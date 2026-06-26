import asyncio

import httpx


async def main():
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "http://localhost:8000/auth/register",
            json={
                "name": "test2",
                "email": "test2@example.com",
                "password": "password123",
            },
        )
        print(res.status_code)
        print(res.text)


if __name__ == "__main__":
    asyncio.run(main())
