from collections import defaultdict
from typing import List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from models.expense import ExpenseSplit, Expense, Settlement

async def get_user_balances(user_id: int, db: AsyncSession, group_id: int = None) -> Dict[int, float]:
    """
    Returns a dictionary of how much the user owes to others, or how much others owe the user.
    Positive balance means they owe the user.
    Negative balance means the user owes them.
    """
    net_balances = defaultdict(float)

    if group_id:
        # Get all splits for this group
        query = select(ExpenseSplit).join(Expense).where(
            (Expense.group_id == group_id) & (Expense.is_deleted == 0)
        )
        splits = (await db.execute(query)).scalars().all()
        for split in splits:
            net_balances[split.user_id] += (split.amount_paid - split.amount_owed)
            
        # Add settlements specifically for this group if we had a group_id on Settlements.
        # Since we don't, we will ignore settlements for group balance simplification 
        # (this matches common Splitwise logic where group debts are isolated from global settlements).
    else:
        # Get all expenses the user is involved in
        expense_ids_query = select(ExpenseSplit.expense_id).where(ExpenseSplit.user_id == user_id)
        expense_ids = (await db.execute(expense_ids_query)).scalars().all()
        
        if expense_ids:
            query = select(ExpenseSplit).join(Expense).where(
                (ExpenseSplit.expense_id.in_(expense_ids)) & (Expense.is_deleted == 0)
            )
            splits = (await db.execute(query)).scalars().all()
            for split in splits:
                net_balances[split.user_id] += (split.amount_paid - split.amount_owed)
                
        # Add global settlements where user is payer or payee
        settlement_query = select(Settlement).where(
            or_(Settlement.payer_id == user_id, Settlement.payee_id == user_id)
        )
        settlements = (await db.execute(settlement_query)).scalars().all()
        for s in settlements:
            net_balances[s.payer_id] += s.amount # Payer's net balance increases (they paid)
            net_balances[s.payee_id] -= s.amount # Payee's net balance decreases (they received)

    return dict(net_balances)

def simplify_debts(balances: Dict[int, float]) -> List[Tuple[int, int, float]]:
    """
    Given a dictionary of user_id -> net_balance, return a list of transactions to settle all debts.
    (debtor_id, creditor_id, amount)
    """
    debtors = [] # Users with negative balance (owe money)
    creditors = [] # Users with positive balance (are owed money)
    
    for user_id, balance in balances.items():
        if balance < -0.01:
            debtors.append([user_id, -balance])
        elif balance > 0.01:
            creditors.append([user_id, balance])
            
    # Sort both to optimize matching (largest debtor pays largest creditor)
    debtors.sort(key=lambda x: x[1], reverse=True)
    creditors.sort(key=lambda x: x[1], reverse=True)
    
    transactions = []
    
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, amount_owed = debtors[i]
        creditor_id, amount_credit = creditors[j]
        
        settle_amount = min(amount_owed, amount_credit)
        transactions.append((debtor_id, creditor_id, round(settle_amount, 2)))
        
        debtors[i][1] -= settle_amount
        creditors[j][1] -= settle_amount
        
        if debtors[i][1] < 0.01:
            i += 1
        if creditors[j][1] < 0.01:
            j += 1
            
    return transactions
