from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import os
import shutil
from datetime import datetime
import asyncio
import random
import uuid

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/receipt")
async def upload_receipt(file: UploadFile = File(...)):
    """Saves a receipt image and returns the static URL."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
        
    ext = file.filename.split('.')[-1]
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
        
    ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Mock AI Processing Delay
    await asyncio.sleep(2.0)
    
    # Mock AI Extraction Results
    merchants = ["Starbucks", "Walmart", "Local Diner", "Gas Station", "Uber", "Amazon"]
    amount = round(random.uniform(5.0, 150.0), 2)
    
    return {
        "url": f"/static/uploads/{filename}",
        "extracted_data": {
            "description": f"{random.choice(merchants)} Receipt",
            "amount": amount,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "category": "Food & Dining" if "Starbucks" in merchants else "General"
        }
    }
