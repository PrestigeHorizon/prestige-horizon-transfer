from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'prestige-horizon-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Create the main app
app = FastAPI(title="Prestige Horizon Transfer API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    country: str = "Benin"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    phone: str
    country: str
    is_admin: bool = False
    created_at: str

class TransferCreate(BaseModel):
    provider: str  # western_union, moneygram, ria, mtn, moov, coris
    amount: float
    currency: str = "XOF"
    receiver_name: str
    receiver_phone: str
    receiver_country: str
    sender_name: Optional[str] = None
    sender_phone: Optional[str] = None
    notes: Optional[str] = None

class TransferUpdate(BaseModel):
    status: str  # pending, processing, completed, cancelled, failed
    admin_notes: Optional[str] = None
    tracking_number: Optional[str] = None

class TransferResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    provider: str
    amount: float
    currency: str
    fee: float
    total_amount: float
    receiver_name: str
    receiver_phone: str
    receiver_country: str
    sender_name: str
    sender_phone: str
    status: str
    tracking_number: Optional[str] = None
    admin_notes: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class ProviderRate(BaseModel):
    provider: str
    name: str
    fee_percentage: float
    flat_fee: float
    min_amount: float
    max_amount: float
    estimated_time: str
    color: str

# Provider Configuration
PROVIDERS = {
    "western_union": {
        "name": "Western Union",
        "fee_percentage": 2.5,
        "flat_fee": 500,
        "min_amount": 1000,
        "max_amount": 5000000,
        "estimated_time": "Minutes",
        "color": "#FFDA00"
    },
    "moneygram": {
        "name": "MoneyGram",
        "fee_percentage": 2.0,
        "flat_fee": 400,
        "min_amount": 1000,
        "max_amount": 3000000,
        "estimated_time": "Minutes",
        "color": "#E51B24"
    },
    "ria": {
        "name": "Ria Money Transfer",
        "fee_percentage": 1.8,
        "flat_fee": 350,
        "min_amount": 500,
        "max_amount": 2000000,
        "estimated_time": "1-2 Hours",
        "color": "#F37021"
    },
    "mtn": {
        "name": "MTN Mobile Money",
        "fee_percentage": 1.5,
        "flat_fee": 100,
        "min_amount": 100,
        "max_amount": 1000000,
        "estimated_time": "Instant",
        "color": "#FFCC00"
    },
    "moov": {
        "name": "Moov Money",
        "fee_percentage": 1.5,
        "flat_fee": 100,
        "min_amount": 100,
        "max_amount": 1000000,
        "estimated_time": "Instant",
        "color": "#00a51b"
    },

    "coris": {
    "name": "Coris Money",
    "fee_percentage": 1.5,
    "flat_fee": 100,
    "min_amount": 100,
    "max_amount": 1000000,
    "estimated_time": "Instant",
    "color": "#0068A5"
    }
}

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    # Ensure password is encoded to bytes before hashing
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        # We must ensure both are encoded to bytes for bcrypt to compare them
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        print(f"Error during password verification: {e}")
        return False
    
def create_token(user_id: str, is_admin: bool = False) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "is_admin": is_admin,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def calculate_fee(provider: str, amount: float) -> float:
    if provider not in PROVIDERS:
        return 0
    config = PROVIDERS[provider]
    return (amount * config["fee_percentage"] / 100) + config["flat_fee"]

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "full_name": user.full_name,
        "phone": user.phone,
        "country": user.country,
        "is_admin": False,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "country": user.country,
            "is_admin": False,
            "created_at": now
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user.get("is_admin", False))
    
    user_response = {k: v for k, v in user.items() if k != "password"}
    return {"token": token, "user": user_response}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})

# ============== PROVIDER ROUTES ==============

@api_router.get("/providers", response_model=List[ProviderRate])
async def get_providers():
    return [
        ProviderRate(provider=key, **value)
        for key, value in PROVIDERS.items()
    ]

@api_router.get("/providers/{provider}/calculate")
async def calculate_transfer(provider: str, amount: float):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    config = PROVIDERS[provider]
    fee = calculate_fee(provider, amount)
    
    return {
        "provider": provider,
        "amount": amount,
        "fee": fee,
        "total": amount + fee,
        "currency": "XOF",
        "estimated_time": config["estimated_time"]
    }

# ============== TRANSFER ROUTES ==============

@api_router.post("/transfers", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(transfer: TransferCreate, user: dict = Depends(get_current_user)):
    if transfer.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    config = PROVIDERS[transfer.provider]
    if transfer.amount < config["min_amount"] or transfer.amount > config["max_amount"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Amount must be between {config['min_amount']} and {config['max_amount']} {transfer.currency}"
        )
    
    fee = calculate_fee(transfer.provider, transfer.amount)
    transfer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    transfer_doc = {
        "id": transfer_id,
        "user_id": user["id"],
        "provider": transfer.provider,
        "amount": transfer.amount,
        "currency": transfer.currency,
        "fee": fee,
        "total_amount": transfer.amount + fee,
        "receiver_name": transfer.receiver_name,
        "receiver_phone": transfer.receiver_phone,
        "receiver_country": transfer.receiver_country,
        "sender_name": transfer.sender_name or user["full_name"],
        "sender_phone": transfer.sender_phone or user["phone"],
        "status": "pending",
        "tracking_number": None,
        "admin_notes": None,
        "notes": transfer.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.transfers.insert_one(transfer_doc)
    
    return TransferResponse(**transfer_doc)

@api_router.get("/transfers", response_model=List[TransferResponse])
async def get_user_transfers(user: dict = Depends(get_current_user)):
    transfers = await db.transfers.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [TransferResponse(**t) for t in transfers]

@api_router.get("/transfers/{transfer_id}", response_model=TransferResponse)
async def get_transfer(transfer_id: str, user: dict = Depends(get_current_user)):
    transfer = await db.transfers.find_one(
        {"id": transfer_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return TransferResponse(**transfer)

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/transfers", response_model=List[TransferResponse])
async def get_all_transfers(
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    
    transfers = await db.transfers.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [TransferResponse(**t) for t in transfers]

@api_router.put("/admin/transfers/{transfer_id}", response_model=TransferResponse)
async def update_transfer(
    transfer_id: str, 
    update: TransferUpdate,
    admin: dict = Depends(get_admin_user)
):
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": update.status,
        "updated_at": now
    }
    
    if update.admin_notes:
        update_data["admin_notes"] = update.admin_notes
    if update.tracking_number:
        update_data["tracking_number"] = update.tracking_number
    
    await db.transfers.update_one(
        {"id": transfer_id},
        {"$set": update_data}
    )
    
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    return TransferResponse(**updated)

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    total_transfers = await db.transfers.count_documents({})
    pending = await db.transfers.count_documents({"status": "pending"})
    processing = await db.transfers.count_documents({"status": "processing"})
    completed = await db.transfers.count_documents({"status": "completed"})
    
    # Calculate total volume
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    volume_result = await db.transfers.aggregate(pipeline).to_list(1)
    total_volume = volume_result[0]["total"] if volume_result else 0
    
    # Users count
    total_users = await db.users.count_documents({"is_admin": False})
    
    return {
        "total_transfers": total_transfers,
        "pending": pending,
        "processing": processing,
        "completed": completed,
        "total_volume": total_volume,
        "total_users": total_users
    }

@api_router.post("/admin/create-admin")
async def create_admin_user():
    """Create initial admin user if not exists"""
    existing = await db.users.find_one({"email": "admin@prestigehorizon.com"})
    if existing:
        return {"message": "Admin already exists"}
    
    admin_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    admin_doc = {
        "id": admin_id,
        "email": "admin@prestigehorizon.com",
        "password": hash_password("admin123"),
        "full_name": "Admin User",
        "phone": "+229 01 56 40 83 46",
        "country": "Burkina Faso",
        "is_admin": True,
        "created_at": now
    }
    
    await db.users.insert_one(admin_doc)
    return {"message": "Admin created", "email": "admin@prestigehorizon.com", "password": "admin123"}

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Prestige Horizon Transfer API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
