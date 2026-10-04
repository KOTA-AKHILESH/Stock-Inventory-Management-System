from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import sqlite3
import hashlib
import secrets
from pathlib import Path


app = FastAPI(title="Stock Inventory API")

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


# -------------------------
# MODELS
# -------------------------

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


class QuantityUpdate(BaseModel):
    change: int


# -------------------------
# DATABASE
# -------------------------

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


# -------------------------
# HOME
# -------------------------

@app.get("/")
def home():
    return {
        "message": "Stock Inventory backend is running"
    }


# -------------------------
# REGISTER
# -------------------------

@app.post("/register")
def register(data: RegisterData):

    allowed_roles = {
        "super_admin",
        "admin",
        "employee"
    }

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

    password_hash = hash_password(
        data.password,
        salt
    )

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
            status_code=400,
            detail="An account with this email already exists"
        )

    return {
        "message": "Registration successful"
    }


# -------------------------
# LOGIN
# -------------------------

@app.post("/login")
def login(data: LoginData):

    with get_connection() as connection:

        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            """,
            (
                data.email.lower(),
            ),
        ).fetchone()

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    salt = bytes.fromhex(
        user["salt"]
    )

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


# -------------------------
# ADD PRODUCT
# -------------------------

@app.post("/products")
def add_product(data: ProductData):

    if data.quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity cannot be negative"
        )

    if data.price < 0:
        raise HTTPException(
            status_code=400,
            detail="Price cannot be negative"
        )

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

    return {
        "message": "Product added successfully",
        "product_id": cursor.lastrowid
    }


# -------------------------
# GET PRODUCTS
# -------------------------

@app.get("/products")
def get_products():

    with get_connection() as connection:

        products = connection.execute(
            """
            SELECT *
            FROM products
            ORDER BY id ASC
            """
        ).fetchall()

    return [
        dict(product)
        for product in products
    ]


# -------------------------
# DELETE PRODUCT
# -------------------------

@app.delete("/products/{product_id}")
def delete_product(product_id: int):

    with get_connection() as connection:

        cursor = connection.execute(
            """
            DELETE FROM products
            WHERE id = ?
            """,
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


# -------------------------
# UPDATE FULL PRODUCT
# -------------------------

@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    data: ProductData
):

    if data.quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity cannot be negative"
        )

    if data.price < 0:
        raise HTTPException(
            status_code=400,
            detail="Price cannot be negative"
        )

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
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {
        "message": "Product updated successfully"
    }


# -------------------------
# EMPLOYEE QUANTITY UPDATE
# -------------------------

@app.patch("/products/{product_id}/quantity")
def update_product_quantity(
    product_id: int,
    data: QuantityUpdate
):

    with get_connection() as connection:

        product = connection.execute(
            """
            SELECT *
            FROM products
            WHERE id = ?
            """,
            (product_id,)
        ).fetchone()

        if product is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        new_quantity = (
            product["quantity"] +
            data.change
        )

        if new_quantity < 0:
            raise HTTPException(
                status_code=400,
                detail="Stock quantity cannot be below 0"
            )

        connection.execute(
            """
            UPDATE products
            SET quantity = ?
            WHERE id = ?
            """,
            (
                new_quantity,
                product_id
            )
        )

        connection.commit()

    return {
        "message": "Stock quantity updated",
        "product_id": product_id,
        "quantity": new_quantity
    }
@app.get("/users")
def get_users():
    with get_connection() as connection:
        users = connection.execute(
            """
            SELECT id, name, email, role
            FROM users
            ORDER BY id ASC
            """
        ).fetchall()

    return [dict(user) for user in users]