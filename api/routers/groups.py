import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from api.dependencies import get_current_user
from core.database import get_db
from models.expense import Expense
from models.group import Group, group_members
from models.user import User
from schemas.group import GroupCreate, GroupResponse, GroupWithMembersResponse

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_group = Group(name=group.name, created_by_id=current_user.id)
    db.add(new_group)
    await db.commit()
    await db.refresh(new_group)

    # Add creator as a member
    await db.execute(
        group_members.insert().values(group_id=new_group.id, user_id=current_user.id)
    )
    await db.commit()

    return new_group


@router.post("/{group_id}/members/{user_id}")
async def add_member_to_group(
    group_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if group exists and user is a member
    stmt = select(Group).where(Group.id == group_id)
    result = await db.execute(stmt)
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user to be added exists
    user_result = await db.execute(select(User).where(User.id == user_id))
    if not user_result.scalars().first():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user is already a member
    check_stmt = select(group_members).where(
        (group_members.c.group_id == group_id) & (group_members.c.user_id == user_id)
    )
    is_member = await db.execute(check_stmt)
    if is_member.first():
        raise HTTPException(status_code=400, detail="User already in group")

    # Check if current_user is in the group (only members can add others)
    check_current_user = await db.execute(
        select(group_members).where(
            (group_members.c.group_id == group_id)
            & (group_members.c.user_id == current_user.id)
        )
    )
    if not check_current_user.first():
        raise HTTPException(
            status_code=403, detail="Not authorized to add members to this group"
        )

    await db.execute(group_members.insert().values(group_id=group_id, user_id=user_id))
    await db.commit()

    return {"message": "Member added successfully"}


@router.get("/{group_id}/export/csv")
async def export_group_csv(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Group).options(selectinload(Group.members)).where(Group.id == group_id)
    )
    group = result.scalars().first()

    if not group or current_user not in group.members:
        raise HTTPException(status_code=404, detail="Group not found or access denied")

    exp_result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.splits))
        .where(Expense.group_id == group_id, Expense.is_deleted == 0)
    )
    expenses = exp_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Date",
            "Description",
            "Category",
            "Total Amount",
            "Currency",
            "Created By",
            "Your Share",
            "You Paid",
        ]
    )

    # We need to map user IDs to names for the 'Created By' column. Since we only have the ID here, we might just export the ID or fetch the user.
    # For simplicity in this mock, we'll write the creator ID.
    for exp in expenses:
        my_split = next((s for s in exp.splits if s.user_id == current_user.id), None)
        your_share = my_split.amount_owed if my_split else 0
        you_paid = my_split.amount_paid if my_split else 0

        writer.writerow(
            [
                exp.date.strftime("%Y-%m-%d %H:%M:%S"),
                exp.description,
                exp.category,
                f"{exp.total_amount:.2f}",
                exp.currency,
                exp.created_by_id,
                f"{your_share:.2f}",
                f"{you_paid:.2f}",
            ]
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=group_{group_id}_expenses.csv"
        },
    )


@router.get("", response_model=list[GroupWithMembersResponse])
async def list_groups(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Group)
        .join(group_members, Group.id == group_members.c.group_id)
        .where(group_members.c.user_id == current_user.id)
        .options(selectinload(Group.members))
    )

    result = await db.execute(stmt)
    groups = result.scalars().all()
    return groups


@router.get("/{group_id}", response_model=GroupWithMembersResponse)
async def get_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Group)
        .join(group_members, Group.id == group_members.c.group_id)
        .where((Group.id == group_id) & (group_members.c.user_id == current_user.id))
        .options(selectinload(Group.members))
    )

    result = await db.execute(stmt)
    group = result.scalars().first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return group
