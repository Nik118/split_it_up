from fastapi import HTTPException
from models.expense import SplitMethod
from schemas.expense import ExpenseCreate

def validate_and_calculate_splits(expense_in: ExpenseCreate):
    total_paid = sum(split.amount_paid for split in expense_in.splits)
    
    # We use a small tolerance for floating point comparisons
    if abs(total_paid - expense_in.total_amount) > 0.01:
        raise HTTPException(status_code=400, detail="Total amount paid must equal the total expense amount")

    num_participants = len(expense_in.splits)
    if num_participants == 0:
        raise HTTPException(status_code=400, detail="At least one participant is required")

    total_assigned = 0.0

    if expense_in.split_method == SplitMethod.EQUAL:
        split_amount = round(expense_in.total_amount / num_participants, 2)
        for split in expense_in.splits:
            split.amount_owed = split_amount
            total_assigned += split_amount

    elif expense_in.split_method == SplitMethod.EXACT:
        total_owed = sum(split.amount_owed for split in expense_in.splits)
        if abs(total_owed - expense_in.total_amount) > 0.01:
            raise HTTPException(status_code=400, detail="Total amount owed must equal the total expense amount")
        # No distribution needed for EXACT since users define exact amounts
        return expense_in.splits

    elif expense_in.split_method == SplitMethod.PERCENTAGE:
        total_percentage = sum(split.percentage for split in expense_in.splits if split.percentage is not None)
        if abs(total_percentage - 100.0) > 0.01:
            raise HTTPException(status_code=400, detail="Total percentage must equal 100%")
            
        for split in expense_in.splits:
            calculated_amount = round(expense_in.total_amount * (split.percentage / 100.0), 2)
            split.amount_owed = calculated_amount
            total_assigned += calculated_amount

    elif expense_in.split_method == SplitMethod.SHARE:
        total_shares = sum(split.shares for split in expense_in.splits if split.shares is not None)
        if total_shares <= 0:
            raise HTTPException(status_code=400, detail="Total shares must be greater than 0")
            
        for split in expense_in.splits:
            calculated_amount = round(expense_in.total_amount * (split.shares / total_shares), 2)
            split.amount_owed = calculated_amount
            total_assigned += calculated_amount

    # Distribute the floating point rounding difference (usually 1 cent) to the first user
    difference = round(expense_in.total_amount - total_assigned, 2)
    if difference != 0:
         expense_in.splits[0].amount_owed = round(expense_in.splits[0].amount_owed + difference, 2)
         
    return expense_in.splits
