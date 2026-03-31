"""
UserProfile extends Supabase's auth.users with app-specific fields.
The user's UUID comes from Supabase Auth — we store it as the PK here.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        comment="Matches auth.users.id from Supabase",
    )
    full_name: Mapped[str | None] = mapped_column(String(120))
    # Madhab affects Nisab type preference (Hanafi → silver; others often use gold)
    madhab: Mapped[str] = mapped_column(
        String(20),
        default="hanafi",
        comment="hanafi | shafi | maliki | hanbali",
    )
    nisab_type: Mapped[str] = mapped_column(
        String(10),
        default="silver",
        comment="gold | silver — determines Nisab threshold",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(UTC),
    )
