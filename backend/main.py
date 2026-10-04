from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import sqlite3
import hashlib
import secrets
from pathlib import Path

app = FastAPI(title="Login API")

DB_PATH = Path(__file__).with_name("users.db")

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
    name: str
    category: str
    quantity: int
    price: float
    supplier: str


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def create_database():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                supplier TEXT NOT NULL
            )
            """
        )

        connection.commit()


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
    return {"message": "Login backend is running"}


@app.post("/register")
def register(data: RegisterData):
    allowed_roles = {"super_admin", "admin", "employee"}

    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters"
        )

    salt = secrets.token_bytes(16)
    password_hash = hash_password(data.password, salt)

    try:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO users (name, email, password_hash, salt, role)
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
            status_code=400,
            detail="An account with this email already exists"
        )

    return {"message": "Registration successful"}


@app.post("/login")
def login(data: LoginData):
    with get_connection() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE email = ?",
            (data.email.lower(),),
        ).fetchone()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    salt = bytes.fromhex(user["salt"])

    entered_password_hash = hash_password(
        data.password,
        salt
    )

    if entered_password_hash != user["password_hash"]:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
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
def add_product(data: ProductData):
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO products
            (name, category, quantity, price, supplier)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                data.name,
                data.category,
                data.quantity,
                data.price,
                data.supplier,
            ),
        )

        connection.commit()

    return {
        "message": "Product added successfully",
        "product_id": cursor.lastrowid
    }


@app.get("/products")
def get_products():
    with get_connection() as connection:
        products = connection.execute(
            "SELECT * FROM products"
        ).fetchall()

    return [dict(product) for product in products]
@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM products WHERE id = ?",
            (product_id,)
        )

        connection.commit()

    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {
        "message": "Product deleted successfully"
    }
@app.put("/products/{product_id}")
def update_product(product_id: int, data: ProductData):
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
                data.name,
                data.category,
                data.quantity,
                data.price,
                data.supplier,
                product_id,
            ),
        )

        connection.commit()

    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {
        "message": "Product updated successfully"
    }