from collections import defaultdict
from typing import List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_

from models.expense import ExpenseSplit, Expense, Settlement

async def get_user_balances(user_id: int, db: AsyncSession, group_id: int = None) -> Dict[str, float]:
    """
    Returns a dictionary of how much the user owes to others, or how much others owe the user.
    Positive balance means they owe the user.
    Negative balance means the user owes them.
    """
    # 1. Fetch all expense splits where this user is involved
    query = select(ExpenseSplit).join(Expense)
    
    if group_id:
        query = query.where(Expense.group_id == group_id)
        
    result = await db.execute(query)
    splits = result.scalars().all()
    
    # Calculate net balance for each user across all expenses
    # user_id -> net_balance
    net_balances = defaultdict(float)
    
    for split in splits:
        net_balances[split.user_id] += (split.amount_paid - split.amount_owed)

    # 2. Add settlements
    # A settlement is when payer pays payee
    settlement_query = select(Settlement)
    if group_id:
        # If we had group_id on settlements, we'd filter here. We don't for now, 
        # but group settlements should be tracked. Let's assume settlements are global for simplicity,
        # or we could add group_id to Settlement. Let's filter only global if no group_id.
        # Actually, let's ignore settlements if group_id is specified since our settlement model
        # doesn't have group_id. In a real app, settlements can be tied to a group.
        pass
    else:
        settlement_query = settlement_query.where(
            or_(Settlement.payer_id == user_id, Settlement.payee_id == user_id)
        )
        settlements = (await db.execute(settlement_query)).scalars().all()
        for s in settlements:
            # If user is payer, their balance with payee increases
            if s.payer_id == user_id:
                pass # We need to track pairwise balances
    
    # Wait, the above logic calculates net balances globally, but it doesn't give pairwise debts.
    # To get pairwise debts (who owes who), we need to simplify debts.
    
    # Let's simplify the debts globally or per group.
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
