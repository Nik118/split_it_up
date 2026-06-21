from core.database import Base
from .user import User, friends_association
from .group import Group, group_members
from .expense import Expense, ExpenseSplit, Settlement, SplitMethod, ExpenseComment
from .activity import ActivityLog

# This file imports all models so that Alembic can auto-detect them.
