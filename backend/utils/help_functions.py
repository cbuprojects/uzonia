from datetime import datetime, timedelta, date
from typing import  Dict
from .database import get_single_uzonia_data, get_year_first_uzonia_data, get_latest_uzonia_data
import shutil
import io
import os
import zipfile


async def time_period_uzonia_func(cb_date: date, db_time_data: list) -> Dict:

    time_period_uzonia_calculations_dict = {}
    uzonia_time_calculations = {7:6, 30:20, 90:64, 180:126, 365:250}
    # Loop over periods
    for n_period_key, n_period_value in uzonia_time_calculations.items():
        value = db_time_data[n_period_value-1][1]
        time_period_uzonia_calculations_dict[f'n_period_{n_period_key}'] = value


    ytd_date = date(year=cb_date.year, month=1, day=1)
    ytd_data = await get_year_first_uzonia_data(year_first_date=ytd_date)
    ytd_value = ytd_data['uzonia']
    time_period_uzonia_calculations_dict[f'ytd'] = ytd_value

    last_work_data = await get_latest_uzonia_data(cb_date=cb_date)
    time_period_uzonia_calculations_dict[f'last_work_date'] = last_work_data['uzonia_date']

    return time_period_uzonia_calculations_dict


async def finding_time_uzonia_calculations_func(cb_date: date, db_time_data: list,
                                               current_uzonia_calculations_dict: dict) -> Dict:
    time_period_uzonia_calculations_dict = await time_period_uzonia_func(cb_date, db_time_data)
    if not time_period_uzonia_calculations_dict:
        return {}

    previous_date_data = await get_single_uzonia_data(uzonia_date=time_period_uzonia_calculations_dict['last_work_date'])

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