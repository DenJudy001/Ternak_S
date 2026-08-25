#!/usr/bin/env python3
"""
Standalone Initial User Seeder Script for SiTernak.
Creates the default admin/owner user in an idempotent manner from environment variables.
"""

import sys
import logging
import os

# Ensure app package is importable
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("seed_user")


def seed_initial_user() -> bool:
    """
    Seed initial user idempotently.
    Returns True if user exists or was created successfully.
    """
    username = settings.INITIAL_USER_USERNAME
    raw_password = settings.INITIAL_USER_PASSWORD

    if not username or not raw_password:
        logger.error("❌ INITIAL_USER_USERNAME or INITIAL_USER_PASSWORD is not set in configuration.")
        return False

    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            logger.info(f"ℹ️ User '{username}' already exists in database (ID: {existing_user.id}). No action needed.")
            return True

        logger.info(f"Creating initial admin user '{username}' ...")
        hashed_password = get_password_hash(raw_password)
        new_user = User(
            username=username,
            email=f"{username}@siternak.local",
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f" Initial user '{username}' created successfully (ID: {new_user.id}).")
        return True
    except Exception as err:
        db.rollback()
        logger.error(f"❌ Error during user seeding: {err}")
        return False
    finally:
        db.close()


def main():
    logger.info("=== SiTernak Initial User Seeder ===")
    success = seed_initial_user()
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
