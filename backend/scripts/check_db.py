#!/usr/bin/env python3
"""
Standalone Database Connectivity Verification Script for SiTernak.
Executes a lightweight query (SELECT 1) to verify PostgreSQL availability and credentials.
"""

import sys
import logging
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Ensure app package is importable
import os
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.database import engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("check_db")


def sanitize_db_target() -> str:
    """Return sanitized database target string without leaking sensitive password."""
    return f"{settings.POSTGRES_USER}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"


def check_database_connection() -> bool:
    """
    Attempt to connect to the database and run a test query.
    Returns True if connection succeeded, False otherwise.
    """
    target = sanitize_db_target()
    logger.info(f"Connecting to database target: {target} ...")

    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar()
            if result == 1:
                logger.info(" Database connection successful! Query 'SELECT 1' returned 1.")
                return True
            else:
                logger.error(f"❌ Unexpected result from database query: {result}")
                return False
    except OperationalError as err:
        logger.error(f"❌ OperationalError: Failed to establish connection to database [{target}].")
        logger.error(f"Reason: {err.orig if hasattr(err, 'orig') else str(err)}")
        return False
    except SQLAlchemyError as err:
        logger.error(f"❌ SQLAlchemyError occurred during connectivity check to [{target}]: {err}")
        return False
    except Exception as err:
        logger.error(f"❌ Unexpected error during connectivity check to [{target}]: {err}")
        return False


def main():
    logger.info("=== SiTernak Database Connectivity Test ===")
    success = check_database_connection()
    if success:
        logger.info("Status: READY")
        sys.exit(0)
    else:
        logger.error("Status: FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
