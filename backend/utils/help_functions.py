from datetime import datetime, timedelta, date
from typing import  Dict
from .database import get_single_uzonia_data
import shutil
import io
import os
import zipfile


async def adjust_for_weekends_func(target_date: date) -> date:
    """Move backward if the date falls on Saturday or Sunday."""
    while target_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
        target_date -= timedelta(days=1)
    return target_date


async def find_last_available_date_func(target_date: date, db_time_date: dict) -> date:
    """
    Adjust for weekends and missing data:
    Keep moving backward until a date exists in db.
    """
    new_date = await adjust_for_weekends_func(target_date)
    while new_date not in db_time_date.keys():
        new_date -= timedelta(days=1)
        new_date = await adjust_for_weekends_func(new_date)
    return new_date


async def time_period_uzonia_func(cb_date: date, db_time_data: dict) -> Dict:

    time_period_uzonia_calculations_dict = {}
    uzonia_time_calculations = [7, 30, 90, 180, 365]
    # Loop over periods
    for n_period in uzonia_time_calculations:
        target_date = cb_date - timedelta(days=n_period)
        valid_date = await find_last_available_date_func(target_date, db_time_data)
        value = db_time_data[valid_date]
        time_period_uzonia_calculations_dict[f'n_period_{n_period}'] = value

    previous_year = cb_date.year - 1
    ytd_date = date(year=previous_year, month=12, day=31)
    ytd_date = await find_last_available_date_func(ytd_date, db_time_data)
    ytd_value = db_time_data[ytd_date]
    time_period_uzonia_calculations_dict[f'ytd'] = ytd_value

    last_work_day = cb_date - timedelta(days=1)
    last_work_date = await find_last_available_date_func(last_work_day, db_time_data)
    time_period_uzonia_calculations_dict[f'last_work_date'] = last_work_date

    return time_period_uzonia_calculations_dict


async def finding_time_uzonia_calculations_func(cb_date: date, db_time_data: dict,
                                               current_uzonia_calculations_dict: dict) -> Dict:
    time_period_uzonia_calculations_dict = await time_period_uzonia_func(cb_date, db_time_data)
    if not time_period_uzonia_calculations_dict:
        return {}

    previous_date_data = await get_single_uzonia_data(uzonia_date=time_period_uzonia_calculations_dict['last_work_date'])
    if previous_date_data is None:
        return {}

    current_uzonia = current_uzonia_calculations_dict['uzonia']

    day_1_diff = current_uzonia - previous_date_data['uzonia']
    day_7_diff = current_uzonia_calculations_dict['day_7_uzonia'] - previous_date_data['day_7_uzonia']
    day_30_diff = current_uzonia_calculations_dict['day_30_uzonia'] - previous_date_data['day_30_uzonia']
    day_90_diff = current_uzonia_calculations_dict['day_90_uzonia'] - previous_date_data['day_90_uzonia']
    day_180_diff = current_uzonia_calculations_dict['day_180_uzonia'] -  previous_date_data['day_180_uzonia']
    index_diff = current_uzonia_calculations_dict['index'] - previous_date_data['index']

    period_7_diff = current_uzonia - time_period_uzonia_calculations_dict['n_period_7']
    period_30_diff = current_uzonia - time_period_uzonia_calculations_dict['n_period_30']
    period_90_diff = current_uzonia - time_period_uzonia_calculations_dict['n_period_90']
    period_180_diff = current_uzonia -  time_period_uzonia_calculations_dict['n_period_180']
    period_365_diff = current_uzonia - time_period_uzonia_calculations_dict['n_period_365']
    period_ytd_diff = current_uzonia - time_period_uzonia_calculations_dict['ytd']

    final_uzonia_table_data_dict = {
        'uzonia_date': current_uzonia_calculations_dict['uzonia_date'],
        'day_uzonia': current_uzonia_calculations_dict['uzonia'],
        'day_7_uzonia': current_uzonia_calculations_dict['day_7_uzonia'],
        'day_30_uzonia': current_uzonia_calculations_dict['day_30_uzonia'],
        'day_90_uzonia': current_uzonia_calculations_dict['day_90_uzonia'],
        'day_180_uzonia': current_uzonia_calculations_dict['day_180_uzonia'],
        'index': current_uzonia_calculations_dict['index'],

        'prev_uzonia_date': previous_date_data['uzonia_date'],
        'prev_day_uzonia': previous_date_data['uzonia'],
        'prev_day_7_uzonia': previous_date_data['day_7_uzonia'],
        'prev_day_30_uzonia': previous_date_data['day_30_uzonia'],
        'prev_day_90_uzonia': previous_date_data['day_90_uzonia'],
        'prev_day_180_uzonia': previous_date_data['day_180_uzonia'],
        'prev_index': previous_date_data['index'],

        'day_1_diff': day_1_diff,
        'day_7_diff': day_7_diff,
        'day_30_diff': day_30_diff,
        'day_90_diff': day_90_diff,
        'day_180_diff': day_180_diff,
        'index_diff': index_diff,

        'period_7_diff': period_7_diff,
        'period_30_diff': period_30_diff,
        'period_90_diff': period_90_diff,
        'period_180_diff': period_180_diff,
        'period_365_diff': period_365_diff,
        'period_ytd_diff': period_ytd_diff,
    }

    return final_uzonia_table_data_dict


def stream_zip_from_folder(folder_path: str):
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_STORED) as zipf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, folder_path)
                zipf.write(full_path, arcname)

    # ⭐ THIS IS THE MISSING STEP ⭐
    zip_buffer.seek(0)
    return zip_buffer