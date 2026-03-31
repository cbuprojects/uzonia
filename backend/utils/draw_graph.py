from PIL import Image, ImageDraw, ImageFont
from datetime import date, datetime
from typing import List, Dict
import math
import os


# ──────────────────────────────────────────────
# Constants — measured against the background image
# Background image is roughly 990 × 1404 px
# ──────────────────────────────────────────────

# Graph canvas inside the white area of the background
GRAPH_LEFT   = 100    # x start (leave room for Y-axis labels)
GRAPH_RIGHT  = 1300   # x end
GRAPH_TOP    = 400   # y start (just below the header band)
GRAPH_BOTTOM = 700   # y end (just above the table)

GRAPH_W = 1200
GRAPH_H = 350

# Design colours (match the example image)
COLOR_UZONIA        = "#1565C0"   # blue line  — UZONIA rate
COLOR_ASOSIY        = "#C62828"   # red line   — Asosiy stavka (base rate)
COLOR_UPPER_BOUND   = "#2E7D32"   # green line — Yuqori chegara
COLOR_LOWER_BOUND   = "#2E7D32"   # green line — Quyi chegara
COLOR_GRID          = "#CCCCCC"   # light grey grid
COLOR_AXIS_TEXT     = "#000000"
COLOR_LAST_LABEL    = "#1565C0"   # bold value label at the right end

# Y-axis tick range and step (auto-expanded from data in draw_graph)
Y_MIN  = 10.0   # % — default, overridden dynamically
Y_MAX  = 17.0   # % — default, overridden dynamically
Y_STEP =  1.0   # %


def _load_font(size: int, bold: bool = False):
    """Try to load a system font, fall back to PIL default."""
    candidates_bold = "data/input_data/fonts/arialbd.ttf"
    candidates_normal = "data/input_data/fonts/arial.ttf"
    if bold:
        path = candidates_bold
    else:
        path = candidates_normal

    try:
        return ImageFont.truetype(path, size)
    except Exception:
        pass
    return ImageFont.load_default()


def _rate_to_y(rate: float) -> float:
    """Convert a rate (%) to a pixel Y coordinate inside the graph area."""
    clamped = max(Y_MIN, min(Y_MAX, rate))
    fraction = (clamped - Y_MIN) / (Y_MAX - Y_MIN)
    return GRAPH_BOTTOM - fraction * GRAPH_H   # inverted: higher rate → lower y


def _index_to_x(i: int, total: int) -> float:
    """Convert a data-point index to a pixel X coordinate."""
    if total <= 1:
        return GRAPH_LEFT
    return GRAPH_LEFT + (i / (total - 1)) * GRAPH_W


def _month_label(d: date) -> str:
    """Return a short Uzbek month abbreviation."""
    UZ_MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May",
                 "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"]
    if d.year == datetime.now().year:
        month_name = ''
    else:
        month_name = UZ_MONTHS[d.month - 1]
    return month_name


def _draw_dashed_polyline(draw, points: List[tuple], fill, width=3, dash=8, gap=6):
    """
    Draw a dashed line that follows a polyline of (x, y) points.

    Works correctly even with many closely-spaced points (e.g. one per day):
    it walks a continuous 'distance budget' across all segments so dashes
    and gaps never reset between data points — the pattern flows smoothly
    from start to finish regardless of point density.

    Parameters
    ----------
    draw   : ImageDraw.Draw instance
    points : list of (x, y) tuples — the polyline vertices
    fill   : dash colour
    width  : line width in pixels
    dash   : length of each dash in pixels
    gap    : length of each gap in pixels
    """
    if len(points) < 2:
        return

    period = dash + gap  # one full on+off cycle in pixels
    budget = 0.0  # how far into the current cycle we are (resets each cycle)
    drawing = True  # True = currently in a dash, False = in a gap

    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]

        dx, dy = x2 - x1, y2 - y1
        seg_len = math.hypot(dx, dy)
        if seg_len == 0:
            continue

        ux, uy = dx / seg_len, dy / seg_len  # unit vector along segment
        consumed = 0.0  # pixels consumed on this segment

        while consumed < seg_len:
            # How much of the current dash/gap phase remains?
            if drawing:
                remaining_phase = dash - budget
            else:
                remaining_phase = gap - budget

            # How far can we go on this segment before it ends?
            available = seg_len - consumed
            step = min(remaining_phase, available)

            if drawing:
                sx = x1 + ux * consumed
                sy = y1 + uy * consumed
                ex = sx + ux * step
                ey = sy + uy * step
                draw.line([(sx, sy), (ex, ey)], fill=fill, width=width)

            consumed += step
            budget += step

            # Did we complete a full phase?
            if budget >= (dash if drawing else gap) - 1e-9:
                budget = 0.0
                drawing = not drawing


def draw_graph_data(filtered_image_data: List[Dict], background_path: str, output_path: str) -> str:
    """
    Draw the UZONIA interbank rate graph onto the background template image.

    Parameters
    ----------
    filtered_image_data : list of dicts with keys:
        - 'uzonia_date'  : date object
        - 'rate'         : float  (UZONIA overnight rate, %)
        - 'uzonia'       : float  (UZONIA index value, optional – not plotted)
    background_path : path to the blank template PNG
    output_path     : where to save the finished image

    Returns
    -------
    str – output_path
    """
    if not filtered_image_data:
        raise ValueError("filtered_image_data is empty")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)


    # ── Sort by date ──────────────────────────────────────────────────────────
    data = sorted(filtered_image_data, key=lambda r: r["uzonia_date"])
    rates   = [float(r["uzonia"]) for r in data]
    dates   = [r["uzonia_date"] for r in data]
    n       = len(data)


    # Dynamic base rate & corridor (±2) — read from data if present, else use defaults
    asosiy_values = [float(r["rate"]) for r in data]


    # ── Open background ───────────────────────────────────────────────────────
    img  = Image.open(background_path).convert("RGBA")
    draw = ImageDraw.Draw(img)

    # Fonts
    font_small  = _load_font(18)
    font_medium = _load_font(22)
    font_bold   = _load_font(22, bold=True)

    # ── Y-axis grid lines & labels ────────────────────────────────────────────
    tick = Y_MIN
    while tick <= Y_MAX + 0.001:
        y = _rate_to_y(tick)
        # Grid line
        draw.line([(GRAPH_LEFT, y), (GRAPH_RIGHT, y)], fill=COLOR_GRID, width=1)
        # Label  (e.g. "13%")
        label = f"{int(round(tick))}%"
        draw.text((GRAPH_LEFT - 45, y - 10), label,
                  fill=COLOR_AXIS_TEXT, font=font_small)
        tick = round(tick + Y_STEP, 1)

    # ── X-axis month labels ───────────────────────────────────────────────────
    month_numbers = []
    month_ticks: List[tuple] = []   # (index, date)
    for i, d in enumerate(dates):
        if d.month not in month_numbers and d.year != datetime.now().year:
            month_ticks.append((i, d))
            month_numbers.append(d.month)

    # Also add the last date as a special tick
    last_label_x = _index_to_x(n - 1, n)
    last_label_text = dates[-1].strftime("%d.%m.%Y")

    for idx, d in month_ticks:
        x = _index_to_x(idx, n)
        label = _month_label(d)
        # Rotated text — draw on a small rotated sub-image then paste
        _draw_rotated_label(img, label, x + 50, GRAPH_BOTTOM + 10, font_medium,
                            fill=COLOR_AXIS_TEXT, angle=-45)

    # Last date label (bold, angled)
    _draw_rotated_label(img, last_label_text, last_label_x, GRAPH_BOTTOM + 10,
                        font_medium, fill=COLOR_AXIS_TEXT, angle=-45)

    # ── Corridor lines (flat horizontal) ─────────────────────────────────────
    asosiy_points = [
        (_index_to_x(i, n), _rate_to_y(asosiy_values[i]))
        for i in range(n)
    ]

    upper_points = [
        (_index_to_x(i, n), _rate_to_y(asosiy_values[i] + 2.0))
        for i in range(n)
    ]

    lower_points = [
        (_index_to_x(i, n), _rate_to_y(asosiy_values[i] - 2.0))
        for i in range(n)
    ]

    # Base rate (red)
    draw.line(asosiy_points, fill=COLOR_ASOSIY, width=4)

    # Corridor (green dashed)
    _draw_dashed_polyline(draw, upper_points, fill=COLOR_UPPER_BOUND, width=3, dash=8, gap=6)
    _draw_dashed_polyline(draw, lower_points, fill=COLOR_LOWER_BOUND, width=3, dash=8, gap=6)

    # ── UZONIA rate line ──────────────────────────────────────────────────────
    points = [
        (_index_to_x(i, n), _rate_to_y(rates[i]))
        for i in range(n)
    ]
    if len(points) >= 2:
        draw.line(points, fill=COLOR_UZONIA, width=4)

    # ── Last-value label (top-right of the chart) ─────────────────────────────
    last_rate = rates[-1]
    last_x, last_y = points[-1]
    label_str = f"{last_rate:.4f}%"
    draw.text((last_x + 25, last_y - 80), label_str,
              fill=COLOR_LAST_LABEL, font=font_bold)
    draw.line([(last_x + 5, last_y - 5), (last_x + 25, last_y - 50)], fill=COLOR_AXIS_TEXT, width=3)

    # ── Legend (below the graph, above the table) ─────────────────────────────
    legend_y  = GRAPH_BOTTOM + 120
    legend_items = [
        (COLOR_ASOSIY,      "Asosiy stavka",      "solid"),
        (COLOR_UPPER_BOUND, "Quyi/Yuqori chegara", "dashed"),
        (COLOR_UZONIA,      "UZONIA",              "solid"),
    ]
    lx = GRAPH_LEFT + 220
    for color, text, style in legend_items:
        if style == "dashed":
            _draw_dashed_line(
                draw,
                lx, legend_y + 7,
                    lx + 35, legend_y + 7,
                fill=color,
                width=4,
                dash=6
            )
        else:
            # line
            draw.line([(lx, legend_y + 7), (lx + 35, legend_y + 7)],
                  fill=color, width=4)
        # text
        text_x = lx + 42
        draw.text((text_x, legend_y - 2), text,
                  fill=COLOR_AXIS_TEXT, font=font_medium)
        # measure text width
        bbox = draw.textbbox((0, 0), text, font=font_medium)
        text_width = bbox[2] - bbox[0]
        # move lx based on actual content
        lx = text_x + text_width + 60  # 60 = spacing gap

    # ── Save ──────────────────────────────────────────────────────────────────
    img = img.convert("RGB")
    img.save(output_path)
    return output_path


# ── Helpers ───────────────────────────────────────────────────────────────────

def _draw_dashed_line(draw, x1, y1, x2, y2, fill, width=4, dash=6, gap=8):
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    pos = 0.0
    while pos < length:
        seg_end = min(pos + dash, length)
        draw.line(
            [(x1 + ux * pos, y1 + uy * pos),
             (x1 + ux * seg_end, y1 + uy * seg_end)],
            fill=fill, width=width
        )
        pos += dash + gap


def _draw_rotated_label(img, text, x, y, font, fill, angle=45):
    """Stamp a rotated text label onto the image at pixel (x, y)."""
    # Measure text on a temporary surface
    tmp  = Image.new("RGBA", (300, 50), (255, 255, 255, 0))
    tdraw = ImageDraw.Draw(tmp)
    bbox = tdraw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # Render text
    txt_img = Image.new("RGBA", (tw + 7, th + 7), (255, 255, 255, 0))
    tdraw2  = ImageDraw.Draw(txt_img)
    tdraw2.text((2, 2), text, font=font, fill=fill)

    # Rotate
    rotated = txt_img.rotate(angle, expand=True)

    # Paste
    px = int(x - rotated.width / 2)
    py = int(y)
    img.paste(rotated, (px, py), rotated)

