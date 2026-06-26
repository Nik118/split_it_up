import pytest
from fastapi import HTTPException

from models.expense import SplitMethod
from schemas.expense import ExpenseCreate, ExpenseSplitCreate
from services.expense_service import validate_and_calculate_splits


def test_equal_split():
    expense = ExpenseCreate(
        description="Dinner",
        total_amount=100.0,
        split_method=SplitMethod.EQUAL,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=100.0),
            ExpenseSplitCreate(user_id=2, amount_paid=0.0),
            ExpenseSplitCreate(user_id=3, amount_paid=0.0),
        ],
    )

    splits = validate_and_calculate_splits(expense)

    assert len(splits) == 3
    # 100 / 3 = 33.33, remainder 0.01 added to the first user
    assert splits[0].amount_owed == 33.34
    assert splits[1].amount_owed == 33.33
    assert splits[2].amount_owed == 33.33


def test_exact_split_valid():
    expense = ExpenseCreate(
        description="Groceries",
        total_amount=50.0,
        split_method=SplitMethod.EXACT,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=50.0, amount_owed=20.0),
            ExpenseSplitCreate(user_id=2, amount_paid=0.0, amount_owed=30.0),
        ],
    )

    splits = validate_and_calculate_splits(expense)
    assert splits[0].amount_owed == 20.0
    assert splits[1].amount_owed == 30.0


def test_exact_split_invalid_total():
    expense = ExpenseCreate(
        description="Groceries",
        total_amount=50.0,
        split_method=SplitMethod.EXACT,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=50.0, amount_owed=20.0),
            ExpenseSplitCreate(
                user_id=2, amount_paid=0.0, amount_owed=20.0
            ),  # Sum is 40 != 50
        ],
    )

    with pytest.raises(HTTPException) as excinfo:
        validate_and_calculate_splits(expense)
    assert "Total amount owed must equal the total expense amount" in str(
        excinfo.value.detail
    )


def test_percentage_split_valid():
    expense = ExpenseCreate(
        description="Taxi",
        total_amount=200.0,
        split_method=SplitMethod.PERCENTAGE,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=200.0, percentage=60.0),
            ExpenseSplitCreate(user_id=2, amount_paid=0.0, percentage=40.0),
        ],
    )

    splits = validate_and_calculate_splits(expense)
    assert splits[0].amount_owed == 120.0
    assert splits[1].amount_owed == 80.0


def test_percentage_split_invalid_percentage():
    expense = ExpenseCreate(
        description="Taxi",
        total_amount=200.0,
        split_method=SplitMethod.PERCENTAGE,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=200.0, percentage=60.0),
            ExpenseSplitCreate(
                user_id=2, amount_paid=0.0, percentage=50.0
            ),  # Sum is 110%
        ],
    )

    with pytest.raises(HTTPException) as excinfo:
        validate_and_calculate_splits(expense)
    assert "Total percentage must equal 100%" in str(excinfo.value.detail)


def test_invalid_total_paid():
    expense = ExpenseCreate(
        description="Dinner",
        total_amount=100.0,
        split_method=SplitMethod.EQUAL,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=90.0),  # Total paid is 90 != 100
        ],
    )

    with pytest.raises(HTTPException) as excinfo:
        validate_and_calculate_splits(expense)
    assert "Total amount paid must equal the total expense amount" in str(
        excinfo.value.detail
    )


def test_share_split_valid():
    expense = ExpenseCreate(
        description="Hotel",
        total_amount=300.0,
        split_method=SplitMethod.SHARE,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=300.0, shares=2.0),  # 2 shares
            ExpenseSplitCreate(user_id=2, amount_paid=0.0, shares=1.0),  # 1 share
        ],
    )

    splits = validate_and_calculate_splits(expense)
    # Total shares = 3. 300 / 3 = 100 per share.
    # User 1 owes 200, User 2 owes 100
    assert splits[0].amount_owed == 200.0
    assert splits[1].amount_owed == 100.0


def test_share_split_invalid_shares():
    expense = ExpenseCreate(
        description="Hotel",
        total_amount=300.0,
        split_method=SplitMethod.SHARE,
        splits=[
            ExpenseSplitCreate(user_id=1, amount_paid=300.0, shares=0.0),
            ExpenseSplitCreate(
                user_id=2, amount_paid=0.0, shares=0.0
            ),  # Total shares 0
        ],
    )

    with pytest.raises(HTTPException) as excinfo:
        validate_and_calculate_splits(expense)
    assert "Total shares must be greater than 0" in str(excinfo.value.detail)
