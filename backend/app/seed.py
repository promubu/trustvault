from sqlalchemy import select
from .db import Base, engine, SessionLocal
from .models import User
from .security import hash_password

Base.metadata.create_all(bind=engine)
accounts = [
    ("admin@example.com", "AdminDemo-ChangeMe-2026!", "admin"),
    ("owner@example.com", "OwnerDemo-ChangeMe-2026!", "owner"),
    ("viewer@example.com", "ViewerDemo-ChangeMe-2026!", "viewer"),
]
with SessionLocal() as db:
    for email, password, role in accounts:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            db.add(User(email=email, password_hash=hash_password(password), role=role))
        else:
            user.password_hash = hash_password(password)
            user.role = role
            user.active = True
    db.commit()
print("Demo accounts (local development only):")
for email, password, role in accounts:
    print(f"{role}: {email} / {password}")
