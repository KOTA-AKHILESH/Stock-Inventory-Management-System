import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, field_validator


app = FastAPI(title="Stock Inventory API")

DB_PATH = Path(os.environ.get("INVENTORY_DB", Path(__file__).with_name("users.db")))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterData(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class LoginData(BaseModel):
    email: EmailStr
    password: str


class ProductData(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=0, strict=True)
    price: float = Field(ge=0, allow_inf_nan=False)
    supplier: str = Field(min_length=1, max_length=120)

    @field_validator("name", "category", "supplier")
    @classmethod
    def clean_text(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class QuantityUpdate(BaseModel):
    change: int = Field(strict=True)


@contextmanager
def get_connection():
    connection = sqlite3.connect(DB_PATH, timeout=15)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def create_database():
    with get_connection() as connection:

        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL
            )
            """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                supplier TEXT NOT NULL
            )
            """)

        connection.execute(
            "CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL)"
        )
        connection.commit()


def current_user(session: str | None = Cookie(default=None)):
    if not session:
        raise HTTPException(401, "Please sign in")
    with get_connection() as connection:
        user = connection.execute(
            """SELECT u.id, u.name, u.email, u.role
            FROM users u
            JOIN sessions s ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.expires_at > ?""",
            (hashlib.sha256(session.encode()).hexdigest(), int(time.time())),
        ).fetchone()
    if not user:
        raise HTTPException(401, "Your session has expired. Please sign in again")
    return dict(user)


def manager(user=Depends(current_user)):
    if user["role"] not in {"admin", "super_admin"}:
        raise HTTPException(403, "Administrator access required")
    return user


def super_admin(user=Depends(current_user)):
    if user["role"] != "super_admin":
        raise HTTPException(403, "Super administrator access required")
    return user


def hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        200_000,
    ).hex()


create_database()


@app.get("/")
def home():
    return {"message": "Stock Inventory backend is running"}


@app.post("/register")
def register(data: RegisterData):

    if not data.name.strip():
        raise HTTPException(400, "Name is required")
    if data.role != "employee":
        raise HTTPException(
            403,
            "New accounts start as employees; ask a super admin to change your role",
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must contain at least 6 characters"
        )

    salt = secrets.token_bytes(16)

    password_hash = hash_password(data.password, salt)

    try:

        with get_connection() as connection:

            connection.execute(
                """
                INSERT INTO users
                (name, email, password_hash, salt, role)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    data.name.strip(),
                    data.email.lower(),
                    password_hash,
                    salt.hex(),
                    data.role,
                ),
            )

            connection.commit()

    except sqlite3.IntegrityError:

        raise HTTPException(
            status_code=400, detail="An account with this email already exists"
        )

    return {"message": "Registration successful"}


@app.post("/login")
def login(data: LoginData, response: Response):

    with get_connection() as connection:

        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            """,
            (data.email.lower(),),
        ).fetchone()

    if user is None:

        raise HTTPException(status_code=401, detail="Invalid email or password")

    salt = bytes.fromhex(user["salt"])

    entered_password_hash = hash_password(data.password, salt)

    if not hmac.compare_digest(entered_password_hash, user["password_hash"]):

        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = secrets.token_urlsafe(32)
    with get_connection() as connection:
        connection.execute(
            "DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),)
        )
        connection.execute(
            "INSERT INTO sessions VALUES (?, ?, ?)",
            (
                hashlib.sha256(token.encode()).hexdigest(),
                user["id"],
                int(time.time()) + 28800,
            ),
        )
    response.set_cookie(
        "session",
        token,
        httponly=True,
        samesite="lax",
        max_age=28800,
        secure=os.environ.get("COOKIE_SECURE") == "1",
    )
    return {
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@app.post("/products")
def add_product(data: ProductData, user=Depends(manager)):

    with get_connection() as connection:

        cursor = connection.execute(
            """
            INSERT INTO products
            (
                name,
                category,
                quantity,
                price,
                supplier
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                data.name.strip(),
                data.category.strip(),
                data.quantity,
                data.price,
                data.supplier.strip(),
            ),
        )

        connection.commit()

    return {"message": "Product added successfully", "product_id": cursor.lastrowid}


@app.get("/products")
def get_products(user=Depends(current_user)):

    with get_connection() as connection:

        products = connection.execute("""
            SELECT *
            FROM products
            ORDER BY id ASC
            """).fetchall()

    return [dict(product) for product in products]


@app.delete("/products/{product_id}")
def delete_product(product_id: int, user=Depends(manager)):

    with get_connection() as connection:

        cursor = connection.execute(
            """
            DELETE FROM products
            WHERE id = ?
            """,
            (product_id,),
        )

        connection.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully"}


@app.put("/products/{product_id}")
def update_product(product_id: int, data: ProductData, user=Depends(manager)):

    with get_connection() as connection:

        cursor = connection.execute(
            """
            UPDATE products
            SET name = ?,
                category = ?,
                quantity = ?,
                price = ?,
                supplier = ?
            WHERE id = ?
            """,
            (
                data.name.strip(),
                data.category.strip(),
                data.quantity,
                data.price,
                data.supplier.strip(),
                product_id,
            ),
        )

        connection.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product updated successfully"}


@app.patch("/products/{product_id}/quantity")
def update_product_quantity(
    product_id: int, data: QuantityUpdate, user=Depends(current_user)
):

    with get_connection() as connection:

        product = connection.execute(
            """
            SELECT *
            FROM products
            WHERE id = ?
            """,
            (product_id,),
        ).fetchone()

        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")

        cursor = connection.execute(
            "UPDATE products SET quantity = quantity + ? WHERE id = ? AND quantity + ? >= 0",
            (data.change, product_id, data.change),
        )
        if cursor.rowcount == 0:
            raise HTTPException(400, "Stock quantity cannot be below 0")
        new_quantity = connection.execute(
            "SELECT quantity FROM products WHERE id=?", (product_id,)
        ).fetchone()["quantity"]

        connection.commit()

    return {
        "message": "Stock quantity updated",
        "product_id": product_id,
        "quantity": new_quantity,
    }


@app.get("/users")
def get_users(user=Depends(super_admin)):
    with get_connection() as connection:
        users = connection.execute("""
            SELECT id, name, email, role
            FROM users
            ORDER BY id ASC
            """).fetchall()

    return [dict(user) for user in users]


@app.get("/me")
def me(user=Depends(current_user)):
    return user


@app.post("/logout")
def logout(response: Response, session: str | None = Cookie(default=None)):
    if session:
        with get_connection() as connection:
            connection.execute(
                "DELETE FROM sessions WHERE token_hash=?",
                (hashlib.sha256(session.encode()).hexdigest(),),
            )
    response.delete_cookie("session")
    return {"message": "Signed out"}


class RoleData(BaseModel):
    role: str


@app.patch("/users/{user_id}/role")
def update_role(user_id: int, data: RoleData, user=Depends(super_admin)):
    if data.role not in {"employee", "admin", "super_admin"}:
        raise HTTPException(400, "Invalid role")
    if user_id == user["id"]:
        raise HTTPException(400, "You cannot change your own role")
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE users SET role=? WHERE id=?", (data.role, user_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(404, "User not found")
    return {"message": "Role updated"}


# Keep frontend and API on the same origin: no separate frontend server needed.
app.mount(
    "/app",
    StaticFiles(
        directory=Path(__file__).resolve().parent.parent / "frontend", html=True
    ),
    name="frontend",
)
