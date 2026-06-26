from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from api.dependencies import get_current_user
from api.routers.ws import manager
from core.database import get_db
from models.activity import ActivityLog
from models.expense import Expense, ExpenseComment, ExpenseSplit
from models.group import Group, group_members
from models.user import User
from schemas.expense import (
    ActivityLogResponse,
    CommentCreate,
    CommentResponse,
    ExpenseCreate,
    ExpenseResponse,
)
from services.expense_service import validate_and_calculate_splits

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseResponse)
async def create_expense(
    expense_in: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate group if provided
    if expense_in.group_id:
        group_stmt = select(Group).where(Group.id == expense_in.group_id)
        group = (await db.execute(group_stmt)).scalars().first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        # Check if current user is in the group
        member_stmt = select(group_members).where(
            (group_members.c.group_id == expense_in.group_id)
            & (group_members.c.user_id == current_user.id)
        )
        if not (await db.execute(member_stmt)).first():
            raise HTTPException(
                status_code=403,
                detail="You must be a member of the group to add an expense",
            )

    # Validate users in splits exist
    user_ids = [split.user_id for split in expense_in.splits]
    users_stmt = select(User).where(User.id.in_(user_ids))
    db_users = (await db.execute(users_stmt)).scalars().all()
    if len(db_users) != len(user_ids):
        raise HTTPException(
            status_code=400, detail="One or more users in the split do not exist"
        )

    # Calculate and validate the split amounts
    calculated_splits = validate_and_calculate_splits(expense_in)

    new_expense = Expense(
        description=expense_in.description,
        total_amount=expense_in.total_amount,
        currency=expense_in.currency,
        category=expense_in.category,
        group_id=expense_in.group_id,
        created_by_id=current_user.id,
        split_method=expense_in.split_method,
    )
    db.add(new_expense)
    await db.flush()  # Flush to get the new_expense.id

    for split in calculated_splits:
        db_split = ExpenseSplit(
            expense_id=new_expense.id,
            user_id=split.user_id,
            amount_paid=split.amount_paid,
            amount_owed=split.amount_owed,
            shares=split.shares,
        )
        db.add(db_split)

    # Log Activity
    activity = ActivityLog(
        user_id=current_user.id,
        action="CREATED_EXPENSE",
        entity_type="Expense",
        entity_id=new_expense.id,
        details=f"Created expense '{new_expense.description}' for {new_expense.total_amount} {new_expense.currency}",
    )
    db.add(activity)

    await db.commit()

    # Send WebSocket Notifications
    notification = {
        "type": "NEW_EXPENSE",
        "message": f"{current_user.name} added '{new_expense.description}'",
        "expense_id": new_expense.id,
    }
    for split in calculated_splits:
        if split.user_id != current_user.id:
            await manager.send_personal_message(notification, split.user_id)

    # Reload with splits
    result = await db.execute(
        select(Expense)
        .where(Expense.id == new_expense.id)
        .options(selectinload(Expense.splits))
    )
    return result.scalars().first()


@router.get("", response_model=list[ExpenseResponse])
async def get_user_expenses(
    group_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get all expenses where the current user is a participant and not deleted
    conditions = [ExpenseSplit.user_id == current_user.id, Expense.is_deleted == 0]
    if group_id is not None:
        conditions.append(Expense.group_id == group_id)

    stmt = (
        select(Expense)
        .join(ExpenseSplit)
        .where(*conditions)
        .options(selectinload(Expense.splits))
        .order_by(Expense.date.desc())
    )

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Expense)
        .where((Expense.id == expense_id) & (Expense.is_deleted == 0))
        .options(selectinload(Expense.splits))
    )
    result = await db.execute(stmt)
    expense = result.scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check if user is part of the expense or group
    participant = any(split.user_id == current_user.id for split in expense.splits)
    if not participant and expense.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this expense"
        )

    return expense


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Expense).where((Expense.id == expense_id) & (Expense.is_deleted == 0))
    expense = (await db.execute(stmt)).scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the creator can delete this expense"
        )

    expense.is_deleted = 1

    activity = ActivityLog(
        user_id=current_user.id,
        action="DELETED_EXPENSE",
        entity_type="Expense",
        entity_id=expense.id,
        details=f"Deleted expense '{expense.description}'",
    )
    db.add(activity)

    await db.commit()
    return {"message": "Expense deleted successfully"}


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_in: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Expense)
        .where((Expense.id == expense_id) & (Expense.is_deleted == 0))
        .options(selectinload(Expense.splits))
    )
    expense = (await db.execute(stmt)).scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the creator can edit this expense"
        )

    # Recalculate splits
    calculated_splits = validate_and_calculate_splits(expense_in)

    # Update expense fields
    expense.description = expense_in.description
    expense.total_amount = expense_in.total_amount
    expense.currency = expense_in.currency
    expense.category = expense_in.category
    expense.split_method = expense_in.split_method

    # Delete old splits and add new ones
    for old_split in expense.splits:
        await db.delete(old_split)

    for split in calculated_splits:
        db_split = ExpenseSplit(
            expense_id=expense.id,
            user_id=split.user_id,
            amount_paid=split.amount_paid,
            amount_owed=split.amount_owed,
            shares=split.shares,
        )
        db.add(db_split)

    # Log Activity
    activity = ActivityLog(
        user_id=current_user.id,
        action="EDITED_EXPENSE",
        entity_type="Expense",
        entity_id=expense.id,
        details=f"Edited expense '{expense.description}'",
    )
    db.add(activity)

    await db.commit()

    # Reload
    result = await db.execute(
        select(Expense)
        .where(Expense.id == expense.id)
        .options(selectinload(Expense.splits))
    )
    return result.scalars().first()


@router.post("/{expense_id}/comments", response_model=CommentResponse)
async def add_comment(
    expense_id: int,
    comment: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Expense)
        .where((Expense.id == expense_id) & (Expense.is_deleted == 0))
        .options(selectinload(Expense.splits))
    )
    expense = (await db.execute(stmt)).scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check participation
    participant = any(split.user_id == current_user.id for split in expense.splits)
    if not participant and expense.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to comment on this expense"
        )

    new_comment = ExpenseComment(
        expense_id=expense_id, user_id=current_user.id, content=comment.content
    )
    db.add(new_comment)

    activity = ActivityLog(
        user_id=current_user.id,
        action="COMMENTED_EXPENSE",
        entity_type="Expense",
        entity_id=expense.id,
        details=f"Commented on expense '{expense.description}'",
    )
    db.add(activity)

    await db.commit()

    # Reload with user relationship for response
    result = await db.execute(
        select(ExpenseComment)
        .where(ExpenseComment.id == new_comment.id)
        .options(selectinload(ExpenseComment.user))
    )
    return result.scalars().first()


@router.get("/{expense_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if expense exists and user has access
    stmt = (
        select(Expense)
        .where((Expense.id == expense_id) & (Expense.is_deleted == 0))
        .options(selectinload(Expense.splits))
    )
    expense = (await db.execute(stmt)).scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    participant = any(split.user_id == current_user.id for split in expense.splits)
    if not participant and expense.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view comments")

    comments_stmt = (
        select(ExpenseComment)
        .where(ExpenseComment.expense_id == expense_id)
        .options(selectinload(ExpenseComment.user))
        .order_by(ExpenseComment.created_at.asc())
    )
    comments = (await db.execute(comments_stmt)).scalars().all()

    return comments


@router.get("/{expense_id}/activity", response_model=list[ActivityLogResponse])
async def get_expense_activity(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Expense)
        .where((Expense.id == expense_id) & (Expense.is_deleted == 0))
        .options(selectinload(Expense.splits))
    )
    expense = (await db.execute(stmt)).scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    participant = any(split.user_id == current_user.id for split in expense.splits)
    if not participant and expense.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view activity")

    activity_stmt = (
        select(ActivityLog)
        .where(
            (ActivityLog.entity_type == "Expense")
            & (ActivityLog.entity_id == expense_id)
        )
        .options(selectinload(ActivityLog.user))
        .order_by(ActivityLog.created_at.desc())
    )

    activities = (await db.execute(activity_stmt)).scalars().all()
    return activities
