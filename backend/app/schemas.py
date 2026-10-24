from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: str = "viewer"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class GrantIn(BaseModel):
    user_id: int
    permission: str = Field(pattern="^(read|edit)$")

class GrantOut(BaseModel):
    id: int
    document_id: int
    user_id: int
    user_email: str | None = None
    permission: str

class DocumentOut(BaseModel):
    id: int
    title: str
    category: str
    owner_id: int
    file_size: int = 0
    mime_type: str = "application/octet-stream"
    created_at: datetime | None = None
    permission: str | None = None

class DocumentUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=100)

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    active: bool = True
