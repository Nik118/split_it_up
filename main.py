import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routers import (activity, ai, auth, balances, expenses, groups,
                         uploads, users, ws)

app = FastAPI(
    title="Split It Up",
    description="A backend API for tracking expenses and splitting bills.",
    version="1.0.0",
)

# CORS configuration
origins = ["*"]

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
app.include_router(uploads.router)
app.include_router(ws.router)
app.include_router(ai.router)

# Mount static files
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
async def root():
    return {"message": "Welcome to Split It Up! Go to /docs for Swagger UI."}
