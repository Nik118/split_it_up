from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from core.database import Base

class SplitMethod(enum.Enum):
    EQUAL = "EQUAL"
    EXACT = "EXACT"
    PERCENTAGE = "PERCENTAGE"

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, index=True)
    total_amount = Column(Float)
    currency = Column(String, default="INR")
    date = Column(DateTime, default=datetime.utcnow)
    
    group_id = Column(Integer, ForeignKey('groups.id'), nullable=True)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    split_method = Column(SQLEnum(SplitMethod))

    group = relationship("Group", back_populates="expenses")
    creator = relationship("User")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey('expenses.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # How much this user paid for the expense
    amount_paid = Column(Float, default=0.0)
    
    # How much this user owes for the expense
    amount_owed = Column(Float, default=0.0)

    expense = relationship("Expense", back_populates="splits")
    user = relationship("User")


class Settlement(Base):
    """Records a payment between two users to settle debts."""
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)
    payer_id = Column(Integer, ForeignKey('users.id'))
    payee_id = Column(Integer, ForeignKey('users.id'))
    amount = Column(Float)
    currency = Column(String, default="INR")
    date = Column(DateTime, default=datetime.utcnow)
    
    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])
