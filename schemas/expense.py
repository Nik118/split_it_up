from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from models.expense import SplitMethod
from schemas.user import UserResponse
from schemas.group import GroupResponse

class ExpenseSplitCreate(BaseModel):
    user_id: int
    amount_paid: float = 0.0
    amount_owed: float = 0.0  # Optional if EQUAL split
    percentage: Optional[float] = None  # Used if PERCENTAGE split

class ExpenseCreate(BaseModel):
    description: str
    total_amount: float = Field(..., gt=0)
    currency: Optional[str] = "INR"
    group_id: Optional[int] = None
    split_method: SplitMethod
    splits: List[ExpenseSplitCreate]

class ExpenseSplitResponse(BaseModel):
    id: int
    user_id: int
    amount_paid: float
    amount_owed: float

    model_config = ConfigDict(from_attributes=True)

class ExpenseResponse(BaseModel):
    id: int
    description: str
    total_amount: float
    currency: str
    date: datetime
    group_id: Optional[int]
    created_by_id: int
    split_method: SplitMethod
    splits: List[ExpenseSplitResponse]

    model_config = ConfigDict(from_attributes=True)
