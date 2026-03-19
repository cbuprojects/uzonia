import asyncpg
import json
import os
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Database configuration
# ---------------------------------------------------------------------------

DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'uzonia_db'),
    'user':     os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port':     int(os.getenv('DB_PORT') or 5432),
}

pool = None


# ---------------------------------------------------------------------------
# Pool lifecycle
# ---------------------------------------------------------------------------

async def init_db_pool() -> None:
    """
    Initialize database connection pool and create tables.
    """
    global pool
    pool = await asyncpg.create_pool(**DB_CONFIG, min_size=5, max_size=20)

    async with pool.acquire() as conn:

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS repo_data (
                id                       SERIAL PRIMARY KEY,
                file_id                  TEXT NOT NULL UNIQUE
                number_of_application    TEXT NOT NULL UNIQUE,
                date_in                  DATETIME NOT NULL,
                date_out                 DATETIME NOT NULL,
                type                     TEXT NOT NULL CHECK (type IN ('buy', 'sell'),
                dealer_from              TEXT NOT NULL,
                dealer_to                TEXT NOT NULL,
                day_code                 TEXT NOT NULL,
                days                     NUMERIC(4, 2) NOT NULL,
                rate                     NUMERIC(8, 3) NOT NULL,
                money_in                 NUMERIC(15, 2) NOT NULL,
                money_out                NUMERIC(15, 2) NOT NULL,
                created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP             
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS uzonia_data (
                id                        SERIAL PRIMARY KEY,
                file_id                   TEXT NOT NULL UNIQUE,
                uzonia                    NUMERIC(4, 4) NOT NULL,
                7_day_uzonia              NUMERIC(4, 4) NOT NULL,
                30_day_uzonia             NUMERIC(4, 4) NOT NULL,
                90_day_uzonia             NUMERIC(4, 4) NOT NULL,
                180_day_uzonia            NUMERIC(4, 4) NOT NULL,
                index                     NUMERIC(4, 4) NOT NULL,
                date                      TEXT NOT NULL,
                created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS file_ (
                id                       SERIAL PRIMARY KEY,
                file_id                  TEXT NOT NULL UNIQUE,
                file_path                TEXT NOT NULL UNIQUE,
                status                   TEXT NOT NULL CHECK (status IN ('progress', 'finished', failed)),
                last_date                TEXT NOT NULL,
                created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                finished_at              DATETIME NOT NULL
        """)


async def close_db_pool() -> None:
    """Gracefully close the connection pool."""
    global pool
    if pool:
        await pool.close()
        pool = None