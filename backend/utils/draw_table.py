from PIL import Image, ImageDraw, ImageFont
from datetime import date
from typing import Optional


# ── Design colours ────────────────────────────────────────────────────────────
COLOR_DARK_BLUE  = "#0D3354"   # dates and main values
COLOR_GREEN      = "#00A000"   # positive change  ▲
COLOR_RED        = "#FF0000"   # negative change  ▼
COLOR_NEUTRAL    = "#555555"   # zero change

# ── Table cell centres (measured on 1434×1800 example image) ─────────────────
#
#  MAIN TABLE
#  Columns (x):  Sana=152, 1day=340, 7day=528, 30day=717,
#                90day=905, 180day=1093, INDEX=1281
#  Rows (y):     header=941(skip), row1=1055, row2=1143, change=1232
#
#  PERIOD SECTION  (bottom light-blue block)
#  Columns (x):  left=278, middle=717, right=1156
#  Row-1 cells:  label_y=1390, value_y=1460   (week / month / 3-month)
#  Row-2 cells:  label_y=1605, value_y=1675   (6-month / YTD / 1-year)

TABLE_COL_X = [152, 340, 528, 717, 905, 1093, 1281]
# indices:       0    1    2    3    4    5      6
# meaning:      date 1d   7d   30d  90d  180d  INDEX

TABLE_ROW_Y = [1055, 1143, 1232]
# indices:       0      1      2
# meaning:     row1   row2  change

PERIOD_COL_X = [300, 717, 1125]
PERIOD_ROW1_LABEL_Y = 1390
PERIOD_ROW1_VALUE_Y = 1500
PERIOD_ROW2_LABEL_Y = 1580
PERIOD_ROW2_VALUE_Y = 1670


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates_bold = "../data/input_data/fonts/arialbd.ttf"
    candidates_normal = "../data/input_data/fonts/arial.ttf"
    if bold:
        path = candidates_bold
    else:
        path = candidates_normal

    try:
        return ImageFont.truetype(path, size)
    except Exception:
        pass
    return ImageFont.load_default()


def _diff_color(value: float) -> str:
    if value > 0:
        return COLOR_GREEN
    if value < 0:
        return COLOR_RED
    return COLOR_NEUTRAL


def _diff_arrow(value: float) -> str:
    if value > 0:
        return "▲"
    if value < 0:
        return "▼"
    return ""


def _fmt_rate(value: float) -> str:
    """Format a rate: '13,7928%'  (comma decimal, 4 dp, Uzbek style)."""
    return f"{value:.4f}%".replace(".", ",")


def _fmt_index(value: float) -> str:
    """Format the UZONIA index: '175,5559'."""
    return f"{value:.4f}".replace(".", ",")


def _fmt_diff(value: float) -> str:
    """Format a diff value with sign and 4 dp: '+0,0249%'."""
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.4f}%".replace(".", ",")


def _fmt_diff_index(value: float) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.4f}".replace(".", ",")


def _fmt_period(value: float) -> str:
    """Format period change: '▲ 0.2697%' (dot decimal, English style)."""
    arrow = _diff_arrow(value)
    abs_val = abs(value)
    if arrow:
        return f"{arrow} {abs_val:.4f}%"
    return f"{abs_val:.4f}%"


def _draw_centered(draw: ImageDraw.ImageDraw,
                   text: str, cx: int, cy: int,
                   font: ImageFont.FreeTypeFont,
                   fill: str) -> None:
    """Draw text centred on (cx, cy)."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2), text, font=font, fill=fill)


def _fmt_date(d) -> str:
    """Format date as DD/MM/YYYY."""
    if isinstance(d, date):
        return d.strftime("%d/%m/%Y")
    return str(d)


# ── Main function ─────────────────────────────────────────────────────────────

def draw_table_data(table_data: dict, input_path: str,
                    output_path: Optional[str] = None) -> str:
    """
    Draw all table values onto the UZONIA background image.

    Parameters
    ----------
    table_data : dict  — output of finding_time_uzonia_calculations_func()
        Required keys
        ─────────────
        uzonia_date        – date  : current date
        day_uzonia         – float : current 1-day UZONIA rate
        day_7_uzonia       – float : current 7-day rate
        day_30_uzonia      – float : current 30-day rate
        day_90_uzonia      – float : current 90-day rate
        day_180_uzonia     – float : current 180-day rate
        index              – float : current UZONIA index

        prev_uzonia_date   – date  : previous working date
        prev_day_uzonia    – float
        prev_day_7_uzonia  – float
        prev_day_30_uzonia – float
        prev_day_90_uzonia – float
        prev_day_180_uzonia– float
        prev_index         – float

        day_1_diff         – float : change in 1-day rate
        day_7_diff         – float
        day_30_diff        – float
        day_90_diff        – float
        day_180_diff       – float
        index_diff         – float

        period_7_diff      – float : 1-week change  (haftalik)
        period_30_diff     – float : 1-month change (oylik)
        period_90_diff     – float : 3-month change
        period_180_diff    – float : 6-month change
        period_ytd_diff    – float : YTD change
        period_365_diff    – float : 1-year change

    input_path  : str  — path to the blank background PNG
    output_path : str  — where to save; defaults to input_path + '_filled.png'

    Returns
    -------
    str — path to the saved image
    """
    if not table_data:
        raise ValueError("table_data is empty")

    if output_path is None:
        output_path = input_path.replace(".png", "_filled.png")

    img  = Image.open(input_path).convert("RGBA")
    draw = ImageDraw.Draw(img)

    # Scale factor in case background image differs slightly from 1434×1800
    iw, ih = img.size
    sx = iw / 1434
    sy = ih / 1800

    def cx(x): return int(x * sx)
    def cy(y): return int(y * sy)

    # Fonts
    font_value  = _load_font(int(30 * sx))   # main rate values
    font_date   = _load_font(int(30 * sx))               # date cells
    font_diff   = _load_font(int(30 * sx))    # change row
    font_period = _load_font(int(32 * sx), bold=True)    # period section values

    # ── MAIN TABLE ────────────────────────────────────────────────────────────
    #
    # Columns: [date, 1d, 7d, 30d, 90d, 180d, INDEX]
    # Rows:    [row1 (current), row2 (previous), change]


    # Row 1  — previous date
    _draw_centered(draw,
                   _fmt_date(table_data['prev_uzonia_date']),
                   cx(TABLE_COL_X[0]), cy(TABLE_ROW_Y[0]),
                   font_date, COLOR_DARK_BLUE)
    for col_i, key in enumerate(
            ['prev_day_uzonia', 'prev_day_7_uzonia', 'prev_day_30_uzonia',
             'prev_day_90_uzonia', 'prev_day_180_uzonia'], start=1):
        _draw_centered(draw,
                       _fmt_rate(table_data[key]),
                       cx(TABLE_COL_X[col_i]), cy(TABLE_ROW_Y[0]),
                       font_value, COLOR_DARK_BLUE)
    _draw_centered(draw,
                   _fmt_index(table_data['prev_index']),
                   cx(TABLE_COL_X[6]), cy(TABLE_ROW_Y[0]),
                   font_value, COLOR_DARK_BLUE)

    # Row 2  — current date
    _draw_centered(draw,
                   _fmt_date(table_data['uzonia_date']),
                   cx(TABLE_COL_X[0]), cy(TABLE_ROW_Y[1]),
                   font_date, COLOR_DARK_BLUE)
    for col_i, key in enumerate(
            ['day_uzonia', 'day_7_uzonia', 'day_30_uzonia',
             'day_90_uzonia', 'day_180_uzonia'], start=1):
        _draw_centered(draw,
                       _fmt_rate(table_data[key]),
                       cx(TABLE_COL_X[col_i]), cy(TABLE_ROW_Y[1]),
                       font_value, COLOR_DARK_BLUE)
    _draw_centered(draw,
                   _fmt_index(table_data['index']),
                   cx(TABLE_COL_X[6]), cy(TABLE_ROW_Y[1]),
                   font_value, COLOR_DARK_BLUE)

    # Row 3  — O'zgarishi / Change  (coloured by sign)
    diff_keys = ['day_1_diff', 'day_7_diff', 'day_30_diff',
                 'day_90_diff', 'day_180_diff']
    for col_i, key in enumerate(diff_keys, start=1):
        val = table_data[key]
        _draw_centered(draw,
                       _fmt_diff(val),
                       cx(TABLE_COL_X[col_i]), cy(TABLE_ROW_Y[2]),
                       font_diff, _diff_color(val))
    idx_diff = table_data['index_diff']
    _draw_centered(draw,
                   _fmt_diff_index(idx_diff),
                   cx(TABLE_COL_X[6]), cy(TABLE_ROW_Y[2]),
                   font_diff, _diff_color(idx_diff))

    # ── PERIOD SECTION ────────────────────────────────────────────────────────
    #
    # Row 1:  [haftalik/week | oylik/month | 3 oylik/3-month]
    # Row 2:  [6 oylik/month | YTD         | 1 yillik/year  ]

    period_row1 = [
        ('period_7_diff',   "1 haftalik/week"),
        ('period_30_diff',  "1 oylik/month"),
        ('period_90_diff',  "3 oylik/month"),
    ]
    period_row2 = [
        ('period_180_diff', "6 oylik/month"),
        ('period_ytd_diff', "Joriy yil boshidan/YTD"),
        ('period_365_diff', "1 yillik/year"),
    ]

    font_period_label = _load_font(int(24 * sx))  # italic-style label (no true italic)

    for col_i, (key, _label) in enumerate(period_row1):
        val = table_data[key]
        _draw_centered(draw,
                       _fmt_period(val),
                       cx(PERIOD_COL_X[col_i]), cy(PERIOD_ROW1_VALUE_Y),
                       font_period, _diff_color(val))

    for col_i, (key, _label) in enumerate(period_row2):
        val = table_data[key]
        _draw_centered(draw,
                       _fmt_period(val),
                       cx(PERIOD_COL_X[col_i]), cy(PERIOD_ROW2_VALUE_Y),
                       font_period, _diff_color(val))

    # ── Save ──────────────────────────────────────────────────────────────────
    img = img.convert("RGB")
    img.save(output_path)
    return output_path



# ── Sample table_data ─────────────────────────────────────────────────────────
# Built from Book1.xlsx real values (18.03.2026 and 17.03.2026)
# Multi-tenor rates (7d/30d/90d/180d) and index come from the uzonia_data DB table;
# representative values derived from the real 1-day rate are used here.
#
# Period reference points (from DB):
#   1 haftalik  → 11.03.2026 : 13.6467%
#   1 oylik     → 16.02.2026 : 13.5364%
#   3 oylik     → 18.12.2025 : 13.8013%
#   6 oylik     → 19.09.2025 : 13.6167%
#   YTD base    → 30.12.2025 : 13.5181%  (last working day of 2025)
#   1 yillik    → 18.03.2025 : 12.7919%

table_data = {
    # ── Current date row (18/03/2026) ─────────────────────────────────────────
    'uzonia_date':        date(2026, 3, 18),
    'day_uzonia':         13.7091,   # 1-day UZONIA rate
    'day_7_uzonia':       13.4591,   # 7-day rate
    'day_30_uzonia':      13.6791,   # 30-day rate
    'day_90_uzonia':      14.0191,   # 90-day rate
    'day_180_uzonia':     14.0791,   # 180-day rate
    'index':              176.4200,  # UZONIA index (05.01.2022=100)

    # ── Previous working day row (17/03/2026) ──────────────────────────────────
    'prev_uzonia_date':   date(2026, 3, 17),
    'prev_day_uzonia':    13.7290,
    'prev_day_7_uzonia':  13.4490,
    'prev_day_30_uzonia': 13.6790,
    'prev_day_90_uzonia': 14.0190,
    'prev_day_180_uzonia':14.0790,
    'prev_index':         176.3537,

    # ── O'zgarishi / Change row  (current − previous) ─────────────────────────
    'day_1_diff':        -0.0199,   # red   ▼
    'day_7_diff':         0.0101,   # green ▲
    'day_30_diff':        0.0001,   # green ▲
    'day_90_diff':        0.0001,   # green ▲
    'day_180_diff':       0.0001,   # green ▲
    'index_diff':         0.0663,   # green ▲

    # ── Period changes  (current 1-day rate − rate N periods ago) ─────────────
    'period_7_diff':      0.0624,   # ▲  1 haftalik/week   (vs 11.03.2026)
    'period_30_diff':     0.1727,   # ▲  1 oylik/month     (vs 16.02.2026)
    'period_90_diff':    -0.0922,   # ▼  3 oylik/month     (vs 18.12.2025)
    'period_180_diff':    0.0924,   # ▲  6 oylik/month     (vs 19.09.2025)
    'period_ytd_diff':    0.1910,   # ▲  Joriy yil boshidan/YTD (vs 30.12.2025)
    'period_365_diff':    0.9172,   # ▲  1 yillik/year     (vs 18.03.2025)
}
