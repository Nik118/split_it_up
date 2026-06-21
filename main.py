from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import auth, users, groups, expenses, balances, activity

app = FastAPI(
    title="Split It Up",
    description="A backend API for tracking expenses and splitting bills.",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(activity.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Split It Up! Go to /docs for Swagger UI."}
