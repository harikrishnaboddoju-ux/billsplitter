"""
Bill Splitter with Expense Prediction - Flask REST API Backend.
Serves full CRUD for groups, bills, smart debt simplification,
time-series ML forecasting, and smart AI agent endpoints.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import json
import logging
from datetime import datetime

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("billsplitter")

from database import (
    init_db, get_db_connection, get_all_users, get_groups, get_group_details
)
from settle_service import calculate_group_balances, simplify_debts
from ml_predictor import forecast_group_expenses
from smart_agent import parse_natural_language_bill, forward_to_n8n_webhook

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Determine allowed CORS origins for Render deployment and local development
def get_allowed_origins():
    env_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("FRONTEND_URL") or ""
    configured = [o.strip().rstrip("/") for o in env_origins.split(",") if o.strip()]
    
    defaults = [
        "https://billsplitter-frontend-g4qp.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    merged = list(defaults)
    for origin in configured:
        if origin not in merged:
            merged.append(origin)
    return merged

allowed_origins = get_allowed_origins()
logger.info(f"Allowed CORS origins: {allowed_origins}")

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
)

@app.before_request
def log_request_info():
    if request.path != "/api/health":
        logger.info(f"--> {request.method} {request.path}")

@app.after_request
def log_response_info(response):
    if request.path != "/api/health":
        logger.info(f"<-- {request.method} {request.path} {response.status_code}")
    return response

# Initialize database schema and seed data on startup
init_db()

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "BillSplitter with ML Expense Prediction API",
        "timestamp": datetime.now().isoformat()
    })

# --- Users Endpoints ---
@app.route("/api/users", methods=["GET", "POST"])
def handle_users():
    conn = get_db_connection()
    if request.method == "POST":
        data = request.json or {}
        name = data.get("name", "New User").strip()
        raw_email = (data.get("email") or "").strip()
        phone = (data.get("phone") or "").strip()
        initials = "".join([part[0] for part in name.split()][:2]).upper() or "U"
        
        # Check if user already exists by email or exact name
        if raw_email:
            existing = conn.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (raw_email,)).fetchone()
            if existing:
                conn.close()
                return jsonify(dict(existing)), 200
            email = raw_email
        else:
            slug = name.lower().replace(' ', '')
            existing = conn.execute("SELECT * FROM users WHERE LOWER(name) = LOWER(?)", (name,)).fetchone()
            if existing:
                conn.close()
                return jsonify(dict(existing)), 200
            email = f"{slug}_{uuid.uuid4().hex[:4]}@example.com"

        user_id = f"u_{uuid.uuid4().hex[:8]}"
        upi_id = (data.get("upi_id") or "").strip() or f"{name.lower().replace(' ', '')}@upi"

        try:
            conn.execute(
                "INSERT INTO users (id, name, email, phone, upi_id, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, name, email, phone, upi_id, initials, datetime.now().isoformat())
            )
            conn.commit()
            user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            conn.close()
            return jsonify(dict(user)), 201
        except Exception as e:
            conn.close()
            return jsonify({"error": f"Failed to create user: {str(e)}"}), 400

    users = get_all_users()
    conn.close()
    return jsonify(users)

@app.route("/api/users/<user_id>", methods=["GET", "PUT", "PATCH"])
def handle_single_user(user_id):
    conn = get_db_connection()
    if request.method in ["PUT", "PATCH"]:
        data = request.json or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        phone = (data.get("phone") or "").strip()
        upi_id = (data.get("upi_id") or "").strip()
        avatar = (data.get("avatar") or "").strip()

        existing = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not existing:
            conn.close()
            return jsonify({"error": "User not found"}), 404

        # Validate unique email if changed
        if email and email.lower() != (existing["email"] or "").lower():
            dup = conn.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (email, user_id)).fetchone()
            if dup:
                conn.close()
                return jsonify({"error": "Email is already taken by another member"}), 400

        new_name = name or existing["name"]
        new_email = email or existing["email"]
        new_phone = phone if phone else existing["phone"]
        new_upi = upi_id if upi_id else existing["upi_id"]
        
        # Recalculate initials if name changed and custom avatar not provided
        if avatar:
            new_avatar = avatar
        elif name:
            new_avatar = "".join([p[0] for p in new_name.split()][:2]).upper() or existing["avatar"]
        else:
            new_avatar = existing["avatar"]

        try:
            conn.execute("""
                UPDATE users 
                SET name = ?, email = ?, phone = ?, upi_id = ?, avatar = ?
                WHERE id = ?
            """, (new_name, new_email, new_phone, new_upi, new_avatar, user_id))
            conn.commit()
            updated = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            conn.close()
            return jsonify(dict(updated)), 200
        except Exception as e:
            conn.close()
            return jsonify({"error": f"Failed to update profile: {str(e)}"}), 400

    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(dict(user))

# --- Groups Endpoints ---
@app.route("/api/groups", methods=["GET", "POST"])
def handle_groups():
    conn = get_db_connection()
    if request.method == "POST":
        data = request.json or {}
        group_id = f"g_{uuid.uuid4().hex[:8]}"
        name = data.get("name", "New Group")
        description = data.get("description", "")
        currency = data.get("currency", "₹")
        monthly_budget = float(data.get("monthly_budget", 8000))
        created_by = data.get("created_by", "u_1")

        conn.execute(
            "INSERT INTO groups (id, name, description, currency, monthly_budget, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (group_id, name, description, currency, monthly_budget, created_by, datetime.now().isoformat())
        )

        # Add creator as Admin
        conn.execute(
            "INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)",
            (group_id, created_by, "Admin", datetime.now().isoformat())
        )

        # Add optional selected members
        selected_members = data.get("member_ids", [])
        for mid in selected_members:
            if mid != created_by:
                conn.execute(
                    "INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)",
                    (group_id, mid, "Member", datetime.now().isoformat())
                )

        conn.commit()
        conn.close()
        return jsonify(get_group_details(group_id)), 201

    groups = get_groups()
    conn.close()
    return jsonify(groups)

@app.route("/api/groups/<group_id>", methods=["GET", "PUT", "PATCH", "DELETE"])
def handle_single_group(group_id):
    conn = get_db_connection()

    if request.method == "DELETE":
        group = conn.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
        if not group:
            conn.close()
            return jsonify({"error": "Group not found"}), 404

        group_name = group["name"]
        conn.execute("DELETE FROM bills WHERE group_id = ?", (group_id,))
        conn.execute("DELETE FROM settlements WHERE group_id = ?", (group_id,))
        conn.execute("DELETE FROM group_members WHERE group_id = ?", (group_id,))
        conn.execute("DELETE FROM group_forecasts WHERE group_id = ?", (group_id,))
        conn.execute("DELETE FROM notifications WHERE group_id = ?", (group_id,))
        conn.execute("DELETE FROM groups WHERE id = ?", (group_id,))
        conn.commit()
        conn.close()
        return jsonify({
            "success": True,
            "message": f"Group '{group_name}' deleted successfully",
            "deleted_id": group_id
        }), 200

    if request.method in ["PUT", "PATCH"]:
        group = conn.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
        if not group:
            conn.close()
            return jsonify({"error": "Group not found"}), 404

        data = request.json or {}
        name = (data.get("name") or "").strip() or group["name"]
        description = data.get("description", group["description"])
        currency = data.get("currency", group["currency"] or "₹")
        monthly_budget = float(data.get("monthly_budget", group["monthly_budget"] or 8000))

        conn.execute("""
            UPDATE groups 
            SET name = ?, description = ?, currency = ?, monthly_budget = ?
            WHERE id = ?
        """, (name, description, currency, monthly_budget, group_id))
        conn.commit()
        conn.close()
        return jsonify(get_group_details(group_id)), 200

    conn.close()
    group = get_group_details(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    # Calculate balances & debt simplification
    balance_info = calculate_group_balances(group["members"], group["bills"], group["settlements"])
    simplified_debts = simplify_debts(group["members"], balance_info["balances"])

    group["balances"] = balance_info["balances"]
    group["total_spent"] = balance_info["total_spent"]
    group["member_spending"] = balance_info["member_spending"]
    group["member_owed"] = balance_info["member_owed"]
    group["simplified_debts"] = simplified_debts

    return jsonify(group)

@app.route("/api/groups/<group_id>/members", methods=["POST"])
def add_group_member(group_id):
    data = request.json or {}
    user_id = data.get("user_id")
    role = data.get("role", "Member")
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    conn = get_db_connection()
    # Check if already member
    existing = conn.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id)).fetchone()
    if existing:
        conn.close()
        return jsonify({"success": True, "message": "User is already a member", "group": get_group_details(group_id)}), 200

    try:
        conn.execute(
            "INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)",
            (group_id, user_id, role, datetime.now().isoformat())
        )
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400
    conn.close()
    return jsonify({"success": True, "group": get_group_details(group_id)})

@app.route("/api/groups/<group_id>/members/<user_id>", methods=["PUT", "PATCH", "DELETE"])
def handle_group_member(group_id, user_id):
    conn = get_db_connection()
    if request.method == "DELETE":
        conn.execute("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Member removed from group", "group": get_group_details(group_id)})

    data = request.json or {}
    new_role = data.get("role", "Admin")
    conn.execute(
        "UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?",
        (new_role, group_id, user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": f"Role updated to {new_role}", "group": get_group_details(group_id)})


# --- Bills Endpoints ---
@app.route("/api/groups/<group_id>/bills", methods=["POST"])
def add_bill(group_id):
    data = request.json or {}
    title = data.get("title", "Untitled Bill").strip() or "Untitled Bill"
    try:
        amount = float(data.get("amount", 0.0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid bill amount"}), 400

    if amount <= 0:
        return jsonify({"error": "Bill amount must be positive"}), 400

    category = data.get("category", "Other")
    date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    paid_by = data.get("paid_by")
    split_type = data.get("split_type", "equal")
    splits = data.get("splits", {})
    notes = data.get("notes", "")
    receipt_url = data.get("receipt_url", "")

    conn = get_db_connection()
    try:
        bill_id = f"b_{uuid.uuid4().hex[:8]}"

        # Fetch group members
        members = conn.execute("SELECT user_id FROM group_members WHERE group_id = ?", (group_id,)).fetchall()
        member_ids = [m["user_id"] for m in members]

        # Name to ID mapping across all users for resilient resolution
        all_users = conn.execute("SELECT id, name FROM users").fetchall()
        name_to_id = {u["name"].lower().strip(): u["id"] for u in all_users}
        id_to_name = {u["id"]: u["name"] for u in all_users}

        # Resolve paid_by (handles dict for multi-payer or string for single payer)
        if isinstance(paid_by, dict):
            resolved_paid_by = {}
            for k, v in paid_by.items():
                k_clean = str(k).strip()
                k_id = name_to_id.get(k_clean.lower(), k_clean)
                try:
                    resolved_paid_by[k_id] = float(v)
                except (ValueError, TypeError):
                    pass
            paid_by = resolved_paid_by
            paid_by_db = json.dumps(paid_by)
        elif paid_by:
            paid_by_str = str(paid_by).strip()
            paid_by = name_to_id.get(paid_by_str.lower(), paid_by_str)
            paid_by_db = str(paid_by)
        else:
            paid_by = member_ids[0] if member_ids else "u_1"
            paid_by_db = str(paid_by)

        # Resolve splits keys
        resolved_splits = {}
        if isinstance(splits, dict) and splits:
            for k, v in splits.items():
                k_clean = str(k).strip()
                k_id = name_to_id.get(k_clean.lower(), k_clean)
                try:
                    resolved_splits[k_id] = float(v)
                except (ValueError, TypeError):
                    pass
            splits = resolved_splits

        # Calculate equal split if split_type is equal or splits is empty
        if split_type == "equal" or not splits:
            active_mids = member_ids if member_ids else list(splits.keys())
            if not active_mids:
                active_mids = [paid_by] if isinstance(paid_by, str) else list(paid_by.keys())
            per_person = round(amount / max(1, len(active_mids)), 2)
            splits = {mid: per_person for mid in active_mids}
            diff = round(amount - sum(splits.values()), 2)
            if diff != 0 and active_mids:
                splits[active_mids[0]] = round(splits[active_mids[0]] + diff, 2)

        conn.execute(
            """INSERT INTO bills (id, group_id, title, amount, category, date, paid_by, split_type, splits_json, receipt_url, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (bill_id, group_id, title, amount, category, date, paid_by_db, split_type, json.dumps(splits), receipt_url, notes, datetime.now().isoformat())
        )

        # Insert notification for other members
        if isinstance(paid_by, dict):
            p_name = "Multiple group members"
            exclude_notif_ids = set(paid_by.keys())
        else:
            p_name = id_to_name.get(paid_by, "A member")
            exclude_notif_ids = {paid_by}

        for mid in member_ids:
            if mid not in exclude_notif_ids:
                conn.execute(
                    "INSERT INTO notifications (id, group_id, user_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (f"n_{uuid.uuid4().hex[:8]}", group_id, mid, "bill", f"New Bill: {title}", f"{p_name} added ₹{amount:,.2f} for {title}.", 0, datetime.now().isoformat())
                )

        # Check for budget breach
        group_row = conn.execute("SELECT monthly_budget FROM groups WHERE id = ?", (group_id,)).fetchone()
        monthly_budget = float(group_row["monthly_budget"]) if group_row and group_row["monthly_budget"] else 40000.0
        total_spent_row = conn.execute("SELECT SUM(amount) as total FROM bills WHERE group_id = ?", (group_id,)).fetchone()
        total_spent = float(total_spent_row["total"]) if total_spent_row and total_spent_row["total"] else 0.0

        if total_spent > monthly_budget:
            for mid in member_ids:
                conn.execute(
                    "INSERT INTO notifications (id, group_id, user_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (f"n_{uuid.uuid4().hex[:8]}", group_id, mid, "alert", "Group Budget Cap Exceeded", f"Total spending has crossed ₹{total_spent:,.2f}, surpassing the ₹{monthly_budget:,.2f} limit.", 0, datetime.now().isoformat())
                )

        conn.commit()
        conn.close()
        return jsonify({"success": True, "bill_id": bill_id, "group": get_group_details(group_id)}), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"Failed to add bill: {str(e)}"}), 400

@app.route("/api/groups/<group_id>/bills/<bill_id>", methods=["DELETE"])
def delete_bill(group_id, bill_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM bills WHERE id = ? AND group_id = ?", (bill_id, group_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Bill removed successfully"})

# --- Settle Up Endpoints ---
@app.route("/api/groups/<group_id>/settle", methods=["POST"])
def record_settlement(group_id):
    data = request.json or {}
    from_id = data.get("from_id")
    to_id = data.get("to_id")
    amount = float(data.get("amount", 0.0))
    payment_method = data.get("payment_method", "UPI")
    transaction_ref = data.get("transaction_ref", f"TXN-{uuid.uuid4().hex[:8].upper()}")
    notes = data.get("notes", "Settled via in-app Settle Up panel")

    if amount <= 0 or not from_id or not to_id:
        return jsonify({"error": "Invalid settlement parameters"}), 400

    conn = get_db_connection()
    settlement_id = f"s_{uuid.uuid4().hex[:8]}"

    conn.execute(
        """INSERT INTO settlements (id, group_id, from_id, to_id, amount, payment_method, transaction_ref, notes, status, settled_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (settlement_id, group_id, from_id, to_id, amount, payment_method, transaction_ref, notes, "settled", datetime.now().isoformat())
    )

    # Notify recipient
    payer = conn.execute("SELECT name FROM users WHERE id = ?", (from_id,)).fetchone()
    p_name = payer["name"] if payer else "Someone"
    conn.execute(
        "INSERT INTO notifications (id, group_id, user_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (f"n_{uuid.uuid4().hex[:8]}", group_id, to_id, "settle", "Payment Received", f"{p_name} marked settlement of ₹{amount:,.2f} via {payment_method}.", 0, datetime.now().isoformat())
    )

    conn.commit()
    conn.close()

    return jsonify({"success": True, "settlement_id": settlement_id, "group": get_group_details(group_id)})

# --- Machine Learning Expense Forecasting ---
@app.route("/api/groups/<group_id>/forecast", methods=["GET"])
def get_group_forecast(group_id):
    group = get_group_details(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    forecast_results = forecast_group_expenses(
        bills=group["bills"],
        group_budget=group.get("monthly_budget", 45000),
        member_count=len(group["members"])
    )
    return jsonify(forecast_results)

# --- Smart AI Agent / n8n Webhook Chat ---
@app.route("/api/smart-agent/chat", methods=["POST"])
def smart_agent_chat():
    data = request.json or {}
    prompt = data.get("message", "").strip()
    group_id = data.get("group_id")
    current_user_id = data.get("user_id")
    n8n_webhook_url = data.get("n8n_webhook_url") or os.getenv("N8N_WEBHOOK_URL")

    if not prompt:
        return jsonify({"error": "Message is required"}), 400

    # Retrieve group members
    group = get_group_details(group_id) if group_id else None
    members = group["members"] if group else get_all_users()

    # Optional forwarding to n8n webhook if user provided one
    if n8n_webhook_url:
        n8n_res = forward_to_n8n_webhook(n8n_webhook_url, {
            "prompt": prompt,
            "group_id": group_id,
            "members": members,
            "timestamp": datetime.now().isoformat()
        })
        if not n8n_res.get("fallback"):
            return jsonify(n8n_res)

    # Built-in Intelligent NLP Bill Parser
    parsed_result = parse_natural_language_bill(prompt, members, current_user_id)
    return jsonify(parsed_result)

# --- Receipt OCR Simulation / Itemization ---
@app.route("/api/receipt-scan", methods=["POST"])
def scan_receipt():
    """
    Simulates OCR extraction on an uploaded receipt image or preset receipt template.
    Returns itemized lines and auto-detected categories.
    """
    data = request.json or {}
    receipt_preset = data.get("preset", "supermarket")

    presets = {
        "canteen": {
            "store": "College Campus Canteen",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": "Food & Dining",
            "items": [
                {"name": "Masala Dosa x 2", "price": 80.00},
                {"name": "Special Ginger Chai x 4", "price": 48.00},
                {"name": "Hot Veg Samosa x 4", "price": 40.00},
                {"name": "Water Bottles (500ml)", "price": 20.00}
            ],
            "subtotal": 188.00,
            "tax": 0.00,
            "total": 188.00
        },
        "cricket": {
            "store": "Box Cricket Turf Arena",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": "Entertainment",
            "items": [
                {"name": "1-Hour Floodlight Turf Slot", "price": 700.00},
                {"name": "Heavy Tennis Cricket Ball (2pk)", "price": 120.00},
                {"name": "Grip Tape & Refreshments", "price": 80.00}
            ],
            "subtotal": 900.00,
            "tax": 0.00,
            "total": 900.00
        },
        "outing": {
            "store": "Student Outing & Biryani House",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": "Food & Dining",
            "items": [
                {"name": "Chicken Dum Biryani (Large Share)", "price": 380.00},
                {"name": "Thums Up Glass Bottles x 4", "price": 80.00},
                {"name": "Extra Raita & Salan", "price": 40.00}
            ],
            "subtotal": 500.00,
            "tax": 25.00,
            "total": 525.00
        },
        "stationery": {
            "store": "Campus Xerox & Tech Book Depot",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": "Supplies",
            "items": [
                {"name": "Project Documentation Print (45 pgs)", "price": 90.00},
                {"name": "Spiral Binding & Transparent Sheet", "price": 40.00},
                {"name": "Blue Ballpoint Pens (Pack of 3)", "price": 30.00}
            ],
            "subtotal": 160.00,
            "tax": 0.00,
            "total": 160.00
        },
        "supermarket": {
            "store": "Campus Corner Mart",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": "Groceries",
            "items": [
                {"name": "Maggi 4-Pack Noodles", "price": 56.00},
                {"name": "Coffee Sachets & Sugar", "price": 45.00},
                {"name": "Biscuits & Snacks", "price": 60.00}
            ],
            "subtotal": 161.00,
            "tax": 0.00,
            "total": 161.00
        },
        "restaurant": {
            "store": "Student Food Court",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": "Food & Dining",
            "items": [
                {"name": "Veg Fried Rice & Manchurian", "price": 220.00},
                {"name": "Paneer Roll x 2", "price": 140.00}
            ],
            "subtotal": 360.00,
            "tax": 18.00,
            "total": 378.00
        },
        "utilities": {
            "store": "Room Broadband & Hosteler Electricity",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": "Utilities",
            "items": [
                {"name": "Shared Room WiFi Subscription", "price": 599.00}
            ],
            "subtotal": 599.00,
            "tax": 0.00,
            "total": 599.00
        }
    }

    result = presets.get(receipt_preset, presets["canteen"])
    return jsonify(result)

# --- Notifications ---
@app.route("/api/notifications", methods=["GET"])
def get_user_notifications():
    user_id = request.args.get("user_id", "u_1")
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/notifications/read", methods=["POST"])
def mark_notifications_read():
    user_id = request.json.get("user_id", "u_1")
    conn = get_db_connection()
    conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# --- File / Receipt Upload ---
@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    
    clean_name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(file.filename)}"
    dest = os.path.join(UPLOAD_FOLDER, clean_name)
    file.save(dest)
    return jsonify({
        "url": f"/api/uploads/{clean_name}",
        "filename": clean_name
    })

@app.route("/api/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# --- Group Data Export (CSV) ---
@app.route("/api/groups/<group_id>/export", methods=["GET"])
def export_group_data(group_id):
    group = get_group_details(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404

    lines = []
    lines.append(f"Group Expense Report: {group['name']}")
    lines.append(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Currency: {group.get('currency', '₹')}")
    lines.append("")
    lines.append("--- BILLS LOG ---")
    lines.append("Bill ID,Date,Title,Category,Amount,Paid By,Split Type")
    
    members_map = {m["id"]: m["name"] for m in group["members"]}
    for b in group.get("bills", []):
        p_name = members_map.get(b.get("paid_by"), b.get("paid_by"))
        clean_title = b.get('title', '').replace(',', ' ')
        lines.append(f"{b['id']},{b.get('date','')},{clean_title},{b.get('category','')},{b.get('amount',0)},{p_name},{b.get('split_type','')}")

    lines.append("")
    lines.append("--- SETTLEMENTS LOG ---")
    lines.append("Settlement ID,Date,From,To,Amount,Method,Reference,Status")
    for s in group.get("settlements", []):
        from_name = members_map.get(s.get("from_id"), s.get("from_id"))
        to_name = members_map.get(s.get("to_id"), s.get("to_id"))
        lines.append(f"{s['id']},{s.get('settled_at','')[:10]},{from_name},{to_name},{s.get('amount',0)},{s.get('payment_method','')},{s.get('transaction_ref','')},{s.get('status','')}")

    csv_data = "\n".join(lines)
    from flask import Response
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=expenses_{group_id}.csv"}
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "t")
    logger.info(f"Starting Bill Splitter API on port {port} (debug={debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)
