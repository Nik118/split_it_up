import asyncio

import google.generativeai as genai
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from api.dependencies import get_current_user
from core.config import settings
from core.database import get_db
from models.expense import Expense, ExpenseSplit
from models.user import User

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

router = APIRouter(prefix="/ai", tags=["ai"])


class CategorizeRequest(BaseModel):
    description: str


class ChatRequest(BaseModel):
    message: str


@router.post("/categorize")
async def categorize_expense(
    request: CategorizeRequest, current_user: User = Depends(get_current_user)
):
    """AI endpoint to categorize expenses based on description."""
    if settings.GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"Categorize the following expense description into one of these exact categories: 'Food', 'Travel', 'Entertainment', 'General'. Only reply with the category name, nothing else. Description: '{request.description}'"
            response = model.generate_content(prompt)
            cat = response.text.strip()
            if cat in ["Food", "Travel", "Entertainment", "General"]:
                return {"category": cat}
        except Exception as e:
            print("Gemini API error:", e)

    # Fallback to mock
    desc = request.description.lower()
    if any(
        word in desc
        for word in [
            "mcdonalds",
            "dinner",
            "lunch",
            "food",
            "pizza",
            "restaurant",
            "burger",
            "coffee",
            "starbucks",
            "cafe",
        ]
    ):
        return {"category": "Food"}
    elif any(
        word in desc
        for word in ["uber", "lyft", "flight", "taxi", "train", "bus", "gas", "parking"]
    ):
        return {"category": "Travel"}
    elif any(
        word in desc
        for word in [
            "movie",
            "cinema",
            "concert",
            "ticket",
            "game",
            "netflix",
            "spotify",
            "party",
        ]
    ):
        return {"category": "Entertainment"}
    else:
        return {"category": "General"}


@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI endpoint to answer questions about the user's finances."""

    # Gather user's financial context
    stmt = (
        select(Expense)
        .join(ExpenseSplit)
        .where((ExpenseSplit.user_id == current_user.id) & (Expense.is_deleted == 0))
        .options(selectinload(Expense.splits))
    )
    expenses = (await db.execute(stmt)).scalars().all()

    total_owed = sum(
        next(s.amount_owed for s in e.splits if s.user_id == current_user.id)
        for e in expenses
    )
    total_paid = sum(
        next(s.amount_paid for s in e.splits if s.user_id == current_user.id)
        for e in expenses
    )
    balance = total_paid - total_owed

    if settings.GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            context = f"User Name: {current_user.name}\nTotal Spent (Paid): {total_paid:.2f}\nTotal Owed (Share): {total_owed:.2f}\nOverall Balance: {balance:.2f} (If positive, they are owed money. If negative, they owe money).\nYou are a helpful financial assistant inside the Split It Up app. Answer the user's question concisely based on this financial data. Keep it short."
            prompt = f"{context}\n\nUser Question: {request.message}"
            response = model.generate_content(prompt)
            return {"response": response.text.strip()}
        except Exception as e:
            print("Gemini API error:", e)

    # Fallback to mock
    msg = request.message.lower()
    await asyncio.sleep(1.0)  # Simulate LLM generation time

    if "how much" in msg and "owe" in msg:
        if balance < 0:
            return {
                "response": f"Based on your records, you are down overall. You owe a total of {-balance:.2f} across all your groups."
            }
        else:
            return {
                "response": f"You are doing great! You are owed {balance:.2f} overall."
            }

    elif "spend" in msg or "spending" in msg:
        return {
            "response": f"Your total spending (your share of expenses) comes to {total_owed:.2f}."
        }

    elif "hello" in msg or "hi" in msg:
        return {
            "response": f"Hi {current_user.name}! I'm your Split It Up AI Assistant. You can ask me things like 'How much do I owe?' or 'What is my total spending?'"
        }

    else:
        return {
            "response": "I'm still a mock AI (Gemini key failed or wasn't set properly). I only understand questions about how much you owe, or your total spending."
        }
