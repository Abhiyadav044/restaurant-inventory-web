from email import header
from typing import List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import schemas
import crud
from database import SessionLocal, engine, Base
from jose import jwt
from datetime import datetime, timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security, Header

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

Base.metadata.create_all(bind=engine)

app = FastAPI()
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)        
def verify_token(authorization: str = Header(...)):
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid or missing token")


@app.get("/")
def root():
    return {"message": "API running"}


@app.post("/login")
def login(request: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, request.username, request.password)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": user.username,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.get("/items")
def get_items(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    return crud.get_items(db)



@app.post("/items", response_model=schemas.InventoryItemResponse)
def create_item(item: schemas.InventoryItemCreate, db: Session = Depends(get_db)):
    return crud.create_item(db, item)


@app.put("/items/{item_id}", response_model=schemas.InventoryItemResponse)
def update_item(item_id: int, item: schemas.InventoryItemCreate, db: Session = Depends(get_db)):
    updated = crud.update_item(db, item_id, item)

    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")

    return updated


@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = crud.delete_item(db, item_id)

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"message": "Item deleted"}

@app.post("/sales")
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db)):
    return crud.create_sale(db, sale)


@app.get("/sales")
def get_sales(db: Session = Depends(get_db)):
    return crud.get_sales(db)    

