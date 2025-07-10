from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import re
import os
from contextlib import asynccontextmanager

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

# Database connection - Fixed for all-in-one container
# In all-in-one container, MongoDB runs on localhost
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "box_management")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"Connecting to MongoDB at: {MONGODB_URL}")
    try:
        app.mongodb_client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        app.mongodb = app.mongodb_client[DATABASE_NAME]
        
        # Test connection
        await app.mongodb_client.admin.command('ping')
        print("Successfully connected to MongoDB!")
        
        # Create indexes
        await app.mongodb.boxes.create_index("name")
        await app.mongodb.boxes.create_index("location")
        await app.mongodb.items.create_index("name")
        await app.mongodb.items.create_index("box_id")
        print("Database indexes created successfully!")
        
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown
    app.mongodb_client.close()

# Initialize FastAPI app
app = FastAPI(
    title="Box Management System API",
    version="1.0.0",
    lifespan=lifespan
)

# Dynamic CORS configuration
def get_allowed_origins():
    """Get allowed origins from environment or allow all in development"""
    env_origins = os.getenv("CORS_ORIGINS", "")
    
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",")]
    
    # In production, you might want to be more restrictive
    # For now, allow all origins but you can customize this
    return ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Health check
@app.get("/api/health")
async def health_check():
    try:
        # Check MongoDB connection
        await app.mongodb_client.admin.command('ping')
        db_status = "connected"
    except:
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": db_status
    }

# Box endpoints
@app.get("/api/boxes", response_model=List[Box])
async def get_boxes(
    search: Optional[str] = None,
    location: Optional[str] = None,
    sort_by: Optional[str] = "name",
    sort_order: Optional[str] = "asc"
):
    query = {}
    
    if search:
        # Case-insensitive regex search
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": regex},
            {"description": regex},
            {"location": regex}
        ]
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    # Determine sort order
    sort_direction = 1 if sort_order == "asc" else -1
    
    cursor = app.mongodb.boxes.find(query).sort(sort_by, sort_direction)
    boxes = []
    
    async for box in cursor:
        # Count items for each box
        item_count = await app.mongodb.items.count_documents({"box_id": box["id"]})
        box["item_count"] = item_count
        boxes.append(Box(**box))
    
    return boxes

@app.post("/api/boxes", response_model=Box)
async def create_box(box: BoxCreate):
    new_box = Box(**box.dict())
    box_dict = new_box.dict()
    
    await app.mongodb.boxes.insert_one(box_dict)
    return new_box

@app.get("/api/boxes/{box_id}", response_model=Box)
async def get_box(box_id: str):
    box = await app.mongodb.boxes.find_one({"id": box_id})
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    # Count items
    item_count = await app.mongodb.items.count_documents({"box_id": box_id})
    box["item_count"] = item_count
    
    return Box(**box)

@app.put("/api/boxes/{box_id}", response_model=Box)
async def update_box(box_id: str, box_update: BoxUpdate):
    # Find existing box
    existing_box = await app.mongodb.boxes.find_one({"id": box_id})
    if not existing_box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    # Update fields
    update_data = {k: v for k, v in box_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await app.mongodb.boxes.update_one(
            {"id": box_id},
            {"$set": update_data}
        )
    
    # Return updated box
    updated_box = await app.mongodb.boxes.find_one({"id": box_id})
    item_count = await app.mongodb.items.count_documents({"box_id": box_id})
    updated_box["item_count"] = item_count
    
    return Box(**updated_box)

@app.delete("/api/boxes/{box_id}")
async def delete_box(box_id: str):
    # Check if box exists
    box = await app.mongodb.boxes.find_one({"id": box_id})
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    # Delete all items in the box (cascading delete)
    await app.mongodb.items.delete_many({"box_id": box_id})
    
    # Delete the box
    await app.mongodb.boxes.delete_one({"id": box_id})
    
    return {"message": "Box and all its items deleted successfully"}

# Item endpoints
@app.get("/api/boxes/{box_id}/items", response_model=List[Item])
async def get_items_in_box(
    box_id: str,
    search: Optional[str] = None,
    min_quantity: Optional[int] = None,
    max_quantity: Optional[int] = None,
    sort_by: Optional[str] = "name",
    sort_order: Optional[str] = "asc"
):
    # Check if box exists
    box = await app.mongodb.boxes.find_one({"id": box_id})
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    query = {"box_id": box_id}
    
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": regex},
            {"details": regex}
        ]
    
    if min_quantity is not None:
        query["quantity"] = {"$gte": min_quantity}
    
    if max_quantity is not None:
        if "quantity" in query:
            query["quantity"]["$lte"] = max_quantity
        else:
            query["quantity"] = {"$lte": max_quantity}
    
    sort_direction = 1 if sort_order == "asc" else -1
    
    cursor = app.mongodb.items.find(query).sort(sort_by, sort_direction)
    items = []
    
    async for item in cursor:
        items.append(Item(**item))
    
    return items

@app.post("/api/items", response_model=Item)
async def create_item(item: ItemCreate):
    # Check if box exists
    box = await app.mongodb.boxes.find_one({"id": item.box_id})
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    
    new_item = Item(**item.dict())
    item_dict = new_item.dict()
    
    await app.mongodb.items.insert_one(item_dict)
    return new_item

@app.get("/api/items/{item_id}", response_model=Item)
async def get_item(item_id: str):
    item = await app.mongodb.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return Item(**item)

@app.put("/api/items/{item_id}", response_model=Item)
async def update_item(item_id: str, item_update: ItemUpdate):
    # Find existing item
    existing_item = await app.mongodb.items.find_one({"id": item_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Update fields
    update_data = {k: v for k, v in item_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await app.mongodb.items.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
    
    # Return updated item
    updated_item = await app.mongodb.items.find_one({"id": item_id})
    return Item(**updated_item)

@app.delete("/api/items/{item_id}")
async def delete_item(item_id: str):
    # Check if item exists
    item = await app.mongodb.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete the item
    await app.mongodb.items.delete_one({"id": item_id})
    
    return {"message": "Item deleted successfully"}

# Global search endpoint
@app.get("/api/search", response_model=List[SearchResult])
async def global_search(
    q: str = Query(..., min_length=1),
    limit: int = 50
):
    results = []
    search_regex = {"$regex": q, "$options": "i"}
    
    # Search boxes
    box_query = {
        "$or": [
            {"name": search_regex},
            {"description": search_regex},
            {"location": search_regex}
        ]
    }
    
    cursor = app.mongodb.boxes.find(box_query).limit(limit // 2)
    async for box in cursor:
        results.append(SearchResult(
            type="box",
            id=box["id"],
            name=box["name"],
            details=box.get("description", ""),
            location=box.get("location", "")
        ))
    
    # Search items
    item_query = {
        "$or": [
            {"name": search_regex},
            {"details": search_regex}
        ]
    }
    
    cursor = app.mongodb.items.find(item_query).limit(limit // 2)
    async for item in cursor:
        # Get box name for context
        box = await app.mongodb.boxes.find_one({"id": item["box_id"]})
        box_name = box["name"] if box else "Unknown Box"
        
        results.append(SearchResult(
            type="item",
            id=item["id"],
            name=item["name"],
            details=item.get("details", ""),
            box_id=item["box_id"],
            box_name=box_name,
            quantity=item.get("quantity", 1)
        ))
    
    return results

# Statistics endpoint
@app.get("/api/stats")
async def get_statistics():
    total_boxes = await app.mongodb.boxes.count_documents({})
    total_items = await app.mongodb.items.count_documents({})
    
    # Calculate total quantity
    pipeline = [
        {"$group": {"_id": None, "total_quantity": {"$sum": "$quantity"}}}
    ]
    
    cursor = app.mongodb.items.aggregate(pipeline)
    total_quantity = 0
    async for result in cursor:
        total_quantity = result.get("total_quantity", 0)
    
    return {
        "total_boxes": total_boxes,
        "total_items": total_items,
        "total_quantity": total_quantity,
        "timestamp": datetime.utcnow()
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Box Management System Backend...")
    uvicorn.run(app, host="0.0.0.0", port=8000)