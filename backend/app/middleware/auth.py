"""
JWT authentication middleware for Supabase.

Supports both legacy HS256 tokens and current ECC (P-256) tokens by
fetching the project's JWKS from the Supabase well-known endpoint.

Token claims relevant to us:
  sub   → user UUID (matches auth.users.id and our user_profiles.id)
  role  → "authenticated" for logged-in users
  exp   → expiry timestamp
"""

import base64
import logging
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.exceptions import ExpiredSignatureError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_bearer = HTTPBearer(auto_error=True)

DEV_TOKEN = "dev"

# Module-level JWKS cache — fetched once on first use
_jwks_cache: list | None = None


def _get_jwks() -> list:
    """Fetch and cache Supabase public keys from the JWKS endpoint."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    if not settings.supabase_url:
        return []
    try:
        url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        resp = httpx.get(url, timeout=5.0)
        resp.raise_for_status()
        _jwks_cache = resp.json().get("keys", [])
        logger.info("Loaded %d JWKS key(s) from Supabase", len(_jwks_cache))
    except Exception as exc:
        logger.warning("Failed to fetch Supabase JWKS: %s", exc)
        _jwks_cache = []
    return _jwks_cache


def _decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a Supabase JWT.

    Tries in order:
      1. Dev bypass (DEBUG=true + token == "dev")
      2. Legacy HS256 shared secret (SUPABASE_JWT_SECRET)
      3. JWKS public keys from Supabase (ECC P-256 / current default)

    Raises HTTPException on any failure.
    """
    # 1. Dev bypass
    if settings.debug and token == DEV_TOKEN:
        return {"sub": "00000000-0000-0000-0000-000000000001"}

    # 2. Legacy HS256
    if settings.supabase_jwt_secret:
        raw = settings.supabase_jwt_secret
        candidates: list[Any] = [raw]
        try:
            candidates.insert(0, base64.b64decode(raw))
        except Exception:
            pass
        for key in candidates:
            try:
                return jwt.decode(token, key, algorithms=["HS256"], audience="authenticated")
            except ExpiredSignatureError as err:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired.",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from err
            except JWTError:
                continue

    # 3. JWKS (ECC P-256 and any other public-key algorithms)
    jwks_keys = _get_jwks()
    for key_data in jwks_keys:
        try:
            public_key = jwk.construct(key_data)
            return jwt.decode(
                token,
                public_key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
        except ExpiredSignatureError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from err
        except JWTError:
            continue

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),  # noqa: B008
) -> str:
    """FastAPI dependency — returns the authenticated user's UUID."""
    payload = _decode_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier.",
        )
    return user_id
