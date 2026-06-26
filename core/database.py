from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

db_url = settings.DATABASE_URL
if db_url and "postgres" in db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Strip all query parameters (like sslmode, channel_binding, options)
    # which crash asyncpg, and explicitly force ssl=require
    if "?" in db_url:
        db_url = db_url.split("?")[0]
    db_url += "?ssl=require"
engine = create_async_engine(db_url, echo=False)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
