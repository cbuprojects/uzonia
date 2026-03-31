import os
import uuid
import logging
import time
from datetime import datetime, timedelta, date
import pandas as pd
from typing import Dict, Optional
import shutil
import asyncio
from uuid import uuid4
import io
from zoneinfo import ZoneInfo
from functools import partial
import random
from fastapi import FastAPI, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from requests import Request
from fastapi.middleware.cors import CORSMiddleware
from utils.bank_data import bank_names
from utils.database import (init_db_pool, close_db_pool, get_single_holiday_data, get_all_holiday_data,
                            add_holiday_data, edit_holiday_data, delete_holiday_data,
                            get_n_uzonia_data, get_single_uzonia_data, add_new_uzonia_data,
                            delete_uzonia_data, get_all_uzonia_data, edit_uzonia_data,
                            get_single_uzonia_upload, get_all_uzonia_uploads, delete_uzonia_upload, edit_uzonia_upload_status,
                            get_date_filtered_rate_uzonia, get_time_period_uzonia_data,
                            add_new_uzonia_upload, get_latest_uzonia_data, get_last_five_uzonia, get_filtered_uzonia_data,
                            add_new_repo_data, add_new_depo_data, get_all_repo_data, repo_data_exists, delete_repo_data)
from utils.add_data import add_new_uzonia_data_to_the_db, add_new_holiday_data_to_the_db
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

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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
    result = await add_new_uzonia_data_to_the_db()
    if result:
        logger.info('🆕 Data is added')
    else:
        logger.info('📋 Data is NOT added')

    result = await add_new_holiday_data_to_the_db()
    if result:
        logger.info('🆕 Holiday data is added')
    else:
        logger.info('📋 Holiday data is NOT added')

    logger.info("✅ Startup complete: DB pool initialized")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Shutdown signal received — closing DB pool…")
    await close_db_pool()
    logger.info("✅ Shutdown complete: DB pool closed")


# ---------------------------------------------------------------------------
# holiday_data
# ---------------------------------------------------------------------------


@app.get("/api/get_single_holiday", tags=["Holiday Date"])
async def get_single_holiday_api(holiday_date: date):
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
async def get_all_holidays_api():
    logger.info("get_all_holidays | Fetching all holidays")
    all_holidays_data = await get_all_holiday_data()

    if not all_holidays_data:
        logger.warning("get_all_holidays | No holidays found in DB")
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_all_holidays | Returned %d records", len(all_holidays_data))
    return {"Status": 'Success', 'Data': all_holidays_data}


@app.post("/api/add_new_holiday", tags=["Add New Code"])
async def add_new_holiday_api(new_holiday: date, new_description: str):
    logger.info("add_new_holiday | new_holiday=%s  new_description=%s old_holiday=%s", new_holiday, new_description)
    if not new_holiday or not new_description:
        logger.warning("add_new_holiday | Missing parameters")
        raise HTTPException(status_code=400, detail="new_holiday and new_description parameters are required!")

    checking_data_existence = await get_single_holiday_data(holiday_date=new_holiday)
    if checking_data_existence:
        logger.warning("add_new_holiday | Duplicate: new_holiday=%s already exists", new_holiday)
        raise HTTPException(status_code=404, detail="Such data already exists!")

    updated_row = await add_holiday_data(holiday_date=new_holiday, description=new_description)
    if not updated_row:
        logger.error("add_new_holiday | DB insert failed for new_holiday=%s", new_holiday)
        raise HTTPException(status_code=404, detail="Could not add the new code to database!")

    logger.info("add_new_holiday | Successfully added new_holiday=%s", new_holiday)
    return {"Status": 'Success', 'Data': 'Added successfully!'}


@app.put('/api/edit_holiday', tags=["Edit Code Status"])
async def edit_holiday_api(description: str, old_holiday_date: date):
    logger.info("edit_holiday | holiday_date=%s  description=%s", old_holiday_date, description)
    if not old_holiday_date:
        logger.warning("edit_holiday | Missing holiday_date")
        raise HTTPException(status_code=400, detail="Holiday date is required")

    checking_data_existence = await get_single_holiday_data(holiday_date=old_holiday_date)
    if not checking_data_existence:
        logger.warning("edit_holiday | Not found: holiday_date=%s", old_holiday_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    now = datetime.now(tz)
    updated_row = await edit_holiday_data(description=description, updated_at=now, holiday_date=old_holiday_date)
    if not updated_row:
        logger.error("edit_holiday | DB update failed for old_holiday_date=%s", old_holiday_date)
        raise HTTPException(status_code=404, detail="Could not update the holiday!")

    logger.info("edit_holiday | Holiday updated for old_holiday_date=%s → %s", old_holiday_date, description)
    return {"Status": 'Success', 'Data': 'Status updated successfully!'}


@app.delete('/api/delete_holiday', tags=["Delete Holiday"])
async def delete_holiday_api(holiday_date: date):
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

    logger.info("delete_holiday | Deleted holiday_date=%s", holiday_date)
    return {"Status": 'Success', 'Data': 'Deleted successfully!'}


# ---------------------------------------------------------------------------
# uzonia_data
# ---------------------------------------------------------------------------

@app.get("/api/get_single_uzonia", tags=["Get Single Uzonia"])
async def get_single_uzonia_api(uzonia_date: date):
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
async def get_all_uzonia_data_api():
    logger.info("get_all_uzonia_data | Fetching all uzonia data")
    all_uzonia_data = await get_all_uzonia_data()

    if not all_uzonia_data:
        logger.warning("get_all_uzonia_data | No uzonia data found in DB")
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_all_uzonia_data | Returned %d records", len(all_uzonia_data))
    return {"Status": 'Success', 'Data': all_uzonia_data}


@app.post("/api/add_new_uzonia", tags=["Add New Uzonia"])
async def add_new_uzonia_api(file_id: str, uzonia: float, day_7_uzonia: float, day_30_uzonia: float,
                             day_90_uzonia: float, day_180_uzonia: float, index: float, uzonia_date: date, days: int):
    logger.info("add_new_uzonia | uzonia_date=%s, file_id=%s, uzonia=%s, day_7_uzonia=%s, day_30_uzonia=%s, day_90_uzonia=%s, day_180_uzonia=%s, index=%s, days=%s",
        uzonia_date, file_id, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, days)

    if not file_id or not uzonia or not day_7_uzonia or not day_30_uzonia or not day_90_uzonia or not day_180_uzonia or not index or not uzonia_date or not days:
        logger.warning("add_new_uzonia | Missing parameters")
        raise HTTPException(status_code=400, detail="new_uzonia and new_uzonia_date parameters are required!")

    holidays_data = await get_all_holiday_data()
    holidays_list = []
    for holiday in holidays_data:
        holidays_list.append(holiday['holiday_date'])

    if uzonia_date in holidays_list:
        logger.warning("add_new_uzonia | Conflict: uzonia_date=%s this is Holiday date", uzonia_date)
        raise HTTPException(status_code=404, detail="This is Holiday date!")

    checking_data_existence = await get_single_uzonia_data(uzonia_date=uzonia_date)
    if checking_data_existence:
        logger.warning("add_new_uzonia | Duplicate: uzonia_date=%s already exists", uzonia_date)
        raise HTTPException(status_code=404, detail="Such data already exists!")

    updated_row = await add_new_uzonia_data(file_id=file_id, uzonia=uzonia, day_7_uzonia=day_7_uzonia,
                                            day_30_uzonia=day_30_uzonia, day_90_uzonia=day_90_uzonia,
                                            day_180_uzonia=day_180_uzonia, index=index, uzonia_date=uzonia_date, days=days)
    if not updated_row:
        logger.error("add_new_uzonia | DB insert failed for uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Could not add the new uzonia to database!")

    logger.info("add_new_uzonia | Successfully added uzonia_date=%s", uzonia_date)
    return {"Status": 'Success', 'Data': 'Added successfully!'}


@app.put('/api/edit_uzonia_data', tags=["Edit Uzonia Status"])
async def edit_uzonia_api(rate: float, uzonia: float, day_7_uzonia: float, day_30_uzonia: float,
                          day_90_uzonia: float, day_180_uzonia: float, index: float, uzonia_date: date, days: int):
    logger.info(
        "edit_uzonia_data | uzonia_date=%s, rate=%s, uzonia=%s, day_7_uzonia=%s, day_30_uzonia=%s, day_90_uzonia=%s, day_180_uzonia=%s, index=%s",
        uzonia_date, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index)

    if not rate or not uzonia or not day_7_uzonia or not day_30_uzonia or not day_90_uzonia or not day_180_uzonia or not index or not uzonia_date or not days:
        logger.warning("edit_uzonia_data | Missing necessary data")
        raise HTTPException(status_code=400, detail="Uzonia datas are required")

    checking_data_existence = await get_single_uzonia_data(uzonia_date=uzonia_date)
    if not checking_data_existence:
        logger.warning("edit_uzonia_data | Not found: uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    updated_row = await edit_uzonia_data(rate=rate, uzonia=uzonia, day_7_uzonia=day_7_uzonia,
                                         day_30_uzonia=day_30_uzonia, day_90_uzonia=day_90_uzonia,
                                         day_180_uzonia=day_180_uzonia, index=index, uzonia_date=uzonia_date, days=days)
    if not updated_row:
        logger.error("edit_uzonia_data | DB update failed for uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Could not update the uzonia data!")

    logger.info("edit_uzonia_data | Uzonia data updated for uzonia_date=%s", uzonia_date)
    return {"Status": 'Success', 'Data': 'Uzonia updated successfully!'}


@app.delete("/api/delete_single_uzonia", tags=["Delete Single Uzonia"])
async def delete_single_uzonia_api(uzonia_date: date):
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
        logger.error("delete_single_uzonia | DB delete failed for uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Could not delete the uzonia data!")

    logger.info("delete_single_uzonia | Deleted uzonia_date=%s", uzonia_date)
    return {"Status": 'Success', 'Data': 'Deleted successfully!'}



# ---------------------------------------------------------------------------
# uzonia_uploads
# ---------------------------------------------------------------------------

@app.post("/api/add_new_uzonia_upload", tags=["Add Uzonia Upload"])
async def add_new_uzonia_upload_api(till_date: date):
    file_id = uuid4().hex[:12]
    folder_path = f'data/output_data/{file_id}'

    # 1. Ensure directory exists BEFORE running sync functions
    os.makedirs(folder_path, exist_ok=True)

    try:
        # 2. Add record to DB with 'progress' status
        await add_new_uzonia_upload(
            file_id=file_id,
            file_path=folder_path,
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

        await asyncio.to_thread(
            draw_table_data, final_uzonia_table_data_dict, image_path, image_path
        )

        till_date_uzonia_data_history = await get_filtered_uzonia_data(till_date=till_date)
        # Run Excel Export in a thread
        await asyncio.to_thread(
            export_uzonia_to_excel, till_date_uzonia_data_history, excel_file_path
        )

        # 4. Update status to 'success'
        await edit_uzonia_upload_status(file_id=file_id, status='finished', finished_at=datetime.now(tz))

        return {"Status": "Success", "file_id": file_id}

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        await edit_uzonia_upload_status(file_id=file_id, status='failed', finished_at=datetime.now(tz))
        raise HTTPException(status_code=500, detail="Internal processing error")


@app.get("/api/get_single_uzonia_upload", tags=["Get Single Uzonia Upload"])
async def get_single_uzonia_upload_api(file_id: str):
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
async def get_all_uzonia_uploads_api():
    logger.info("get_all_uzonia_uploads | Fetching all uzonia uploads")
    all_uzonia_data = await get_all_uzonia_uploads()

    if not all_uzonia_data:
        logger.warning("get_all_uzonia_uploads | No uzonia uploads found in DB")
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    all_holidays = await get_all_holiday_data()
    if not all_holidays:
        logger.warning("get_all_uzonia_uploads | No holidays found in DB")

    logger.info("get_all_uzonia_uploads | Returned %d records", len(all_uzonia_data))
    return {"Status": 'Success', 'Data': all_uzonia_data, 'Holidays': all_holidays}


@app.delete("/api/delete_single_uzonia_upload", tags=["Delete Single Uzonia Upload"])
async def delete_single_uzonia_upload_api(file_id: str):
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
            shutil.rmtree(file_path, ignore_errors=True)
            logger.info("delete_single_uzonia_upload | Output file removed: %s", file_path)
        except Exception as e:
            logger.warning("delete_single_uzonia_upload | Could not remove output file %s: %s", file_path, e)

    logger.info("delete_single_uzonia_upload | Deleted file_id=%s", file_id)
    return {"Status": 'Success', 'Data': 'Deleted successfully!'}


@app.get("/api/download_uzonia_data_file", tags=["Download Calculations File"])
async def download_uzonia_data_file_api(file_id: str):
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
    zip_buffer = await asyncio.to_thread(stream_zip_from_folder, output_file_path)
    logger.info("download_uzonia_data_file | Serving file %s  job_id=%s", output_file_path, file_id)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{file_id}.zip"',
            "Content-Length": str(zip_buffer.getbuffer().nbytes)  # Optional: tells browser the size
        }
    )



# ----------------------------------------------------------------------------------------------------------------------
# uzonia_data_calculations
# ----------------------------------------------------------------------------------------------------------------------

@app.post("/api/add_new_uzonia_calculation", tags=["Add new uzonia"])
async def add_new_uzonia_calculation_api(repo_n_file: UploadFile, repo_m_file: UploadFile, deposit_file: UploadFile,
                                         cb_date: str = Form(...), cb_rate: float = Form(...), cb_deposit: str = Form(...)):
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
        raise HTTPException(status_code=404, detail="Such data already exists!")

    holidays_data = await get_all_holiday_data()
    holidays_list = []
    for holiday in holidays_data:
        holidays_list.append(holiday['holiday_date'])

    if cb_date in holidays_list:
        raise HTTPException(status_code=404, detail="This is holiday date!")

    file_id = uuid4().hex[:12]

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


    # ------------------------------------------------------------------------------------------------------------------
    # Calculating Repo N and M
    # ------------------------------------------------------------------------------------------------------------------
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
                r['Инвестор']
                for r in repo_n_file_data
                if r['Номер заявки'] == row['Номер заявки'] and r['Направление'] == 'Продажа'
            ),
            None
        )

        dealer_to = next(
            (
                r['Инвестор']
                for r in repo_n_file_data
                if r['Номер заявки'] == row['Номер заявки'] and r['Направление'] == 'Покупка'
            ),
            None
        )

        days = row['Срок РЕПО (днях)'].replace(' день', '', regex=False).astype(int)
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
                r['Дилер/Инвестор']
                for r in repo_m_file_data
                if r['Номер заявки'] == row['Номер заявки'] and r['Направление'] == 'Продажа'
            ),
            None
        )

        dealer_to = next(
            (
                r['Дилер/Инвестор']
                for r in repo_m_file_data
                if r['Номер заявки'] == row['Номер заявки'] and r['Направление'] == 'Покупка'
            ),
            None
        )

        days = row['Срок РЕПО (днях)'].replace(' день', '', regex=False).astype(int)
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


    # ------------------------------------------------------------------------------------------------------------------
    # Calculating N days values
    # ------------------------------------------------------------------------------------------------------------------
    latest_uzonia_data = await get_latest_uzonia_data(cb_date=cb_date)
    print(f'latest_uzonia_data: {latest_uzonia_data}')
    latest_date = latest_uzonia_data['uzonia_date']
    latest_index = float(latest_uzonia_data['index'])
    n_day_number = (cb_date - latest_date).days
    print('n_day_number:', n_day_number)

    days_n_periods = [7, 30, 90, 180]
    for period in days_n_periods:
        # 1. Start with the 'un-synced' days (the gap between last data and now)
        # Assuming 'current_rate' is the rate for the gap period
        total_growth = (1 + ((day_uzonia / 100) * (n_day_number / 365)))
        till_date = cb_date - timedelta(days=period)
        history = await get_n_uzonia_data(cb_date=cb_date, till_date=till_date)

        total_days_in_period = n_day_number

        for rate_value, active_days in history:
            # 2. Compound each historical day using ITS OWN 'active_days' (usually 1, or 3 for weekends)
            total_growth *= (1 + ((rate_value / 100) * (active_days / 365)))
            total_days_in_period += active_days

        # 3. Final Annualization using the actual total days elapsed
        n_day_final_value = ((total_growth - 1) * (365 / total_days_in_period)) * 100
        print('n_day_final_uzonia_value:', n_day_final_value)
        final_uzonia_data_dict[f'day_{period}_uzonia'] = n_day_final_value


    uzonia_index = latest_index * (1 + ((day_uzonia * n_day_number) / (365 * 100)))
    final_uzonia_data_dict['index'] = uzonia_index
    final_uzonia_data_dict['uzonia_date'] = cb_date


    # ------------------------------------------------------------------------------------------------------------------
    # Adding Uzonia to the DB
    # ------------------------------------------------------------------------------------------------------------------
    await add_new_uzonia_data(file_id=file_id, rate=cb_rate, uzonia=final_uzonia_data_dict['day_uzonia'],
                              day_7_uzonia=final_uzonia_data_dict['day_7_uzonia'],
                              day_30_uzonia=final_uzonia_data_dict['day_30_uzonia'],
                              day_90_uzonia=final_uzonia_data_dict['day_90_uzonia'],
                              day_180_uzonia=final_uzonia_data_dict['day_180_uzonia'],
                              index=final_uzonia_data_dict['index'],
                              uzonia_date=final_uzonia_data_dict['uzonia_date'],
                              days=n_day_number)

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




# ----------------------------------------------------------------------------------------------------------------------
# repo_data
# ----------------------------------------------------------------------------------------------------------------------
@app.get("/api/get_all_repo_data", tags=["Get All Uzonia"])
async def get_all_repo_data_api():
    logger.info("get_all_repo_data | Fetching all repo data")
    all_repo_data = await get_all_repo_data()

    if not all_repo_data:
        logger.warning("get_all_repo_data | No repo data found in DB")
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_all_repo_data | Returned %d records", len(all_repo_data))
    return {"Status": 'Success', 'Data': all_repo_data}


@app.delete("/api/delete_repo_data", tags=["Delete Repo Data"])
async def delete_repo_data_api(file_id: str):
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

