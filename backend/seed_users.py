from database import SessionLocal, engine, Base
import models

Base.metadata.create_all(bind=engine)

db = SessionLocal()

users = [
    {"username": "admin", "password": "1234", "role": "admin"},
    {"username": "staff", "password": "1111", "role": "staff"},
]

for user in users:
    existing = db.query(models.User).filter(models.User.username == user["username"]).first()
    if not existing:
        db.add(models.User(**user))

db.commit()
db.close()

print("Users created")