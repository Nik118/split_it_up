from services.balance_service import simplify_debts


def test_simplify_debts_simple_chain():
    # A owes B 10
    # B owes C 10
    # Expected: A owes C 10

    # Let's represent this in net balances:
    # A: -10 (owes 10)
    # B: +10 - 10 = 0 (is owed 10, but owes 10)
    # C: +10 (is owed 10)

    balances = {1: -10.0, 2: 0.0, 3: 10.0}  # A  # B  # C

    transactions = simplify_debts(balances)

    assert len(transactions) == 1
    # debtor, creditor, amount
    assert transactions[0] == (1, 3, 10.0)


def test_simplify_debts_complex():
    # User 1 net: -50 (owes 50)
    # User 2 net: -30 (owes 30)
    # User 3 net: +40 (is owed 40)
    # User 4 net: +40 (is owed 40)

    balances = {1: -50.0, 2: -30.0, 3: 40.0, 4: 40.0}

    transactions = simplify_debts(balances)

    # User 1 should pay the largest creditor (User 3 or 4, say User 3) 40
    # User 1 still owes 10, pays User 4 10
    # User 2 owes 30, pays User 4 30

    # We just need to check if the total debt is settled correctly.
    # Total positive balance = 80, Total negative balance = -80.

    # Verify that everyone's balance is resolved by these transactions
    for d_id, c_id, amt in transactions:
        balances[d_id] += amt
        balances[c_id] -= amt

    for user_id, balance in balances.items():
        assert abs(balance) < 0.01


def test_simplify_debts_no_debt():
    balances = {1: 0.0, 2: 0.0}

    transactions = simplify_debts(balances)
    assert len(transactions) == 0
