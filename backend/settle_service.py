"""
Debt Simplification & Settlement Service using Min-Cash-Flow Algorithm.
Minimizes the total number of transactions required to balance all dues in a group.
"""

def calculate_group_balances(members, bills, settlements):
    """
    Computes the net balance of each member in the group.
    Net balance > 0: Member is owed money (creditor)
    Net balance < 0: Member owes money (debtor)
    Net balance == 0: Settled
    """
    balances = {m["id"]: 0.0 for m in members}
    total_spent = 0.0
    member_spending = {m["id"]: 0.0 for m in members}
    member_owed = {m["id"]: 0.0 for m in members}

    # Process bills
    for bill in bills:
        amount = float(bill.get("amount", 0.0))
        total_spent += amount
        payer_id = bill.get("paid_by")
        
        # In multi-payer, paid_by can be a dict: {member_id: amount_paid}
        if isinstance(payer_id, dict):
            for pid, p_amt in payer_id.items():
                if pid in balances:
                    balances[pid] += float(p_amt)
                    member_spending[pid] += float(p_amt)
        elif payer_id in balances:
            balances[payer_id] += amount
            member_spending[payer_id] += amount

        # Splits
        splits = bill.get("splits", {})
        for mid, split_val in splits.items():
            if mid in balances:
                balances[mid] -= float(split_val)
                member_owed[mid] += float(split_val)

    # Process confirmed settlements
    for s in settlements:
        from_id = s.get("from_id")
        to_id = s.get("to_id")
        amt = float(s.get("amount", 0.0))
        if s.get("status", "settled") == "settled":
            if from_id in balances:
                balances[from_id] += amt
            if to_id in balances:
                balances[to_id] -= amt

    return {
        "balances": {mid: round(val, 2) for mid, val in balances.items()},
        "total_spent": round(total_spent, 2),
        "member_spending": {mid: round(val, 2) for mid, val in member_spending.items()},
        "member_owed": {mid: round(val, 2) for mid, val in member_owed.items()}
    }

def simplify_debts(members, balances):
    """
    Greedy Min-Cash Flow algorithm to minimize transaction hops.
    Takes members and net balances, returns list of simplified payments.
    """
    member_lookup = {m["id"]: m for m in members}
    
    # Net amounts copy
    net = {mid: round(amt, 2) for mid, amt in balances.items() if abs(amt) >= 0.01}
    simplified_transactions = []

    while True:
        debtors = [(mid, amt) for mid, amt in net.items() if amt < -0.01]
        creditors = [(mid, amt) for mid, amt in net.items() if amt > 0.01]

        if not debtors or not creditors:
            break

        # Max debtor (most negative) and Max creditor (most positive)
        debtors.sort(key=lambda x: x[1])
        creditors.sort(key=lambda x: x[1], reverse=True)

        max_debtor_id, debtor_amount = debtors[0]
        max_creditor_id, creditor_amount = creditors[0]

        settle_amount = round(min(-debtor_amount, creditor_amount), 2)
        if settle_amount < 0.01:
            break

        debtor = member_lookup.get(max_debtor_id, {"id": max_debtor_id, "name": "Unknown"})
        creditor = member_lookup.get(max_creditor_id, {"id": max_creditor_id, "name": "Unknown"})

        upi_id = creditor.get("upi_id", f"{creditor.get('name', 'user').lower().replace(' ', '')}@upi")
        upi_link = f"upi://pay?pa={upi_id}&pn={creditor.get('name', 'User').replace(' ', '%20')}&am={settle_amount}&cu=INR&tn=Bill%20Splitter%20Settlement"

        simplified_transactions.append({
            "from_id": max_debtor_id,
            "from_name": debtor.get("name", "Unknown"),
            "to_id": max_creditor_id,
            "to_name": creditor.get("name", "Unknown"),
            "to_upi": upi_id,
            "upi_link": upi_link,
            "amount": settle_amount
        })

        # Update remaining net amounts
        net[max_debtor_id] = round(net[max_debtor_id] + settle_amount, 2)
        net[max_creditor_id] = round(net[max_creditor_id] - settle_amount, 2)

    return simplified_transactions
