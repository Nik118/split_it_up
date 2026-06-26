from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from models.expense import SplitMethod
from schemas.user import UserResponse


class ExpenseSplitCreate(BaseModel):
    user_id: int
    amount_paid: float = 0.0
    amount_owed: float = 0.0  # Optional if EQUAL split
    percentage: Optional[float] = None  # Used if PERCENTAGE split
    shares: Optional[float] = None  # Used if SHARE split


class ExpenseCreate(BaseModel):
    description: str
    total_amount: float = Field(..., gt=0)
    currency: Optional[str] = "INR"
    category: Optional[str] = "General"
    receipt_url: Optional[str] = None
    group_id: Optional[int] = None
    split_method: SplitMethod
    splits: List[ExpenseSplitCreate]


class ExpenseSplitResponse(BaseModel):
    id: int
    user_id: int
    amount_paid: float
    amount_owed: float
    shares: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ExpenseResponse(BaseModel):
    id: int
    description: str
    total_amount: float
    currency: str
    category: str
    receipt_url: Optional[str]
    is_deleted: bool
    date: datetime
    group_id: Optional[int]
    created_by_id: int
    split_method: SplitMethod
    splits: List[ExpenseSplitResponse]

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    content: str


class CommentResponse(CommentCreate):
    id: int
    expense_id: int
    user_id: int
    created_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


class ActivityLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: int
    details: str
    created_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)
