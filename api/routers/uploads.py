import os
import shutil
import uuid
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = "uploads"


@router.post("/receipt")
async def upload_receipt(file: UploadFile = File(...)):
    """Saves a receipt image and returns the static URL."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/static/uploads/{filename}"}


@router.post("/scan")
async def scan_receipt(file: UploadFile = File(...)):
    """Saves a receipt image and mocks an AI extraction."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Mock AI Extraction Results
    import random

    merchants = ["Starbucks", "Walmart", "Local Diner", "Gas Station", "Uber", "Amazon"]
    chosen_merchant = random.choice(merchants)
    amount = round(random.uniform(5.0, 150.0), 2)

    food_merchants = {"Starbucks", "Local Diner"}
    category = "Food & Dining" if chosen_merchant in food_merchants else "General"

    return {
        "url": f"/static/uploads/{filename}",
        "extracted_data": {
            "description": f"{chosen_merchant} Receipt",
            "amount": amount,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "category": category,
        },
    }
