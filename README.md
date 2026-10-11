# Stockroom — Stock Inventory Management

A responsive HTML/CSS/JavaScript frontend with a FastAPI + SQLite backend.

## Project folders

- `frontend/`: four independent pages. Each has its own HTML, CSS and JavaScript files: `index`, `admin`, `super_admin` and `employee`. See `FRONTEND-GUIDE.md` for explanations.
- `backend/main.py`: API, session authentication and role permissions.
- `backend/users.db`: your existing uploaded database, including existing accounts and inventory. Existing passwords still work.
- `backend/requirements.txt`: runtime dependencies.
- `backend/test_app.py`: isolated API tests; they do not change your database.

## Run with npm

Open a terminal in the `inventory-app-simple` folder (beside `package.json`), then run:

```powershell
npm run setup
npm run dev
```

Open **http://127.0.0.1:8000/app/**. Keep the terminal running. These npm commands start the Python backend, which also serves the frontend. Python and Node.js/npm must be installed.

## Run in VS Code on Windows

1. Extract this ZIP and open the `inventory-app-simple` folder in VS Code.
2. Open Terminal → New Terminal. Install Python 3.10 or newer if needed.
3. Run:

```powershell
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload
```

4. Open **http://127.0.0.1:8000/app/** in your browser.
5. Sign in with an existing account. The appropriate role dashboard opens automatically.

Use this URL to open the app; the API serves the frontend. No npm, Vite, PHP, Live Server, or second terminal is required. Do not open the HTML directly using a file URL.

## macOS / Linux

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m uvicorn main:app --app-dir backend --reload
```

## Features

- Hidden hamburger navigation on desktop and mobile. Menu closes on selection, clicking the backdrop, or pressing Escape. Keyboard focus stays inside the open menu.
- Summary cards, inventory value in rupees, stock health and restock priorities based on actual database data.
- Search, category and stock filters, name sorting, pagination and CSV export of filtered products.
- Add/edit/delete products with forms and confirmation dialogs; stock adjustment accepts any positive or negative whole number.
- Responsive tables and layouts, loading/error/empty states, and safe text rendering.
- Login uses an HttpOnly cookie session lasting eight hours; logout invalidates it on the server.
- Backend enforces permissions, validates fields and prevents stock from going negative. Quantity updates are atomic.
- Registration uses the name / user ID consistently. The original registration page referenced a missing name input.

## Roles

| Role | Permissions |
| --- | --- |
| Employee | View inventory, filter/export products, adjust quantities |
| Admin | Employee permissions plus add, edit and delete products |
| Super admin | Admin permissions plus view users and assign roles |

New accounts always register as employees. Sign in with your existing super admin account and open **☰ → Team members** to assign another role. You cannot change your own role. Existing account roles are retained.

Low stock: 1–5 units. Out of stock: 0 units. High stock: over 20 units. The low-stock list includes out-of-stock products.

## Data and backups

All persistent data is in `backend/users.db`. Back up that file with the server stopped. Sessions are added automatically when the backend first starts. Keep your original upload as a backup. No example accounts or fake products have been added to the supplied database.

## Tests

```powershell
.venv\Scripts\python.exe -m pip install httpx
.venv\Scripts\python.exe -m unittest discover -s backend -v
```

The tests use a temporary database. They cover authentication, role enforcement, product CRUD, validation, stock changes and frontend serving.

## Deployment notes

This project is configured for local development. For public hosting, use HTTPS and set `COOKIE_SECURE=1`, configure allowed origins for the real domain, and add login rate limiting and operational backups before deployment. Run without `--reload` in production. `INVENTORY_DB` optionally selects a different SQLite database path.
