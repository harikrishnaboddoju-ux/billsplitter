"""
Scheduled ML Expense Forecasting Job for BillSplitter.
Runs periodically (e.g. daily/weekly cron or manually) using ARIMA + Seasonality decomposition
on historical expense data and pushes updated forecasts & proactive alerts back into the database.
"""

import sys
import os
import json
import uuid
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from database import init_db, get_db_connection, get_groups, get_group_details
from ml_predictor import forecast_group_expenses

def run_ml_forecasting_pipeline():
    init_db()
    print("=" * 65)
    print("  BillSplitter ARIMA Expense Predictor - Scheduled Pipeline Job")
    print(f"  Execution Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    conn = get_db_connection()
    groups = get_groups()

    if not groups:
        print("No active groups found in database. Exiting job.")
        conn.close()
        return

    processed = 0
    total_alerts_generated = 0

    print(f"\nProcessing ML forecasts across {len(groups)} group(s)...\n")
    print(f"{'Group Name':<28} | {'Forecast Total':<15} | {'Budget':<10} | {'Status'}")
    print("-" * 65)

    for g in groups:
        group_id = g["id"]
        group = get_group_details(group_id)
        if not group:
            continue

        bills = group.get("bills", [])
        budget = float(group.get("monthly_budget", 40000.0))
        member_count = len(group.get("members", []))
        currency = group.get("currency", "₹")

        # Run ARIMA time-series forecast
        forecast = forecast_group_expenses(bills, group_budget=budget, member_count=member_count)
        total_forecast = forecast.get("total_forecast", 0)

        # Cache forecast into group_forecasts table
        conn.execute(
            """INSERT INTO group_forecasts (group_id, total_forecast, forecast_json, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(group_id) DO UPDATE SET
                   total_forecast=excluded.total_forecast,
                   forecast_json=excluded.forecast_json,
                   updated_at=excluded.updated_at""",
            (group_id, total_forecast, json.dumps(forecast), datetime.now().isoformat())
        )

        # Proactive Alert Generation based on Forecast
        status_label = "Optimal"
        if total_forecast > budget:
            status_label = "OVER BUDGET"
            overage = total_forecast - budget
            # Insert proactive alert notification for all members
            for m in group.get("members", []):
                conn.execute(
                    """INSERT INTO notifications (id, group_id, user_id, type, title, message, is_read, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        f"n_{uuid.uuid4().hex[:8]}",
                        group_id,
                        m["id"],
                        "alert",
                        "Forecast Alert: Budget Threshold Risk",
                        f"Next month expense forecast ({currency}{total_forecast:,.2f}) is projected to exceed budget by {currency}{overage:,.2f}.",
                        0,
                        datetime.now().isoformat()
                    )
                )
                total_alerts_generated += 1
        elif total_forecast > budget * 0.85:
            status_label = "High Spend (85%+)"

        print(f"{group['name'][:26]:<28} | {currency}{total_forecast:>11,.2f}  | {currency}{budget:>8,.0f} | {status_label}")
        processed += 1

    conn.commit()
    conn.close()

    print("-" * 65)
    print(f"✅ Finished ML Forecasting Pipeline: {processed} group(s) updated, {total_alerts_generated} proactive alert(s) dispatched.\n")

if __name__ == "__main__":
    run_ml_forecasting_pipeline()
