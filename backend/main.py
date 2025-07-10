from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, select, or_, and_, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from datetime import datetime
import uuid
import os
from typing import List, Optional
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

# Database setup - SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./box_management.db")

# Create engine with SQLite-specific settings
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy models
class BoxDB(Base):
    __tablename__ = "boxes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    location = Column(String, default="", index=True)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ItemDB(Base):
    __tablename__ = "items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    quantity = Column(Integer, default=1)
    details = Column(Text, default="")
    box_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models
class BoxBase(BaseModel):
    name: str
    location: Optional[str] = ""
    description: Optional[str] = ""

class BoxCreate(BoxBase):
    pass

class Box(BoxBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    item_count: int = 0

class BoxUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

class ItemBase(BaseModel):
    name: str
    quantity: int = 1
    details: Optional[str] = ""
    box_id: str

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    details: Optional[str] = None

class SearchResult(BaseModel):
    type: str  # "box" or "item"
    id: str
    name: str
    details: Optional[str] = None
    box_id: Optional[str] = None
    box_name: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[int] = None

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Box Management System with SQLite...")
    print(f"Database location: {SQLALCHEMY_DATABASE_URL}")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("Database tables ready!")
    
    yield
    
    # Shutdown
    print("Shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="Box Management System API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Health check
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": "sqlite",
        "database_file": SQLALCHEMY_DATABASE_URL
    }

# Box endpoints
@app.get("/api/boxes", response_model=List[Box])
async def get_boxes(
    search: Optional[str] = None,
    location: Optional[str] = None,
    sort_by: Optional[str] = "name",
    sort_order: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(BoxDB)
    
    if search:
        search_filter = or_(
            BoxDB.name.ilike(f"%{search}%"),
            BoxDB.description.ilike(f"%{search}%"),
            BoxDB.location.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if location:
        query = query.filter(BoxDB.location.ilike(f"%{location}%"))
    
    # Sorting
    if sort_order == "desc":
        query = query.order_by(getattr(BoxDB, sort_by).desc())
    else:
        query = query.order_by(getattr(BoxDB, sort_by))
    
    boxes = query.all()
    result = []
    
    for box in boxes:
        item_count = db.query(ItemDB).filter(ItemDB.box_id == box.id).count()
        box_dict = {
            "id": box.id,
            "name": box.name,
            "location": box.location,
            "description": box.description,
            "created_at": box.created_at,
            "updated_at": box.updated_at,
            "item_count": item_count
        }
        result.append(Box(**box_dict))
    
    return result

@app.post("/api/boxes", response_model=Box)
async def create_box(box: BoxCreate, db: Session = Depends(get_db)):
    db_box = BoxDB(
        id=str(uuid.uuid4()),
        name=box.name,
        location=box.location,
        description=box.description,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_box)
    db.commit()
    db.refresh(db_box)
    
    return Box(
        id=db_box.id,
        name=db_box.name,
        location=db_box.location,
        description=db_box.description,
        created_at=db_box.created_at,
        updated_at=db_box.updated_at,
        item_count=0
    )

@app.get("/api/boxes/{box_id}", response_model=Box)
async def get_box(box_id: str, db: Session = Depends(get_db)):
    box = db.query(BoxDB).filter(BoxDB.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    item_count = db.query(ItemDB).filter(ItemDB.box_id == box_id).count()
    
    return Box(
        id=box.id,
        name=box.name,
        location=box.location,
        description=box.description,
        created_at=box.created_at,
        updated_at=box.updated_at,
        item_count=item_count
    )

@app.put("/api/boxes/{box_id}", response_model=Box)
async def update_box(box_id: str, box_update: BoxUpdate, db: Session = Depends(get_db)):
    box = db.query(BoxDB).filter(BoxDB.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    if box_update.name is not None:
        box.name = box_update.name
    if box_update.location is not None:
        box.location = box_update.location
    if box_update.description is not None:
        box.description = box_update.description
    
    box.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(box)
    
    item_count = db.query(ItemDB).filter(ItemDB.box_id == box_id).count()
    
    return Box(
        id=box.id,
        name=box.name,
        location=box.location,
        description=box.description,
        created_at=box.created_at,
        updated_at=box.updated_at,
        item_count=item_count
    )

@app.delete("/api/boxes/{box_id}")
async def delete_box(box_id: str, db: Session = Depends(get_db)):
    box = db.query(BoxDB).filter(BoxDB.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    # Delete all items in the box
    db.query(ItemDB).filter(ItemDB.box_id == box_id).delete()
    
    # Delete the box
    db.delete(box)
    db.commit()
    
    return {"message": "Box and all its items deleted successfully"}

# Item endpoints
@app.get("/api/boxes/{box_id}/items", response_model=List[Item])
async def get_items_in_box(
    box_id: str,
    search: Optional[str] = None,
    min_quantity: Optional[int] = None,
    max_quantity: Optional[int] = None,
    sort_by: Optional[str] = "name",
    sort_order: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    # Check if box exists
    box = db.query(BoxDB).filter(BoxDB.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    query = db.query(ItemDB).filter(ItemDB.box_id == box_id)
    
    if search:
        search_filter = or_(
            ItemDB.name.ilike(f"%{search}%"),
            ItemDB.details.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if min_quantity is not None:
        query = query.filter(ItemDB.quantity >= min_quantity)
    
    if max_quantity is not None:
        query = query.filter(ItemDB.quantity <= max_quantity)
    
    # Sorting
    if sort_order == "desc":
        query = query.order_by(getattr(ItemDB, sort_by).desc())
    else:
        query = query.order_by(getattr(ItemDB, sort_by))
    
    items = query.all()
    
    return [Item(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        details=item.details,
        box_id=item.box_id,
        created_at=item.created_at,
        updated_at=item.updated_at
    ) for item in items]

@app.post("/api/items", response_model=Item)
async def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    # Check if box exists
    box = db.query(BoxDB).filter(BoxDB.id == item.box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    db_item = ItemDB(
        id=str(uuid.uuid4()),
        name=item.name,
        quantity=item.quantity,
        details=item.details,
        box_id=item.box_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    return Item(
        id=db_item.id,
        name=db_item.name,
        quantity=db_item.quantity,
        details=db_item.details,
        box_id=db_item.box_id,
        created_at=db_item.created_at,
        updated_at=db_item.updated_at
    )

@app.get("/api/items/{item_id}", response_model=Item)
async def get_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return Item(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        details=item.details,
        box_id=item.box_id,
        created_at=item.created_at,
        updated_at=item.updated_at
    )

@app.put("/api/items/{item_id}", response_model=Item)
async def update_item(item_id: str, item_update: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item_update.name is not None:
        item.name = item_update.name
    if item_update.quantity is not None:
        item.quantity = item_update.quantity
    if item_update.details is not None:
        item.details = item_update.details
    
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    
    return Item(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        details=item.details,
        box_id=item.box_id,
        created_at=item.created_at,
        updated_at=item.updated_at
    )

@app.delete("/api/items/{item_id}")
async def delete_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    
    return {"message": "Item deleted successfully"}

# Global search endpoint
@app.get("/api/search", response_model=List[SearchResult])
async def global_search(
    q: str = Query(..., min_length=1),
    limit: int = 50,
    db: Session = Depends(get_db)
):
    results = []
    
    # Search boxes
    box_query = db.query(BoxDB).filter(
        or_(
            BoxDB.name.ilike(f"%{q}%"),
            BoxDB.description.ilike(f"%{q}%"),
            BoxDB.location.ilike(f"%{q}%")
        )
    ).limit(limit // 2)
    
    for box in box_query:
        results.append(SearchResult(
            type="box",
            id=box.id,
            name=box.name,
            details=box.description,
            location=box.location
        ))
    
    # Search items
    item_query = db.query(ItemDB).filter(
        or_(
            ItemDB.name.ilike(f"%{q}%"),
            ItemDB.details.ilike(f"%{q}%")
        )
    ).limit(limit // 2)
    
    for item in item_query:
        # Get box name for context
        box = db.query(BoxDB).filter(BoxDB.id == item.box_id).first()
        box_name = box.name if box else "Unknown Box"
        
        results.append(SearchResult(
            type="item",
            id=item.id,
            name=item.name,
            details=item.details,
            box_id=item.box_id,
            box_name=box_name,
            quantity=item.quantity
        ))
    
    return results

# Statistics endpoint
@app.get("/api/stats")
async def get_statistics(db: Session = Depends(get_db)):
    total_boxes = db.query(func.count(BoxDB.id)).scalar()
    total_items = db.query(func.count(ItemDB.id)).scalar()
    total_quantity = db.query(func.sum(ItemDB.quantity)).scalar() or 0
    
    return {
        "total_boxes": total_boxes,
        "total_items": total_items,
        "total_quantity": total_quantity,
        "timestamp": datetime.utcnow()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Box Management System Backend with SQLite...")
    uvicorn.run(app, host="0.0.0.0", port=8000)