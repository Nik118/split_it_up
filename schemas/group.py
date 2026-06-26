from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from schemas.user import UserResponse


class GroupBase(BaseModel):
    name: str


class GroupCreate(GroupBase):
    pass


class GroupResponse(GroupBase):
    id: int
    created_at: datetime
    created_by_id: int

    model_config = ConfigDict(from_attributes=True)


class GroupWithMembersResponse(GroupResponse):
    members: List[UserResponse] = []
