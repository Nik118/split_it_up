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

    if expense_in.split_method == SplitMethod.EQUAL:
        split_amount = round(expense_in.total_amount / num_participants, 2)
        # Handle rounding error (e.g. 100 / 3 = 33.33 * 3 = 99.99)
        total_assigned = split_amount * num_participants
        difference = round(expense_in.total_amount - total_assigned, 2)

        for i, split in enumerate(expense_in.splits):
            split.amount_owed = split_amount
            # Add the 1 cent difference to the first person
            if i == 0 and difference != 0:
                split.amount_owed = round(split.amount_owed + difference, 2)

    elif expense_in.split_method == SplitMethod.EXACT:
        total_owed = sum(split.amount_owed for split in expense_in.splits)
        if abs(total_owed - expense_in.total_amount) > 0.01:
            raise HTTPException(status_code=400, detail="Total amount owed must equal the total expense amount")

    elif expense_in.split_method == SplitMethod.PERCENTAGE:
        total_percentage = sum(split.percentage for split in expense_in.splits if split.percentage is not None)
        if abs(total_percentage - 100.0) > 0.01:
            raise HTTPException(status_code=400, detail="Total percentage must equal 100%")
            
        total_assigned = 0.0
        for i, split in enumerate(expense_in.splits):
            calculated_amount = round(expense_in.total_amount * (split.percentage / 100.0), 2)
            split.amount_owed = calculated_amount
            total_assigned += calculated_amount
            
        difference = round(expense_in.total_amount - total_assigned, 2)
        if difference != 0:
             expense_in.splits[0].amount_owed += difference
             
    return expense_in.splits
