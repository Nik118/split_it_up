from typing import List

from pydantic import BaseModel, ConfigDict


class Debt(BaseModel):
    debtor_id: int
    creditor_id: int
    amount: float


class BalanceResponse(BaseModel):
    user_id: int
    net_balance: float


class SimplifiedDebtsResponse(BaseModel):
    debts: List[Debt]


class SettlementCreate(BaseModel):
    payee_id: int
    amount: float
    currency: str = "INR"


class SettlementResponse(SettlementCreate):
    id: int
    payer_id: int

    model_config = ConfigDict(from_attributes=True)
