import os
import uuid
import logging
import time
from datetime import datetime, timedelta, date
import pandas as pd
from pathlib import Path
import zipfile
from typing import Dict, Optional
import shutil
import asyncio
from uuid import uuid4
import io

from pydantic import BaseModel
from passlib.context import CryptContext
import hmac
import hashlib
import secrets
from zoneinfo import ZoneInfo

from functools import partial
import random
from fastapi import FastAPI, UploadFile, HTTPException, Form, BackgroundTasks, Request, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse

from utils.database import (init_db_pool, close_db_pool, get_single_holiday_data, get_all_holiday_data,
                            add_holiday_data, edit_holiday_data, delete_holiday_data,
                            get_single_uzonia_data, add_new_uzonia_data,
                            delete_uzonia_data, get_all_uzonia_data, edit_uzonia_data, get_nth_uzonia_data,
                            get_single_uzonia_upload, get_all_uzonia_uploads, delete_uzonia_upload, edit_uzonia_upload_status,
                            get_date_filtered_rate_uzonia, get_time_period_uzonia_data,
                            add_new_uzonia_upload, get_latest_uzonia_data, get_last_five_uzonia, get_filtered_uzonia_data,
                            add_new_repo_data, add_new_depo_data, get_all_repo_data, repo_data_exists, delete_repo_data,
                            get_all_depo_data, depo_data_exists, delete_depo_data,
                            create_superuser, create_user_session, get_session, logout_user_session, expire_user_session,
                            edit_user_language, add_new_user, get_user, get_user_id, get_all_users, edit_user_details,
                            edit_user_password, delete_user,
                            get_all_sessions_data, edit_session_status, delete_session,
                            add_action_data, get_all_actions_data, edit_action_status, delete_single_action, get_single_action_data,
                            get_all_bank_ids, get_single_bank_data_name, get_all_bank_data, add_bank_data,
                            edit_bank_data, delete_bank_data, get_all_bank_names)
from utils.add_data import add_all_uzonia_data_to_the_db, add_new_holiday_data_to_the_db, add_new_bank_data_to_the_db
from utils.calculations import calculate_day_uzonia, calculate_cb_rate
from utils.draw_graph import draw_graph_data
from utils.draw_table import draw_table_data
from utils.help_functions import finding_time_uzonia_calculations_func, stream_zip_from_folder
from utils.build_excel import export_uzonia_to_excel


# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),                          # stdout
        logging.FileHandler("logs/app.log", encoding="utf-8") # persistent log file
    ]
)

logger = logging.getLogger("cbu_api")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title='CBU Incoterm Data Processing APIs', docs_url='/', redoc_url=None)

# origins = [
#     "http://localhost:5173",
#     "http://127.0.0.1:5173",
# ]

origins = [
    "http://10.1.209.135:4837",
    "http://localhost:4837",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Timezone
# ---------------------------------------------------------------------------

tz = ZoneInfo("Asia/Tashkent")


# ---------------------------------------------------------------------------
# Request timing middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    logger.info("➡️  %s %s  (client=%s)", request.method, request.url.path, request.client.host)
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "⬅️  %s %s → %s  (%.1f ms)",
        request.method, request.url.path, response.status_code, elapsed
    )
    return response



# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting CBU API…")
    await init_db_pool()
    result = await add_all_uzonia_data_to_the_db()
    if result:
        logger.info('🆕 Data is added')
    else:
        logger.info('📋 Data is NOT added')

    result = await add_new_holiday_data_to_the_db()
    if result:
        logger.info('🆕 Holiday data is added')
    else:
        logger.info('📋 Holiday data is NOT added')

    result = await add_new_bank_data_to_the_db()
    if result:
        logger.info('🆕 Bank data is added')
    else:
        logger.info('📋 Bank data is NOT added')


    # await create_admin_user()


    logger.info("✅ Startup complete: DB pool initialized")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Shutdown signal received — closing DB pool…")
    await close_db_pool()
    logger.info("✅ Shutdown complete: DB pool closed")


# ----------------------------------------------------------------------------------------------------------------------
# Admin auth
# ----------------------------------------------------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["argon2"],deprecated="auto")
psd = str(os.getenv("PD"))
ad = str(os.getenv("AD"))
fs = str(os.getenv("FS"))
ls = str(os.getenv("LS"))
dp = str(os.getenv("DP"))
l = str(os.getenv("L"))
iad = os.getenv("IAD", "false").lower() == "true"
ias = os.getenv("IAC", "false").lower() == "true"

async def create_admin_user():
    token = secrets.token_hex(64)
    await create_superuser(token, ad, fs, ls, dp, l, hs_pd(token), ias, iad, datetime.now(tz))

def hs_pd(token: str) -> str:
    hmac_result = hmac.new(token.encode(), psd.encode(), hashlib.sha256).hexdigest()
    return pwd_context.hash(hmac_result)



# ----------------------------------------------------------------------------------------------------------------------
# User auth
# ----------------------------------------------------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login_api(request: Request, data: LoginRequest):
    user = await get_user(data.username)
    if not user:
        raise HTTPException(401, "Invalid username!")

    if not verify_password(user_id=user['user_id'], password=data.password, hashed_password=user['password']):
        raise HTTPException(401, "Invalid credentials")

    session_data = create_session_token()
    ip_address = request.client.host

    await create_user_session(user['user_id'], session_data['session_id'], ip_address,
                       'active', datetime.now(tz), datetime.now(tz), datetime.now(tz) + timedelta(minutes=30))

    unique_job_id = uuid.uuid4().hex[:12]
    await add_action_data(user_id=user['user_id'], session_id=session_data['session_id'], ip_address=ip_address,
                          unique_job_id=unique_job_id, action='Logged in', action_status='success', created_at=datetime.now(tz))

    return {"session_id": session_data['token']}


def verify_password(user_id: str, password: str, hashed_password: str) -> bool:
    password = hmac.new(user_id.encode(), password.encode(), hashlib.sha256).hexdigest()
    return pwd_context.verify(password, hashed_password)


def create_session_token():
    token = secrets.token_urlsafe(64)
    session_id = hashlib.sha256(token.encode()).hexdigest()
    return {'token': token, 'session_id': session_id}


async def get_current_user(request: Request):

    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(401, "Not authenticated")

    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header")

    session_id = authorization.split(" ", 1)[1]

    ip_address = request.client.host
    if not ip_address:
        raise HTTPException(401, "Not valid user, not authenticated!")

    hashed_session_id = hashlib.sha256(session_id.encode()).hexdigest()
    session = await get_session(hashed_session_id)

    # Session existence check
    if not session:
        raise HTTPException(401, "Invalid session!")

    # Session status check
    if session["status"] != "active":
        raise HTTPException(401, "Session is not valid!")

    # Session expired
    if session["expire_time"] < datetime.now(tz):
        await expire_user_session(hashed_session_id)
        raise HTTPException(401, "Session expired")

    if str(ip_address) != str(session["ip_address"]):
        await logout_user_session(hashed_session_id)
        raise HTTPException(403, "IP address is not valid!")

    user = await get_user_id(session["user_id"])

    # User deleted
    if not user:
        await logout_user_session(hashed_session_id)
        raise HTTPException(401, "User does not exist")

    # User blocked/inactive
    if not user["is_active"]:
        await logout_user_session(hashed_session_id)
        raise HTTPException(403, "User account is disabled!")

    return {'user': user,
            'session_id': session["session_id"]}


@app.post("/api/logout")
async def logout_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    session_id = user_session_data['session_id']
    if not user:
        raise HTTPException(401, "Not authenticated!")

    await logout_user_session(session_id)

    user_session = await get_session(session_id)
    unique_job_id = uuid.uuid4().hex[:12]
    await add_action_data(user_id=user['user_id'], session_id=session_id, ip_address=user_session['ip_address'],
                          unique_job_id=unique_job_id, action='Logged out', action_status='success',
                          created_at=datetime.now(tz))

    return {'status': "Logged out successfully!"}



# ----------------------------------------------------------------------------------------------------------------------
# user data
# ----------------------------------------------------------------------------------------------------------------------

@app.put("/api/update_language", tags=["User Language"])
async def update_language_api(language: str, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("update_language | language=%s   username=%s", language, user['username'])
    if not language:
        logger.warning("update_language | Missing language parameter")
        raise HTTPException(status_code=400, detail="Language parameter is required")

    user_language_updated = await edit_user_language(language, user['username'])
    if not user_language_updated:
        logger.warning("update_language | User language edit failed")
        raise HTTPException(status_code=400, detail="Language does not exist")

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = uuid.uuid4().hex[:12]
    await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'], ip_address=user_session['ip_address'],
                          unique_job_id=unique_job_id, action=f'Changed language', action_status='success',
                          created_at=datetime.now(tz))

    return {"Status": 'Success', 'user': {
        'user_id': user['user_id'],
        'username': user['username'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'department': user['department'],
        'language': language,
        'is_active': user['is_active'],
        'is_admin': user['is_admin']
    }}


class UserData(BaseModel):
    username: str
    first_name: str
    last_name: str
    department: str
    language: str
    password: str
    is_active: bool
    is_admin: bool
@app.post("/api/add_user", tags=["Add User"])
async def add_user_api(data: UserData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("add_user | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    user_exists = await get_user(username=data.username)
    if user_exists:
        raise HTTPException(403, "User already exists!")

    if data.language not in ['ru', 'en', 'uz_c', 'uz_l']:
        raise HTTPException(403, "Language does not exist!")

    user_id = secrets.token_hex(64)
    hmac_result = hmac.new(user_id.encode(), data.password.encode(), hashlib.sha256).hexdigest()
    password_hash = pwd_context.hash(hmac_result)

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = uuid.uuid4().hex[:12]

    added_new_user = await add_new_user(user_id, data.username, data.first_name, data.last_name, data.department,
                       data.language, password_hash, data.is_active, data.is_admin, datetime.now(tz))
    if not added_new_user:
        await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                              ip_address=user_session['ip_address'],
                              unique_job_id=unique_job_id, action='Added user', action_status='failed',
                              created_at=datetime.now(tz))
        raise HTTPException(403, "Could not add new user!")


    await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'], ip_address=user_session['ip_address'],
                          unique_job_id=unique_job_id, action='Added user', action_status='success',
                          created_at=datetime.now(tz))

    return {'status': "Success", 'data': 'Added successfully!'}


@app.get("/api/get_all_users", tags=["Get All Users"])
async def get_all_users_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("get_all_users | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    all_users = await get_all_users()
    if not all_users:
        raise HTTPException(403, "No users found!")

    return {'status': "Success", 'admin': user, 'users': all_users}


class UserEditData(BaseModel):
    user_id: str
    username: str
    first_name: str
    last_name: str
    department: str
    language: str
    is_active: bool
    is_admin: bool
@app.put("/api/edit_user_details", tags=["Edit User_details"])
async def edit_user_details_api(data: UserEditData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("edit_user_details | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    user_exists = await get_user_id(data.user_id)
    if not user_exists:
        raise HTTPException(403, "User does not exist!")

    if data.language not in ['ru', 'en', 'uz_c', 'uz_l']:
        raise HTTPException(403, "Language does not exist!")

    edited_user = await edit_user_details(username=data.username,
                                          first_name=data.first_name,
                                          last_name=data.last_name,
                                          department=data.department,
                                          language=data.language,
                                          is_active=data.is_active,
                                          is_admin=data.is_admin,
                                          user_id=data.user_id)

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = uuid.uuid4().hex[:12]

    if not edited_user:
        await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                              ip_address=user_session['ip_address'],
                              unique_job_id=unique_job_id, action='Edited user details', action_status='failed',
                              created_at=datetime.now(tz))
        raise HTTPException(403, "Could not edit user details!")

    await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                          ip_address=user_session['ip_address'],
                          unique_job_id=unique_job_id, action='Edited user details', action_status='success',
                          created_at=datetime.now(tz))

    return {'status': "Success", 'data': edited_user}


class UserEditPasswordData(BaseModel):
    user_id: str
    password: str
@app.put("/api/edit_user_password", tags=["Edit Password"])
async def edit_user_password_api(data: UserEditPasswordData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("edit_user_password | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    user_data = await get_user_id(data.user_id)
    if not user_data:
        raise HTTPException(403, "User does not exist!")

    hmac_result = hmac.new(data.user_id.encode(), data.password.encode(), hashlib.sha256).hexdigest()
    hashed_password = pwd_context.hash(hmac_result)

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = uuid.uuid4().hex[:12]

    edited_user = await edit_user_password(data.user_id, hashed_password)
    if not edited_user:
        await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                              ip_address=user_session['ip_address'],
                              unique_job_id=unique_job_id, action='Edited user password', action_status='failed',
                              created_at=datetime.now(tz))
        raise HTTPException(403, "Could not edit user password!")

    await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                          ip_address=user_session['ip_address'],
                          unique_job_id=unique_job_id, action='Edited user password', action_status='success',
                          created_at=datetime.now(tz))

    return {'status': "Success", 'data': 'Edited successfully!'}


class DeleteUserData(BaseModel):
    user_id: str
    username: str
@app.delete("/api/delete_user", tags=["Delete User"])
async def delete_user_api(data: DeleteUserData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("delete_user | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    user_exists = await get_user_id(data.user_id)
    if not user_exists:
        raise HTTPException(403, "User does not exist!")

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = uuid.uuid4().hex[:12]

    deleted_user = await delete_user(data.user_id)
    if not deleted_user:
        await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                              ip_address=user_session['ip_address'],
                              unique_job_id=unique_job_id, action='Deleted user', action_status='failed',
                              created_at=datetime.now(tz))
        raise HTTPException(403, "Could not delete user details!")

    await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                          ip_address=user_session['ip_address'],
                          unique_job_id=unique_job_id, action='Deleted user', action_status='success',
                          created_at=datetime.now(tz))

    return {'status': "Success", 'data': 'Deleted successfully!'}



# ----------------------------------------------------------------------------------------------------------------------
# user sessions
# ----------------------------------------------------------------------------------------------------------------------

@app.get("/api/get_all_users_sessions", tags=["Get All Users Sessions"])
async def get_all_users_sessions_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("get_all_users_sessions | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    all_sessions_data = await get_all_sessions_data()
    if not all_sessions_data:
        return {'status': "Failed", 'admin': user, 'data': all_sessions_data}

    return {'status': "Success", 'admin': user, 'data': all_sessions_data}


class EditSessionStatusData(BaseModel):
    session_id: str
    status: str
    expire_time: datetime
@app.put('/api/edit_session_details', tags=["Edit Session Details"])
async def edit_session_status_api(data: EditSessionStatusData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("edit_session_status | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    session_existence = await get_session(data.session_id)
    if not session_existence:
        raise HTTPException(403, "Session does not exist!")

    edited_session_status = await edit_session_status(data.session_id, data.status, data.expire_time)
    if not edited_session_status:
        raise HTTPException(403, "Could not edit session status!")

    return {'status': "Success", 'data': 'Edited successfully!'}


class DeleteSessionData(BaseModel):
    session_id: str
@app.delete('/api/delete_session', tags=["Delete Session"])
async def delete_session_api(data: DeleteSessionData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("delete_session | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    session_existence = await get_session(data.session_id)
    if not session_existence:
        raise HTTPException(403, "Session does not exist!")

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = uuid.uuid4().hex[:12]

    deleted_session = await delete_session(data.session_id)
    if not deleted_session:
        await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                              ip_address=user_session['ip_address'],
                              unique_job_id=unique_job_id, action='Deleted session', action_status='failed',
                              created_at=datetime.now(tz))
        raise HTTPException(403, "Could not delete session!")

    await add_action_data(user_id=user['user_id'], session_id=user_session_data['session_id'],
                          ip_address=user_session['ip_address'],
                          unique_job_id=unique_job_id, action='Deleted session', action_status='success',
                          created_at=datetime.now(tz))

    return {'status': "Success", 'data': 'Deleted successfully!'}



# ----------------------------------------------------------------------------------------------------------------------
# user actions
# ----------------------------------------------------------------------------------------------------------------------

@app.get('/api/get_all_user_actions', tags=["Get All Actions"])
async def get_all_user_actions_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("get_all_actions | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    user_actions = await get_all_actions_data()
    if not user_actions:
        return {'status': "Failed", 'admin': user, 'data': user_actions}

    return {'status': "Success", 'admin': user, 'data': user_actions}


class DeleteActionsData(BaseModel):
    unique_job_id: str
@app.delete('/api/delete_user_action', tags=["Delete User Action"])
async def delete_user_action_api(data: DeleteActionsData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("delete_user_action | username=%s", user['username'])
    if not user:
        raise HTTPException(401, "Not authenticated!")

    if not user['is_admin']:
        raise HTTPException(403, "User does not have admin rights!")

    action_existence = await get_single_action_data(data.unique_job_id)
    if not action_existence:
        raise HTTPException(403, "Action does not exist!")

    deleted_action = await delete_single_action(data.unique_job_id)
    if not deleted_action:
        raise HTTPException(403, "Could not delete action!")

    return {'status': "Success", 'data': 'Deleted successfully!'}




# ----------------------------------------------------------------------------------------------------------------------
# uzonia_data_calculations
# ----------------------------------------------------------------------------------------------------------------------

@app.post("/api/add_new_uzonia_calculation", tags=["Add new uzonia"])
async def add_new_uzonia_calculation_api(repo_n_file: UploadFile, repo_m_file: UploadFile, deposit_file: UploadFile,
                                         cb_date: str = Form(...), cb_rate: float = Form(...),
                                         cb_deposit: str = Form(...),
                                         user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.error("add_new_uzonia_calculation Not Authenticated!")
        raise HTTPException(401, "Not authenticated!")

    user_session = await get_session(session_id=user_session_data['session_id'])

    try:
        if not repo_n_file or not repo_m_file or not deposit_file or not cb_date or not cb_rate or not cb_deposit:
            raise HTTPException(status_code=404, detail="❌ Not enough data!")

        try:
            cb_date = date.fromisoformat(cb_date)
            cb_rate = float(cb_rate)
            cb_deposit = float(cb_deposit.replace(" ", ""))
        except Exception as e:
            raise HTTPException(status_code=404, detail="Wrong CB Input data!")

        try:
            repo_n_file_content = await repo_n_file.read()
            repo_n_file_data = pd.read_excel(io.BytesIO(repo_n_file_content))  # wrap bytes in BytesIO
            columns = ["Номер заявки", "Время подачи", "Время исполнения второй части", "Направление",
                       "Инвестор", "Часть РЕПО", "Блокировка", "Срок РЕПО (днях)", "Ставка РЕПО (в % годовых)",
                       "Количество (в шт.)", "Сумма РЕПО (в сумах)", "Сумма обр. выкупа (в сумах)"]
            repo_n_file_data.columns = repo_n_file_data.columns.str.strip()
            missing_columns = [expected_column for expected_column in columns if
                               expected_column not in repo_n_file_data.columns]
            if missing_columns:
                raise HTTPException(status_code=400, detail=f"Missing columns: {missing_columns}")
        except Exception as e:
            raise HTTPException(status_code=404, detail="❌ Error with the repo N file!")

        try:
            repo_m_file_content = await repo_m_file.read()
            repo_m_file_data = pd.read_excel(io.BytesIO(repo_m_file_content))  # wrap bytes in BytesIO
            columns = ["Номер заявки", "Время подачи", "Время исполнения второй части", "Направление",
                       "Дилер/Инвестор", "Код расчётов (дней)", "Срок РЕПО (днях)", "Ставка РЕПО (в % годовых)",
                       "Количество (в шт.)", "Сумма РЕПО (в сумах)", "Сумма обр. выкупа (в сумах)"]
            repo_m_file_data.columns = repo_m_file_data.columns.str.strip()
            missing_columns = [expected_column for expected_column in columns if
                               expected_column not in repo_m_file_data.columns]
            if missing_columns:
                raise HTTPException(status_code=400, detail=f"Missing columns: {missing_columns}")
        except Exception as e:
            raise HTTPException(status_code=404, detail="❌ Error with the repo M file!")

        try:
            deposit_file_content = await deposit_file.read()
            deposit_file_data = pd.read_excel(io.BytesIO(deposit_file_content))  # wrap bytes in BytesIO
            columns = ["Код сделки", "ОперДата", "Банк(Размещение)", "Банк(Привлечение)",
                       "Валюта", "Сумма", "Процентная ставка", "Дата возврата", "Срок возврата (в днях)"]
            deposit_file_data.columns = deposit_file_data.columns.str.strip()
            missing_columns = [expected_column for expected_column in columns if
                               expected_column not in deposit_file_data.columns]
            if missing_columns:
                raise HTTPException(status_code=400, detail=f"Missing columns: {missing_columns}")
        except Exception as e:
            raise HTTPException(status_code=404, detail="❌ Error with the Deposit file!")

        check_existence = await get_single_uzonia_data(uzonia_date=cb_date)
        if check_existence:
            raise HTTPException(status_code=422, detail="Such data already exists!")

        holidays_data = await get_all_holiday_data()
        if holidays_data:
            holidays_list = []
            for holiday in holidays_data:
                holidays_list.append(holiday['holiday_date'])
        else:
            holidays_list = []

        if cb_date.weekday() >= 5:
            day_type='Day-off'
        else:
            day_type='Working day'

        if cb_date in holidays_list:
            day_type='Day-off'

        file_id = uuid4().hex[:12]
        unique_job_id = str(uuid4().hex)

        bank_names = await get_all_bank_names()

        # ------------------------------------------------------------------------------------------------------------------
        # Processing the first Repo N file
        # ------------------------------------------------------------------------------------------------------------------

        repo_n_file_data['Номер заявки'] = repo_n_file_data['Номер заявки'].astype(str).str.strip()
        repo_n_file_data['Время подачи'] = pd.to_datetime(repo_n_file_data['Время подачи'], format='%d/%m/%Y %H:%M:%S').dt.date
        repo_n_file_data['Время исполнения второй части'] = pd.to_datetime(repo_n_file_data['Время исполнения второй части'], format='%d/%m/%Y %H:%M:%S').dt.date
        repo_n_file_data['Направление'] = repo_n_file_data['Направление'].astype(str).str.strip()
        repo_n_file_data['Инвестор'] = repo_n_file_data['Инвестор'].astype(str).str.strip()
        repo_n_file_data['Срок РЕПО (днях)'] = repo_n_file_data['Срок РЕПО (днях)'].astype(str).str.strip()
        repo_n_file_data['Ставка РЕПО (в % годовых)'] = repo_n_file_data['Ставка РЕПО (в % годовых)'].astype(float)
        repo_n_file_data['Сумма РЕПО (в сумах)'] = repo_n_file_data['Сумма РЕПО (в сумах)'].astype(str).str.replace(',', '', regex=False).astype(float)
        repo_n_file_data['Сумма обр. выкупа (в сумах)'] = repo_n_file_data['Сумма обр. выкупа (в сумах)'].astype(str).str.replace(',', '', regex=False).astype(float)

        removed_application_numbers = []
        for idx, row in repo_n_file_data.iterrows():
            if row['Инвестор'] not in bank_names:
                application_number = row['Номер заявки']
                removed_application_numbers.append(application_number)
        repo_n_file_data = repo_n_file_data[~repo_n_file_data['Номер заявки'].isin(removed_application_numbers)].reset_index(drop=True)

        outdated_rows = []
        for index, row in repo_n_file_data.iterrows():
            date_in = row['Время подачи']
            date_out = row['Время исполнения второй части']
            diff_days = (date_out - date_in).days

            if diff_days > 1:
                between_date = date_in + timedelta(days=1)
                while between_date < date_out:
                    if between_date.weekday() < 5:
                        if between_date in holidays_list:
                            between_date = between_date + timedelta(days=1)
                        else:
                            outdated_rows.append(index)
                            break
                    else:
                        between_date = between_date + timedelta(days=1)
            elif diff_days == 1:
                continue
            else:
                outdated_rows.append(index)

        repo_n_file_data = repo_n_file_data.drop(index=outdated_rows).reset_index(drop=True)


        # ------------------------------------------------------------------------------------------------------------------
        # Processing the first Repo M file
        # ------------------------------------------------------------------------------------------------------------------
        repo_m_file_data['Номер заявки'] = repo_m_file_data['Номер заявки'].astype(str).str.strip()
        repo_m_file_data['Время подачи'] = pd.to_datetime(repo_m_file_data['Время подачи'], format='%d/%m/%Y %H:%M:%S').dt.date
        repo_m_file_data['Время исполнения второй части'] = pd.to_datetime(repo_m_file_data['Время исполнения второй части'], format='%d/%m/%Y %H:%M:%S').dt.date
        repo_m_file_data['Направление'] = repo_m_file_data['Направление'].astype(str).str.strip()
        repo_m_file_data['Дилер/Инвестор'] = repo_m_file_data['Дилер/Инвестор'].astype(str).str.strip()
        repo_m_file_data['Срок РЕПО (днях)'] = repo_m_file_data['Срок РЕПО (днях)'].astype(str).str.strip()
        repo_m_file_data['Ставка РЕПО (в % годовых)'] = repo_m_file_data['Ставка РЕПО (в % годовых)'].astype(float)
        repo_m_file_data['Сумма РЕПО (в сумах)'] = repo_m_file_data['Сумма РЕПО (в сумах)'].astype(str).str.replace(',', '', regex=False).astype(float)
        repo_m_file_data['Сумма обр. выкупа (в сумах)'] = repo_m_file_data['Сумма обр. выкупа (в сумах)'].astype(str).str.replace(',', '', regex=False).astype(float)

        removed_application_numbers = []
        for idx, row in repo_m_file_data.iterrows():
            if row['Дилер/Инвестор'] not in bank_names:
                application_number = row['Номер заявки']
                removed_application_numbers.append(application_number)
        repo_m_file_data = repo_m_file_data[~repo_m_file_data['Номер заявки'].isin(removed_application_numbers)].reset_index(drop=True)

        outdated_rows = []
        for index, row in repo_m_file_data.iterrows():
            date_in = row['Время подачи']
            date_out = row['Время исполнения второй части']
            diff_days = (date_out - date_in).days

            if diff_days > 1:
                between_date = date_in + timedelta(days=1)
                while between_date < date_out:
                    if between_date.weekday() < 5:
                        if between_date in holidays_list:
                            between_date = between_date + timedelta(days=1)
                        else:
                            outdated_rows.append(index)
                            break
                    else:
                        between_date = between_date + timedelta(days=1)
            elif diff_days == 1:
                continue
            else:
                outdated_rows.append(index)

        repo_m_file_data = repo_m_file_data.drop(index=outdated_rows).reset_index(drop=True)


        # --------------------------------------------------------------------------------------------------------------
        # Processing the Deposit file
        # --------------------------------------------------------------------------------------------------------------
        deposit_file_data['Код сделки'] = deposit_file_data['Код сделки'].astype(str).str.strip()
        deposit_file_data['ОперДата'] = pd.to_datetime(deposit_file_data['ОперДата'], format='%d.%m.%Y').dt.date
        deposit_file_data['Банк(Размещение)'] = deposit_file_data['Банк(Размещение)'].astype(str).str.strip()
        deposit_file_data['Банк(Привлечение)'] = deposit_file_data['Банк(Привлечение)'].astype(str).str.strip()
        deposit_file_data['Сумма'] = deposit_file_data['Сумма'].astype(str).str.strip().str.replace(',', '', regex=False).astype(float)
        deposit_file_data['Дата возврата'] = pd.to_datetime(deposit_file_data['Дата возврата'], format='%d.%m.%Y').dt.date
        deposit_file_data['Процентная ставка'] = deposit_file_data['Процентная ставка'].astype(float)
        deposit_file_data['Срок возврата (в днях)'] = deposit_file_data['Срок возврата (в днях)'].astype(str).str.strip()

        outdated_rows = []
        for index, row in deposit_file_data.iterrows():
            date_in = row['ОперДата']
            date_out = row['Дата возврата']
            diff_days = (date_out - date_in).days

            if diff_days > 1:
                between_date = date_in + timedelta(days=1)
                while between_date < date_out:
                    if between_date.weekday() < 5:
                        if between_date in holidays_list:
                            between_date = between_date + timedelta(days=1)
                        else:
                            outdated_rows.append(index)
                            break
                    else:
                        between_date = between_date + timedelta(days=1)
            elif diff_days == 1:
                continue
            else:
                outdated_rows.append(index)

        deposit_file_data = deposit_file_data.drop(index=outdated_rows).reset_index(drop=True)
        depo_unique = deposit_file_data.drop_duplicates(subset=['Код сделки'])


        # --------------------------------------------------------------------------------------------------------------
        # Calculating Repo N and M
        # --------------------------------------------------------------------------------------------------------------
        repos_data_list = []

        repo_n_unique = repo_n_file_data.drop_duplicates(subset=['Номер заявки'])
        repos_data_list.extend(repo_n_unique[['Номер заявки', 'Ставка РЕПО (в % годовых)', 'Сумма РЕПО (в сумах)']].values.tolist())

        repo_m_unique = repo_m_file_data.drop_duplicates(subset=['Номер заявки'])
        repos_data_list.extend(repo_m_unique[['Номер заявки', 'Ставка РЕПО (в % годовых)', 'Сумма РЕПО (в сумах)']].values.tolist())

        # Sorting by rate (ascending)
        repos_data_list.sort(key=lambda x: (x[1], x[2]))
        total_value = 0
        for row_data in repos_data_list:
            total_value = total_value + row_data[2]


        for idx, row in repo_n_unique.iterrows():
            dealer_from = next(
                (
                    row_n['Инвестор']
                    for index, row_n in repo_n_file_data.iterrows()
                    if row_n['Номер заявки'] == row['Номер заявки'] and row_n['Направление'] == 'Продажа'
                ),
                None
            )

            dealer_to = next(
                (
                    row_n['Инвестор']
                    for index, row_n in repo_n_file_data.iterrows()
                    if row_n['Номер заявки'] == row['Номер заявки'] and row_n['Направление'] == 'Покупка'
                ),
                None
            )

            days = int(row['Срок РЕПО (днях)'].replace(' день', ''))
            await add_new_repo_data(file_id=file_id,
                                    number_of_application=row['Номер заявки'],
                                    date_in=row['Время подачи'],
                                    date_out=row['Время исполнения второй части'],
                                    dealer_from=dealer_from,
                                    dealer_to=dealer_to,
                                    rate=row['Ставка РЕПО (в % годовых)'],
                                    days=days,
                                    money_in=row['Сумма РЕПО (в сумах)'],
                                    money_out=row['Сумма РЕПО (в сумах)'],
                                    created_at=datetime.now(tz))

        for idx, row in repo_m_unique.iterrows():
            dealer_from = next(
                (
                    row_m['Дилер/Инвестор']
                    for index, row_m in repo_m_file_data.iterrows()
                    if row_m['Номер заявки'] == row['Номер заявки'] and row_m['Направление'] == 'Продажа'
                ),
                None
            )

            dealer_to = next(
                (
                    row_m['Дилер/Инвестор']
                    for index, row_m in repo_m_file_data.iterrows()
                    if row_m['Номер заявки'] == row['Номер заявки'] and row_m['Направление'] == 'Покупка'
                ),
                None
            )

            days = int(row['Срок РЕПО (днях)'].replace(' день', ''))
            await add_new_repo_data(file_id=file_id,
                                    number_of_application=row['Номер заявки'],
                                    date_in=row['Время подачи'],
                                    date_out=row['Время исполнения второй части'],
                                    dealer_from=dealer_from,
                                    dealer_to=dealer_to,
                                    rate=row['Ставка РЕПО (в % годовых)'],
                                    days=days,
                                    money_in=row['Сумма РЕПО (в сумах)'],
                                    money_out=row['Сумма РЕПО (в сумах)'],
                                    created_at=datetime.now(tz))

        for idx, row in depo_unique.iterrows():
            await add_new_depo_data(file_id=file_id,
                                    number_of_application=row['Код сделки'],
                                    date_in=row['ОперДата'],
                                    date_out=row['Дата возврата'],
                                    dealer_from=row['Банк(Размещение)'],
                                    dealer_to=row['Банк(Привлечение)'],
                                    rate=row['Процентная ставка'],
                                    days=int(row['Срок возврата (в днях)']),
                                    money=row['Сумма'],
                                    created_at=datetime.now(tz))


        # ------------------------------------------------------------------------------------------------------------------
        # Calculating first way
        # ------------------------------------------------------------------------------------------------------------------
        uzonia_calculation_way = 0
        if total_value >= 500000000000 and len(repos_data_list) >= 5:
            ten_percent_value = total_value * 0.10
            print('ten_percent_value:', ten_percent_value, '1 way')
            day_uzonia = calculate_day_uzonia(ten_percent_value, repos_data_list)
            uzonia_calculation_way = 1

        else:
            depo_unique = deposit_file_data.drop_duplicates(subset=['Код сделки'])
            repos_data_list.extend(depo_unique[['Код сделки', 'Процентная ставка', 'Сумма']].values.tolist())

            # Sorting by rate (ascending)
            repos_data_list.sort(key=lambda x: (x[1], x[2]))
            total_value = 0
            for row_data in repos_data_list:
                total_value = total_value + row_data[2]


            # --------------------------------------------------------------------------------------------------------------
            # Calculating second way
            # --------------------------------------------------------------------------------------------------------------
            if total_value >= 500000000000:
                logger.info("add_new_uzonia_calculation | Using calculation way 2 (total_value=%s)", total_value)
                ten_percent_value = total_value * 0.10
                print('ten_percent_value:', ten_percent_value, '2 way')
                day_uzonia = calculate_day_uzonia(ten_percent_value, repos_data_list)
                uzonia_calculation_way = 2
            else:
                # ----------------------------------------------------------------------------------------------------------
                # Calculating third way
                # ----------------------------------------------------------------------------------------------------------
                logger.info("add_new_uzonia_calculation | Using calculation way 3 (total_value=%s, cb_deposit=%s)",
                            total_value, cb_deposit)
                cb_deposit_10_percent = cb_deposit * 0.10
                random_application_number = random.randint(100000, 999999)
                last_five_uzonia = await get_last_five_uzonia()
                cb_rate = calculate_cb_rate(cb_rate=cb_rate, last_five_uzonia=last_five_uzonia)
                repos_data_list.append([random_application_number, cb_rate, cb_deposit_10_percent])

                # Sorting by rate (ascending)
                repos_data_list.sort(key=lambda x: (x[1], x[2]))
                total_value += cb_deposit_10_percent

                ten_percent_value = total_value * 0.10
                print('ten_percent_value:', ten_percent_value, '3 way')
                day_uzonia = calculate_day_uzonia(ten_percent_value, repos_data_list)
                uzonia_calculation_way = 3


        final_uzonia_data_dict = {'day_uzonia': day_uzonia, 'uzonia_calculation_way': uzonia_calculation_way}


        # --------------------------------------------------------------------------------------------------------------
        # Calculating N days values
        # --------------------------------------------------------------------------------------------------------------
        latest_uzonia_data = await get_latest_uzonia_data(cb_date=cb_date)
        print(f'latest_uzonia_data: {latest_uzonia_data}')
        latest_date = latest_uzonia_data['uzonia_date']
        latest_index = float(latest_uzonia_data['index'])
        n_day_number = (cb_date - latest_date).days
        print('n_day_number:', n_day_number)

        uzonia_index = latest_index * (1 + ((day_uzonia / 100 ) * (n_day_number / 365)))
        print('uzonia_index:', uzonia_index)
        final_uzonia_data_dict['index'] = uzonia_index
        final_uzonia_data_dict['uzonia_date'] = cb_date

        days_n_periods = {7:6, 30:29, 90:89, 180:179}
        for period_key, latest_n_value in days_n_periods.items():
            nth_index_value = await get_nth_uzonia_data(nth_value=latest_n_value)
            print(f'nth_index_value: {nth_index_value}', type(nth_index_value))
            print(f'uzonia_index: {uzonia_index}', type(uzonia_index))
            nth_day_final_value = ((uzonia_index / nth_index_value) - 1) * 365 / period_key * 100
            final_uzonia_data_dict[f'day_{period_key}_uzonia'] = nth_day_final_value


        # --------------------------------------------------------------------------------------------------------------
        # Adding Uzonia to the DB
        # --------------------------------------------------------------------------------------------------------------
        added_new_uzonia = await add_new_uzonia_data(unique_job_id=unique_job_id,
                                  file_id=file_id,
                                  rate=cb_rate,
                                  day_type=day_type,
                                  uzonia=final_uzonia_data_dict['day_uzonia'],
                                  day_7_uzonia=final_uzonia_data_dict['day_7_uzonia'],
                                  day_30_uzonia=final_uzonia_data_dict['day_30_uzonia'],
                                  day_90_uzonia=final_uzonia_data_dict['day_90_uzonia'],
                                  day_180_uzonia=final_uzonia_data_dict['day_180_uzonia'],
                                  index=final_uzonia_data_dict['index'],
                                  uzonia_date=final_uzonia_data_dict['uzonia_date'],
                                  days=n_day_number)
        if not added_new_uzonia:
            # Adding Action details
            await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                                  session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                                  action='Uzonia Calculation', action_status="failed", created_at=datetime.now(tz))

            logger.warning("add_new_uzonia_calculation | Duplicate: uzoni_date=%s already exists", str(final_uzonia_data_dict['uzonia_date']))
            raise HTTPException(status_code=404, detail="Such data already exists!")

        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Uzonia Calculation', action_status="success", created_at=datetime.now(tz))

        return {
            'file_id': file_id,
            'calculation_way': final_uzonia_data_dict['uzonia_calculation_way'],
            'uzonia_date': final_uzonia_data_dict['uzonia_date'],
            'uzonia': final_uzonia_data_dict['day_uzonia'],
            'day_7_uzonia': final_uzonia_data_dict['day_7_uzonia'],
            'day_30_uzonia': final_uzonia_data_dict['day_30_uzonia'],
            'day_90_uzonia': final_uzonia_data_dict['day_90_uzonia'],
            'day_180_uzonia': final_uzonia_data_dict['day_180_uzonia'],
            'index': final_uzonia_data_dict['index'],
        }
    except Exception as e:
        logger.info("add_new_uzonia_calculation | error=%s", e)
        raise HTTPException(status_code=404, detail="Could not calculate uzonia!")


@app.get("/api/get_calculation_page", tags=["Calculation page"])
async def get_calculation_page_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    logger.info("get_main_page | username=%s", user['username'])

    return {"Status": 'Success', 'user': {
        'user_id': user['user_id'],
        'username': user['username'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'department': user['department'],
        'language': user['language'],
        'is_active': user['is_active'],
        'is_admin': user['is_admin']
    }}



# ---------------------------------------------------------------------------
# holiday_data
# ---------------------------------------------------------------------------

@app.get("/api/get_single_holiday", tags=["Holiday Date"])
async def get_single_holiday_api(holiday_date: date, user_session_data = Depends(get_current_user)):
    logger.info("get_single_holiday | holiday_date=%s", holiday_date)
    if not holiday_date:
        logger.warning("get_single_holiday | Missing holiday_date parameter")
        raise HTTPException(status_code=400, detail="holiday_date parameter is required")

    single_holiday_data = await get_single_holiday_data(holiday_date=holiday_date)
    if not single_holiday_data:
        logger.warning("get_single_holiday | Not found: holiday_date=%s", holiday_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_single_holiday | Found: holiday_date=%s", holiday_date)
    return {"Status": 'Success', 'Data': single_holiday_data}


@app.get("/api/get_all_holidays", tags=["All Holidays"])
async def get_all_holidays_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("get_all_holidays | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    logger.info("get_all_holidays | Fetching all holidays")
    all_holidays_data = await get_all_holiday_data()

    if not all_holidays_data:
        logger.warning("get_all_holidays | No holidays found in DB")
        return {"Status": 'Failed', 'user': user, 'Data': all_holidays_data}

    logger.info("get_all_holidays | Returned %d records", len(all_holidays_data))
    return {"Status": 'Success', 'user': user, 'Data': all_holidays_data}


@app.post("/api/add_new_holiday", tags=["Add New Code"])
async def add_new_holiday_api(new_holiday: date, new_description: str, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("add_new_holiday | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(session_id=user_session_data['session_id'])

    try:
        logger.info("add_new_holiday | new_holiday=%s  new_description=%s old_holiday=%s", new_holiday, new_description)
        if not new_holiday or not new_description:
            logger.warning("add_new_holiday | Missing parameters")
            raise HTTPException(status_code=400, detail="new_holiday and new_description parameters are required!")

        checking_data_existence = await get_single_holiday_data(holiday_date=new_holiday)
        if checking_data_existence:
            logger.warning("add_new_holiday | Duplicate: new_holiday=%s already exists", new_holiday)
            raise HTTPException(status_code=404, detail="Such data already exists!")


        updated_row = await add_holiday_data(unique_job_id=unique_job_id, holiday_date=new_holiday, description=new_description)
        if not updated_row:
            logger.error("add_new_holiday | DB insert failed for new_holiday=%s", new_holiday)
            raise HTTPException(status_code=404, detail="Could not add the new code to database!")

        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Added New Holiday', action_status="success", created_at=datetime.now(tz))
        logger.info("add_new_holiday | Successfully added new_holiday=%s", new_holiday)
        return {"Status": 'Success', 'Data': 'Added successfully!'}
    except Exception as e:
        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Added New Holiday', action_status="failed", created_at=datetime.now(tz))
        logger.error("add_new_holiday | Failed to add new_holiday=%s", e)
        raise HTTPException(status_code=404, detail="Could not add the new holiday!")


@app.put('/api/edit_holiday', tags=["Edit Code Status"])
async def edit_holiday_api(description: str, old_holiday_date: date, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("edit_holiday | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(session_id=user_session_data['session_id'])

    logger.info("edit_holiday | holiday_date=%s  description=%s", old_holiday_date, description)
    if not old_holiday_date:
        logger.warning("edit_holiday | Missing holiday_date")
        raise HTTPException(status_code=400, detail="Holiday date is required")

    checking_data_existence = await get_single_holiday_data(holiday_date=old_holiday_date)
    if not checking_data_existence:
        logger.warning("edit_holiday | Not found: holiday_date=%s", old_holiday_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    try:
        now = datetime.now(tz)
        updated_row = await edit_holiday_data(unique_job_id=unique_job_id, description=description, updated_at=now, holiday_date=old_holiday_date)
        if not updated_row:
            logger.error("edit_holiday | DB update failed for old_holiday_date=%s", old_holiday_date)
            raise HTTPException(status_code=404, detail="Could not update the holiday!")

        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Updated Holiday', action_status="success", created_at=datetime.now(tz))

        logger.info("edit_holiday | Holiday updated for old_holiday_date=%s → %s", old_holiday_date, description)
        return {"Status": 'Success', 'Data': 'Status updated successfully!'}
    except Exception as e:
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Updated Holiday', action_status="failed", created_at=datetime.now(tz))
        logger.error("edit_holiday | Failed to update holiday=%s", e)
        raise HTTPException(status_code=404, detail="Could not update the holiday!")


@app.delete('/api/delete_holiday', tags=["Delete Holiday"])
async def delete_holiday_api(holiday_date: date, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("delete_holiday | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(session_id=user_session_data['session_id'])

    try:
        logger.info("delete_holiday | holiday_date=%s", holiday_date)
        if not holiday_date:
            logger.warning("delete_holiday | Missing holiday_date")
            raise HTTPException(status_code=400, detail="Holiday is required")

        checking_data_existence = await get_single_holiday_data(holiday_date=holiday_date)
        if not checking_data_existence:
            logger.warning("delete_holiday | Not found: holiday_date=%s", holiday_date)
            raise HTTPException(status_code=404, detail="Such data does not exist!")

        deleted_row = await delete_holiday_data(holiday_date=holiday_date)
        if not deleted_row:
            logger.error("delete_holiday | DB delete failed for holiday_date=%s", holiday_date)
            raise HTTPException(status_code=404, detail="Such data does not exist!")

        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Deleted Holiday', action_status="success", created_at=datetime.now(tz))
        logger.info("delete_holiday | Deleted holiday_date=%s", holiday_date)
        return {"Status": 'Success', 'Data': 'Deleted successfully!'}
    except Exception as e:
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Deleted Holiday', action_status="failed", created_at=datetime.now(tz))
        logger.error("delete_holiday | Failed to delete holiday=%s, error=%s", holiday_date, e)
        raise HTTPException(status_code=404, detail="Could not delete the holiday!")



# ---------------------------------------------------------------------------
# holiday_data
# ---------------------------------------------------------------------------

class BankData(BaseModel):
    unique_bank_id: int
    bank_name: str
@app.get("/api/get_single_bank_data", tags=["Bank Data"])
async def get_single_bank_data_api(data: BankData, user_session_data = Depends(get_current_user)):
    logger.info("get_single_bank_data | bank_data=%s", data.bank_name)
    if not data.unique_bank_id or not data.bank_name:
        logger.warning("get_single_bank_data | Missing bank_name parameter")
        raise HTTPException(status_code=400, detail="bank_name parameter is required")

    bank_data = await get_single_bank_data_name(bank_name=data.bank_name)
    if not bank_data:
        logger.warning("get_single_bank_data | Not found: bank_name=%s", data.bank_name)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_single_bank_data | Found: bank_name=%s", data.bank_name)
    return {"Status": 'Success', 'Data': bank_data}


@app.get("/api/get_all_bank_data", tags=["All Banks"])
async def get_all_bank_data_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("get_all_bank_data | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    logger.info("get_all_bank_data | Fetching all banks")
    all_bank_data = await get_all_bank_data()

    if not all_bank_data:
        logger.warning("get_all_bank_data | No banks found in DB")
        return {"Status": 'Failed', 'user': user, 'Data': all_bank_data}

    logger.info("get_all_bank_data | Returned %d records", len(all_bank_data))
    return {"Status": 'Success', 'user': user, 'Data': all_bank_data}


class AddBankData(BaseModel):
    bank_name: str
@app.post("/api/add_new_bank_data", tags=["Add New Bank Data"])
async def add_new_bank_data_api(data: AddBankData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("add_new_bank_data | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(session_id=user_session_data['session_id'])

    try:
        logger.info("add_new_bank_data | bank_name=%s", data.bank_name)
        if not data.bank_name:
            logger.warning("add_new_bank_data | Missing parameters")
            raise HTTPException(status_code=400, detail="bank_name parameter is required!")

        checking_data_existence = await get_single_bank_data_name(bank_name=data.bank_name)
        if checking_data_existence:
            logger.warning("add_new_bank_data | Duplicate: bank_name=%s already exists", data.bank_name)
            raise HTTPException(status_code=404, detail="Such data already exists!")

        unique_bank_id = random.randint(100000, 999999)
        bank_ids = await get_all_bank_ids()
        if not bank_ids:
            logger.warning("add_new_bank_data | Not found: Bank ids")

        if unique_bank_id in bank_ids:
            unique_bank_id = random.randint(100000, 999999)

        updated_row = await add_bank_data(unique_job_id=unique_job_id, unique_bank_id=unique_bank_id, bank_name=data.bank_name, created_at=datetime.now(tz))
        if not updated_row:
            logger.error("add_new_bank_data | DB insert failed for bank_name=%s", data.bank_name)
            raise HTTPException(status_code=404, detail="Could not add the new bank id to database!")

        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Added New Bank Name', action_status="success", created_at=datetime.now(tz))
        logger.info("add_new_bank_data | Successfully added bank_name=%s", data.bank_name)
        return {"Status": 'Success', 'Data': 'Added successfully!'}
    except Exception as e:
        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Added New Bank Name', action_status="failed", created_at=datetime.now(tz))
        logger.error("add_new_bank_data | Failed to add bank_name=%s", e)
        raise HTTPException(status_code=500, detail='Could not add the new bank!')


class EditBankName(BaseModel):
    unique_bank_id: int
    bank_name: str
@app.put('/api/edit_bank_data', tags=["Edit Bank Name"])
async def edit_bank_data_api(data: EditBankName, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("edit_bank_data | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(session_id=user_session_data['session_id'])

    logger.info("edit_bank_data | bank_name=%s", data.bank_name)
    if not data.bank_name or not data.unique_bank_id:
        logger.warning("edit_bank_data | Missing Bank data")
        raise HTTPException(status_code=400, detail="Bank data is required")

    checking_data_existence = await get_single_bank_data_name(bank_name=data.bank_name)
    if not checking_data_existence:
        logger.warning("edit_bank_data | Not found: bank_name=%s", data.bank_name)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    try:
        now = datetime.now(tz)
        updated_row = await edit_bank_data(unique_job_id=unique_job_id, unique_bank_id=data.unique_bank_id, bank_name=data.bank_name, updated_at=now)
        if not updated_row:
            logger.error("edit_bank_data | DB update failed for bank_name=%s", data.bank_name)
            raise HTTPException(status_code=404, detail="Could not update the holiday!")

        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Updated Bank Name', action_status="success", created_at=datetime.now(tz))

        logger.info("edit_bank_data | Bank data updated for bank_name=%s", data.bank_name)
        return {"Status": 'Success', 'Data': 'Status updated successfully!'}
    except Exception as e:
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Updated Bank Name', action_status="failed", created_at=datetime.now(tz))

        logger.error("edit_bank_data | Failed to update bank_name=%s", e)
        raise HTTPException(status_code=404, detail="Could not update the bank_name!")


class DeleteBankData(BaseModel):
    unique_bank_id: int
    bank_name: str
@app.delete('/api/delete_bank_data', tags=["Delete Bank Data"])
async def delete_bank_data_api(data: DeleteBankData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("delete_bank_data | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(session_id=user_session_data['session_id'])

    try:
        logger.info("delete_bank_data | bank_name=%s", data.bank_name)
        if not data.unique_bank_id or not data.bank_name:
            logger.warning("delete_bank_data | Missing bank data!")
            raise HTTPException(status_code=400, detail="Bank Data is required")

        checking_data_existence = await get_single_bank_data_name(bank_name=data.bank_name)
        if not checking_data_existence:
            logger.warning("delete_bank_data | Not found: bank_data=%s", data.bank_name)
            raise HTTPException(status_code=404, detail="Such data does not exist!")

        deleted_row = await delete_bank_data(unique_bank_id=data.unique_bank_id)
        if not deleted_row:
            logger.error("delete_bank_data | DB delete failed for bank_name=%s", data.bank_name)
            raise HTTPException(status_code=404, detail="Such data does not exist!")

        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Deleted Bank Data', action_status="success", created_at=datetime.now(tz))

        logger.info("delete_bank_data | Deleted bank_name=%s", data.bank_name)
        return {"Status": 'Success', 'Data': 'Deleted successfully!'}
    except Exception as e:
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Deleted Bank Data', action_status="failed", created_at=datetime.now(tz))
        logger.error("delete_bank_data | Failed to delete bank_name=%s, error=%s", data.bank_name, e)
        raise HTTPException(status_code=404, detail="Could not delete the bank name!")



# ---------------------------------------------------------------------------
# uzonia_data
# ---------------------------------------------------------------------------

@app.get("/api/get_single_uzonia", tags=["Get Single Uzonia"])
async def get_single_uzonia_api(uzonia_date: date, user_session_data = Depends(get_current_user)):
    logger.info("get_single_uzonia | uzonia_date=%s", uzonia_date)
    if not uzonia_date:
        logger.warning("get_single_uzonia | Missing uzonia_date parameter")
        raise HTTPException(status_code=400, detail="uzonia_date parameter is required")

    single_uzonia_data = await get_single_uzonia_data(uzonia_date=uzonia_date)
    if not single_uzonia_data:
        logger.warning("get_single_uzonia | Not found: uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_single_uzonia | Found: uzonia_date=%s", uzonia_date)
    return {"Status": 'Success', 'Data': single_uzonia_data}


@app.get("/api/get_all_uzonia_data", tags=["Get All Uzonia"])
async def get_all_uzonia_data_api(user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("get_all_uzonia_data | Missing user")
        raise HTTPException(status_code=401, detail="Not Authorized!")

    logger.info("get_all_uzonia_data | Fetching all uzonia data")
    all_uzonia_data = await get_all_uzonia_data()

    if not all_uzonia_data:
        logger.warning("get_all_uzonia_data | No uzonia data found in DB")
        return {"Status": 'Success', 'user': user, 'Data': all_uzonia_data}

    logger.info("get_all_uzonia_data | Returned %d records", len(all_uzonia_data))
    return {"Status": 'Success', 'user': user, 'Data': all_uzonia_data}


class AddUzoniaData(BaseModel):
    day_type: str
    rate: float
    uzonia: float
    day_7_uzonia: float
    day_30_uzonia: float
    day_90_uzonia: float
    day_180_uzonia: float
    index: float
    uzonia_date: date
    days: int
@app.post("/api/add_new_uzonia", tags=["Add New Uzonia"])
async def add_new_uzonia_api(data: AddUzoniaData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("edit_uzonia_api user not found in session")
        raise HTTPException(status_code=404, detail="User doesn't exist!")

    file_id = uuid4().hex[:12]
    user_session = await get_session(user_session_data['session_id'])

    logger.info("add_new_uzonia | uzonia_date=%s, file_id=%s, uzonia=%s, day_7_uzonia=%s, day_30_uzonia=%s, day_90_uzonia=%s, day_180_uzonia=%s, index=%s, days=%s",
        data.uzonia_date, file_id, data.uzonia, data.day_7_uzonia,
                data.day_30_uzonia, data.day_90_uzonia, data.day_180_uzonia, data.index, data.days)

    if (not file_id or not data.uzonia or not data.day_7_uzonia or not data.day_30_uzonia or not data.day_90_uzonia
            or not data.day_180_uzonia or not data.index or not data.uzonia_date or not data.days):
        logger.warning("add_new_uzonia | Missing parameters")
        raise HTTPException(status_code=400, detail="new_uzonia and new_uzonia_date parameters are required!")

    holidays_data = await get_all_holiday_data()
    holidays_list = []
    for holiday in holidays_data:
        holidays_list.append(holiday['holiday_date'])

    if data.uzonia_date in holidays_list:
        logger.warning("add_new_uzonia | Conflict: uzonia_date=%s this is Holiday date", data.uzonia_date)
        raise HTTPException(status_code=404, detail="This is Holiday date!")

    checking_data_existence = await get_single_uzonia_data(uzonia_date=data.uzonia_date)
    if checking_data_existence:
        logger.warning("add_new_uzonia | Duplicate: uzonia_date=%s already exists", data.zonia_date)
        raise HTTPException(status_code=404, detail="Such data already exists!")

    unique_job_id = str(uuid4().hex)
    updated_row = await add_new_uzonia_data(unique_job_id=unique_job_id, file_id=file_id,
                                            day_type=data.day_type,
                                            rate=data.rate,
                                            uzonia=data.uzonia,
                                            day_7_uzonia=data.day_7_uzonia,
                                            day_30_uzonia=data.day_30_uzonia, day_90_uzonia=data.day_90_uzonia,
                                            day_180_uzonia=data.day_180_uzonia, index=data.index,
                                            uzonia_date=data.uzonia_date, days=data.days)
    if not updated_row:
        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Uzonia Add', action_status="failed", created_at=datetime.now(tz))

        logger.error("add_new_uzonia | DB insert failed for uzonia_date=%s", data.uzonia_date)
        raise HTTPException(status_code=404, detail="Could not add the new uzonia to database!")

    # Adding Action details
    await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                          session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                          action='Uzonia Add', action_status="success", created_at=datetime.now(tz))

    logger.info("add_new_uzonia | Successfully added uzonia_date=%s", data.uzonia_date)
    return {"Status": 'Success', 'Data': 'Added successfully!'}


class EditUzoniaData(BaseModel):
    day_type: str
    rate: float
    uzonia: float
    day_7_uzonia: float
    day_30_uzonia: float
    day_90_uzonia: float
    day_180_uzonia: float
    index: float
    uzonia_date: date
    days: int
@app.put('/api/edit_uzonia_data', tags=["Edit Uzonia Status"])
async def edit_uzonia_api(data: EditUzoniaData, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.warning("edit_uzonia_api user not found in session")
        raise HTTPException(status_code=404, detail="User doesn't exist!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(user_session_data['session_id'])

    logger.info(
        "edit_uzonia_data | uzonia_date=%s, rate=%s, uzonia=%s, day_7_uzonia=%s, day_30_uzonia=%s, day_90_uzonia=%s, day_180_uzonia=%s, index=%s",
        data.uzonia_date, data.rate, data.uzonia, data.day_7_uzonia, data.day_30_uzonia,
        data.day_90_uzonia, data.day_180_uzonia, data.index)

    if (not data.rate or not data.uzonia or not data.day_7_uzonia or not data.day_30_uzonia
            or not data.day_90_uzonia or not data.day_180_uzonia or not data.index
            or not data.uzonia_date or not data.days):
        logger.warning("edit_uzonia_data | Missing necessary data")
        raise HTTPException(status_code=400, detail="Uzonia datas are required")

    checking_data_existence = await get_single_uzonia_data(uzonia_date=data.uzonia_date)
    if not checking_data_existence:
        logger.warning("edit_uzonia_data | Not found: uzonia_date=%s", data.uzonia_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    updated_row = await edit_uzonia_data(day_type=data.day_type, rate=data.rate, uzonia=data.uzonia, day_7_uzonia=data.day_7_uzonia,
                                         day_30_uzonia=data.day_30_uzonia, day_90_uzonia=data.day_90_uzonia,
                                         day_180_uzonia=data.day_180_uzonia, index=data.index, unique_job_id=unique_job_id,
                                         uzonia_date=data.uzonia_date, days=data.days)
    if not updated_row:

        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Uzonia Edit', action_status="failed", created_at=datetime.now(tz))

        logger.error("edit_uzonia_data | DB update failed for uzonia_date=%s", data.uzonia_date)
        raise HTTPException(status_code=404, detail="Could not update the uzonia data!")

    # Adding Action details
    await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                          session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                          action='Uzonia Edit', action_status="success", created_at=datetime.now(tz))

    logger.info("edit_uzonia_data | Uzonia data updated for uzonia_date=%s", data.uzonia_date)
    return {"Status": 'Success', 'Data': 'Uzonia updated successfully!'}


@app.delete("/api/delete_single_uzonia", tags=["Delete Single Uzonia"])
async def delete_single_uzonia_api(uzonia_date: date, user_session_data = Depends(get_current_user)):
    user = user_session_data['user']
    if not user:
        logger.error("delete_single_uzonia | User doesn't exist")
        raise HTTPException(status_code=404, detail="User doesn't exist!")

    unique_job_id = str(uuid4().hex)
    user_session = await get_session(user_session_data['session_id'])

    logger.info("delete_single_uzonia | uzonia_date=%s", uzonia_date)
    if not uzonia_date:
        logger.warning("delete_single_uzonia | Missing uzonia_date parameter")
        raise HTTPException(status_code=400, detail="uzonia_date parameter is required")

    single_uzonia_data = await get_single_uzonia_data(uzonia_date=uzonia_date)
    if not single_uzonia_data:
        logger.warning("delete_single_uzonia | Not found: uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    deleted_row = await delete_uzonia_data(uzonia_date=uzonia_date)
    if not deleted_row:
        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='Uzonia Deletion', action_status="failed", created_at=datetime.now(tz))

        logger.error("delete_single_uzonia | DB delete failed for uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Could not delete the uzonia data!")

    # Adding Action details
    await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                          session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                          action='Uzonia Deletion', action_status="success", created_at=datetime.now(tz))

    logger.info("delete_single_uzonia | Deleted uzonia_date=%s", uzonia_date)
    return {"Status": 'Success', 'Data': 'Deleted successfully!'}



# ---------------------------------------------------------------------------
# uzonia_uploads
# ---------------------------------------------------------------------------

@app.post("/api/add_new_uzonia_upload", tags=["Add Uzonia Upload"])
async def add_new_uzonia_upload_api(till_date: date, user_session_data = Depends(get_current_user)):
    user = user_session_data["user"]
    if not user:
        logger.warning("add_new_uzonia_upload | Missing user")
        raise HTTPException(status_code=400, detail="Missing user")

    user_session = await get_session(user_session_data['session_id'])

    file_id = uuid4().hex[:12]
    unique_job_id = str(uuid4().hex)
    folder_path = f'data/output_data/{file_id}'
    zip_path = f"data/output_data/{file_id}.zip"

    # 1. Ensure directory exists BEFORE running sync functions
    os.makedirs(folder_path, exist_ok=True)

    try:
        # 2. Add record to DB with 'progress' status
        await add_new_uzonia_upload(
            unique_job_id=unique_job_id,
            file_id=file_id,
            file_path=zip_path,
            status="progress",
            file_date=till_date,
            created_at=datetime.now(tz)
        )

        # 3. Offload Sync Functions to Threads
        # This prevents the API from freezing
        background_image_path = "data/input_data/image/background_image.png"
        output_image_file_path = os.path.join(folder_path, f"{file_id}.png")
        excel_file_path = os.path.join(folder_path, f"{file_id}.xlsx")

        from_date = date(till_date.year - 1, 1, 1)
        filtered_image_data = await get_date_filtered_rate_uzonia(from_date=from_date, till_date=till_date)
        # Run Image Drawing in a thread
        image_path = await asyncio.to_thread(
            draw_graph_data, filtered_image_data, background_image_path, output_image_file_path
        )

        till_date_uzonia_data = await get_single_uzonia_data(uzonia_date=till_date)
        if not till_date_uzonia_data:
            logger.error("add_new_uzonia_calculation | Failed to get single uzonia data from %s", till_date)
            raise HTTPException(status_code=404, detail="❌ Could not get single uzonia data")

        time_period_uzonia_data = await get_time_period_uzonia_data(cb_date=till_date)

        final_uzonia_table_data_dict = await finding_time_uzonia_calculations_func(cb_date=till_date,
                                                                                   db_time_data=time_period_uzonia_data,
                                                                                   current_uzonia_calculations_dict=till_date_uzonia_data)

        await asyncio.to_thread(draw_table_data, final_uzonia_table_data_dict, image_path, image_path)

        till_date_uzonia_data_history = await get_filtered_uzonia_data(till_date=till_date)
        # Run Excel Export in a thread
        await asyncio.to_thread(export_uzonia_to_excel, till_date_uzonia_data_history, excel_file_path)

        # Zipping folder
        folder_path = Path(f'data/output_data/{file_id}')
        zip_path = Path(f"data/output_data/{file_id}.zip")

        # Create ZIP from folder
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
            for file in folder_path.iterdir():
                if file.is_file():
                    # keeps relative paths inside zip
                    arcname = file.relative_to(folder_path)
                    zipf.write(file, arcname)

        # Remove original folder after zipping
        shutil.rmtree(folder_path)

        # 4. Update status to 'success'
        await edit_uzonia_upload_status(file_id=file_id, status='finished', finished_at=datetime.now(tz))

        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='File Upload', action_status="success", created_at=datetime.now(tz))

        return {"Status": "Success", "file_id": file_id}

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        shutil.rmtree(folder_path)
        await edit_uzonia_upload_status(file_id=file_id, status='failed', finished_at=datetime.now(tz))

        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='File Upload', action_status="failed", created_at=datetime.now(tz))

        raise HTTPException(status_code=500, detail="Internal processing error")


@app.get("/api/get_single_uzonia_upload", tags=["Get Single Uzonia Upload"])
async def get_single_uzonia_upload_api(file_id: str, user_session_data = Depends(get_current_user)):
    logger.info("get_single_uzonia_upload | file_id=%s", file_id)
    if not file_id:
        logger.warning("get_single_uzonia_upload | Missing uzonia_date parameter")
        raise HTTPException(status_code=400, detail="file_id parameter is required")

    single_uzonia_data = await get_single_uzonia_upload(file_id=file_id)
    if not single_uzonia_data:
        logger.warning("get_single_uzonia_upload | Not found: file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_single_uzonia_upload | Found: file_id=%s", file_id)
    return {"Status": 'Success', 'Data': single_uzonia_data}


@app.get("/api/get_all_uzonia_uploads", tags=["Get All Uzonia Upload"])
async def get_all_uzonia_uploads_api(user_session_data = Depends(get_current_user)):
    logger.info("get_all_uzonia_uploads | Fetching all uzonia uploads")

    user = user_session_data["user"]
    if not user:
        logger.warning("get_all_uzonia_uploads | Missing user")
        raise HTTPException(status_code=400, detail="user_id parameter is required")


    all_holidays = await get_all_holiday_data()
    if not all_holidays:
        logger.warning("get_all_uzonia_uploads | No holidays found in DB")

    all_uzonia_data = await get_all_uzonia_uploads()

    if not all_uzonia_data:
        logger.warning("get_all_uzonia_uploads | No uzonia uploads found in DB")
        return {"Status": 'Failed', 'user': user, 'Data': all_uzonia_data, 'Holidays': all_holidays}


    logger.info("get_all_uzonia_uploads | Returned %d records", len(all_uzonia_data))
    return {"Status": 'Success', 'user': user, 'Data': all_uzonia_data, 'Holidays': all_holidays}


@app.delete("/api/delete_single_uzonia_upload", tags=["Delete Single Uzonia Upload"])
async def delete_single_uzonia_upload_api(file_id: str, user_session_data = Depends(get_current_user)):
    user = user_session_data["user"]
    if not user:
        logger.warning("add_new_uzonia_upload | Missing user")
        raise HTTPException(status_code=400, detail="Missing user")

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = str(uuid4().hex)

    logger.info("delete_single_uzonia_upload | file_id=%s", file_id)
    if not file_id:
        logger.warning("delete_single_uzonia_upload | Missing file_id parameter")
        raise HTTPException(status_code=400, detail="file_id parameter is required")

    single_uzonia_data = await get_single_uzonia_upload(file_id=file_id)
    if not single_uzonia_data:
        logger.warning("delete_single_uzonia_upload | Not found: file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    deleted_row = await delete_uzonia_upload(file_id=file_id)
    if not deleted_row:
        logger.error("delete_single_uzonia_upload | DB delete failed for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="Could not delete the uzonia upload!")

    file_path = single_uzonia_data['file_path']
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            # Adding Action details
            await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                                  session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                                  action='File Deletion', action_status="success", created_at=datetime.now(tz))

            logger.info("delete_single_uzonia_upload | Output file removed: %s", file_path)
        except Exception as e:
            # Adding Action details
            await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                                  session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                                  action='File Deletion', action_status="failed", created_at=datetime.now(tz))
            logger.warning("delete_single_uzonia_upload | Could not remove output file %s: %s", file_path, e)

    logger.info("delete_single_uzonia_upload | Deleted file_id=%s", file_id)
    return {"Status": 'Success', 'Data': 'Deleted successfully!'}


@app.get("/api/download_uzonia_data_file", tags=["Download Calculations File"])
async def download_uzonia_data_file_api(file_id: str, user_session_data = Depends(get_current_user)):
    # Check user authentication first
    user = user_session_data.get("user")
    if not user:
        logger.warning("download_uzonia_data_file | Unauthorized access attempt")
        raise HTTPException(status_code=401, detail="Authentication required")

    user_session = await get_session(user_session_data['session_id'])
    unique_job_id = str(uuid4().hex)

    logger.info("download_uzonia_data_file | file_id=%s", file_id)
    if not file_id:
        logger.warning("download_uzonia_data_file | Missing file_id")
        raise HTTPException(status_code=404, detail="Could not get File ID!")

    uzonia_file_data = await get_single_uzonia_upload(file_id=file_id)
    if not uzonia_file_data:
        logger.warning("download_uzonia_data_file | DB record not found for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="The file does not exist in the db!")

    output_file_path = uzonia_file_data['file_path']
    if not os.path.exists(output_file_path):
        raise HTTPException(status_code=404, detail="Folder does not exist")

    # 🚀 non-blocking zip
    # zip_buffer = await asyncio.to_thread(stream_zip_from_folder, output_file_path)
    logger.info("download_uzonia_data_file | Serving file %s  job_id=%s", output_file_path, file_id)

    try:
        # Adding Action details
        await add_action_data(user_id=user['user_id'], unique_job_id=unique_job_id,
                              session_id=user_session_data["session_id"], ip_address=user_session['ip_address'],
                              action='File Download', action_status="success", created_at=datetime.now(tz))

        return FileResponse(
            output_file_path,
            filename=f'{file_id}.zip',
            media_type="application/zip"
        )
    except Exception as e:
        await edit_action_status(unique_job_id=unique_job_id, status='failed')
        logger.warning("download_uzonia_data_file | Failed to download file %s: %s", output_file_path, e)



# ----------------------------------------------------------------------------------------------------------------------
# repo_data
# ----------------------------------------------------------------------------------------------------------------------

@app.get("/api/get_all_repo_data", tags=["Get All Uzonia"])
async def get_all_repo_data_api(user_session_data = Depends(get_current_user)):
    user = user_session_data.get("user")
    if not user:
        logger.warning("get_all_repo_data | Unauthorized access attempt")
        raise HTTPException(status_code=401, detail="Authentication required")

    logger.info("get_all_repo_data | Fetching all repo data")
    all_repo_data = await get_all_repo_data()

    if len(all_repo_data) == 0:
        return {"Status": 'Success', 'user': user, 'Data': all_repo_data}

    if not all_repo_data:
        logger.warning("get_all_repo_data | No repo data found in DB")
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_all_repo_data | Returned %d records", len(all_repo_data))
    return {"Status": 'Success', 'user': user, 'Data': all_repo_data}


@app.delete("/api/delete_repo_data", tags=["Delete Repo Data"])
async def delete_repo_data_api(file_id: str, user_session_data = Depends(get_current_user)):
    logger.info("delete_repo_data | file_id=%s", file_id)
    if not file_id:
        logger.warning("delete_repo_data | Missing file_id parameter")
        raise HTTPException(status_code=400, detail="file_id parameter is required")

    single_repo_data = await repo_data_exists(file_id=file_id)
    if not single_repo_data:
        logger.warning("delete_repo_data | Not found: file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    deleted_row = await delete_repo_data(file_id=file_id)
    if not deleted_row:
        logger.error("delete_repo_data | DB delete failed for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="Could not delete the repo data!")

    logger.info("delete_repo_data | Deleted file_id=%s", file_id)
    return {"Status": 'Success', 'Data': 'Deleted successfully!'}



# ----------------------------------------------------------------------------------------------------------------------
# depo_data
# ----------------------------------------------------------------------------------------------------------------------

@app.get("/api/get_all_depo_data", tags=["Get All Depo Data"])
async def get_all_depo_data_api(user_session_data = Depends(get_current_user)):
    user = user_session_data.get("user")
    if not user:
        logger.warning("get_all_repo_data | Unauthorized access attempt")
        raise HTTPException(status_code=401, detail="Authentication required")

    logger.info("get_all_depo_data | Fetching all depo data")
    all_depo_data = await get_all_depo_data()

    if len(all_depo_data) == 0:
        return {"Status": 'Success', 'user': user, 'Data': all_depo_data}

    if not all_depo_data:
        logger.warning("get_all_depo_data | No depo data found in DB")
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_all_depo_data | Returned %d records", len(all_depo_data))
    return {"Status": 'Success', 'user': user, 'Data': all_depo_data}


@app.delete("/api/delete_depo_data", tags=["Delete Depo Data"])
async def delete_repo_data_api(file_id: str, user_session_data = Depends(get_current_user)):
    logger.info("delete_depo_data | file_id=%s", file_id)
    if not file_id:
        logger.warning("delete_depo_data | Missing file_id parameter")
        raise HTTPException(status_code=400, detail="file_id parameter is required")

    single_depo_data = await depo_data_exists(file_id=file_id)
    if not single_depo_data:
        logger.warning("delete_depo_data | Not found: file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    deleted_row = await delete_depo_data(file_id=file_id)
    if not deleted_row:
        logger.error("delete_depo_data | DB delete failed for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="Could not delete the depo data!")

    logger.info("delete_depo_data | Deleted file_id=%s", file_id)
    return {"Status": 'Success', 'Data': 'Deleted successfully!'}

