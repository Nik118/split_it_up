from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

friends_association = Table(
    'friends',
    Base.metadata,
    Column('user_id_1', Integer, ForeignKey('users.id'), primary_key=True),
    Column('user_id_2', Integer, ForeignKey('users.id'), primary_key=True),
    Column('created_at', DateTime, default=datetime.utcnow)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Self-referential relationship for friends
    # Note: To fully support bi-directional friends easily, we might need a custom property or two relationships,
    # but for simplicity, we can query the friends_association table directly.
    
    # Groups the user is a member of
    groups = relationship("Group", secondary="group_members", back_populates="members")
    
    # Groups the user created
    created_groups = relationship("Group", back_populates="creator")
