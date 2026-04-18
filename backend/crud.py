from sqlalchemy.orm import Session
import models


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.User).filter(
        models.User.username == username
    ).first()

    if user and user.password == password:
        return user

    return None


def get_items(db: Session):
    return db.query(models.InventoryItem).all()


def create_item(db: Session, item):
    db_item = models.InventoryItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_item(db: Session, item_id: int, updated_item):
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id
    ).first()

    if not item:
        return None

    for key, value in updated_item.dict().items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int):
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id
    ).first()

    if item:
        db.delete(item)
        db.commit()

    return item