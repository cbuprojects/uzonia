import os
import pandas as pd
from datetime import datetime
from .database import check_existence_uzonia_data, add_new_uzonia_data, add_holiday_data, check_existence_holiday_data
from .bank_data import bank_holidays
from uuid import uuid4


def safe_float(val):
    return float(val) if pd.notnull(val) else None


async def add_new_uzonia_data_to_the_db() -> bool:
    file_path = 'data/excels/uzonia_data_history.xlsx'
    checking_existence = await check_existence_uzonia_data()
    if checking_existence:
        return False

    file_id = str(uuid4().hex[:12])

    uzonia_data = pd.read_excel(file_path, sheet_name='Sheet1')
    uzonia_data['Sana'] = pd.to_datetime(uzonia_data['Sana'], format='%d.%m.%Y')
    uzonia_data['UZONIA'] = uzonia_data['UZONIA'].astype(float)
    uzonia_data['7-kunlik UZONIA'] = uzonia_data['7-kunlik UZONIA'].astype(float)
    uzonia_data['30-kunlik UZONIA'] = uzonia_data['30-kunlik UZONIA'].astype(float)
    uzonia_data['90-kunlik UZONIA'] = uzonia_data['90-kunlik UZONIA'].astype(float)
    uzonia_data['180-kunlik UZONIA'] = uzonia_data['180-kunlik UZONIA'].astype(float)
    uzonia_data['UZONIA indeks'] = uzonia_data['UZONIA indeks'].astype(float)
    uzonia_data['Asosiy stavka'] = uzonia_data['Asosiy stavka'].astype(float)

    for index, row in uzonia_data.iterrows():
        uzonia_date = row['Sana']
        next_index = index + 1

        if next_index > (len(uzonia_data) - 1):
            next_index = index

        next_date = uzonia_data.at[next_index, 'Sana']
        days = (uzonia_date - next_date).days

        rate = row['Asosiy stavka'] if pd.notnull(row['Asosiy stavka']) else None
        day_uzonia = row['UZONIA'] if pd.notnull(row['UZONIA']) else None
        day_7_uzonia = row['7-kunlik UZONIA'] if pd.notnull(row['7-kunlik UZONIA']) else None
        day_30_uzonia = row['30-kunlik UZONIA'] if pd.notnull(row['30-kunlik UZONIA']) else None
        day_90_uzonia = row['90-kunlik UZONIA'] if pd.notnull(row['90-kunlik UZONIA']) else None
        day_180_uzonia = row['180-kunlik UZONIA'] if pd.notnull(row['180-kunlik UZONIA']) else None
        uzonia_index = row['UZONIA indeks'] if pd.notnull(row['UZONIA indeks']) else None

        result = await add_new_uzonia_data(file_id=file_id, rate=rate, uzonia=day_uzonia, day_7_uzonia=day_7_uzonia,
                                  day_30_uzonia=day_30_uzonia, day_90_uzonia=day_90_uzonia,
                                  day_180_uzonia=day_180_uzonia, index=uzonia_index, uzonia_date=uzonia_date, days=days)
        print(f'{index}.Added new uzonia data: {uzonia_date}, {result}')

    return True


async def add_new_holiday_data_to_the_db() -> bool:
    checking_existence = await check_existence_holiday_data()
    if checking_existence:
        return False

    for bank_holiday in bank_holidays:
        holiday_date = bank_holiday['holiday_date']
        description = bank_holiday['description']
        result = await add_holiday_data(holiday_date=holiday_date, description=description)
        if result:
            print(f'Added new holiday data: {holiday_date}, {description}')
    return True



