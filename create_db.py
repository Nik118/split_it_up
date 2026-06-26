import asyncio

import asyncpg

from core.config import settings


async def create_database():
    # Connect to the default 'postgres' database to create a new one
    try:
        conn = await asyncpg.connect(
            user="postgres",
            password="password",
            host="localhost",
            port=5432,
            database="postgres",
        )
        # Check if database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'split_it_up'"
        )
        if not exists:
            await conn.execute("CREATE DATABASE split_it_up")
            print("Database 'split_it_up' created successfully.")
        else:
            print("Database 'split_it_up' already exists.")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(create_database())
