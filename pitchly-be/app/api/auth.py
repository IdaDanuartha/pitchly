import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_verify_token,
    decode_verify_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthUrlResponse,
    GoogleCodeRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
    VerifyRequest,
)
from app.services.email import send_verification_email
from app.services.google_oauth import (
    GoogleOAuthError,
    build_auth_url,
    exchange_code,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest, db: AsyncSession = Depends(get_db)
) -> User:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email sudah terdaftar"
        )

    # When Resend is configured, require email verification; otherwise auto-verify.
    verified = not settings.email_enabled
    user = User(
        nama=payload.nama,
        email=payload.email,
        password_hash=hash_password(payload.password),
        email_verified=verified,
        auth_provider="local",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if settings.email_enabled:
        token = create_verify_token(user.email)
        link = f"{settings.app_base_url}/verifikasi?token={token}"
        await run_in_threadpool(
            send_verification_email, user.email, user.nama, link
        )

    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi salah",
        )
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email belum diverifikasi. Cek kotak masuk Anda.",
        )
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/verify", response_model=UserPublic)
async def verify_email(
    payload: VerifyRequest, db: AsyncSession = Depends(get_db)
) -> User:
    email = decode_verify_token(payload.token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tautan verifikasi tidak valid atau kedaluwarsa",
        )
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan"
        )
    user.email_verified = True
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/google/url", response_model=AuthUrlResponse)
async def google_url() -> AuthUrlResponse:
    if not settings.google_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Login Google belum dikonfigurasi",
        )
    return AuthUrlResponse(url=build_auth_url(state=secrets.token_urlsafe(16)))


@router.post("/google/exchange", response_model=TokenResponse)
async def google_exchange(
    payload: GoogleCodeRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    if not settings.google_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Login Google belum dikonfigurasi",
        )
    try:
        info = await run_in_threadpool(exchange_code, payload.code)
    except GoogleOAuthError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    sub = info.get("sub")
    email = info.get("email")
    nama = info.get("name") or (email.split("@")[0] if email else "Pengguna")
    if not sub or not email:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "Profil Google tidak lengkap"
        )

    user = await db.scalar(select(User).where(User.google_sub == sub))
    if user is None:
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                nama=nama,
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(24)),
                email_verified=True,
                auth_provider="google",
                google_sub=sub,
            )
            db.add(user)
        else:
            # Link Google to an existing local account.
            user.google_sub = sub
            user.email_verified = True
        await db.commit()
        await db.refresh(user)

    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
