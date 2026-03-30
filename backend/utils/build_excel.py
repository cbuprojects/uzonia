import pandas as pd
from typing import List, Dict

def export_uzonia_to_excel(data: List[Dict], output_path: str) -> str:
    """Export uzonia DB data to formatted Excel file."""

    if not data:
        raise ValueError("No data to export")

    # ── Convert to DataFrame ─────────────────────────────────────────────
    df = pd.DataFrame(data)

    # ── Rename columns to match required format ─────────────────────────
    df = df.rename(columns={
        'uzonia_date': 'Sana',
        'uzonia': 'UZONIA',
        'day_7_uzonia': '7-kunlik UZONIA',
        'day_30_uzonia': '30-kunlik UZONIA',
        'day_90_uzonia': '90-kunlik UZONIA',
        'day_180_uzonia': '180-kunlik UZONIA',
        'index': 'UZONIA indeks',
        'rate': 'Asosiy stavka'
    })

    # ── Keep only needed columns in correct order ───────────────────────
    df = df[
        [
            'Sana',
            'UZONIA',
            '7-kunlik UZONIA',
            '30-kunlik UZONIA',
            '90-kunlik UZONIA',
            '180-kunlik UZONIA',
            'UZONIA indeks',
            'Asosiy stavka'
        ]
    ]

    # ── Type formatting ─────────────────────────────────────────────────
    df['Sana'] = pd.to_datetime(df['Sana'])

    for col in df.columns[1:]:
        df[col] = df[col].astype(float)

    # ── Sort by date ascending (optional, nicer for Excel) ──────────────
    df = df.sort_values(by='Sana', ascending=False)

    # ── Save to Excel ───────────────────────────────────────────────────
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Sheet1', index=False)

    return output_path