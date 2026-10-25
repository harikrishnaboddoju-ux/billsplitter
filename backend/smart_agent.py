"""
Smart Splitter Agent & n8n Webhook Connector.
Parses natural language prompts, multi-payer contributions, and receipt details into structured bill splits.
Conversational assistant capable of asking follow-up questions and confirming splits.
"""

import re
import requests
from datetime import datetime

def parse_natural_language_bill(prompt, members, current_user_id=None):
    """
    Intelligently parses user text like:
    "Dinner at Barbeque Nation 1800 paid by Harshith split equally"
    "Groceries 850 paid by Hari Krishna, Harshith 40%, Hari Krishna 40%, Chiranjeeva 20%"
    "i spent around 1500 in cricket and 5 people played, so i payed 500 and my friend payed 1000, so divide"
    """
    prompt_lower = prompt.lower()
    
    # 1. Extract Amount
    # look for numbers with optional currency symbols: ₹, $, INR, rs., etc.
    candidates = re.findall(r'(\d+(?:\.\d{1,2})?)', prompt)
    valid_numbers = []
    if candidates:
        for c in candidates:
            idx = prompt.find(c)
            after = prompt[idx+len(c):idx+len(c)+3].strip()
            if not after.startswith("%"):
                valid_numbers.append(float(c))

    # 2. Multi-Payer Detection
    # Look for patterns like: "i payed 500 and my friend payed 1000" or "Hari paid 600, Harshith paid 400"
    payer_matches = re.findall(
        r'([a-zA-Z\s]+?)\s+(?:paid|payed|spent|contributed|gave)\s+(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)',
        prompt,
        re.IGNORECASE
    )

    multi_payer_dict = {}
    payer_details_list = []
    current_uid = current_user_id or (members[0]["id"] if members else "u_1")
    other_members = [m for m in members if m["id"] != current_uid]

    if len(payer_matches) >= 2:
        used_member_ids = set()
        for raw_name, raw_amt in payer_matches:
            clean_name = re.sub(r'^(and|so|then|also|but|,)\s+', '', raw_name.strip(), flags=re.IGNORECASE).strip().lower()
            try:
                amt_val = float(raw_amt)
            except ValueError:
                continue

            matched_id = None
            matched_name = "Member"

            if clean_name in ["i", "me", "myself"]:
                matched_id = current_uid
                matched_member = next((m for m in members if m["id"] == current_uid), None)
                matched_name = matched_member["name"] if matched_member else "You"
            elif "friend" in clean_name or "partner" in clean_name or "roommate" in clean_name or "flatmate" in clean_name:
                # Assign to the first other group member not yet used
                candidate_other = next((m for m in other_members if m["id"] not in used_member_ids), None)
                if candidate_other:
                    matched_id = candidate_other["id"]
                    matched_name = candidate_other["name"]
            else:
                # Try matching group member name
                for m in members:
                    if clean_name in m["name"].lower() or m["name"].lower() in clean_name:
                        matched_id = m["id"]
                        matched_name = m["name"]
                        break

            if not matched_id and other_members:
                candidate_other = next((m for m in other_members if m["id"] not in used_member_ids), other_members[0])
                matched_id = candidate_other["id"]
                matched_name = candidate_other["name"]

            if matched_id:
                used_member_ids.add(matched_id)
                multi_payer_dict[matched_id] = multi_payer_dict.get(matched_id, 0.0) + amt_val
                payer_details_list.append((matched_name, amt_val))

    # Overall bill amount determination
    amount = None
    if multi_payer_dict and sum(multi_payer_dict.values()) > 0:
        sum_multi = sum(multi_payer_dict.values())
        if valid_numbers and max(valid_numbers) >= sum_multi:
            amount = max(valid_numbers)
        else:
            amount = sum_multi
    elif valid_numbers:
        amount = max(valid_numbers)

    # 3. Extract Category
    category = "Other"
    cat_keywords = {
        "Food & Dining": ["dinner", "lunch", "breakfast", "cafe", "restaurant", "food", "pizza", "burger", "drinks", "bar", "swiggy", "zomato", "biryani", "bistro", "bbq"],
        "Groceries": ["groceries", "grocery", "supermarket", "veggies", "milk", "vegetables", "reliance", "dmart", "fruits", "spices", "mart"],
        "Rent": ["rent", "maintenance", "lease", "apartment", "flat", "society"],
        "Utilities": ["wifi", "electricity", "water", "gas", "power", "internet", "broadband", "cylinder", "bill"],
        "Travel": ["uber", "ola", "taxi", "cab", "petrol", "fuel", "flight", "train", "metro", "bus", "toll", "trip", "goa"],
        "Entertainment": ["cricket", "turf", "ground", "badminton", "sports", "football", "match", "movie", "cinema", "netflix", "party", "spotify", "concert", "game", "bowling", "outing", "gaming", "snooker"]
    }

    for cat, kws in cat_keywords.items():
        if any(kw in prompt_lower for kw in kws):
            category = cat
            break

    # 4. Extract Title
    title = ""
    place_match = re.search(r'(?:at|for|on|in)\s+([a-zA-Z0-9\s&]+?)(?:\s+(?:and|for|cost|was|of|paid|payed|spent|split|\d)|$)', prompt, re.IGNORECASE)
    if place_match:
        extracted = place_match.group(1).strip()
        if len(extracted) > 1 and not extracted.isdigit():
            title = extracted.title()
    if not title:
        title = f"{category} Expense"

    # 5. Identify Payer
    if multi_payer_dict and len(multi_payer_dict) > 1:
        paid_by = multi_payer_dict
        payer_desc = " & ".join([f"**{pname}** (₹{pamt:,.2f})" for pname, pamt in payer_details_list])
    else:
        paid_by_id = current_uid
        for m in members:
            name_parts = m["name"].lower().split()
            if any(part in prompt_lower for part in name_parts):
                for part in name_parts:
                    if re.search(rf'(?:paid\s+by|payed\s+by|by|from)\s+{part}', prompt_lower) or re.search(rf'{part}\s+(?:paid|payed)', prompt_lower):
                        paid_by_id = m["id"]
                        break
        paid_by = paid_by_id
        matched_payer = next((m for m in members if m["id"] == paid_by_id), None)
        payer_desc = f"**{matched_payer['name'] if matched_payer else 'You'}**"

    # 6. Determine Split Method & Calculations
    pct_matches = re.findall(r'([a-zA-Z]+)\s*[:=]?\s*(\d+)%', prompt)
    splits = {}
    split_type = "equal"

    if pct_matches and amount:
        split_type = "percentage"
        pct_sum = 0
        allocated = {}
        for name_token, pct_val in pct_matches:
            pct = float(pct_val)
            for m in members:
                if name_token.lower() in m["name"].lower():
                    allocated[m["id"]] = round((pct / 100.0) * amount, 2)
                    pct_sum += pct
                    break
        
        remaining_members = [m["id"] for m in members if m["id"] not in allocated]
        if pct_sum < 100 and remaining_members:
            rem_pct = (100 - pct_sum) / len(remaining_members)
            for rmid in remaining_members:
                allocated[rmid] = round((rem_pct / 100.0) * amount, 2)
        splits = allocated
    else:
        # Default equal split across active group members
        if amount and members:
            equal_share = round(amount / len(members), 2)
            splits = {m["id"]: equal_share for m in members}
            diff = round(amount - sum(splits.values()), 2)
            if diff != 0 and members:
                splits[members[0]["id"]] = round(splits[members[0]["id"]] + diff, 2)

    is_ready = bool(amount and len(splits) > 0)
    if is_ready:
        if isinstance(paid_by, dict):
            agent_response = (
                f"I've prepared the split for **{title}** (₹{amount:,.2f}) under **{category}**.\n"
                f"• Multi-Payer: {payer_desc}\n"
                f"• Split mode: **Equal** across {len(splits)} members (₹{round(amount/max(1, len(splits)), 2):,.2f} each).\n"
                f"Review the breakdown below and click 'Confirm & Save Bill' to log it instantly to your group!"
            )
        else:
            agent_response = (
                f"I've prepared the split for **{title}** (₹{amount:,.2f}) under **{category}**.\n"
                f"• Paid by: {payer_desc}\n"
                f"• Split mode: **{split_type.capitalize()}** across {len(splits)} members.\n"
                f"Review the breakdown below and click 'Confirm & Save Bill' to log it instantly to your group!"
            )
    else:
        agent_response = "Could you tell me how much the bill was and who paid?"

    return {
        "is_ready_to_save": is_ready,
        "title": title,
        "amount": amount,
        "category": category,
        "paid_by": paid_by,
        "split_type": split_type,
        "splits": splits,
        "agent_message": agent_response,
        "extracted_date": datetime.now().strftime("%Y-%m-%d")
    }

def forward_to_n8n_webhook(webhook_url, payload):
    """
    Optional bridge to an external n8n AI workflow URL.
    """
    try:
        res = requests.post(webhook_url, json=payload, timeout=6)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        return {"error": str(e), "fallback": True}
    return {"fallback": True}
