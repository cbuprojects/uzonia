import asyncpg
import json
import os
from zoneinfo import ZoneInfo
from datetime import datetime, date
from typing import Optional, Dict, List
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

tz = ZoneInfo('Asia/Tashkent')


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
            CREATE TABLE IF NOT EXISTS holiday_data (
                id                       SERIAL PRIMARY KEY,
                holiday_date             DATE NOT NULL UNIQUE,
                description              TEXT NOT NULL,
                updated_at               TIMESTAMPTZ,
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS uzonia_data (
                id                        SERIAL PRIMARY KEY,
                file_id                   TEXT NOT NULL,
                rate                      NUMERIC(8, 4) NOT NULL,
                uzonia                    NUMERIC(8, 4) NOT NULL,
                day_7_uzonia              NUMERIC(8, 4),
                day_30_uzonia             NUMERIC(8, 4),
                day_90_uzonia             NUMERIC(8, 4),
                day_180_uzonia            NUMERIC(8, 4),
                index                     NUMERIC(8, 4) NOT NULL,
                uzonia_date               DATE NOT NULL UNIQUE,
                days                      INTEGER NOT NULL,
                created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS repo_data (
                id                       SERIAL PRIMARY KEY,
                file_id                  TEXT NOT NULL UNIQUE,
                number_of_applications   TEXT NOT NULL UNIQUE,
                date_in                  DATE NOT NULL,
                date_out                 DATE NOT NULL,
                type                     TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
                dealer_from              TEXT NOT NULL,
                dealer_to                TEXT NOT NULL,
                days                     NUMERIC(8, 2) NOT NULL,
                rate                     NUMERIC(8, 2) NOT NULL,
                money_in                 NUMERIC(18, 2) NOT NULL,
                money_out                NUMERIC(18, 2) NOT NULL,
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()          
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS depo_data (
                id                       SERIAL PRIMARY KEY,
                file_id                  TEXT NOT NULL UNIQUE,
                number_of_application    TEXT NOT NULL UNIQUE,
                date_in                  DATE NOT NULL,
                date_out                 DATE NOT NULL,
                dealer_from              TEXT,
                dealer_to                TEXT,
                days                     NUMERIC(8, 2) NOT NULL,
                rate                     NUMERIC(8, 3) NOT NULL,
                money                    NUMERIC(18, 2) NOT NULL,
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()             
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS uzonia_uploads (
                id                       SERIAL PRIMARY KEY,
                file_id                  TEXT NOT NULL UNIQUE,
                file_path                TEXT NOT NULL UNIQUE,
                status                   TEXT NOT NULL CHECK (status IN ('progress', 'finished', 'failed')),
                file_date                DATE NOT NULL,
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                finished_at              TIMESTAMPTZ
            )
        """)


async def close_db_pool() -> None:
    """Gracefully close the connection pool."""
    global pool
    if pool:
        await pool.close()
        pool = None



# ----------------------------------------------------------------------------------------------------------------------
# holiday_data
# ----------------------------------------------------------------------------------------------------------------------

async def get_single_holiday_data(holiday_date: date) -> Optional[Dict]:
    """Get holiday data from database for a specific date."""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT holiday_date, description, updated_at, created_at
                FROM holiday_data
                WHERE holiday_date = $1
                """,
                holiday_date
            )
        if row:
            return {'holiday_date': row['holiday_date'], 'description': row['description'],
                    'updated_at': row['updated_at'], 'created_at': row['created_at']}
        else:
            return None
    except Exception as e:
        print(f'Could not get holiday data from database: {e}')
        return None


async def add_holiday_data(holiday_date: date, description: str) -> bool:
    """Insert a new holiday date. Returns False on duplicate."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO holiday_data (holiday_date, description)
                VALUES ($1, $2)
                """, holiday_date, description
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def delete_holiday_data(holiday_date: date) -> bool:
    """Delete holiday data from database."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM holiday_data
                WHERE holiday_date = $1
                """, holiday_date
            )
        return True
    except Exception as e:
        print(f'Could not delete holiday data from database: {e}')
        return False


async def edit_holiday_data(description: str, updated_at: datetime, holiday_date: date ) -> bool:
    """Edit holiday data from database."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE holiday_data
                SET description = $1, updated_at = $2
                WHERE holiday_date = $3
                """, description, updated_at, holiday_date
            )
        return True
    except Exception as e:
        print(f'Could not edit holiday data from database: {e}')
        return False


async def get_all_holiday_data() -> List[Dict]:
    """Get all holiday data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT holiday_date, description, updated_at, created_at
                FROM holiday_data
                ORDER BY holiday_date ASC
                """
            )
            if rows:
                print(f'Found {len(rows)} holiday data')
                return [{'holiday_date': row['holiday_date'],
                         'description': row['description'],
                         'updated_at': row['updated_at'],
                         'created_at': row['created_at']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all holiday data from database: {e}')
        return None


async def check_existence_holiday_data() -> bool:
    """Checking if uzonia data table has data."""
    try:
        async with pool.acquire() as conn:
            exists = await conn.fetchval("SELECT EXISTS (SELECT 1 FROM holiday_data);")
        return exists
    except Exception as e:
        print(e)
        return False



# ----------------------------------------------------------------------------------------------------------------------
# uzonia_data
# ----------------------------------------------------------------------------------------------------------------------

async def check_existence_uzonia_data() -> bool:
    """Checking if uzonia data table has data."""
    try:
        async with pool.acquire() as conn:
            exists = await conn.fetchval("SELECT EXISTS (SELECT 1 FROM uzonia_data);")
        return exists
    except Exception as e:
        print(e)
        return False


async def add_new_uzonia_data(file_id: str, rate: float, uzonia: float,  day_7_uzonia: float,
                              day_30_uzonia: float, day_90_uzonia: float,
                              day_180_uzonia: float, index: float, uzonia_date: date, days: int) -> bool:
    """Insert a new uzonia code. Returns False on duplicate."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO uzonia_data (file_id, rate, uzonia, day_7_uzonia, day_30_uzonia,
                                         day_90_uzonia, day_180_uzonia, index, uzonia_date, days)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                file_id, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date, days
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def get_single_uzonia_data(uzonia_date: date) -> Optional[Dict]:
    """Get uzonia data from database for a specific date."""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT file_id, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date, days
                FROM uzonia_data
                WHERE uzonia_date = $1
                """,
                uzonia_date
            )
        if row:
            return {'file_id': row['file_id'], 'rate': row['rate'], 'uzonia': row['uzonia'],
                    'day_7_uzonia': row['day_7_uzonia'], 'day_30_uzonia': row['day_30_uzonia'],
                    'day_90_uzonia': row['day_90_uzonia'], 'day_180_uzonia': row['day_180_uzonia'],
                    'index': row['index'], 'uzonia_date': row['uzonia_date'], 'days': row['days']}
        else:
            return None
    except Exception as e:
        print(f'Could not get uzonia data from database: {e}')
        return None


async def delete_uzonia_data(uzonia_date: date) -> bool:
    """Delete uzonia data from database."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM uzonia_data
                WHERE uzonia_date = $1
                """, uzonia_date
            )
        return True
    except Exception as e:
        print(f'Could not delete uzonia row data from database: {e}')
        return False


async def edit_uzonia_data(rate: float, uzonia: float, day_7_uzonia: float, day_30_uzonia: float, day_90_uzonia: float,
                           day_180_uzonia: float, index: float, uzonia_date: date, days: int) -> bool:
    """Edit uzonia data from database."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE uzonia_data
                SET rate = $1, uzonia = $2, day_7_uzonia = $3, day_30_uzonia = $4,
                    day_90_uzonia = $5, day_180_uzonia = $6, index = $7, days = $8
                WHERE uzonia_date = $9
                """, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, days, uzonia_date
            )

        return True
    except Exception as e:
        print(f'Could not edit uzonia data from database: {e}')
        return False


async def get_all_uzonia_data() -> List[Dict]:
    """Get all uzonia data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT file_id, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date, days, created_at
                FROM uzonia_data
                ORDER BY uzonia_date DESC
                """
            )
            if rows:
                print(f'Found {len(rows)} holiday data')
                return [{'file_id': row['file_id'],
                         'rate': row['rate'],
                         'uzonia': row['uzonia'],
                         'day_7_uzonia': row['day_7_uzonia'],
                         'day_30_uzonia': row['day_30_uzonia'],
                         'day_90_uzonia': row['day_90_uzonia'],
                         'day_180_uzonia': row['day_180_uzonia'],
                         'index': row['index'],
                         'uzonia_date': row['uzonia_date'],
                         'days': row['days'],
                         'created_at': row['created_at']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


async def get_n_uzonia_data(days_number: int) -> list:
    """Get uzonia data for last n days."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT uzonia, days
                FROM uzonia_data
                ORDER BY uzonia_date DESC
                LIMIT $1
            """, days_number)
            rows = [[row['uzonia'], row['days']] for row in rows]
            return rows
    except Exception as e:
        print(f"Error fetching UZONIA data: {e}")
        return []


async def get_date_filtered_rate_uzonia(from_date: date) -> List[Dict]:
    """Get date filtered rate uzonia."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT uzonia_date, rate, uzonia
                FROM uzonia_data
                WHERE uzonia_date >= $1
                ORDER BY uzonia_date ASC
                """, from_date
            )
            if rows:
                print(f'Found {len(rows)} holiday data')
                return [{'rate': row['rate'],
                         'uzonia': row['uzonia'],
                         'uzonia_date': row['uzonia_date']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


async def get_time_period_uzonia_data(cb_date: date) -> Dict:
    """Get time period uzonia data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT uzonia_date, uzonia
                FROM uzonia_data
                WHERE uzonia_date <= $1
                ORDER BY uzonia_date ASC
                """, cb_date
            )
            if rows:
                time_period_uzonia_data = {}
                for row in rows:
                    time_period_uzonia_data[row['uzonia_date']] = row['uzonia']
                return time_period_uzonia_data
            else:
                return {}
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


async def get_last_five_uzonia():
    """Get last five uzonia data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT uzonia
                FROM uzonia_data
                ORDER BY uzonia_date DESC
                LIMIT 5
                """
            )
            if rows:
                return [row['uzonia'] for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all holiday data from database: {e}')
        return None



# ----------------------------------------------------------------------------------------------------------------------
# uzonia_uploads
# ----------------------------------------------------------------------------------------------------------------------

async def add_new_uzonia_upload(file_id: str, file_path: str, status: str, file_date: date) -> bool:
    """Insert a new uzonia upload. Returns False on duplicate."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO uzonia_uploads (file_id, file_path, status, file_date)
                VALUES ($1, $2, $3, $4)
                """,
                file_id, file_path, status, file_date
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def edit_uzonia_upload_status(status: str, finished_at: datetime, file_id: str) -> bool:
    """Edit uzonia upload status."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE uzonia_uploads
                SET status = $1, finished_at = $2
                WHERE file_id = $3
                """, status, finished_at, file_id
            )

        return True
    except Exception as e:
        print(f'Could not edit uzonia upload data from database: {e}')
        return False


async def delete_uzonia_upload(file_id: str) -> bool:
    """Delete uzonia upload."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM uzonia_uploads
                WHERE file_id = $1
                """, file_id
            )
        return True
    except Exception as e:
        print(f'Could not delete uzonia upload data from database: {e}')
        return False


async def get_single_uzonia_upload(file_id: str) -> Optional[Dict]:
    """Get uzonia upload data from database"""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT file_id, file_path, status, file_date, finished_at
                FROM uzonia_uploads
                WHERE file_id = $1
                """,
                file_id
            )
        if row:
            return {'file_id': row['file_id'], 'file_path': row['file_path'], 'status': row['status'],
                    'file_date': row['file_date'], 'finished_at': row['finished_at']}
        else:
            return None
    except Exception as e:
        print(f'Could not get uzonia uploads data from database: {e}')
        return None


async def get_all_uzonia_uploads() -> List[Dict]:
    """Get all uzonia uploads."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT file_id, file_path, status, file_date, finished_at
                FROM uzonia_uploads
                ORDER BY file_date DESC
                """
            )
            if rows:
                print(f'Found {len(rows)} holiday data')
                return [{'file_id': row['file_id'],
                         'file_path': row['file_path'],
                         'status': row['status'],
                         'file_date': row['file_date'],
                         'finished_at': row['finished_at']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


