from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from api.dependencies import get_current_user
from core.database import get_db
from models.activity import ActivityLog
from models.user import User
from schemas.expense import ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityLogResponse])
async def get_activity(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # Simple logic: Fetch all activity by this user.
    # In a full app, you'd fetch activity for groups the user is in.
    stmt = (
        select(ActivityLog)
        .where(ActivityLog.user_id == current_user.id)
        .options(selectinload(ActivityLog.user))
        .order_by(ActivityLog.created_at.desc())
        .limit(50)
    )

    result = await db.execute(stmt)
    return result.scalars().all()
