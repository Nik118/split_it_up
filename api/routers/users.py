from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from api.dependencies import get_current_user
from core.database import get_db
from models.user import User, friends_association
from schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


class CurrencyUpdate(BaseModel):
    currency: str


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/currency", response_model=UserResponse)
async def update_currency(
    currency_update: CurrencyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.default_currency = currency_update.currency
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/all", response_model=list[UserResponse])
async def read_all_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()


@router.post("/friends/{friend_id}")
async def add_friend(
    friend_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if friend_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="You cannot add yourself as a friend"
        )

    result = await db.execute(select(User).where(User.id == friend_id))
    friend = result.scalars().first()
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already friends
    stmt = select(friends_association).where(
        (
            (friends_association.c.user_id_1 == current_user.id)
            & (friends_association.c.user_id_2 == friend_id)
        )
        | (
            (friends_association.c.user_id_1 == friend_id)
            & (friends_association.c.user_id_2 == current_user.id)
        )
    )
    existing_friend = await db.execute(stmt)
    if existing_friend.first():
        raise HTTPException(status_code=400, detail="Already friends")

    # Insert both directions for easier querying
    await db.execute(
        friends_association.insert().values(
            user_id_1=current_user.id, user_id_2=friend_id
        )
    )
    await db.execute(
        friends_association.insert().values(
            user_id_1=friend_id, user_id_2=current_user.id
        )
    )
    await db.commit()

    return {"message": "Friend added successfully"}


@router.get("/friends", response_model=list[UserResponse])
async def list_friends(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # Get all users who are friends with the current user
    stmt = (
        select(User)
        .join(friends_association, User.id == friends_association.c.user_id_2)
        .where(friends_association.c.user_id_1 == current_user.id)
    )

    result = await db.execute(stmt)
    friends = result.scalars().all()
    return friends
