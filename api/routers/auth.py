import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from core.database import get_db
from core.security import (create_access_token, create_password_reset_token,
                           create_verification_token, get_password_hash,
                           verify_password)
from models.user import User
from schemas.user import (PasswordResetConfirm, PasswordResetRequest, Token,
                          UserCreate, UserResponse)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email.lower()))
    db_user = result.scalars().first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        name=user.name,
        email=user.email.lower(),
        hashed_password=hashed_password,
        is_verified=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate verification token
    verification_token = create_verification_token(new_user.email)
    verification_url = f"http://localhost:5173/verify?token={verification_token}"

    # Mock sending email by printing to console
    print(
        f"\n{'='*50}\n[MOCK EMAIL SENT TO {new_user.email}]\nPlease verify your account by clicking the link below:\n{verification_url}\n{'='*50}\n"
    )

    return new_user


@router.get("/verify")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        token_type: str = payload.get("type")

        if email is None or token_type != "verification":
            raise HTTPException(status_code=400, detail="Invalid token")

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.is_verified:
            return {"message": "Email already verified"}

        user.is_verified = True
        await db.commit()

        return {"message": "Email verified successfully!"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid verification token")


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == form_data.username.lower())
    )
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to log in.",
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == request.email.lower()))
    user = result.scalars().first()

    if not user:
        # We still return success to prevent email enumeration
        return {
            "message": "If that email is registered, a password reset link has been sent."
        }

    reset_token = create_password_reset_token(user.email)
    reset_url = f"http://localhost:5173/reset-password?token={reset_token}"

    # Mock sending email
    print(
        f"\n{'='*50}\n[MOCK EMAIL SENT TO {user.email}]\nPlease reset your password by clicking the link below:\n{reset_url}\n{'='*50}\n"
    )

    return {
        "message": "If that email is registered, a password reset link has been sent."
    }


@router.post("/reset-password")
async def reset_password(
    request: PasswordResetConfirm, db: AsyncSession = Depends(get_db)
):
    try:
        payload = jwt.decode(
            request.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        token_type: str = payload.get("type")

        if email is None or token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token")

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        hashed_password = get_password_hash(request.new_password)
        user.hashed_password = hashed_password
        await db.commit()

        return {"message": "Password has been reset successfully."}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid reset token")
