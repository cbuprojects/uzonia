import os
import pandas as pd
from datetime import datetime

from numpy.ma.extras import unique

from .database import (check_existence_uzonia_data, add_new_uzonia_data,
                       add_holiday_data, check_existence_holiday_data, get_latest_uzonia_data, get_nth_uzonia_data)
from .bank_data import bank_holidays
from uuid import uuid4


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

        uzonia_date = row['Date']
        rate = row['Asosiy stavka'] if pd.notnull(row['Asosiy stavka']) else None
        day_uzonia = row['UZONIA'] * 100 if pd.notnull(row['UZONIA']) else None
        day_type = row['Day']
        days = row['weight']

        if index >= 1:
            latest_uzonia_value = await get_latest_uzonia_data(cb_date=uzonia_date)
            uzonia_index = latest_uzonia_value['index'] * (1 + ((day_uzonia / 100 ) * (days / 365)))

            if index >7:
                nth_index_value = await get_nth_uzonia_data(nth_value=6)
                day_7_uzonia = ((uzonia_index / nth_index_value) - 1) * 365 / 7 * 100
            else:
                day_7_uzonia = None
                day_30_uzonia = None
                day_90_uzonia = None
                day_180_uzonia = None

                if index > 29:
                    nth_index_value = await get_nth_uzonia_data(nth_value=29)
                    day_30_uzonia = ((uzonia_index / nth_index_value) - 1) * 365 / 7 * 100

                else:
                    day_90_uzonia = None
                    day_180_uzonia = None



                    if index > 179:
                        nth_index_value = await get_nth_uzonia_data(nth_value=179)
                        day_90_uzonia = ((uzonia_index / nth_index_value) - 1) * 365 / 7 * 100

                    else:
                        day_180_uzonia = None

        else:
            next_index = index + 1

            # Get next row safely
            if next_index < len(uzonia_data):
                next_row = uzonia_data.iloc[next_index]  # or .loc[next_index] if index is default
                uzonia_index = next_row['UZONIA index'] if pd.notnull(row['UZONIA index']) else None
                day_7_uzonia = next_row['7-day UZONIA'] * 100 if pd.notnull(row['7-day UZONIA']) else None
                day_30_uzonia = next_row['30-day UZONIA'] * 100 if pd.notnull(row['30-day UZONIA']) else None
                day_90_uzonia = next_row['90-day UZONIA'] * 100 if pd.notnull(row['90-day UZONIA']) else None
                day_180_uzonia = next_row['180-day UZONIA']* 100 if pd.notnull(row['180-day UZONIA']) else None
            else:
                uzonia_index = row['UZONIA index'] if pd.notnull(row['UZONIA index']) else None
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



