# Full Stack Role-Based Login Page

This project contains:

- HTML frontend
- CSS styling
- JavaScript frontend logic
- Python FastAPI backend
- SQLite database
- Password hashing
- Super Admin role
- Admin role
- Employee role
- Role-based dashboard redirection

## Project Structure

```text
login_page_fullstack/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── dashboard.css
│   ├── dashboard.js
│   ├── super_admin.html
│   ├── admin.html
│   └── employee.html
│
├── backend/
│   ├── main.py
│   └── requirements.txt
│
├── .gitignore
└── README.md
```

## 1. Install Python packages

Open the project in VS Code.

In the terminal:

```bash
cd backend
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## 2. Start the Python backend

Inside the backend folder:

```bash
uvicorn main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

You can open the FastAPI docs at:

```text
http://127.0.0.1:8000/docs
```

## 3. Start the frontend

Open the `frontend` folder in VS Code.

Install the VS Code extension:

```text
Live Server
```

Right-click `index.html` and select:

```text
Open with Live Server
```

It will normally open at:

```text
http://127.0.0.1:5500
```

## 4. Register

Create a user and choose one of:

- Super Admin
- Admin
- Employee

The user is saved in:

```text
backend/users.db
```

## 5. Login

Enter the same email and password.

After successful login:

- Super Admin -> `super_admin.html`
- Admin -> `admin.html`
- Employee -> `employee.html`

## Important

This is a beginner-friendly development project.

For a production website you should add:

- JWT or secure server-side sessions
- HTTPS
- authorization checks on every protected backend endpoint
- environment variables
- stronger role-management rules
- email verification
- rate limiting
- password reset functionality

In a real inventory-management system, normal users should NOT be allowed to choose `super_admin` during public registration. An existing super admin should create or approve privileged accounts.
