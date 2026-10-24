from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import Base, engine, SessionLocal
from .models import User
from .security import hash_password

DEMO_ACCOUNTS = [
    ("admin@example.com", "AdminDemo-ChangeMe-2026!", "admin"),
    ("owner@example.com", "OwnerDemo-ChangeMe-2026!", "owner"),
    ("viewer@example.com", "ViewerDemo-ChangeMe-2026!", "viewer"),
]

def seed_demo_accounts(db: Session):
    """Safely seeds demo accounts into the database if they do not already exist."""
    for email, password, role in DEMO_ACCOUNTS:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            db.add(User(email=email, password_hash=hash_password(password), role=role, active=True))
        else:
            user.active = True
    db.commit()

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_accounts(db)
    print("Demo accounts (local development only):")
    for email, password, role in DEMO_ACCOUNTS:
        print(f"{role}: {email} / {password}")
