from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'prestige-horizon-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

app = FastAPI(title="Prestige Money Transfer API")
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)

# ============================================================
# CORRIDORS & SERVICES
# Canada → Bénin : paiement Interac ou USDC, réception MTN/Moov/Banque
# Bénin  → Canada : paiement virement bancaire BJ, réception Interac
# ============================================================

CORRIDORS = {
    "canada_to_benin": {
        "label": "Canada → Bénin",
        "from_country": "Canada",
        "to_country": "Bénin",
        "from_currency": "CAD",
        "to_currency": "XOF",
        "payment_methods": ["interac", "crypto_usdc"],
        "delivery_methods": ["mtn", "moov", "bank_transfer"],
        "rate_xof_per_cad": 430.0,
        "fee_percentage": 2.0,
        "flat_fee_cad": 5.0,
        "min_amount_cad": 50.0,
        "max_amount_cad": 5000.0,
        "estimated_time": "24-48h"
    },
    "benin_to_canada": {
        "label": "Bénin → Canada",
        "from_country": "Bénin",
        "to_country": "Canada",
        "from_currency": "XOF",
        "to_currency": "CAD",
        "payment_methods": ["bank_transfer"],
        "delivery_methods": ["interac"],
        "rate_cad_per_xof": 0.00226,
        "fee_percentage": 2.5,
        "flat_fee_xof": 2500.0,
        "min_amount_xof": 25000.0,
        "max_amount_xof": 2500000.0,
        "estimated_time": "2-5 jours ouvrables"
    }
}

PAYMENT_METHOD_LABELS = {
    "interac":       {"label": "Virement Interac / Bancaire", "icon": "bank",   "currency": "CAD"},
    "crypto_usdc":   {"label": "Crypto (USDC)",               "icon": "crypto", "currency": "USDC"},
    "bank_transfer": {"label": "Virement Bancaire",           "icon": "bank",   "currency": "XOF"},
}

DELIVERY_METHOD_LABELS = {
    "mtn":           {"label": "MTN Mobile Money",   "color": "#FFCC00", "icon": "mtn"},
    "moov":          {"label": "Moov Money",         "color": "#00a51b", "icon": "moov"},
    "bank_transfer": {"label": "Virement Bancaire",  "color": "#D4AF37", "icon": "bank"},
    "interac":       {"label": "Interac / Bancaire", "color": "#D4AF37", "icon": "bank"},
}

# Instructions de paiement affichées au client après création du transfert
PAYMENT_INSTRUCTIONS = {
    "interac": {
        "title": "Envoyez votre virement Interac",
        "steps": [
            "Connectez-vous à votre banque en ligne (Desjardins, RBC, TD, BMO, Scotia, etc.)",
            "Initiez un virement Interac e-Transfer",
            "Destinataire : paiement@prestigemoneytransfer.ca",
            "Montant : {total_charged} CAD",
            "Message/Note : {tracking_number}",
            "Envoyez et téléchargez votre preuve de virement ci-dessous."
        ],
        "note": "Votre transfert sera traité dans les 2-4h après réception et confirmation du paiement."
    },
    "crypto_usdc": {
        "title": "Envoyez votre paiement en USDC",
        "steps": [
            "Réseau accepté : Ethereum (ERC-20) ou Polygon",
            "Adresse de réception : 0xPRESTIGE000000000000000000000000000000",
            "Montant USDC équivalent : {total_charged_usdc} USDC",
            "Ajoutez le mémo/note : {tracking_number}",
            "Attendez 3 confirmations réseau, puis téléchargez votre hash de transaction ci-dessous."
        ],
        "note": "Le taux USDC/XOF sera celui du moment de la confirmation on-chain."
    },
    "bank_transfer": {
        "title": "Effectuez votre virement bancaire",
        "steps": [
            "Banque : Prestige Money Transfer — Banque of Africa Bénin",
            "IBAN / Numéro de compte : BJ66 BJ00 6101 8800 3000 0000 000",
            "Montant : {total_charged} XOF",
            "Motif du virement : {tracking_number}",
            "Téléchargez votre reçu de virement ci-dessous."
        ],
        "note": "Les virements béninois sont traités sous 1-3 jours ouvrables."
    }
}

# Statuts valides et transitions autorisées (modèle manuel)
VALID_STATUSES = [
    "pending",            # créé, en attente de paiement
    "payment_received",   # admin a confirmé réception du paiement
    "processing",         # admin en cours de décaissement
    "completed",          # décaissement effectué
    "cancelled",          # annulé (avant traitement)
    "failed"              # échec (problème technique ou fraude)
]

ADMIN_TRANSITIONS = {
    "pending":          ["payment_received", "cancelled"],
    "payment_received": ["processing", "cancelled", "failed"],
    "processing":       ["completed", "failed"],
    "completed":        [],
    "cancelled":        [],
    "failed":           ["pending"]
}

STATUS_LABELS = {
    "pending":          {"label": "En attente de paiement", "color": "amber"},
    "payment_received": {"label": "Paiement reçu",          "color": "blue"},
    "processing":       {"label": "En cours de traitement", "color": "purple"},
    "completed":        {"label": "Complété",               "color": "green"},
    "cancelled":        {"label": "Annulé",                 "color": "gray"},
    "failed":           {"label": "Échoué",                 "color": "red"},
}

# ============================================================
# PYDANTIC MODELS
# ============================================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    country: str  # "Canada" | "Bénin"

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
    corridor: str                           # canada_to_benin | benin_to_canada
    payment_method: str                     # interac | crypto_usdc | bank_transfer
    delivery_method: str                    # mtn | moov | bank_transfer | interac
    send_amount: float                      # montant dans la devise source
    receiver_name: str
    receiver_phone: Optional[str] = None   # obligatoire si MTN/Moov
    receiver_mobile_network: Optional[str] = None  # "mtn" | "moov" (pour Mobile Money)
    receiver_bank_name: Optional[str] = None
    receiver_bank_account: Optional[str] = None
    receiver_bank_iban: Optional[str] = None
    receiver_interac_email: Optional[str] = None   # pour livraison Interac au Canada
    notes: Optional[str] = None

class TransferUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None
    tracking_number: Optional[str] = None
    exchange_rate_applied: Optional[float] = None

class TransferResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    corridor: str
    payment_method: str
    delivery_method: str
    send_amount: float
    send_currency: str
    fee: float
    total_charged: float
    receive_amount: float
    receive_currency: str
    exchange_rate: float
    receiver_name: str
    receiver_phone: Optional[str] = None
    receiver_mobile_network: Optional[str] = None
    receiver_bank_name: Optional[str] = None
    receiver_bank_account: Optional[str] = None
    receiver_bank_iban: Optional[str] = None
    receiver_interac_email: Optional[str] = None
    sender_name: str
    sender_email: str
    sender_phone: str
    sender_country: str
    status: str
    status_label: Optional[str] = None
    status_color: Optional[str] = None
    tracking_number: Optional[str] = None
    admin_notes: Optional[str] = None
    notes: Optional[str] = None
    payment_proof_filename: Optional[str] = None
    payment_instructions: Optional[dict] = None
    next_statuses: Optional[List[str]] = None
    created_at: str
    updated_at: str

class RateUpdate(BaseModel):
    rate: float

# ============================================================
# HELPERS
# ============================================================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user_id: str, is_admin: bool = False) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    return jwt.encode(
        {"user_id": user_id, "is_admin": is_admin, "exp": expiration},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return user

def generate_tracking_number() -> str:
    """Génère un numéro de suivi lisible : PMT-YYYYMMDD-XXXX"""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = str(uuid.uuid4()).upper()[:6]
    return f"PMT-{today}-{suffix}"

def calculate_transfer(corridor_key: str, send_amount: float) -> dict:
    c = CORRIDORS[corridor_key]
    fee_pct = c["fee_percentage"] / 100
    if corridor_key == "canada_to_benin":
        flat = c["flat_fee_cad"]
        fee = round(send_amount * fee_pct + flat, 2)
        total_charged = round(send_amount + fee, 2)
        rate = c["rate_xof_per_cad"]
        receive_amount = round(send_amount * rate, 0)
        return {
            "send_currency": "CAD", "receive_currency": "XOF",
            "fee": fee, "total_charged": total_charged,
            "receive_amount": receive_amount, "exchange_rate": rate
        }
    else:
        flat = c["flat_fee_xof"]
        fee = round(send_amount * fee_pct + flat, 0)
        total_charged = round(send_amount + fee, 0)
        rate = c["rate_cad_per_xof"]
        receive_amount = round(send_amount * rate, 2)
        return {
            "send_currency": "XOF", "receive_currency": "CAD",
            "fee": fee, "total_charged": total_charged,
            "receive_amount": receive_amount, "exchange_rate": rate
        }

def build_payment_instructions(payment_method: str, tracking_number: str, total_charged: float) -> dict:
    """Construit les instructions de paiement personnalisées pour le client."""
    instructions = PAYMENT_INSTRUCTIONS.get(payment_method, {})
    if not instructions:
        return {}
    usdc_rate = 1.36  # CAD/USDC approximatif — à rendre dynamique plus tard
    total_usdc = round(total_charged / usdc_rate, 2)
    filled_steps = [
        s.replace("{total_charged}", str(total_charged))
         .replace("{tracking_number}", tracking_number)
         .replace("{total_charged_usdc}", str(total_usdc))
        for s in instructions.get("steps", [])
    ]
    return {
        "title": instructions.get("title", ""),
        "steps": filled_steps,
        "note": instructions.get("note", "")
    }

def enrich_transfer(transfer: dict) -> dict:
    """Ajoute status_label, status_color, next_statuses et payment_instructions."""
    s = transfer.get("status", "pending")
    meta = STATUS_LABELS.get(s, {})
    transfer["status_label"] = meta.get("label", s)
    transfer["status_color"] = meta.get("color", "gray")
    transfer["next_statuses"] = ADMIN_TRANSITIONS.get(s, [])
    # Reconstruire les instructions si pas encore stockées
    if not transfer.get("payment_instructions") and transfer.get("tracking_number"):
        transfer["payment_instructions"] = build_payment_instructions(
            transfer["payment_method"],
            transfer["tracking_number"],
            transfer["total_charged"]
        )
    return transfer

# ============================================================
# AUTH ROUTES
# ============================================================

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    if user.country not in ["Canada", "Bénin", "Benin"]:
        raise HTTPException(status_code=400, detail="Seuls les résidents du Canada et du Bénin peuvent s'inscrire.")
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    country = "Bénin" if user.country == "Benin" else user.country
    user_doc = {
        "id": user_id, "email": user.email,
        "password": hash_password(user.password),
        "full_name": user.full_name, "phone": user.phone,
        "country": country, "is_admin": False, "created_at": now
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k not in ("password", "_id")}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    token = create_token(user["id"], user.get("is_admin", False))
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password"}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})

# ============================================================
# CORRIDOR / RATE ROUTES
# ============================================================

@api_router.get("/corridors")
async def get_corridors():
    result = []
    for key, c in CORRIDORS.items():
        result.append({
            "key": key,
            "label": c["label"],
            "from_country": c["from_country"],
            "to_country": c["to_country"],
            "from_currency": c["from_currency"],
            "to_currency": c["to_currency"],
            "payment_methods": [
                {**PAYMENT_METHOD_LABELS[m], "key": m} for m in c["payment_methods"]
            ],
            "delivery_methods": [
                {**DELIVERY_METHOD_LABELS[m], "key": m} for m in c["delivery_methods"]
            ],
            "fee_percentage": c["fee_percentage"],
            "estimated_time": c["estimated_time"],
            "min_amount": c.get("min_amount_cad") or c.get("min_amount_xof"),
            "max_amount": c.get("max_amount_cad") or c.get("max_amount_xof"),
            "exchange_rate": c.get("rate_xof_per_cad") or c.get("rate_cad_per_xof"),
        })
    return result

@api_router.get("/corridors/{corridor_key}/calculate")
async def calculate_route(corridor_key: str, send_amount: float):
    if corridor_key not in CORRIDORS:
        raise HTTPException(status_code=404, detail="Corridor introuvable")
    c = CORRIDORS[corridor_key]
    min_amt = c.get("min_amount_cad") or c.get("min_amount_xof")
    max_amt = c.get("max_amount_cad") or c.get("max_amount_xof")
    if send_amount < min_amt or send_amount > max_amt:
        raise HTTPException(status_code=400, detail=f"Montant entre {min_amt} et {max_amt}")
    return calculate_transfer(corridor_key, send_amount)

@api_router.get("/statuses")
async def get_statuses():
    return [{"key": k, **v} for k, v in STATUS_LABELS.items()]

# ============================================================
# TRANSFER ROUTES
# ============================================================

@api_router.post("/transfers", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(transfer: TransferCreate, user: dict = Depends(get_current_user)):
    if transfer.corridor not in CORRIDORS:
        raise HTTPException(status_code=400, detail="Corridor invalide")
    c = CORRIDORS[transfer.corridor]

    if transfer.payment_method not in c["payment_methods"]:
        raise HTTPException(status_code=400, detail="Méthode de paiement invalide pour ce corridor")
    if transfer.delivery_method not in c["delivery_methods"]:
        raise HTTPException(status_code=400, detail="Méthode de livraison invalide pour ce corridor")

    # Validation des champs obligatoires selon le mode de livraison
    if transfer.delivery_method in ["mtn", "moov"] and not transfer.receiver_phone:
        raise HTTPException(status_code=400, detail="Numéro de téléphone du receveur requis pour Mobile Money")
    if transfer.delivery_method == "bank_transfer" and not transfer.receiver_bank_account:
        raise HTTPException(status_code=400, detail="Numéro de compte bancaire requis pour virement bancaire")
    if transfer.delivery_method == "interac" and not transfer.receiver_interac_email:
        raise HTTPException(status_code=400, detail="Email Interac du receveur requis")

    min_amt = c.get("min_amount_cad") or c.get("min_amount_xof")
    max_amt = c.get("max_amount_cad") or c.get("max_amount_xof")
    if transfer.send_amount < min_amt or transfer.send_amount > max_amt:
        raise HTTPException(status_code=400, detail=f"Montant entre {min_amt} et {max_amt}")

    calc = calculate_transfer(transfer.corridor, transfer.send_amount)
    transfer_id = str(uuid.uuid4())
    tracking_number = generate_tracking_number()
    now = datetime.now(timezone.utc).isoformat()

    payment_instructions = build_payment_instructions(
        transfer.payment_method, tracking_number, calc["total_charged"]
    )

    doc = {
        "id": transfer_id,
        "user_id": user["id"],
        "corridor": transfer.corridor,
        "payment_method": transfer.payment_method,
        "delivery_method": transfer.delivery_method,
        "send_amount": transfer.send_amount,
        "send_currency": calc["send_currency"],
        "fee": calc["fee"],
        "total_charged": calc["total_charged"],
        "receive_amount": calc["receive_amount"],
        "receive_currency": calc["receive_currency"],
        "exchange_rate": calc["exchange_rate"],
        "receiver_name": transfer.receiver_name,
        "receiver_phone": transfer.receiver_phone,
        "receiver_mobile_network": transfer.receiver_mobile_network,
        "receiver_bank_name": transfer.receiver_bank_name,
        "receiver_bank_account": transfer.receiver_bank_account,
        "receiver_bank_iban": transfer.receiver_bank_iban,
        "receiver_interac_email": transfer.receiver_interac_email,
        "sender_name": user["full_name"],
        "sender_email": user["email"],
        "sender_phone": user["phone"],
        "sender_country": user["country"],
        "status": "pending",
        "tracking_number": tracking_number,
        "admin_notes": None,
        "notes": transfer.notes,
        "payment_proof_filename": None,
        "payment_instructions": payment_instructions,
        "created_at": now,
        "updated_at": now
    }
    await db.transfers.insert_one(doc)
    return TransferResponse(**enrich_transfer(doc))

@api_router.get("/transfers", response_model=List[TransferResponse])
async def get_user_transfers(user: dict = Depends(get_current_user)):
    transfers = await db.transfers.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [TransferResponse(**enrich_transfer(t)) for t in transfers]

@api_router.get("/transfers/{transfer_id}", response_model=TransferResponse)
async def get_transfer(transfer_id: str, user: dict = Depends(get_current_user)):
    transfer = await db.transfers.find_one(
        {"id": transfer_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfert introuvable")
    return TransferResponse(**enrich_transfer(transfer))

@api_router.post("/transfers/{transfer_id}/proof")
async def upload_payment_proof(
    transfer_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Le client uploade sa preuve de paiement (image ou PDF, max 5 Mo)."""
    transfer = await db.transfers.find_one({"id": transfer_id, "user_id": user["id"]}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfert introuvable")
    if transfer["status"] != "pending":
        raise HTTPException(status_code=400, detail="Preuve uploadable uniquement sur un transfert en attente")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format accepté : JPG, PNG, WebP, PDF")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 Mo)")

    # Stockage en base64 en MongoDB (simple pour démo — migrer vers S3 en prod)
    encoded = base64.b64encode(content).decode("utf-8")
    now = datetime.now(timezone.utc).isoformat()
    await db.transfers.update_one(
        {"id": transfer_id},
        {"$set": {
            "payment_proof_data": encoded,
            "payment_proof_filename": file.filename,
            "payment_proof_content_type": file.content_type,
            "payment_proof_uploaded_at": now,
            "updated_at": now
        }}
    )
    return {"message": "Preuve de paiement reçue avec succès", "filename": file.filename}

@api_router.get("/transfers/{transfer_id}/proof")
async def get_payment_proof(transfer_id: str, user: dict = Depends(get_current_user)):
    """Récupère la preuve de paiement (pour le client ou l'admin)."""
    query = {"id": transfer_id}
    if not user.get("is_admin"):
        query["user_id"] = user["id"]
    transfer = await db.transfers.find_one(query)
    if not transfer or not transfer.get("payment_proof_data"):
        raise HTTPException(status_code=404, detail="Aucune preuve de paiement")
    return {
        "filename": transfer.get("payment_proof_filename"),
        "content_type": transfer.get("payment_proof_content_type"),
        "data": transfer["payment_proof_data"],
        "uploaded_at": transfer.get("payment_proof_uploaded_at")
    }

# Route publique : suivi par numéro de tracking (sans authentification)
@api_router.get("/track/{tracking_number}")
async def track_transfer(tracking_number: str):
    transfer = await db.transfers.find_one(
        {"tracking_number": tracking_number},
        {"_id": 0, "payment_proof_data": 0, "user_id": 0, "sender_email": 0}
    )
    if not transfer:
        raise HTTPException(status_code=404, detail="Numéro de suivi introuvable")
    s = transfer.get("status", "pending")
    meta = STATUS_LABELS.get(s, {})
    return {
        "tracking_number": tracking_number,
        "corridor": CORRIDORS.get(transfer["corridor"], {}).get("label", transfer["corridor"]),
        "send_amount": transfer["send_amount"],
        "send_currency": transfer["send_currency"],
        "receive_amount": transfer["receive_amount"],
        "receive_currency": transfer["receive_currency"],
        "delivery_method": DELIVERY_METHOD_LABELS.get(transfer["delivery_method"], {}).get("label", transfer["delivery_method"]),
        "status": s,
        "status_label": meta.get("label", s),
        "status_color": meta.get("color", "gray"),
        "created_at": transfer["created_at"],
        "updated_at": transfer["updated_at"],
        "estimated_time": CORRIDORS.get(transfer["corridor"], {}).get("estimated_time", ""),
    }

# ============================================================
# ADMIN ROUTES
# ============================================================

@api_router.get("/admin/transfers", response_model=List[TransferResponse])
async def get_all_transfers(
    status: Optional[str] = None,
    corridor: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    if corridor:
        query["corridor"] = corridor
    transfers = await db.transfers.find(query, {"_id": 0, "payment_proof_data": 0}).sort("created_at", -1).to_list(500)
    return [TransferResponse(**enrich_transfer(t)) for t in transfers]

@api_router.get("/admin/transfers/{transfer_id}", response_model=TransferResponse)
async def admin_get_transfer(transfer_id: str, admin: dict = Depends(get_admin_user)):
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0, "payment_proof_data": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfert introuvable")
    return TransferResponse(**enrich_transfer(transfer))

@api_router.put("/admin/transfers/{transfer_id}", response_model=TransferResponse)
async def update_transfer(
    transfer_id: str,
    update: TransferUpdate,
    admin: dict = Depends(get_admin_user)
):
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfert introuvable")

    current_status = transfer["status"]
    new_status = update.status

    # Vérification de la transition
    allowed = ADMIN_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Transition '{current_status}' → '{new_status}' non autorisée. Transitions possibles : {allowed}"
        )

    now = datetime.now(timezone.utc).isoformat()
    update_data = {"status": new_status, "updated_at": now}
    if update.admin_notes:
        update_data["admin_notes"] = update.admin_notes
    if update.tracking_number:
        update_data["tracking_number"] = update.tracking_number
    if update.exchange_rate_applied:
        update_data["exchange_rate"] = update.exchange_rate_applied

    await db.transfers.update_one({"id": transfer_id}, {"$set": update_data})
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0, "payment_proof_data": 0})
    return TransferResponse(**enrich_transfer(updated))

@api_router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find(
        {"is_admin": False}, {"_id": 0, "password": 0}
    ).sort("created_at", -1).to_list(500)
    return users

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    total = await db.transfers.count_documents({})
    by_status = {}
    for s in VALID_STATUSES:
        by_status[s] = await db.transfers.count_documents({"status": s})
    total_users = await db.users.count_documents({"is_admin": False})

    pipeline_cad = [
        {"$match": {"send_currency": "CAD", "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$send_amount"}, "fees": {"$sum": "$fee"}}}
    ]
    pipeline_xof = [
        {"$match": {"send_currency": "XOF", "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$send_amount"}, "fees": {"$sum": "$fee"}}}
    ]
    vol_cad = await db.transfers.aggregate(pipeline_cad).to_list(1)
    vol_xof = await db.transfers.aggregate(pipeline_xof).to_list(1)

    # Volume des 30 derniers jours par corridor
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": "$corridor", "count": {"$sum": 1}, "volume_sent": {"$sum": "$send_amount"}}}
    ]
    recent = await db.transfers.aggregate(recent_pipeline).to_list(10)

    return {
        "total_transfers": total,
        "by_status": by_status,
        "total_users": total_users,
        "volume_cad_completed": vol_cad[0]["total"] if vol_cad else 0,
        "fees_cad_collected": vol_cad[0]["fees"] if vol_cad else 0,
        "volume_xof_completed": vol_xof[0]["total"] if vol_xof else 0,
        "fees_xof_collected": vol_xof[0]["fees"] if vol_xof else 0,
        "last_30_days_by_corridor": recent,
    }

@api_router.put("/admin/corridors/{corridor_key}/rate")
async def update_rate(corridor_key: str, body: RateUpdate, admin: dict = Depends(get_admin_user)):
    if corridor_key not in CORRIDORS:
        raise HTTPException(status_code=404, detail="Corridor introuvable")
    if body.rate <= 0:
        raise HTTPException(status_code=400, detail="Le taux doit être positif")
    if corridor_key == "canada_to_benin":
        CORRIDORS[corridor_key]["rate_xof_per_cad"] = body.rate
    else:
        CORRIDORS[corridor_key]["rate_cad_per_xof"] = body.rate
    return {"message": "Taux mis à jour", "corridor": corridor_key, "rate": body.rate}

#to delete later, juste pour initialiser un compte admin
@api_router.post("/admin/create-admin")

async def create_admin_user():
    existing = await db.users.find_one({"email": "admin@prestigemoneytransfer.ca"})
    if existing:
        return {"message": "Admin déjà existant"}
    admin_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": admin_id,
        "email": "admin@prestigemoneytransfer.ca",
        "password": hash_password("PrestigeAdmin2024!"),
        "full_name": "Admin Prestige",
        "phone": "+1 514 000 0000",
        "country": "Canada",
        "is_admin": True,
        "created_at": now
    }
    await db.users.insert_one(doc)
    return {"message": "Admin créé", "email": doc["email"], "password": "PrestigeAdmin2024!"}

# ============================================================
# HEALTH
# ============================================================

@api_router.get("/")
async def root():
    return {"message": "Prestige Money Transfer API", "status": "running", "version": "2.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ============================================================
# APP SETUP
# ============================================================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/")
def read_root():
    return {"message": "Prestige Money Transfer — Backend v2.0"}