from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.database import get_db
from models.user import User
from models.expense import Expense, ExpenseSplit
from models.group import Group, group_members
from schemas.expense import ExpenseCreate, ExpenseResponse
from api.dependencies import get_current_user
from services.expense_service import validate_and_calculate_splits

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.post("", response_model=ExpenseResponse)
async def create_expense(expense_in: ExpenseCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validate group if provided
    if expense_in.group_id:
        group_stmt = select(Group).where(Group.id == expense_in.group_id)
        group = (await db.execute(group_stmt)).scalars().first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
            
        # Check if current user is in the group
        member_stmt = select(group_members).where(
            (group_members.c.group_id == expense_in.group_id) & (group_members.c.user_id == current_user.id)
        )
        if not (await db.execute(member_stmt)).first():
            raise HTTPException(status_code=403, detail="You must be a member of the group to add an expense")

    # Validate users in splits exist
    user_ids = [split.user_id for split in expense_in.splits]
    users_stmt = select(User).where(User.id.in_(user_ids))
    db_users = (await db.execute(users_stmt)).scalars().all()
    if len(db_users) != len(user_ids):
        raise HTTPException(status_code=400, detail="One or more users in the split do not exist")

    # Calculate and validate the split amounts
    calculated_splits = validate_and_calculate_splits(expense_in)

    new_expense = Expense(
        description=expense_in.description,
        total_amount=expense_in.total_amount,
        currency=expense_in.currency,
        group_id=expense_in.group_id,
        created_by_id=current_user.id,
        split_method=expense_in.split_method
    )
    db.add(new_expense)
    await db.flush() # Flush to get the new_expense.id
    
    for split in calculated_splits:
        db_split = ExpenseSplit(
            expense_id=new_expense.id,
            user_id=split.user_id,
            amount_paid=split.amount_paid,
            amount_owed=split.amount_owed
        )
        db.add(db_split)

    await db.commit()
    
    # Reload with splits
    result = await db.execute(
        select(Expense).where(Expense.id == new_expense.id).options(selectinload(Expense.splits))
    )
    return result.scalars().first()

@router.get("", response_model=list[ExpenseResponse])
async def get_user_expenses(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get all expenses where the current user is a participant
    stmt = select(Expense).join(ExpenseSplit).where(
        ExpenseSplit.user_id == current_user.id
    ).options(selectinload(Expense.splits))
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Expense).where(Expense.id == expense_id).options(selectinload(Expense.splits))
    result = await db.execute(stmt)
    expense = result.scalars().first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    # Check if user is part of the expense or group
    participant = any(split.user_id == current_user.id for split in expense.splits)
    if not participant and expense.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this expense")
        
    return expense
