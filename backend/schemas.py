from pydantic import BaseModel


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    username: str
    role: str


class InventoryItemCreate(BaseModel):
    item_name: str
    category: str
    quantity: float
    unit: str
    low_limit: float
    expiry: str


class InventoryItemResponse(BaseModel):
    id: int
    item_name: str
    category: str
    quantity: float
    unit: str
    low_limit: float
    expiry: str

    class Config:
        from_attributes = True   