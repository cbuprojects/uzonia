from datetime import datetime, timedelta, date
from typing import  Dict
from .database import get_single_uzonia_data
import shutil
import os


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
        print(f"{n_period}-day period: {valid_date} → value = {value}")

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

    previous_date_data = await get_single_uzonia_data(uzonia_date=time_period_uzonia_func['last_work_date'])
    if previous_date_data is None:
        return {}

    current_uzonia = current_uzonia_calculations_dict['day_uzonia']

    day_1_diff = previous_date_data['uzonia'] - current_uzonia
    day_7_diff = previous_date_data['day_7_uzonia'] - current_uzonia_calculations_dict['day_7_uzonia']
    day_30_diff = previous_date_data['day_30_uzonia'] - current_uzonia_calculations_dict['day_30_uzonia']
    day_90_diff = previous_date_data['day_90_uzonia'] - current_uzonia_calculations_dict['day_90_uzonia']
    day_180_diff = previous_date_data['day_180_uzonia'] - current_uzonia_calculations_dict['day_180_uzonia']
    index_diff = previous_date_data['index'] - current_uzonia_calculations_dict['index']

    period_7_diff = time_period_uzonia_calculations_dict['n_period_7'] - current_uzonia
    period_30_diff = time_period_uzonia_calculations_dict['n_period_30'] - current_uzonia
    period_90_diff = time_period_uzonia_calculations_dict['n_period_90'] - current_uzonia
    period_180_diff = time_period_uzonia_calculations_dict['n_period_180'] - current_uzonia
    period_365_diff = current_uzonia_calculations_dict['n_period_365'] - current_uzonia
    period_ytd_diff = current_uzonia_calculations_dict['ytd'] - current_uzonia

    final_uzonia_table_data_dict = {
        'uzonia_calculation_way': current_uzonia_calculations_dict['uzonia_calculation_way'],
        'uzonia_date': current_uzonia_calculations_dict['uzonia_date'],
        'day_uzonia': current_uzonia_calculations_dict['day_uzonia'],
        'day_7_uzonia': current_uzonia_calculations_dict['day_7_uzonia'],
        'day_30_uzonia': current_uzonia_calculations_dict['day_30_uzonia'],
        'day_90_uzonia': current_uzonia_calculations_dict['day_90_uzonia'],
        'day_180_uzonia': current_uzonia_calculations_dict['day_180_uzonia'],
        'index': current_uzonia_calculations_dict['index'],

        'prev_uzonia_date': previous_date_data['uzonia_date'],
        'prev_day_uzonia': previous_date_data['day_uzonia'],
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


def zip_and_delete_folder(folder_path: str, zip_name: str = None) -> str:
    """Zip a folder and delete the original."""

    if not os.path.exists(folder_path):
        raise ValueError("Folder does not exist")

    # If zip name not provided → use folder name
    if not zip_name:
        zip_name = folder_path.rstrip("/\\").split("/")[-1]

    # Create zip (no .zip extension here)
    zip_path = shutil.make_archive(zip_name, 'zip', folder_path)

    # Delete original folder
    shutil.rmtree(folder_path)

    return zip_path