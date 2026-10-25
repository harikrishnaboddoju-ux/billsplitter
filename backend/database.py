"""
SQLite Database Storage and Manager for Bill Splitter.
Provides persistent storage, thread-safe access, and seed data initialization.
"""

import sqlite3
import json
import os
import uuid
from datetime import datetime, timedelta

DB_PATH = os.getenv("DATABASE_PATH", os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "billsplitter.db")))

# Ensure parent directory exists for persistent disk paths
_db_dir = os.path.dirname(os.path.abspath(DB_PATH))
if _db_dir:
    os.makedirs(_db_dir, exist_ok=True)

def get_db_connection():
    # timeout=20.0 prevents locks during concurrent requests across Gunicorn workers
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        upi_id TEXT,
        avatar TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        currency TEXT DEFAULT '₹',
        monthly_budget REAL DEFAULT 8000,
        created_by TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS group_members (
        group_id TEXT,
        user_id TEXT,
        role TEXT DEFAULT 'Member',
        joined_at TEXT,
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        paid_by TEXT NOT NULL,
        split_type TEXT DEFAULT 'equal',
        splits_json TEXT NOT NULL,
        receipt_url TEXT,
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'UPI',
        transaction_ref TEXT,
        notes TEXT,
        status TEXT DEFAULT 'settled',
        settled_at TEXT,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        group_id TEXT,
        user_id TEXT,
        type TEXT DEFAULT 'info',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS group_forecasts (
        group_id TEXT PRIMARY KEY,
        total_forecast REAL,
        forecast_json TEXT,
        updated_at TEXT,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
    """)
    conn.commit()
    conn.close()
    seed_initial_data()

def seed_initial_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # Seed Users
    users = [
        ("u_1", "Hari Krishna", "harikrishna@example.com", "+91 98765 43210", "harikrishna@okaxis", "HK"),
        ("u_2", "Harshith", "harshith@example.com", "+91 98765 43211", "harshith@oksbi", "H"),
        ("u_3", "Chiranjeeva", "chiranjeeva@example.com", "+91 98765 43212", "chiranjeeva@paytm", "C"),
        ("u_4", "Harsha Vardhan", "harshavardhan@example.com", "+91 98765 43213", "harsha.v@icici", "HV"),
        ("u_5", "Santhosh", "santhosh@example.com", "+91 98765 43214", "santhosh@okhdfc", "S")
    ]
    cursor.executemany(
        "INSERT INTO users (id, name, email, phone, upi_id, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [(u[0], u[1], u[2], u[3], u[4], u[5], datetime.now().isoformat()) for u in users]
    )

    # Seed Groups
    groups = [
        ("g_1", "Flat 402 - Green Glen", "Apartment shared expenses, groceries, and bills", "₹", 8000.0, "u_1", datetime.now().isoformat()),
        ("g_2", "Goa Beach Trip 2026", "Shared villas, car rentals, food, and activities", "₹", 8000.0, "u_1", datetime.now().isoformat())
    ]
    cursor.executemany(
        "INSERT INTO groups (id, name, description, currency, monthly_budget, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        groups
    )

    # Seed Group Members
    g1_members = [
        ("g_1", "u_1", "Admin", datetime.now().isoformat()),
        ("g_1", "u_2", "Member", datetime.now().isoformat()),
        ("g_1", "u_3", "Member", datetime.now().isoformat()),
        ("g_1", "u_4", "Member", datetime.now().isoformat())
    ]
    g2_members = [
        ("g_2", "u_1", "Admin", datetime.now().isoformat()),
        ("g_2", "u_2", "Member", datetime.now().isoformat()),
        ("g_2", "u_4", "Member", datetime.now().isoformat()),
        ("g_2", "u_5", "Member", datetime.now().isoformat())
    ]
    cursor.executemany("INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)", g1_members + g2_members)

    now = datetime.now()
    
    # Seed Bills for Group 1 with historical distribution for realistic ML charts
    sample_bills = [
        (
            "b_1", "g_1", "Apartment Rent & Maintenance", 22000.0, "Rent",
            (now - timedelta(days=22)).strftime("%Y-%m-%d"), "u_1", "equal",
            json.dumps({"u_1": 5500.0, "u_2": 5500.0, "u_3": 5500.0, "u_4": 5500.0}),
            None, "Paid directly to owner bank transfer", now.isoformat()
        ),
        (
            "b_2", "g_1", "ACT High-Speed Fiber WiFi", 1299.0, "Utilities",
            (now - timedelta(days=18)).strftime("%Y-%m-%d"), "u_2", "equal",
            json.dumps({"u_1": 324.75, "u_2": 324.75, "u_3": 324.75, "u_4": 324.75}),
            None, "300 Mbps unlimited plan", now.isoformat()
        ),
        (
            "b_3", "g_1", "D-Mart Monthly Grocery Restock", 4650.0, "Groceries",
            (now - timedelta(days=14)).strftime("%Y-%m-%d"), "u_3", "equal",
            json.dumps({"u_1": 1162.5, "u_2": 1162.5, "u_3": 1162.5, "u_4": 1162.5}),
            None, "Grains, cooking oil, spices, and cleaning supplies", now.isoformat()
        ),
        (
            "b_4", "g_1", "Electricity & Water Board Bill", 2420.0, "Utilities",
            (now - timedelta(days=11)).strftime("%Y-%m-%d"), "u_2", "equal",
            json.dumps({"u_1": 605.0, "u_2": 605.0, "u_3": 605.0, "u_4": 605.0}),
            None, "Monthly BESCOM meter bill", now.isoformat()
        ),
        (
            "b_5", "g_1", "Weekend House Party & Barbeque", 3280.0, "Food & Dining",
            (now - timedelta(days=6)).strftime("%Y-%m-%d"), "u_4", "equal",
            json.dumps({"u_1": 820.0, "u_2": 820.0, "u_3": 820.0, "u_4": 820.0}),
            None, "Grill supplies, drinks, and snacks", now.isoformat()
        ),
        (
            "b_6", "g_1", "Organic Milk & Fresh Farm Veggies", 1140.0, "Groceries",
            (now - timedelta(days=2)).strftime("%Y-%m-%d"), "u_1", "equal",
            json.dumps({"u_1": 285.0, "u_2": 285.0, "u_3": 285.0, "u_4": 285.0}),
            None, "Country Delight subscription restock", now.isoformat()
        )
    ]
    cursor.executemany(
        """INSERT INTO bills (id, group_id, title, amount, category, date, paid_by, split_type, splits_json, receipt_url, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        sample_bills
    )

    # Seed Settle-up payment
    sample_settlement = (
        "s_1", "g_1", "u_2", "u_1", 4000.0, "UPI", "UPI-REF-93820184", "Part settlement for rent", "settled",
        (now - timedelta(days=8)).isoformat()
    )
    cursor.execute(
        """INSERT INTO settlements (id, group_id, from_id, to_id, amount, payment_method, transaction_ref, notes, status, settled_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        sample_settlement
    )

    # Seed Notifications
    notifications = [
        ("n_1", "g_1", "u_1", "settle", "Payment Received", "Harshith settled ₹4,000 via UPI towards monthly rent.", 0, (now - timedelta(days=8)).isoformat()),
        ("n_2", "g_1", "u_1", "alert", "Uneven Contribution Alert", "Hari Krishna has paid 64% of total group expenses this month. Settle up to maintain balance.", 0, (now - timedelta(days=3)).isoformat()),
        ("n_3", "g_1", "u_1", "reminder", "Upcoming Recurring Bills", "Electricity and rent forecast indicates ~₹24,420 due early next week.", 0, now.isoformat())
    ]
    cursor.executemany(
        "INSERT INTO notifications (id, group_id, user_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        notifications
    )

    conn.commit()
    conn.close()

# Helper accessors
def get_all_users():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM users ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_groups():
    conn = get_db_connection()
    groups = conn.execute("SELECT * FROM groups ORDER BY created_at DESC").fetchall()
    result = []
    for g in groups:
        g_dict = dict(g)
        members = conn.execute("""
            SELECT u.id, u.name, u.email, u.phone, u.upi_id, u.avatar, gm.role 
            FROM group_members gm 
            JOIN users u ON gm.user_id = u.id 
            WHERE gm.group_id = ?
        """, (g["id"],)).fetchall()
        g_dict["members"] = [dict(m) for m in members]
        result.append(g_dict)
    conn.close()
    return result

def get_group_details(group_id):
    conn = get_db_connection()
    group = conn.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not group:
        conn.close()
        return None
    g_dict = dict(group)
    
    # Members
    members = conn.execute("""
        SELECT u.id, u.name, u.email, u.phone, u.upi_id, u.avatar, gm.role 
        FROM group_members gm 
        JOIN users u ON gm.user_id = u.id 
        WHERE gm.group_id = ?
    """, (group_id,)).fetchall()
    g_dict["members"] = [dict(m) for m in members]

    # Bills
    bills = conn.execute("SELECT * FROM bills WHERE group_id = ? ORDER BY date DESC, created_at DESC", (group_id,)).fetchall()
    b_list = []
    for b in bills:
        bd = dict(b)
        try:
            bd["splits"] = json.loads(bd["splits_json"])
        except Exception:
            bd["splits"] = {}
        if bd.get("paid_by") and isinstance(bd["paid_by"], str) and bd["paid_by"].strip().startswith("{"):
            try:
                bd["paid_by"] = json.loads(bd["paid_by"])
            except Exception:
                pass
        b_list.append(bd)
    g_dict["bills"] = b_list

    # Settlements
    settlements = conn.execute("SELECT * FROM settlements WHERE group_id = ? ORDER BY settled_at DESC", (group_id,)).fetchall()
    g_dict["settlements"] = [dict(s) for s in settlements]

    conn.close()
    return g_dict
