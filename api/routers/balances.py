from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from api.dependencies import get_current_user
from core.database import get_db
from models.expense import Settlement
from models.user import User
from schemas.balance import (Debt, SettlementCreate, SettlementResponse,
                             SimplifiedDebtsResponse)
from services.balance_service import get_user_balances, simplify_debts

router = APIRouter(prefix="/balances", tags=["balances"])


@router.get("/simplify", response_model=SimplifiedDebtsResponse)
async def get_simplified_debts(
    group_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Get net balances for everyone in the context (either global or within a group)
    # The current get_user_balances calculates balances for all users involved in expenses.
    balances = await get_user_balances(current_user.id, db, group_id)

    # 2. Simplify debts
    transactions = simplify_debts(balances)

    # Format response
    debts = [Debt(debtor_id=t[0], creditor_id=t[1], amount=t[2]) for t in transactions]

    # Optional: Filter debts to only show those involving the current user if no group is specified
    if not group_id:
        debts = [
            d
            for d in debts
            if d.debtor_id == current_user.id or d.creditor_id == current_user.id
        ]

    return SimplifiedDebtsResponse(debts=debts)


@router.post("/settle", response_model=SettlementResponse)
async def settle_debt(
    settlement_in: SettlementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if settlement_in.payee_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="You cannot settle a debt with yourself"
        )

    # Check if payee exists
    payee = (
        (await db.execute(select(User).where(User.id == settlement_in.payee_id)))
        .scalars()
        .first()
    )
    if not payee:
        raise HTTPException(status_code=404, detail="Payee not found")

    new_settlement = Settlement(
        payer_id=current_user.id,
        payee_id=settlement_in.payee_id,
        amount=settlement_in.amount,
        currency=settlement_in.currency,
    )

    db.add(new_settlement)
    await db.commit()
    await db.refresh(new_settlement)

    return new_settlement
