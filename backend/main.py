from typing import List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import schemas
import crud
from database import SessionLocal, engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI()

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


@app.get("/")
def root():
    return {"message": "API running"}


@app.post("/login", response_model=schemas.UserResponse)
def login(request: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, request.username, request.password)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "username": user.username,
        "role": user.role
    }


@app.get("/items", response_model=List[schemas.InventoryItemResponse])
def get_items(db: Session = Depends(get_db)):
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

