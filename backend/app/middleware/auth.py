"""
JWT authentication middleware for Supabase.

Supabase signs JWTs with HS256 using the project's JWT secret.
We verify the token server-side so no request can spoof a user ID.

Token claims relevant to us:
  sub   → user UUID (matches auth.users.id and our user_profiles.id)
  email → user email
  role  → "authenticated" for logged-in users
  exp   → expiry timestamp
"""

import base64
import logging
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_bearer = HTTPBearer(auto_error=True)

ALGORITHM = "HS256"


DEV_TOKEN = "dev"


def _decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a Supabase JWT.
    Raises HTTPException on any failure.

    Dev mode: when SUPABASE_JWT_SECRET is unset and DEBUG=true, the static
    token "dev" is accepted and returns a fixed local user ID so you can
    run the app against a local PostgreSQL without any Supabase account.
    """
    # Dev bypass: when DEBUG=true, always accept the static "dev" token
    if settings.debug and token == DEV_TOKEN:
        return {"sub": "00000000-0000-0000-0000-000000000001"}

    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not configured.",
        )

    # Supabase displays the JWT secret base64-encoded in the dashboard.
    # Try base64-decoded bytes first, then fall back to the raw string.
    raw = settings.supabase_jwt_secret
    candidates: list[Any] = [raw]
    try:
        candidates.insert(0, base64.b64decode(raw))
    except Exception:
        pass

    last_exc: Exception = Exception("JWT verification failed")
    for key in candidates:
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=[ALGORITHM],
                audience="authenticated",
            )
            return payload
        except ExpiredSignatureError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from err
        except JWTError as exc:
            last_exc = exc
            continue

    try:
        raise last_exc
    except ExpiredSignatureError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except JWTError as exc:
        logger.debug("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),  # noqa: B008
) -> str:
    """
    FastAPI dependency. Extracts and returns the authenticated user's UUID.
    Raises 401 if the token is missing, invalid, or expired.
    """
    payload = _decode_token(credentials.credentials)

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier.",
        )
    return user_id
