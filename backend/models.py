from sqlalchemy import Column, Integer, String, Float
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)


class InventoryItem(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True)
    category = Column(String)
    quantity = Column(Float)
    unit = Column(String)
    low_limit = Column(Float)
    expiry = Column(String)