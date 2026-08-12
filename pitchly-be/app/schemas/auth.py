import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    nama: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama: str
    email: EmailStr
    role: str
    email_verified: bool = True
    auth_provider: str = "local"


class ProfileUpdate(BaseModel):
    nama: str = Field(min_length=1, max_length=120)


class PasswordChange(BaseModel):
    password_lama: str = Field(min_length=1, max_length=128)
    password_baru: str = Field(min_length=6, max_length=128)


class VerifyRequest(BaseModel):
    token: str


class GoogleCodeRequest(BaseModel):
    code: str


class AuthUrlResponse(BaseModel):
    url: str
