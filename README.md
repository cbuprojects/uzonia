<div align="center">

# 📈 Uzonia Calculation & Reporting System

## FastAPI • PostgreSQL • Rate Analytics • Excel Automation • Embedded Chart Generation


[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey?logo=apple&logoColor=white)](https://www.apple.com/macos/)
![Version](https://img.shields.io/badge/Version-1.0-6c757d)
![Status](https://img.shields.io/badge/Status-Production--Ready-success)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135.1-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Uvicorn](https://img.shields.io/badge/Uvicorn-0.42.0-4051b5?logo=gunicorn&logoColor=white)](https://www.uvicorn.org/)
[![Starlette](https://img.shields.io/badge/Starlette-0.52.1-009688)](https://www.starlette.io/)
[![Pydantic](https://img.shields.io/badge/Pydantic-2.12.5-E92063?logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)
[![anyio](https://img.shields.io/badge/anyio-4.12.1-4B8BBE)](https://anyio.readthedocs.io/)
[![python-multipart](https://img.shields.io/badge/python--multipart-0.0.22-FF6B6B)](https://github.com/Kludex/python-multipart)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![asyncpg](https://img.shields.io/badge/asyncpg-0.31.0-336791?logo=postgresql&logoColor=white)](https://magicstack.github.io/asyncpg/)
[![pandas](https://img.shields.io/badge/pandas-3.0.1-150458?logo=pandas&logoColor=white)](https://pandas.pydata.org/)
[![numpy](https://img.shields.io/badge/numpy-2.4.3-013243?logo=numpy&logoColor=white)](https://numpy.org/)
[![matplotlib](https://img.shields.io/badge/matplotlib-3.10.8-11557C?logo=python&logoColor=white)](https://matplotlib.org/)
[![Pillow](https://img.shields.io/badge/Pillow-12.1.1-blue)](https://python-pillow.org/)
[![openpyxl](https://img.shields.io/badge/openpyxl-3.1.5-217346?logo=microsoftexcel&logoColor=white)](https://openpyxl.readthedocs.io/)
[![xlrd](https://img.shields.io/badge/xlrd-2.0.2-217346)](https://xlrd.readthedocs.io/)
[![Input](https://img.shields.io/badge/Input-Excel%20.xlsx%20%2F%20.xls-217346?logo=microsoftexcel&logoColor=white)](https://www.microsoft.com/en-us/microsoft-365/excel)
[![Output](https://img.shields.io/badge/Output-Excel%20%2B%20Embedded%20PNG%20Chart-brightgreen?logo=microsoftexcel&logoColor=white)](https://openpyxl.readthedocs.io/)
[![passlib](https://img.shields.io/badge/passlib-1.7.4-6A0DAD)](https://passlib.readthedocs.io/en/stable/)
[![argon2-cffi](https://img.shields.io/badge/argon2--cffi-25.1.0-7B2FBE)](https://argon2-cffi.readthedocs.io/en/stable/)
[![HMAC-SHA256](https://img.shields.io/badge/Security-HMAC--SHA256-DC143C?logo=letsencrypt&logoColor=white)](https://docs.python.org/3/library/hmac.html)
[![Session Auth](https://img.shields.io/badge/Auth-Session%20Based%20%2B%20IP%20Binding-CC0000)](https://fastapi.tiangolo.com/tutorial/security/)
[![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Dev%20Server-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![python-dotenv](https://img.shields.io/badge/python--dotenv-1.2.2-ECD53F)](https://github.com/theskumar/python-dotenv)
[![Structured Logging](https://img.shields.io/badge/Logging-Structured%20%2B%20File-4B8BBE?logo=python&logoColor=white)](https://docs.python.org/3/library/logging.html)
[![ZoneInfo](https://img.shields.io/badge/Timezone-Asia%2FTashkent%20(ZoneInfo)-lightgrey?logo=python&logoColor=white)](https://docs.python.org/3/library/zoneinfo.html)
[![Category](https://img.shields.io/badge/Category-Financial%20Analytics-6A0DAD)](https://www.wto.org/)
[![Category](https://img.shields.io/badge/Category-Rate%20Calculations-0D47A1)](https://pandas.pydata.org/)
[![Category](https://img.shields.io/badge/Category-Interbank%20Markets-8B0000)](https://www.bis.org/)

*Full-stack REST API system for Uzonia overnight rate calculation, REPO/DEPO data management, and automated Excel report generation with embedded PNG charts and data tables*

---

## 📋 Table of Contents

[🏢 Overview](#-project-overview) • [📦 Installation](#-installation) • [🔐 Authentication](#-authentication--session-management) • [🔌 API Reference](#-api-reference) • [📊 Output](#-output-excel-structure) • [🗄️ Database](#️-database--postgresql)

</div>

---

## 🏢 Project Overview

**Uzonia Calculation System** is a **FastAPI-based REST API** backed by **PostgreSQL** and served alongside a **React/TypeScript frontend**. It automates the calculation and reporting of the **Uzonia overnight rate** — an interbank overnight lending benchmark — along with related **REPO** and **DEPO** transaction data.

The system ingests raw Excel files, performs rolling window rate calculations (7-day, 30-day, 90-day, 180-day moving averages), and produces a professionally formatted Excel report containing:

- 📊 An embedded PNG chart of the Uzonia rate over time
- 📋 A formatted data table summarising all rate metrics
- 🏦 REPO and DEPO transaction records
- 📅 Holiday calendar management for business day adjustments

All routes are protected by **session-based authentication** with IP binding, expiry enforcement, and a full audit log.

---

## 📂 Project Structure

```text
uzonia/
│
├── backend/
│   ├── data/
│   │   ├── excels/                    # Source Excel files (.xlsx / .xls)
│   │   ├── input_data/
│   │   │   ├── fonts/
│   │   │   │   ├── arial.ttf          # Font for chart/table rendering
│   │   │   │   └── arialbd.ttf        # Bold font for chart/table rendering
│   │   │   └── image/
│   │   │       ├── background_image.png  # Chart background
│   │   │       └── example.png           # Layout reference
│   │   └── output_data/               # Generated Excel reports (auto-written)
│   ├── logs/
│   │   └── app.log                    # Persistent application log file
│   ├── utils/
│   │   ├── database.py                # asyncpg DB pool, all CRUD operations
│   │   ├── add_data.py                # DB seeding & data import helpers
│   │   ├── calculations.py            # Uzonia rate & moving average formulas
│   │   ├── build_excel.py             # Excel report assembly (openpyxl)
│   │   ├── draw_graph.py              # Matplotlib chart rendering → PNG
│   │   ├── draw_table.py              # Table image rendering → PNG
│   │   ├── bank_data.py               # Bank/dealer reference data helpers
│   │   ├── help_functions.py          # Shared utility functions
│   │   ├── output_graph.png           # Cached chart output
│   │   ├── output_table.png           # Cached table output
│   │   └── __init__.py
│   ├── main.py                        # FastAPI app, all API routes
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── login.tsx
│       │   ├── calculations.tsx       # Main Uzonia calculation & report page (home)
│       │   ├── user_pages/
│       │   │   ├── holidays.tsx       # Holiday calendar management
│       │   │   ├── uzonia_data.tsx    # View Uzonia rate history
│       │   │   ├── uploads.tsx        # Upload Uzonia source files
│       │   │   ├── repos.tsx          # REPO transaction data
│       │   │   └── depos.tsx          # DEPO transaction data
│       │   └── admin_pages/
│       │       ├── user_data.tsx      # User account management
│       │       ├── user_sessions.tsx  # Session monitoring
│       │       └── user_actions.tsx   # Audit log viewer
│       ├── App.tsx
│       ├── App.css
│       ├── main.tsx
│       └── index.css
│
├── requirements.txt
└── README.md
```

---

## 🗄️ Database — PostgreSQL

Uses **PostgreSQL** via the `asyncpg` async driver with a connection pool (`min_size=5, max_size=20`). All tables are created automatically on startup.

### Tables

| Table | Purpose |
|---|---|
| `holiday_data` | Business day holiday calendar — dates excluded from rate calculations |
| `uzonia_data` | Daily Uzonia rate records with rolling averages (7d / 30d / 90d / 180d) |
| `repo_data` | REPO transaction records (date in/out, dealer, days, rate, money in/out) |
| `depo_data` | DEPO transaction records (date in/out, dealer, days, rate, money) |
| `uzonia_uploads` | Upload job tracking — file path, status, file date |
| `users` | User accounts with roles, departments, language preference, argon2-hashed passwords |
| `user_sessions` | Active/expired/logged-out sessions with IP binding and expiry timestamps |
| `user_actions` | Full audit log of every user action with session and IP traceability |

### Table Schemas

#### `uzonia_data`
Stores one record per business day of rate data.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `unique_job_id` | TEXT UNIQUE | 12-char hex record identifier |
| `file_id` | TEXT | Source upload file identifier |
| `rate` | NUMERIC(18,4) | Base overnight rate |
| `uzonia` | NUMERIC(18,4) | Calculated Uzonia value for the day |
| `day_7_uzonia` | NUMERIC(18,4) | 7-day rolling average |
| `day_30_uzonia` | NUMERIC(18,4) | 30-day rolling average |
| `day_90_uzonia` | NUMERIC(18,4) | 90-day rolling average |
| `day_180_uzonia` | NUMERIC(18,4) | 180-day rolling average |
| `index` | NUMERIC(18,4) | Cumulative index value |
| `uzonia_date` | DATE UNIQUE | Business date of the record |
| `days` | INTEGER | Number of days (for weighting) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

#### `repo_data`
Stores individual REPO transaction records.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `file_id` | TEXT | Source file identifier |
| `number_of_application` | TEXT UNIQUE | Unique application/deal reference |
| `date_in` | DATE | Transaction open date |
| `date_out` | DATE | Transaction close date |
| `dealer_from` | TEXT | Counterparty selling the security |
| `dealer_to` | TEXT | Counterparty buying the security |
| `days` | NUMERIC(8,2) | Transaction duration in days |
| `rate` | NUMERIC(8,2) | REPO rate (%) |
| `money_in` | NUMERIC(18,2) | Cash amount at open |
| `money_out` | NUMERIC(18,2) | Cash amount at close (incl. interest) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

#### `depo_data`
Stores individual DEPO (deposit) transaction records.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `file_id` | TEXT UNIQUE | Source file identifier |
| `number_of_application` | TEXT UNIQUE | Unique application/deal reference |
| `date_in` | DATE | Deposit open date |
| `date_out` | DATE | Deposit maturity date |
| `dealer_from` | TEXT | Depositing party |
| `dealer_to` | TEXT | Receiving party |
| `days` | NUMERIC(8,2) | Deposit duration in days |
| `rate` | NUMERIC(8,3) | Deposit rate (%) |
| `money` | NUMERIC(18,2) | Deposit amount |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

#### `holiday_data`

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `unique_job_id` | TEXT UNIQUE | 12-char hex record identifier |
| `holiday_date` | DATE UNIQUE | The holiday date |
| `description` | TEXT | Holiday name / description |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

#### `uzonia_uploads`

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Auto-increment primary key |
| `unique_job_id` | TEXT UNIQUE | 12-char hex job identifier |
| `file_id` | TEXT UNIQUE | File identifier |
| `file_path` | TEXT UNIQUE | Path to the uploaded source file |
| `status` | TEXT | `progress` / `finished` / `failed` |
| `file_date` | DATE | Business date the file covers |
| `created_at` | TIMESTAMPTZ | Upload timestamp |
| `finished_at` | TIMESTAMPTZ | Processing completion timestamp |

#### `users` / `user_sessions` / `user_actions`
Identical in structure to the auth tables described in the [Authentication](#-authentication--session-management) section.

### Environment Configuration

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_NAME=uzonia_db
DB_USER=postgres
DB_PASSWORD=password
DB_PORT=5432

# Admin seed
PD=your_admin_password
AD=admin_username
FS=first_name
LS=last_name
DP=department
L=ru
IAD=true
IAC=true
```

---

## ⚙️ Key Capabilities

- **Uzonia rate calculation** — Daily overnight rate computation with 7-day, 30-day, 90-day, and 180-day rolling averages, plus a cumulative index
- **REPO & DEPO management** — Full CRUD for interbank REPO and DEPO transaction records sourced from Excel uploads
- **Holiday calendar** — Business day management; holidays are excluded from rate weighting calculations
- **Automated Excel report generation** — One-click report assembling a formatted data table and an embedded PNG chart into a single `.xlsx` file
- **PNG chart rendering** — Matplotlib-generated Uzonia rate chart with custom fonts, background image, and styling, saved as PNG and embedded directly into Excel
- **PNG table rendering** — Formatted rate summary table rendered as a PNG image and embedded alongside the chart
- **Session-based authentication** — Bearer tokens, SHA-256 session IDs, IP binding, expiry enforcement, and argon2 password hashing
- **Full audit trail** — Every login, logout, upload, and action recorded in `user_actions`
- **Admin management** — User, session, and action management pages
- **Structured logging** — Timestamped logs to stdout and `logs/app.log` with per-request timing

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend framework** | [FastAPI](https://fastapi.tiangolo.com/) 0.135.1 |
| **ASGI server** | [Uvicorn](https://www.uvicorn.org/) 0.42.0 |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [asyncpg](https://magicstack.github.io/asyncpg/) 0.31.0 |
| **Data processing** | [pandas](https://pandas.pydata.org/) 3.0.1 + [numpy](https://numpy.org/) 2.4.3 |
| **Chart generation** | [matplotlib](https://matplotlib.org/) 3.10.8 + [Pillow](https://python-pillow.org/) 12.1.1 |
| **Excel I/O** | [openpyxl](https://openpyxl.readthedocs.io/) 3.1.5 (write) + [xlrd](https://xlrd.readthedocs.io/) 2.0.2 (read `.xls`) |
| **Password hashing** | [passlib](https://passlib.readthedocs.io/) 1.7.4 with [argon2-cffi](https://argon2-cffi.readthedocs.io/) 25.1.0 |
| **Env config** | [python-dotenv](https://github.com/theskumar/python-dotenv) 1.2.2 |
| **Frontend** | React + TypeScript (Vite) |

---

## 📦 Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd uzonia

# 2. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and admin seed values

# 5. Ensure the logs directory exists
mkdir -p backend/logs

# 6. Run the backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 7. Run the frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The API docs (Swagger UI) will be available at: `http://localhost:8000/`

---

## 🔐 Authentication & Session Management

All API routes except `/api/login` require a valid `Authorization: Bearer <token>` header.

### How It Works

1. **Login** — The client posts `username` + `password` to `/api/login`. The server verifies the argon2-hashed, HMAC-derived password, creates a session record, and returns a bearer token.
2. **Token storage** — The frontend stores the token in `localStorage` under `session_id` and attaches it as `Authorization: Bearer <token>` on every subsequent request.
3. **Server-side validation** — On every protected route: token is SHA-256-hashed to look up the session, status checked (`active`), expiry checked (30 minutes), IP address verified.
4. **Automatic expiry** — Expired sessions are marked `expired` on first access; IP mismatches force `logged_out`.
5. **Logout** — `/api/logout` marks the session `logged_out` and records the action.

### Password Security

```
HMAC-SHA256(user_id, plain_password) → argon2_hash(result)
```

### Frontend Auth Helpers (`App.tsx`)

```typescript
const isAuthenticated = () => Boolean(localStorage.getItem('session_id'));
export const authHeader = () => `Bearer ${localStorage.getItem('session_id') ?? ''}`;
export const logout = () => {
  localStorage.removeItem('session_id');
  window.location.href = '/login';
};
```

`ProtectedRoute` wraps all authenticated pages and redirects unauthenticated users to `/login`.

---

## 🔌 API Reference

All endpoints are prefixed with `/api`. Interactive docs at `http://localhost:8000/`. All routes except `/api/login` require `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/login` | Authenticate with username/password; returns bearer token |
| `POST` | `/api/logout` | Invalidate the current session |

### Holiday Calendar

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get_all_holidays` | List all holiday records |
| `GET` | `/api/get_single_holiday` | Get a holiday by `unique_job_id` |
| `POST` | `/api/add_holiday` | Add a new holiday date |
| `PUT` | `/api/edit_holiday` | Update a holiday description |
| `DELETE` | `/api/delete_holiday` | Delete a holiday record |

### Uzonia Rate Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get_all_uzonia_data` | List all daily rate records |
| `GET` | `/api/get_single_uzonia_data` | Get a record by `unique_job_id` |
| `POST` | `/api/add_uzonia_data` | Add a single rate record manually |
| `PUT` | `/api/edit_uzonia_data` | Update an existing rate record |
| `DELETE` | `/api/delete_uzonia_data` | Delete a rate record |

### Uzonia File Uploads

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload_uzonia_file` | Upload `.xlsx` source file; returns `job_id` |
| `GET` | `/api/get_all_uzonia_uploads` | List all upload job records |
| `GET` | `/api/get_single_uzonia_upload` | Poll job status by `unique_job_id` |
| `DELETE` | `/api/delete_uzonia_upload` | Delete an upload job record |

### REPO Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get_all_repo_data` | List all REPO transactions |
| `GET` | `/api/get_single_repo_data` | Get a transaction by `number_of_application` |
| `POST` | `/api/add_repo_data` | Add a REPO transaction record |
| `PUT` | `/api/edit_repo_data` | Update a REPO record |
| `DELETE` | `/api/delete_repo_data` | Delete a REPO record |

### DEPO Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get_all_depo_data` | List all DEPO transactions |
| `GET` | `/api/get_single_depo_data` | Get a transaction by `number_of_application` |
| `POST` | `/api/add_depo_data` | Add a DEPO transaction record |
| `PUT` | `/api/edit_depo_data` | Update a DEPO record |
| `DELETE` | `/api/delete_depo_data` | Delete a DEPO record |

### Calculations & Report Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/generate_report` | Trigger Uzonia report generation; returns the output `.xlsx` |

### User Management (Admin)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get_all_users` | List all user accounts |
| `POST` | `/api/add_new_user` | Create a new user |
| `PUT` | `/api/edit_user_details` | Update user profile |
| `PUT` | `/api/edit_user_password` | Change a user's password |
| `DELETE` | `/api/delete_user` | Delete a user account |

### Session Management (Admin)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get_all_sessions_data` | List all sessions |
| `PUT` | `/api/edit_session_status` | Manually change a session status |
| `DELETE` | `/api/delete_session` | Delete a session record |

### Action Audit Log (Admin)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get_all_actions_data` | List all recorded user actions |
| `GET` | `/api/get_single_action_data` | Get a single action by `unique_job_id` |
| `DELETE` | `/api/delete_single_action` | Delete an action record |

---

## 📊 Output Excel Structure

The report is generated by `build_excel.py` using openpyxl and contains:

### Embedded PNG Chart
Generated by `draw_graph.py` using **matplotlib** with:
- Custom Arial fonts loaded from `input_data/fonts/`
- Background image from `input_data/image/background_image.png`
- Uzonia daily rate plotted over time with rolling average overlays
- Saved as `output_graph.png` and embedded directly into the Excel sheet

### Embedded PNG Table
Generated by `draw_table.py` using **matplotlib/Pillow** with:
- Formatted summary of rate metrics (Uzonia, rolling averages, index)
- Saved as `output_table.png` and embedded alongside the chart

### Data Sheet
- Formatted rows of all `uzonia_data` records for the report period
- Columns: date, rate, Uzonia, 7d/30d/90d/180d averages, index, days
- Auto-sized column widths, styled headers

---

## 🖥️ Frontend Pages

All pages use `authHeader()` for authenticated API calls; any `401`/`403` response triggers `logout()`.

### Main Page
| Page | Route | Description |
|---|---|---|
| `calculations.tsx` | `/` | Home page — trigger Uzonia report generation and download the output Excel |

### User Pages (`/src/components/user_pages/`)

| Page | Route | Description |
|---|---|---|
| `holidays.tsx` | `/holidays` | View, add, edit, and delete holiday calendar entries |
| `uzonia_data.tsx` | `/data` | Browse and manage daily Uzonia rate history |
| `uploads.tsx` | `/uploads` | Upload source Excel files for rate data ingestion |
| `repos.tsx` | `/repo` | View and manage REPO transaction records |
| `depos.tsx` | `/depo` | View and manage DEPO transaction records |

### Admin Pages (`/src/components/admin_pages/`)

| Page | Route | Description |
|---|---|---|
| `user_data.tsx` | `/users_data` | Create, edit, activate/deactivate, and delete user accounts |
| `user_sessions.tsx` | `/user_sessions` | Monitor all active and historical sessions |
| `user_actions.tsx` | `/user_actions` | Browse the full audit log of every user action |

### Routing (`App.tsx`)

```
/login          → LoginPage (public)
/               → CalculationsPage (protected — home)
/holidays       → HolidaysPage (protected)
/data           → UzoniaDataPage (protected)
/uploads        → UzoniaUploadsPage (protected)
/repo           → RepoDataPage (protected)
/depo           → DepoDataPage (protected)
/users_data     → AdminUsersPage (protected)
/user_sessions  → AdminSessionsPage (protected)
/user_actions   → AdminActionsPage (protected)
* (unknown)     → redirect based on auth state
```

---

## 📝 Logging

Logs written simultaneously to console and `logs/app.log`.

```
2026-03-15 09:00:00 | INFO     | uzonia_api | ➡️  POST /api/upload_uzonia_file  (client=10.1.0.5)
2026-03-15 09:00:01 | INFO     | uzonia_api | upload_uzonia | Received file 'uzonia_17-03-2026.xlsx'  job_id=b2e1f4c3a0d9
2026-03-15 09:00:03 | INFO     | uzonia_api | generate_report | DONE  job_id=b2e1f4c3a0d9  (1842.7 ms)
```

---

## ⚠️ Important Notes

- Input Excel files must match the expected column schema for Uzonia, REPO, and DEPO data
- Both `.xlsx` and `.xls` formats are supported for input files (`openpyxl` + `xlrd`)
- `data/output_data/` is written to on every report generation — old files are overwritten
- The `logs/` directory must exist before starting the server
- Session tokens are valid for **30 minutes** from login and are bound to the originating IP address
- Custom fonts (`arial.ttf`, `arialbd.ttf`) must be present in `data/input_data/fonts/` for correct chart rendering
- The background image (`background_image.png`) must be present in `data/input_data/image/` for chart styling

---

## 🔐 Intended Users

- Central bank analysts
- Interbank market operations teams
- Financial reporting specialists
- System administrators

---

<div align="center">

## 👨‍💻 Made By

[![GitHub](https://img.shields.io/badge/GitHub-Uzonia%20Calculation%20System-blue?logo=github)](https://github.com/cbuprojects/uzonia)

</div>