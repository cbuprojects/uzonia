import os
import uuid
import logging
import time
from datetime import datetime, timedelta, date
import pandas as pd
from typing import Dict
import shutil
import asyncio
from uuid import uuid4
from zoneinfo import ZoneInfo
import random
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import FileResponse
from requests import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette import status

from utils.bank_data import bank_names, bank_holidays
from utils.database import (init_db_pool, close_db_pool, get_single_holiday_data, get_all_holiday_data,
                            add_holiday_data, edit_holiday_data, delete_holiday_data,
                            get_n_uzonia_data, get_single_uzonia_data, add_new_uzonia_data,
                            delete_uzonia_data, get_all_uzonia_data, edit_uzonia_data,
                            get_single_uzonia_upload, get_all_uzonia_uploads, delete_uzonia_upload,
                            get_date_filtered_rate_uzonia, get_time_period_uzonia_data,
                            add_new_uzonia_upload)
from utils.add_data import add_new_uzonia_data_to_the_db, add_new_holiday_data_to_the_db
from utils.calculations import calculate_day_uzonia
from utils.draw_graph import draw_graph_data
from utils.draw_table import draw_table_data
from utils.help_functions import finding_time_uzonia_calculations_func, zip_and_delete_folder
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
                             day_90_uzonia: float, day_180_uzonia: float, index: float, uzonia_date: date):
    logger.info("add_new_uzonia | uzonia_date=%s, file_id=%s, uzonia=%s, day_7_uzonia=%s, day_30_uzonia=%s, day_90_uzonia=%s, day_180_uzonia=%s, index=%s",
        uzonia_date, file_id, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index)

    if not file_id or not uzonia or not day_7_uzonia or not day_30_uzonia or not day_90_uzonia or not day_180_uzonia or not index or not uzonia_date:
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
                                            day_180_uzonia=day_180_uzonia, index=index, uzonia_date=uzonia_date)
    if not updated_row:
        logger.error("add_new_uzonia | DB insert failed for uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Could not add the new uzonia to database!")

    logger.info("add_new_uzonia | Successfully added uzonia_date=%s", uzonia_date)
    return {"Status": 'Success', 'Data': 'Added successfully!'}


@app.put('/api/edit_uzonia_data', tags=["Edit Uzonia Status"])
async def edit_uzonia_api(rate: float, uzonia: float, day_7_uzonia: float, day_30_uzonia: float,
                          day_90_uzonia: float, day_180_uzonia: float, index: float, uzonia_date: date):
    logger.info(
        "edit_uzonia_data | uzonia_date=%s, rate=%s, uzonia=%s, day_7_uzonia=%s, day_30_uzonia=%s, day_90_uzonia=%s, day_180_uzonia=%s, index=%s",
        uzonia_date, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index)

    if not rate or not uzonia or not day_7_uzonia or not day_30_uzonia or not day_90_uzonia or not day_180_uzonia or not index or not uzonia_date:
        logger.warning("edit_uzonia_data | Missing necessary data")
        raise HTTPException(status_code=400, detail="Uzonia datas are required")

    checking_data_existence = await get_single_uzonia_data(uzonia_date=uzonia_date)
    if not checking_data_existence:
        logger.warning("edit_uzonia_data | Not found: uzonia_date=%s", uzonia_date)
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    updated_row = await edit_uzonia_data(rate=rate, uzonia=uzonia, day_7_uzonia=day_7_uzonia,
                                         day_30_uzonia=day_30_uzonia, day_90_uzonia=day_90_uzonia,
                                         day_180_uzonia=day_180_uzonia, index=index, uzonia_date=uzonia_date)
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
async def get_all_uzonia_data_api():
    logger.info("get_all_uzonia_uploads | Fetching all uzonia uploads")
    all_uzonia_data = await get_all_uzonia_uploads()

    if not all_uzonia_data:
        logger.warning("get_all_uzonia_uploads | No uzonia uploads found in DB")
        raise HTTPException(status_code=404, detail="Such data does not exist!")

    logger.info("get_all_uzonia_uploads | Returned %d records", len(all_uzonia_data))
    return {"Status": 'Success', 'Data': all_uzonia_data}


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
    if file_path and os.path.isfile(file_path):
        try:
            os.remove(file_path)
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
    logger.info("download_uzonia_data_file | Serving file %s  job_id=%s", output_file_path, file_id)
    try:
        return FileResponse(
            path=output_file_path,
            filename=f"{file_id}.zip",
            media_type="application/zip"
        )
    except Exception as e:
        logger.error("download_uzonia_data_file | FileResponse failed  file_id=%s  path=%s  error=%s",
                     file_id, output_file_path, e, exc_info=True)
        raise HTTPException(status_code=404, detail=f"Could not download file {output_file_path}: {e}")


# ---------------------------------------------------------------------------
# uzonia_data_calculations
# ---------------------------------------------------------------------------

@app.post("/api/add_new_uzonia_calculation", tags=["Add new uzonia"])
async def add_new_uzonia_calculation_api(repo_n_file: UploadFile, repo_m_file: UploadFile, deposit_file: UploadFile, cb_date: date, cb_rate: float, cb_deposit: float):
    if not repo_n_file or not repo_m_file or not deposit_file or not cb_date or not cb_rate or not cb_deposit:
        raise HTTPException(status_code=404, detail="❌ Not enough data!")

    try:
        cb_date = datetime.strptime(cb_date, "%d.%m.%Y")
        cb_rate = float(cb_rate)
        cb_deposit = float(cb_deposit)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Wrong CB Input data!")

    try:
        repo_n_file_data = pd.read_excel(repo_n_file)
        columns = ["Номер заявки", "Время подачи", "Время исполнения второй части", "Направление",
                   "Инвестор", "Часть РЕПО", "Блокировка", "Срок РЕПО (днях)", "Ставка РЕПО (в % годовых)",
                   "Количество (в шт.)", "Сумма РЕПО (в сумах)", "Сумма обр. выкупа (в сумах)"]
        repo_n_file_data = repo_n_file_data.columns.str.strip()
        missing_columns = [expected_column for expected_column in columns if expected_column not in repo_n_file_data.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing_columns}")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="❌ Error with the repo N file!")


    try:
        repo_m_file_data = pd.read_excel(repo_m_file)
        columns = ["Номер заявки", "Время подачи", "Время исполнения второй части", "Направление",
                   "Дилер/Инвестор", "Код расчётов (дней)", "Срок РЕПО (днях)", "Ставка РЕПО (в % годовых)",
                   "Количество (в шт.)", "Сумма РЕПО (в сумах)", "Сумма обр. выкупа (в сумах)"]
        repo_m_file_data = repo_m_file_data.columns.str.strip()
        missing_columns = [expected_column for expected_column in columns if expected_column not in repo_m_file_data.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing_columns}")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="❌ Error with the repo M file!")


    try:
        deposit_file_data = pd.read_excel(deposit_file)
        columns = ["Код сделки", "ОперДата", "Банк(Размещение)", "Банк(Привлечение)",
                   "Валюта", "Сумма", "Процентная ставка", "Дата возврата", "Срок возврата (в днях)"]
        deposit_file_data = deposit_file_data.columns.str.strip()
        missing_columns = [expected_column for expected_column in columns if expected_column not in deposit_file_data.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing_columns}")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="❌ Error with the Deposit file!")

    check_existence = await get_single_uzonia_data(uzonia_date=cb_date)
    if check_existence:
        raise HTTPException(status_code=404, detail="Such data already exists!")

    holidays_data = await get_all_holiday_data()
    holidays_list = []
    for holiday in holidays_data:
        holidays_list.append(holiday['holiday_date'])

    file_id = uuid.uuid4().hex[:12]



    # ------------------------------------------------------------------------------------------------------------------
    # Processing the first Repo N file
    # ------------------------------------------------------------------------------------------------------------------

    repo_n_file_data['Номер заявки'] = repo_n_file_data['Номер заявки'].astype(str).str.strip()
    repo_n_file_data['Время подачи'] = pd.to_datetime(repo_n_file_data['Время подачи'], format='%d/%m/%Y %H:%M:%S')
    repo_n_file_data['Время исполнения второй части'] = pd.to_datetime(repo_n_file_data['Время исполнения второй части'], format='%d/%m/%Y %H:%M:%S')
    repo_n_file_data['Направление'] = repo_n_file_data['Направление'].astype(str).str.strip()
    repo_n_file_data['Инвестор'] = repo_n_file_data['Инвестор'].astype(str).str.strip()
    repo_n_file_data['Срок РЕПО (днях)'] = repo_n_file_data['Срок РЕПО (днях)'].astype(str).str.strip()
    repo_n_file_data['Ставка РЕПО (в % годовых)'] = repo_n_file_data['Ставка РЕПО (в % годовых)'].astype(float)
    repo_n_file_data['Сумма РЕПО (в сумах)'] = repo_n_file_data['Сумма РЕПО (в сумах)'].astype(str).str.replace[',', ''].astype(float)
    repo_n_file_data['Сумма обр. выкупа (в сумах)'] = repo_n_file_data['Сумма обр. выкупа (в сумах)'].astype(str).str.replace[',', ''].astype(float)

    invalid_mask = ~repo_n_file_data['Инвестор'].isin(bank_names)
    bad_ids = repo_n_file_data.loc[invalid_mask, 'Номер заявки']
    repo_n_file_data = repo_n_file_data[~repo_n_file_data['Номер заявки'].isin(bad_ids)].reset_index(drop=True)


    outdated_rows = []
    for index, row in repo_n_file_data.iterrows():
        date_in = row['Время подачи']
        date_out = row['Время исполнения второй части']
        diff_days = (date_out - date_in).days

        # 1. Normal 1-day gap → OK
        if diff_days == 1:
            continue

        # 2. Check if gap is caused by weekend/bank holiday
        current = date_in
        valid_gap = True
        while current < date_out:
            current += timedelta(days=1)

            # If current is weekday AND not a bank holiday → gap invalid
            if current.weekday() < 5 and current not in holidays_list:
                valid_gap = False
                break  # no need to check further

        if valid_gap:
            continue  # skip, gap is fine
        else:
            outdated_rows.append(index)

        # 3. If we reach here → gap is invalid, handle it
        print(f"Row {index} has invalid gap: {diff_days} days ({date_in} → {date_out})")

    removed_rows = repo_n_file_data.loc[outdated_rows]
    repo_n_file_data = repo_n_file_data.drop(index=outdated_rows).reset_index(drop=True)

    print("Removed rows due to invalid gaps:")
    print(removed_rows)



    # ------------------------------------------------------------------------------------------------------------------
    # Processing the first Repo M file
    # ------------------------------------------------------------------------------------------------------------------

    repo_n_file_data['Номер заявки'] = repo_n_file_data['Номер заявки'].astype(str).str.strip()
    repo_n_file_data['Время подачи'] = pd.to_datetime(repo_n_file_data['Время подачи'], format='%d/%m/%Y %H:%M:%S')
    repo_n_file_data['Время исполнения второй части'] = pd.to_datetime(repo_n_file_data['Время исполнения второй части'], format='%d/%m/%Y %H:%M:%S')
    repo_n_file_data['Направление'] = repo_n_file_data['Направление'].astype(str).str.strip()
    repo_n_file_data['Дилер/Инвестор'] = repo_n_file_data['Инвестор'].astype(str).str.strip()
    repo_n_file_data['Срок РЕПО (днях)'] = repo_n_file_data['Срок РЕПО (днях)'].astype(str).str.strip()
    repo_n_file_data['Ставка РЕПО (в % годовых)'] = repo_n_file_data['Ставка РЕПО (в % годовых)'].astype(float)
    repo_n_file_data['Сумма РЕПО (в сумах)'] = repo_n_file_data['Сумма РЕПО (в сумах)'].astype(str).str.replace[',', ''].astype(float)
    repo_n_file_data['Сумма обр. выкупа (в сумах)'] = repo_n_file_data['Сумма обр. выкупа (в сумах)'].astype(str).str.replace[',', ''].astype(float)

    invalid_mask = ~repo_m_file_data['Дилер/Инвестор'].isin(bank_names)
    bad_ids = repo_m_file_data.loc[invalid_mask, 'Номер заявки']
    repo_m_file_data = repo_m_file_data[~repo_m_file_data['Номер заявки'].isin(bad_ids)].reset_index(drop=True)

    outdated_rows = []
    for index, row in repo_m_file_data.iterrows():
        date_in = row['Время подачи']
        date_out = row['Время исполнения второй части']
        diff_days = (date_out - date_in).days

        # 1. Normal 1-day gap → OK
        if diff_days == 1:
            continue

        # 2. Check if gap is caused by weekend/bank holiday
        current = date_in
        valid_gap = True
        while current < date_out:
            current += timedelta(days=1)

            # If current is weekday AND not a bank holiday → gap invalid
            if current.weekday() < 5 and current not in holidays_list:
                valid_gap = False
                break  # no need to check further

        if valid_gap:
            continue  # skip, gap is fine
        else:
            outdated_rows.append(index)

        # 3. If we reach here → gap is invalid, handle it
        print(f"Row {index} has invalid gap: {diff_days} days ({date_in} → {date_out})")

    removed_rows = repo_m_file_data.loc[outdated_rows]
    repo_m_file_data = repo_m_file_data.drop(index=outdated_rows).reset_index(drop=True)

    print("Removed rows due to invalid gaps:")
    print(removed_rows)



    # ------------------------------------------------------------------------------------------------------------------
    # Processing the Deposit file
    # ------------------------------------------------------------------------------------------------------------------

    # invalid_mask = ~repo_m_file_data['Банк(Размещение)'].isin(bank_names)
    # bad_ids = repo_m_file_data.loc[invalid_mask, 'Номер заявки']
    # repo_m_file_data = repo_m_file_data[~repo_m_file_data['Номер заявки'].isin(bad_ids)].reset_index(drop=True)

    deposit_file_data['Код сделки'] = deposit_file_data['Код сделки'].astype(str).str.strip()
    deposit_file_data['ОперДата'] = pd.to_datetime(deposit_file_data['ОперДата'], format='%d.%m.%Y')
    deposit_file_data['Банк(Размещение)'] = deposit_file_data['Банк(Размещение)'].astype(str).str.strip()
    deposit_file_data['Банк(Привлечение)'] = deposit_file_data['Банк(Привлечение)'].astype(str).str.strip()
    deposit_file_data['Сумма'] = deposit_file_data['Сумма'].astype(str).str.strip()
    deposit_file_data['Дата возврата'] = pd.to_datetime(deposit_file_data['Дата возврата'], format='%d.%m.%Y')
    deposit_file_data['Процентная ставка'] = deposit_file_data['Процентная ставка'].astype(float)
    deposit_file_data['Срок возврата (в днях)'] = deposit_file_data['Срок возврата (в днях)'].astype(str).str.strip()

    outdated_rows = []
    for index, row in deposit_file_data.iterrows():
        date_in = row['ОперДата']
        date_out = row['Дата возврата']
        diff_days = (date_out - date_in).days

        # 1. Normal 1-day gap → OK
        if diff_days == 1:
            continue

        # 2. Check if gap is caused by weekend/bank holiday
        current = date_in
        valid_gap = True
        while current < date_out:
            current += timedelta(days=1)

            # If current is weekday AND not a bank holiday → gap invalid
            if current.weekday() < 5 and current not in holidays_list:
                valid_gap = False
                break  # no need to check further

        if valid_gap:
            continue  # skip, gap is fine
        else:
            outdated_rows.append(index)

        # 3. If we reach here → gap is invalid, handle it
        print(f"Row {index} has invalid gap: {diff_days} days ({date_in} → {date_out})")

    removed_rows = deposit_file_data.loc[outdated_rows]
    deposit_file_data = deposit_file_data.drop(index=outdated_rows).reset_index(drop=True)

    print("Removed rows due to invalid gaps:")
    print(removed_rows)



    # ------------------------------------------------------------------------------------------------------------------
    # Calculating Repo N and M
    # ------------------------------------------------------------------------------------------------------------------

    repos_data_list = []
    applications_list_n = repo_n_file_data['Номер заявки'].astype(str).str.strip().unique().tolist()
    print(f'Number of applications: {applications_list_n}')
    for application in applications_list_n:
        for index, row in repo_n_file_data.iterrows():
            if application == row['Номер заявки']:
                applications_list_n.remove(application)
                repos_data_list.append([row['Номер заявки'], row['Ставка РЕПО (в % годовых)'], row['Сумма РЕПО (в сумах)']])
    print(f'Repo data list: {repos_data_list}')

    applications_list_m = repo_m_file_data['Номер заявки'].astype(str).str.strip().unique().tolist()
    print(f'Number of applications: {applications_list_m}')
    for application in applications_list_m:
        for index, row in repo_m_file_data.iterrows():
            if application == row['Номер заявки']:
                repos_data_list.append([row['Номер заявки'], row['Ставка РЕПО (в % годовых)'], row['Сумма РЕПО (в сумах)']])
    print(f'Update Repo data list: {repos_data_list}')

    # Sorting by rate (ascending)
    repos_data_list.sort(key=lambda x: x[1])
    total_value = 0
    for row_data in repos_data_list:
        total_value += row_data[2]


    # ------------------------------------------------------------------------
    # Calculating first way
    # ------------------------------------------------------------------------
    uzonia_calculation_way = 0
    if total_value >= 500000000000 and len(repos_data_list) >= 5:
        ten_percent_value = (total_value / 100) * 10
        day_uzonia = await calculate_day_uzonia(ten_percent_value, repos_data_list)
        uzonia_calculation_way = 1
        print(f'Calculate day uzonia: {day_uzonia} with 1 way')
    else:
        applications_deposit = deposit_file_data['Код сделки'].astype(str).str.strip().unique().tolist()
        print(f'Number of applications: {applications_deposit}')
        for application in applications_deposit:
            for index, row in deposit_file_data.iterrows():
                if application == row['Код сделки']:
                    applications_deposit.remove(application)
                    repos_data_list.append([row['Код сделки'], row['Процентная ставка'], row['Сумма']])
        print(f'Repo data list: {repos_data_list}')

        # Sorting by rate (ascending)
        repos_data_list.sort(key=lambda x: x[1])
        total_value = 0
        for row_data in repos_data_list:
            total_value += row_data[2]

    # ------------------------------------------------------------------------
    # Calculating second way
    # ------------------------------------------------------------------------
        if total_value >= 500000000000:
            ten_percent_value = (total_value / 100) * 10
            day_uzonia = await calculate_day_uzonia(ten_percent_value, repos_data_list)
            uzonia_calculation_way = 2
            print(f'Calculate day uzonia: {day_uzonia} with 2 way')
        else:
    # ------------------------------------------------------------------------
    # Calculating third way
    # ------------------------------------------------------------------------
            cb_deposit_10_percent = (cb_deposit / 100) * 10
            random_application_number = random.randint(100000, 999999)
            repos_data_list.append([random_application_number, cb_rate, cb_deposit_10_percent])

            # Sorting by rate (ascending)
            repos_data_list.sort(key=lambda x: x[1])
            total_value += cb_deposit_10_percent

            ten_percent_value = (total_value / 100) * 10
            day_uzonia = await calculate_day_uzonia(ten_percent_value, repos_data_list)
            uzonia_calculation_way = 3
            print(f'Calculate day uzonia: {day_uzonia} with 3 way')

    final_uzonia_data_dict = {'day_uzonia': day_uzonia, 'uzonia_calculation_way': uzonia_calculation_way}
    days_n_uzonias = [7, 30, 90, 180]
    for day_n_uzonia in days_n_uzonias:
        day_n_uzonias_list = await get_n_uzonia_data(days_number=day_n_uzonia)
        total_multiplied_uzonia_value = 0
        for day_n_uzonia_value in day_n_uzonias_list:
            total_multiplied_uzonia_value *= (1 + (day_n_uzonia_value / (365 * 100)))
        total_multiplied_uzonia_value -= 1
        n_day_final_uzonia_value = (total_multiplied_uzonia_value * (365 /day_n_uzonia) * 100)
        final_uzonia_data_dict[f'day_{day_n_uzonia}_uzonia'] = n_day_final_uzonia_value
        print(f'Calculated {day_n_uzonia} uzonia: {n_day_final_uzonia_value}')
    print(f'Final Uzonia: {final_uzonia_data_dict}')

    uzonia_index = (1 + (day_uzonia / (365 * 100)))
    final_uzonia_data_dict['index'] = uzonia_index
    final_uzonia_data_dict['uzonia_date'] = cb_date



    # ------------------------------------------------------------------------------------------------------------------
    # Adding Uzonia to the DB
    # ------------------------------------------------------------------------------------------------------------------

    result = await add_new_uzonia_data(file_id=file_id,rate=cb_rate, uzonia=final_uzonia_data_dict['day_uzonia'],
                                       day_7_uzonia=final_uzonia_data_dict['day_7_uzonia'],
                                       day_30_uzonia=final_uzonia_data_dict['day_30_uzonia'],
                                       day_90_uzonia=final_uzonia_data_dict['day_90_uzonia'],
                                       day_180_uzonia=final_uzonia_data_dict['day_180_uzonia'],
                                       index=final_uzonia_data_dict['index'],
                                       uzonia_date=final_uzonia_data_dict['uzonia_date'])
    if not result:
        raise HTTPException(status_code=404, detail="❌ Could not add new uzonia data!")



    # ------------------------------------------------------------------------------------------------------------------
    # Gathering Uzonia Data
    # ------------------------------------------------------------------------------------------------------------------

    from_date = date(cb_date.year - 1, 1, 1)
    filtered_image_data = await get_date_filtered_rate_uzonia(from_date=from_date)
    if not filtered_image_data:
        raise HTTPException(status_code=404, detail="❌ Could not get previous data")

    time_period_uzonia_data = await get_time_period_uzonia_data(cb_date=cb_date)
    if not time_period_uzonia_data:
        raise HTTPException(status_code=404, detail="❌ Could not get previous uzonia data")

    final_uzonia_table_data_dict = await finding_time_uzonia_calculations_func(cb_date=cb_date,
                                                                               db_time_data=time_period_uzonia_data,
                                                                               current_uzonia_calculations_dict=final_uzonia_data_dict)

    if not final_uzonia_table_data_dict:
        raise HTTPException(status_code=404, detail="❌ Could not build uzonia table data")


    # ------------------------------------------------------------------------------------------------------------------
    # Adding File Path to the DB
    # ------------------------------------------------------------------------------------------------------------------
    file_uploaded = await add_new_uzonia_upload(file_id=file_id, file_path=f'data/output_data/{file_id}/',
                                                status='progress', file_date=cb_date)
    if not file_uploaded:
        raise HTTPException(status_code=404, detail="❌ Could not add file to the DB")



    # ------------------------------------------------------------------------------------------------------------------
    # Drawing Image
    # ------------------------------------------------------------------------------------------------------------------

    output_image_file_path = f'data/output_data/{file_id}/{file_id}.png'
    image_file_path = draw_graph_data(filtered_image_data, background_path="data/input_data/image/background_image.png", output_path=output_image_file_path)
    if not image_file_path:
        raise HTTPException(status_code=404, detail="❌ Could not draw graph")

    image_file_path = draw_table_data(final_uzonia_table_data_dict, input_path=image_file_path, output_path=image_file_path)
    if not image_file_path:
        raise HTTPException(status_code=404, detail="❌ Could not draw table")



    # ------------------------------------------------------------------------------------------------------------------
    # Building Excel File
    # ------------------------------------------------------------------------------------------------------------------

    all_uzonia_data_history = await get_all_uzonia_data()
    if not all_uzonia_data_history:
        raise HTTPException(status_code=404, detail="❌ Could not get all uzonia data")

    excel_file_path = export_uzonia_to_excel(data=all_uzonia_data_history, output_path=f'data/output_data/{file_id}/{file_id}.xlsx')
    if not excel_file_path:
        raise HTTPException(status_code=404, detail="❌ Could not build excel file")


    # ------------------------------------------------------------------------------------------------------------------
    # Building Excel File
    # ------------------------------------------------------------------------------------------------------------------

    zip_folder_path = zip_and_delete_folder(folder_path=f'data/output_data/{file_id}/', zip_name=f'data/output_data/{file_id}/')
    if not zip_folder_path:
        raise HTTPException(status_code=404, detail="❌ Could not zip folder")

    # ------------------------------------------------------------------------------------------------------------------
    # Returning Everything
    # ------------------------------------------------------------------------------------------------------------------

    return {
        'file_id': file_id,
        'calculation_way': final_uzonia_data_dict['calculation_way'],
        'uzonia_date': final_uzonia_data_dict['uzonia_date'],
        'uzonia': final_uzonia_data_dict['uzonia'],
        'day_7_uzonia': final_uzonia_data_dict['day_7_uzonia'],
        'day_30_uzonia': final_uzonia_data_dict['day_30_uzonia'],
        'day_90_uzonia': final_uzonia_data_dict['day_90_uzonia'],
        'day_180_uzonia': final_uzonia_data_dict['day_180_uzonia'],
        'index': final_uzonia_data_dict['index'],
        'output_file_path': zip_folder_path,
        'filename': f"{file_id}.zip",
        'media_type': 'application/zip'
    }








































