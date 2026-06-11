import os
import random
import pandas as pd
from datetime import datetime
from zoneinfo import ZoneInfo
from .database import (check_existence_uzonia_data, add_new_uzonia_data,
                       add_holiday_data, check_existence_holiday_data,
                       get_latest_uzonia_data, get_nth_uzonia_data,
                       check_existence_bank_data, add_bank_data)
from .bank_data import bank_holidays, bank_names
from uuid import uuid4

tz = ZoneInfo('Asia/Tashkent')

def safe_float(val):
    return float(val) if pd.notnull(val) else None


async def add_all_uzonia_data_to_the_db() -> bool:
    file_path = 'data/excels/all_uzonia_rates.xlsx'
    checking_existence = await check_existence_uzonia_data()
    if checking_existence:
        return False

    file_id = str(uuid4().hex[:12])

    uzonia_data = pd.read_excel(file_path)
    print('Columns:', uzonia_data.columns.tolist())
    uzonia_data['Day'] = uzonia_data['Day'].astype(str)
    uzonia_data['Date'] = pd.to_datetime(uzonia_data['Date'], format='%d.%m.%Y')
    uzonia_data['UZONIA'] = uzonia_data['UZONIA'].astype(float)
    uzonia_data['weight'] = uzonia_data['weight'].astype(int)
    uzonia_data['Asosiy stavka'] = uzonia_data['Asosiy stavka'].astype(int)

    cols = ['UZONIA', '7-day UZONIA', '30-day UZONIA', '90-day UZONIA',
            '180-day UZONIA', 'UZONIA index']

    for col in cols:
        uzonia_data[col] = pd.to_numeric(
            uzonia_data[col].astype(str)  # make sure it's string
            .str.replace('%', '', regex=False)  # 13.1354% -> 13.1354
            .str.replace(',', '.', regex=False)  # 13,1354 -> 13.1354
            .str.strip()  # ' 13.1 ' -> '13.1'
            .replace('', pd.NA)  # empty string -> NaN
            .replace('-', pd.NA),  # dash -> NaN
            errors='coerce'  # ' ' or 'Day-off' -> NaN
        )


    for index, row in uzonia_data.iterrows():

        if row['UZONIA'] is None:
            break

        uzonia_date = row['Date'].date()
        rate = row['Asosiy stavka'] if pd.notnull(row['Asosiy stavka']) else None
        day_uzonia = row['UZONIA'] * 100 if pd.notnull(row['UZONIA']) else None
        day_type = row['Day'].strip()
        days = row['weight']

        # day_7_uzonia=None
        # day_30_uzonia=None
        # day_90_uzonia=None
        # day_180_uzonia=None
        #
        # if index == 0:
        #     uzonia_index = 100.0000
        #
        # else:
        #     latest_uzonia_value = await get_latest_uzonia_data(cb_date=uzonia_date)
        #     print(latest_uzonia_value)
        #     uzonia_index = latest_uzonia_value['index'] * (1 + ((day_uzonia / 100 ) * (days / 365)))
        #
        #     if index >7:
        #         nth_index_value = await get_nth_uzonia_data(nth_value=6)
        #         day_7_uzonia = ((uzonia_index / nth_index_value) - 1) * 365 / 7 * 100
        #
        #         if index > 29:
        #             nth_index_value = await get_nth_uzonia_data(nth_value=29)
        #             day_30_uzonia = ((uzonia_index / nth_index_value) - 1) * 365 / 30 * 100
        #
        #             if index > 89:
        #                 nth_index_value = await get_nth_uzonia_data(nth_value=89)
        #                 day_90_uzonia = ((uzonia_index / nth_index_value) - 1) * 365 / 90 * 100
        #
        #                 if index > 179:
        #                     nth_index_value = await get_nth_uzonia_data(nth_value=179)
        #                     day_180_uzonia = ((uzonia_index / nth_index_value) - 1) * 365 / 180 * 100


        next_index = index + 1

        # Get next row safely
        if next_index < len(uzonia_data):
            next_row = uzonia_data.iloc[next_index]  # or .loc[next_index] if index is default
            uzonia_index = next_row['UZONIA index'] if pd.notnull(row['UZONIA index']) else None
            print(f'Next index:', next_row, f'Uzonia index value: {uzonia_index}')
            day_7_uzonia = next_row['7-day UZONIA'] * 100 if pd.notnull(row['7-day UZONIA']) else None
            day_30_uzonia = next_row['30-day UZONIA'] * 100 if pd.notnull(row['30-day UZONIA']) else None
            day_90_uzonia = next_row['90-day UZONIA'] * 100 if pd.notnull(row['90-day UZONIA']) else None
            day_180_uzonia = next_row['180-day UZONIA']* 100 if pd.notnull(row['180-day UZONIA']) else None
        else:
            uzonia_index = row['UZONIA index'] if pd.notnull(row['UZONIA index']) else None
            print(f'index:', row, f'Uzonia index value: {uzonia_index}')
            day_7_uzonia = row['7-day UZONIA'] * 100 if pd.notnull(row['7-day UZONIA']) else None
            day_30_uzonia = row['30-day UZONIA'] * 100 if pd.notnull(row['30-day UZONIA']) else None
            day_90_uzonia = row['90-day UZONIA'] * 100 if pd.notnull(row['90-day UZONIA']) else None
            day_180_uzonia = row['180-day UZONIA'] * 100 if pd.notnull(row['180-day UZONIA']) else None

        unique_job_id = str(uuid4().hex)

        result = await add_new_uzonia_data(unique_job_id=unique_job_id, file_id=file_id, day_type=day_type,
                                           rate=rate, uzonia=day_uzonia, day_7_uzonia=day_7_uzonia,
                                           day_30_uzonia=day_30_uzonia, day_90_uzonia=day_90_uzonia,
                                           day_180_uzonia=day_180_uzonia, index=uzonia_index,
                                           uzonia_date=uzonia_date, days=days)
        print(f'{index}.Added new uzonia data: {uzonia_date}, {result}')

    return True


async def add_new_holiday_data_to_the_db() -> bool:
    checking_existence = await check_existence_holiday_data()
    if checking_existence:
        return False

    for bank_holiday in bank_holidays:
        unique_job_id = str(uuid4().hex)
        holiday_date = bank_holiday['holiday_date']
        description = bank_holiday['description']
        result = await add_holiday_data(unique_job_id=unique_job_id, holiday_date=holiday_date, description=description)
        if result:
            print(f'Added new holiday data: {holiday_date}, {description}')
    return True


async def add_new_bank_data_to_the_db() -> bool:
    checking_existence = await check_existence_bank_data()
    if checking_existence:
        return False

    for bank_name in bank_names:
        unique_job_id = str(uuid4().hex)
        unique_bank_id = random.randint(100000, 999999)
        result = await add_bank_data(unique_job_id=unique_job_id, unique_bank_id=unique_bank_id, bank_name=bank_name, created_at=datetime.now(tz))
        if result:
            print(f'Added new bank data: {bank_name}')
    return True


