import asyncpg
import json
import os
from zoneinfo import ZoneInfo
from datetime import datetime, date
from typing import Optional, Dict, List, Any, Coroutine
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
                unique_job_id            TEXT NOT NULL UNIQUE,
                holiday_date             DATE NOT NULL UNIQUE,
                description              TEXT NOT NULL,
                updated_at               TIMESTAMPTZ,
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS uzonia_data (
                id                        SERIAL PRIMARY KEY,
                unique_job_id             TEXT NOT NULL UNIQUE,
                file_id                   TEXT NOT NULL,
                day_type                  TEXT NOT NULL,
                rate                      NUMERIC(18, 4) NOT NULL,
                uzonia                    NUMERIC(18, 4) NOT NULL,
                day_7_uzonia              NUMERIC(18, 4),
                day_30_uzonia             NUMERIC(18, 4),
                day_90_uzonia             NUMERIC(18, 4),
                day_180_uzonia            NUMERIC(18, 4),
                index                     NUMERIC(18, 4) NOT NULL,
                uzonia_date               DATE NOT NULL UNIQUE,
                days                      INTEGER NOT NULL,
                created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS repo_data (
                id                       SERIAL PRIMARY KEY,
                file_id                  TEXT NOT NULL,
                number_of_application    TEXT NOT NULL UNIQUE,
                date_in                  DATE NOT NULL,
                date_out                 DATE NOT NULL,
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
                unique_job_id            TEXT NOT NULL UNIQUE,
                file_id                  TEXT NOT NULL UNIQUE,
                file_path                TEXT NOT NULL UNIQUE,
                status                   TEXT NOT NULL CHECK (status IN ('progress', 'finished', 'failed')),
                file_date                DATE NOT NULL,
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                finished_at              TIMESTAMPTZ
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              SERIAL PRIMARY KEY,
                user_id         TEXT NOT NULL UNIQUE,
                username        TEXT NOT NULL UNIQUE,
                first_name      TEXT NOT NULL,
                last_name       TEXT NOT NULL,
                department      TEXT NOT NULL,
                language        TEXT NOT NULL CHECK (language IN('ru', 'en', 'uz_c', 'uz_l')),
                password        TEXT NOT NULL,
                is_active       BOOLEAN NOT NULL DEFAULT TRUE,
                is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id              SERIAL PRIMARY KEY,
                user_id         TEXT NOT NULL,
                session_id      TEXT NOT NULL UNIQUE,
                ip_address      INET,
                status          TEXT NOT NULL CHECK (status IN ('active', 'expired', 'logged_out')),
                last_login      TIMESTAMPTZ,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expire_time     TIMESTAMPTZ,

                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_actions(
                id              SERIAL PRIMARY KEY,
                user_id         TEXT NOT NULL,
                unique_job_id   TEXT NOT NULL UNIQUE,
                session_id      TEXT NOT NULL,
                ip_address      INET,
                action          TEXT NOT NULL,
                action_status   TEXT NOT NULL CHECK (action_status IN ('success', 'failed')),
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
            )
        """)


async def close_db_pool() -> None:
    """Gracefully close the connection pool."""
    global pool
    if pool:
        await pool.close()
        pool = None



# ----------------------------------------------------------------------------------------------------------------------
# user auth
# ----------------------------------------------------------------------------------------------------------------------

async def create_superuser(user_id: str, username: str, first_name: str, last_name: str, department: str, language: str,
                           password: str, is_active: bool, is_admin: bool, created_at: datetime) -> bool:
    """Create a new superuser."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (user_id, username, first_name, last_name, department, language, password, is_active, is_admin, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                user_id, username, first_name, last_name, department, language, password, is_active, is_admin,
                created_at
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def get_user(username: str) -> Optional[dict]:
    """Fetch a single user."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT user_id, username, first_name, last_name, department, language, password, is_active, is_admin, created_at
            FROM users
            WHERE username = $1
            """,
            username,
        )

    return {"user_id": row["user_id"],
            "username": row["username"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "department": row["department"],
            "language": row["language"],
            "password": row["password"],
            "is_active": row["is_active"],
            "is_admin": row["is_admin"],
            "created_at": row["created_at"]
            } if row else None


async def get_user_id(user_id: str) -> Optional[dict]:
    """Fetch a single user."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT user_id, username, first_name, last_name, department, language, password, is_active, is_admin, created_at
            FROM users
            WHERE user_id = $1
            """,
            user_id,
        )

    return {"user_id": row["user_id"],
            "username": row["username"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "department": row["department"],
            "language": row["language"],
            "password": row["password"],
            "is_active": row["is_active"],
            "is_admin": row["is_admin"],
            "created_at": row["created_at"]
            } if row else None


async def create_user_session(user_id: str, session_id: str, ip_address: str, status: str, last_login: datetime,
                              created_at: datetime, expire_time: datetime) -> bool:
    """Create a new user session."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO user_sessions (user_id, session_id, ip_address, status, last_login, created_at, expire_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                user_id, session_id, ip_address, status, last_login, created_at, expire_time
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def get_session(session_id: str) -> Optional[dict]:
    """Fetch a single session."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT user_id, session_id, ip_address, status, created_at, expire_time
            FROM user_sessions
            WHERE session_id = $1
            """,
            session_id,
        )

    return {"user_id": row["user_id"],
            "session_id": row["session_id"],
            "ip_address": row["ip_address"],
            "status": row["status"],
            "created_at": row["created_at"],
            "expire_time": row["expire_time"],
            } if row else None


async def logout_user_session(session_id: str) -> bool:
    """Logout a user session."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE user_sessions SET status = 'logged_out' WHERE session_id = $1",
            session_id,
        )
    affected = int(result.split()[-1])  # asyncpg returns e.g. "UPDATE 1"
    return True if affected > 0 else False


async def expire_user_session(session_id: str) -> bool:
    """Expire a user session."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE user_sessions SET status = 'expired' WHERE session_id = $1",
            session_id,
        )
    affected = int(result.split()[-1])  # asyncpg returns e.g. "UPDATE 1"
    return True if affected > 0 else False



# ----------------------------------------------------------------------------------------------------------------------
# user data
# ----------------------------------------------------------------------------------------------------------------------

async def edit_user_language(language: str, username: str) -> bool:
    """Edit a user language."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE users SET language = $1 WHERE  username = $2",
            language, username
        )
    affected = int(result.split()[-1])  # asyncpg returns e.g. "UPDATE 1"
    return True if affected > 0 else False


async def edit_user_details(username: str, first_name: str, last_name: str, department: str, language: str,
                            is_active: bool, is_admin: bool, user_id: str) -> bool:
    """Edit a user details."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE users SET username = $1, first_name = $2, last_name = $3, department = $4,"
            "language = $5, is_active = $6, is_admin = $7 WHERE user_id = $8",
            username, first_name, last_name, department, language, is_active, is_admin, user_id
        )
    affected = int(result.split()[-1])  # asyncpg returns e.g. "UPDATE 1"
    return True if affected > 0 else False


async def edit_user_password(user_id: str, password: str) -> bool:
    """Edit a user password."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE users SET password = $2 WHERE user_id = $1",
            user_id, password
        )
    affected = int(result.split()[-1])  # asyncpg returns e.g. "UPDATE 1"
    return True if affected > 0 else False


async def add_new_user(user_id: str, username: str, first_name: str, last_name: str, department: str, language: str,
                       password: str, is_active: bool, is_admin: bool, created_at: datetime):
    """Add a new user."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (user_id, username, first_name, last_name, department, language, password, is_active, is_admin, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                user_id, username, first_name, last_name, department, language, password, is_active, is_admin,
                created_at
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def delete_user(user_id: str) -> Optional[int]:
    """Delete user from the database."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM users WHERE user_id = $1",
            user_id,
        )
    affected = int(result.split()[-1])
    return affected if affected > 0 else None


async def get_all_users():
    """Fetch all users."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT user_id, username, first_name, last_name, department, language, password, is_active, is_admin, created_at
            FROM users
            ORDER BY is_admin DESC
            """
        )
    return [dict(row) for row in rows]



# ----------------------------------------------------------------------------------------------------------------------
# user sessions
# ----------------------------------------------------------------------------------------------------------------------

async def get_all_sessions_data():
    """Fetch alls sessions."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT 
                s.user_id,
                s.session_id,
                s.ip_address,
                s.status,
                s.last_login,
                s.created_at,
                s.expire_time,

                u.username,
                u.first_name,
                u.last_name
            FROM user_sessions s
            JOIN users u ON u.user_id = s.user_id
            ORDER BY s.created_at DESC    
            """
        )

    return [dict(row) for row in rows]


async def delete_session(session_id: str):
    """Delete session from the database."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM user_sessions WHERE session_id = $1",
            session_id,
        )
    affected = int(result.split()[-1])
    return affected if affected > 0 else None


async def edit_session_status(session_id: str, status: str, expire_time: datetime) -> bool:
    """Edit session details."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE user_sessions SET status = $2, expire_time = $3 WHERE session_id = $1",
            session_id, status, expire_time
        )
    affected = int(result.split()[-1])  # asyncpg returns e.g. "UPDATE 1"
    return True if affected > 0 else False



# ----------------------------------------------------------------------------------------------------------------------
# user actions
# ----------------------------------------------------------------------------------------------------------------------

async def get_all_actions_data():
    """Fetch all actions."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                ua.user_id,
                ua.session_id,
                ua.unique_job_id,
                u.username,
                u.first_name,
                u.last_name,
                u.department,
                ua.ip_address,
                ua.action,
                ua.action_status,
                ua.created_at
            FROM user_actions ua
            JOIN users u
                ON ua.user_id = u.user_id
            ORDER BY ua.created_at DESC
            """
        )

    return [dict(row) for row in rows]


async def get_single_action_data(unique_job_id: str):
    """Fetch single action."""
    """Fetch a single session."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT user_id, unique_job_id, session_id, ip_address, action, action_status, created_at
            FROM user_actions
            WHERE unique_job_id = $1
            """,
            unique_job_id,
        )

    return {"user_id": row["user_id"],
            "unique_job_id": row["unique_job_id"],
            "session_id": row["session_id"],
            "ip_address": row["ip_address"],
            "action": row["action"],
            "action_status": row["action_status"],
            "created_at": row["created_at"]
            } if row else None


async def delete_single_action(unique_job_id: str):
    """Delete single action."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM user_actions WHERE unique_job_id = $1",
            unique_job_id,
        )
    affected = int(result.split()[-1])
    return affected if affected > 0 else None


async def add_action_data(user_id, unique_job_id, session_id, ip_address, action, action_status, created_at):
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO user_actions (user_id, unique_job_id, session_id, ip_address, action, action_status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            user_id, unique_job_id, session_id, ip_address, action, action_status, created_at
        )
    return True


async def edit_action_status(unique_job_id: str, status: str):
    """Edit user actions status."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE user_actions SET action_status = $2 WHERE unique_job_id = $1",
            unique_job_id, status
        )
    affected = int(result.split()[-1])  # asyncpg returns e.g. "UPDATE 1"
    return True if affected > 0 else False



# ----------------------------------------------------------------------------------------------------------------------
# holiday_data
# ----------------------------------------------------------------------------------------------------------------------

async def get_single_holiday_data(holiday_date: date) -> Optional[Dict]:
    """Get holiday data from database for a specific date."""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT unique_job_id, holiday_date, description, updated_at, created_at
                FROM holiday_data
                WHERE holiday_date = $1
                """,
                holiday_date
            )
        if row:
            return {'unique_job_id': row['unique_job_id'],
                    'holiday_date': row['holiday_date'],
                    'description': row['description'],
                    'updated_at': row['updated_at'],
                    'created_at': row['created_at']}
        else:
            return None
    except Exception as e:
        print(f'Could not get holiday data from database: {e}')
        return None


async def add_holiday_data(unique_job_id: str, holiday_date: date, description: str) -> bool:
    """Insert a new holiday date. Returns False on duplicate."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO holiday_data (unique_job_id, holiday_date, description)
                VALUES ($1, $2, $3)
                """, unique_job_id, holiday_date, description
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
                SELECT
                    h.unique_job_id,
                    h.holiday_date,
                    h.description,
                    h.updated_at,
                    h.created_at,

                    ua.user_id,
                    usr.username,
                    usr.first_name,
                    usr.last_name,
                    usr.department
                
                FROM holiday_data h
                LEFT JOIN user_actions ua
                    ON ua.unique_job_id = h.unique_job_id
                LEFT JOIN users usr
                    ON usr.user_id = ua.user_id
                
                ORDER BY h.holiday_date ASC;
                """
            )
            if rows:
                return [{'unique_job_id': row['unique_job_id'],
                         'holiday_date': row['holiday_date'],
                         'description': row['description'],
                         'updated_at': row['updated_at'],
                         'created_at': row['created_at'],
                         'username': row['username'],
                         'first_name': row['first_name'],
                         'last_name': row['last_name'],
                         'department': row['department']} for row in rows]
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


async def add_new_uzonia_data(unique_job_id: str, file_id: str, day_type: str,
                              rate: float,
                              uzonia: float,  day_7_uzonia: float,
                              day_30_uzonia: float, day_90_uzonia: float,
                              day_180_uzonia: float, index: float,
                              uzonia_date: date, days: int) -> bool:
    """Insert a new uzonia code. Returns False on duplicate."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO uzonia_data (unique_job_id, file_id, day_type, rate, uzonia, day_7_uzonia, day_30_uzonia,
                                         day_90_uzonia, day_180_uzonia, index, uzonia_date, days)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                """,
                unique_job_id, file_id, day_type, rate, uzonia, day_7_uzonia, day_30_uzonia,
                day_90_uzonia, day_180_uzonia, index, uzonia_date, days
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
                SELECT unique_job_id, file_id, day_type, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date, days
                FROM uzonia_data
                WHERE uzonia_date = $1
                """,
                uzonia_date
            )
        if row:
            return {'unique_job_id': row['unique_job_id'], 'file_id': row['file_id'], 'day_type': row['day_type'],
                    'rate': row['rate'], 'uzonia': float(row['uzonia']),
                    'day_7_uzonia': float(row['day_7_uzonia']), 'day_30_uzonia': float(row['day_30_uzonia']),
                    'day_90_uzonia': float(row['day_90_uzonia']), 'day_180_uzonia': float(row['day_180_uzonia']),
                    'index': float(row['index']), 'uzonia_date': row['uzonia_date'], 'days': row['days']}
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


async def edit_uzonia_data(day_type: str, rate: float, uzonia: float, day_7_uzonia: float, day_30_uzonia: float, day_90_uzonia: float,
                           day_180_uzonia: float, index: float, uzonia_date: date, days: int) -> bool:
    """Edit uzonia data from database."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE uzonia_data
                SET day_type = $1, rate = $2, uzonia = $3, day_7_uzonia = $4, day_30_uzonia = $5,
                    day_90_uzonia = $6, day_180_uzonia = $7, index = $8, days = $9
                WHERE uzonia_date = $10
                """, day_type, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, days, uzonia_date
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
                SELECT
                    ud.unique_job_id,
                    ud.file_id,
                    ud.day_type,
                    ud.rate,
                    ud.uzonia,
                    ud.day_7_uzonia,
                    ud.day_30_uzonia,
                    ud.day_90_uzonia,
                    ud.day_180_uzonia,
                    ud.index,
                    ud.uzonia_date,
                    ud.days,
                    ud.created_at,
                    
                
                    ua.user_id,
                    usr.username,
                    usr.first_name,
                    usr.last_name
                
                FROM uzonia_data ud
                LEFT JOIN user_actions ua
                    ON ua.unique_job_id = ud.unique_job_id
                LEFT JOIN users usr
                    ON usr.user_id = ua.user_id
                
                ORDER BY ud.uzonia_date DESC;
                """
            )
            if rows:
                return [{'unique_job_id': row['unique_job_id'],
                         'file_id': row['file_id'],
                         'day_type': row['day_type'],
                         'rate': row['rate'],
                         'uzonia': row['uzonia'],
                         'day_7_uzonia': row['day_7_uzonia'],
                         'day_30_uzonia': row['day_30_uzonia'],
                         'day_90_uzonia': row['day_90_uzonia'],
                         'day_180_uzonia': row['day_180_uzonia'],
                         'index': row['index'],
                         'uzonia_date': row['uzonia_date'],
                         'days': row['days'],
                         'created_at': row['created_at'],
                         'username': row['username'],
                         'first_name': row['first_name'],
                         'last_name': row['last_name']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


async def get_filtered_uzonia_data(till_date: date) -> List[Dict]:
    """Get all uzonia data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT unique_job_id, file_id, day_type, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date, days, created_at
                FROM uzonia_data
                WHERE uzonia_date <= $1
                ORDER BY uzonia_date DESC
                """, till_date
            )
            if rows:
                return [{'unique_job_id': row['unique_job_id'],
                         'file_id': row['file_id'],
                         'day_type': row['day_type'],
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


async def get_latest_n_uzonia(latest_n: int) -> list:
    """Get uzonia data for last n days."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT uzonia, days, uzonia_date
                FROM uzonia_data
                ORDER BY uzonia_date DESC
                LIMIT $1
            """, latest_n, day_type)
            if rows:
                rows = [[float(row['uzonia']), float(row['days'])] for row in rows]
            else:
                rows = []
            return rows
    except Exception as e:
        print(f"Error fetching UZONIA data: {e}")
        return []


async def get_nth_uzonia_data(nth_value: int) -> float | None:
    """Get uzonia data for nth day."""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT
                  LEAD(index, $1) OVER (ORDER BY uzonia_date DESC) AS nth_ago_index
                FROM uzonia_data
                ORDER BY uzonia_date DESC
                LIMIT 1;
            """, nth_value)
            if row and row['nth_ago_index'] is not None:
                row = float(row['nth_ago_index'])
            else:
                row = []
            return row
    except Exception as e:
        print(f"Error fetching UZONIA data: {e}")
        return None




async def get_date_filtered_rate_uzonia(from_date: date, till_date: date) -> List[Dict]:
    """Get date filtered rate uzonia."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT uzonia_date, rate, uzonia
                FROM uzonia_data
                WHERE uzonia_date >= $1 AND uzonia_date <= $2
                ORDER BY uzonia_date ASC
                """, from_date, till_date
            )
            if rows:
                return [{'rate': float(row['rate']),
                         'uzonia': float(row['uzonia']),
                         'uzonia_date': row['uzonia_date']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


async def get_time_period_uzonia_data(cb_date: date) -> List:
    """Get time period uzonia data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT uzonia_date, uzonia
                FROM uzonia_data
                WHERE uzonia_date <= $1
                ORDER BY uzonia_date DESC
                """, cb_date
            )
            if rows:
                time_period_uzonia_data = [[row['uzonia_date'], float(row['uzonia'])] for row in rows]
                return time_period_uzonia_data
            else:
                return []
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
                return [float(row['uzonia']) for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all holiday data from database: {e}')
        return None


async def get_latest_uzonia_data(cb_date: date, day_type = 'Working day') -> Dict:
    """Get latest uzonia data."""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT unique_job_id, file_id, day_type, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date, days
                FROM uzonia_data
                WHERE uzonia_date < $1 and day_type == $2
                ORDER BY uzonia_date DESC
                LIMIT 1
                """, cb_date, day_type)
        if row:
            return {'unique_job_id': row['unique_job_id'],
                    'file_id': row['file_id'],
                    'day_type': row['day_type'],
                    'rate': row['rate'],
                    'uzonia': float(row['uzonia']),
                    'day_7_uzonia': float(row['day_7_uzonia']),
                    'day_30_uzonia': float(row['day_30_uzonia']),
                    'day_90_uzonia': float(row['day_90_uzonia']),
                    'day_180_uzonia': float(row['day_180_uzonia']),
                    'index': float(row['index']),
                    'uzonia_date': row['uzonia_date'],
                    'days': row['days']}
        else:
            return None
    except Exception as e:
        print(f'Could not get uzonia data from database: {e}')
        return None


async def get_year_first_uzonia_data(year_first_date: date):
    """Get nth uzonia data."""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT unique_job_id, file_id, day_type, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date, days
                FROM uzonia_data
                WHERE uzonia_date >= $1
                ORDER BY uzonia_date ASC
                LIMIT 1
                """, year_first_date)
        if row:
            return {'unique_job_id': row['unique_job_id'],
                    'file_id': row['file_id'],
                    'day_type': row['day_type'],
                    'rate': row['rate'],
                    'uzonia': float(row['uzonia']),
                    'day_7_uzonia': float(row['day_7_uzonia']),
                    'day_30_uzonia': float(row['day_30_uzonia']),
                    'day_90_uzonia': float(row['day_90_uzonia']),
                    'day_180_uzonia': float(row['day_180_uzonia']),
                    'index': float(row['index']), 'uzonia_date': row['uzonia_date'], 'days': row['days']}
        else:
            return None
    except Exception as e:
        print(f'Could not get uzonia data from database: {e}')
        return None



# ----------------------------------------------------------------------------------------------------------------------
# uzonia_uploads
# ----------------------------------------------------------------------------------------------------------------------

async def add_new_uzonia_upload(unique_job_id: str, file_id: str, file_path: str, status: str, file_date: date, created_at: datetime) -> bool:
    """Insert a new uzonia upload. Returns False on duplicate."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO uzonia_uploads (unique_job_id, file_id, file_path, status, file_date, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                unique_job_id, file_id, file_path, status, file_date, created_at
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
                SELECT unique_job_id, file_id, file_path, status, file_date, finished_at
                FROM uzonia_uploads
                WHERE file_id = $1
                """,
                file_id
            )
        if row:
            return {'unique_job_id': row['unique_job_id'], 'file_id': row['file_id'],
                    'file_path': row['file_path'], 'status': row['status'],
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
                SELECT
                    u.unique_job_id,
                    u.file_id,
                    u.file_path,
                    u.status,
                    u.file_date,
                    u.created_at,
                    u.finished_at,
                
                    ua.user_id,
                    usr.username,
                    usr.first_name,
                    usr.last_name,
                    usr.department
                
                FROM uzonia_uploads u
                LEFT JOIN user_actions ua
                    ON ua.unique_job_id = u.unique_job_id
                LEFT JOIN users usr
                    ON usr.user_id = ua.user_id
                
                ORDER BY u.file_date DESC;
                """
            )
            if rows:
                return [{'unique_job_id': row['unique_job_id'],
                         'file_id': row['file_id'],
                         'file_path': row['file_path'],
                         'status': row['status'],
                         'file_date': row['file_date'],
                         'created_at': row['created_at'],
                         'finished_at': row['finished_at'],
                         'username': row['username'],
                         'first_name': row['first_name'],
                         'last_name': row['last_name'],
                         'department': row['department']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None



# ----------------------------------------------------------------------------------------------------------------------
# repo_data
# ----------------------------------------------------------------------------------------------------------------------
async def repo_data_exists(file_id: str) -> bool:
    """Check if repo data exists."""
    try:
        async with pool.acquire() as conn:
            result = await conn.fetchval(
                """
                SELECT 1
                FROM repo_data
                WHERE file_id = $1
                LIMIT 1
                """,
                file_id
            )
        return result
    except Exception as e:
        print(f'Could not get repo data from database: {e}')
        return False


async def get_all_repo_data():
    """Get all repo data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT file_id, number_of_application, date_in, date_out, dealer_from, dealer_to, rate, days, money_in, money_out, created_at
                FROM repo_data
                ORDER BY created_at DESC
                """
            )
            if rows:
                return [{'file_id': row['file_id'],
                         'number_of_application': row['number_of_application'],
                         'date_in': row['date_in'],
                         'date_out': row['date_out'],
                         'dealer_from': row['dealer_from'],
                         'dealer_to': row['dealer_to'],
                         'rate': row['rate'],
                         'days': row['days'],
                         'money_in': row['money_in'],
                         'money_out': row['money_out'],
                         'created_at': row['created_at']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


async def add_new_repo_data(file_id: str,  number_of_application: str, date_in: date, date_out: date,
                            dealer_from: str, dealer_to: str, rate: float, days: int, money_in: float, money_out: float, created_at: datetime) -> bool:
    """Add new repo data."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO repo_data (file_id, number_of_application, date_in, date_out,
                 dealer_from, dealer_to, rate, days, money_in, money_out, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                file_id, number_of_application, date_in, date_out, dealer_from, dealer_to, rate, days, money_in, money_out, created_at
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def delete_repo_data(file_id: str) -> bool:
    """Delete uzonia upload."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM repo_data
                WHERE file_id = $1
                """, file_id
            )
        return True
    except Exception as e:
        print(f'Could not delete uzonia upload data from database: {e}')
        return False



# ----------------------------------------------------------------------------------------------------------------------
# depo_data
# ----------------------------------------------------------------------------------------------------------------------
async def depo_data_exists(file_id: str) -> bool:
    """Check if depo data exists."""
    try:
        async with pool.acquire() as conn:
            result = await conn.fetchval(
                """
                SELECT 1
                FROM depo_data
                WHERE file_id = $1
                LIMIT 1
                """,
                file_id
            )
        return result
    except Exception as e:
        print(f'Could not get depo data from database: {e}')
        return False


async def get_all_depo_data():
    """Get all repo data."""
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT file_id, number_of_application, date_in, date_out, dealer_from, dealer_to, rate, days, money, created_at
                FROM depo_data
                ORDER BY created_at DESC
                """
            )
            if rows:
                return [{'file_id': row['file_id'],
                         'number_of_application': row['number_of_application'],
                         'date_in': row['date_in'],
                         'date_out': row['date_out'],
                         'dealer_from': row['dealer_from'],
                         'dealer_to': row['dealer_to'],
                         'rate': row['rate'],
                         'days': row['days'],
                         'money': row['money'],
                         'created_at': row['created_at']} for row in rows]
            else:
                return []
    except Exception as e:
        print(f'Could not get all uzonia data from database: {e}')
        return None


async def add_new_depo_data(file_id: str,  number_of_application: str, date_in: date, date_out: date,
                            dealer_from: str, dealer_to: str, rate: float, days: int, money: float, created_at: datetime) -> bool:
    """Add new repo data."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO depo_data (file_id, number_of_application, date_in, date_out,
                 dealer_from, dealer_to, rate, days, money, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                file_id, number_of_application, date_in, date_out, dealer_from, dealer_to, rate, days, money, created_at
            )
        return True
    except asyncpg.UniqueViolationError:
        return False


async def delete_depo_data(file_id: str) -> bool:
    """Delete uzonia upload."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM depo_data
                WHERE file_id = $1
                """, file_id
            )
        return True
    except Exception as e:
        print(f'Could not delete uzonia upload data from database: {e}')
        return False
