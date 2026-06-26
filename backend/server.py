from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi_mail import FastMail, ConnectionConfig, MessageSchema
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import httpx
import re
from pathlib import Path
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============================================================
# APP & MIDDLEWARE
# ============================================================

app = FastAPI(title="Prestige Money Transfer API")

# Récupération des origines depuis le .env (avec repli sur vos ports locaux)
cors_env = os.environ.get("CORS_ORIGINS", "*")
if cors_env == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in cors_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins != ["*"] else False, # True est interdit si origins = ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# DB & AUTH
# ============================================================

# Connexion propre à MongoDB Atlas
mongo_url = os.environ['MONGO_URL']
client    = AsyncIOMotorClient(mongo_url)

# Utilise directement la DB définie dans l'URI ou celle du .env
db        = client.get_default_database() if "mongodb+srv" in mongo_url else client[os.environ['DB_NAME']]

JWT_SECRET           = os.environ.get('JWT_SECRET', 'prestige-horizon-secret-key-2024')
JWT_ALGORITHM        = "HS256"
JWT_EXPIRATION_HOURS = 24

security   = HTTPBearer()
api_router = APIRouter(prefix="/api")
logger     = logging.getLogger(__name__)

# ============================================================
# EMAIL — Resend
# ============================================================

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL     = os.environ.get("FROM_EMAIL", "Prestige Money Transfer <prestigehorizonbj@gmail.com>")
RESEND_API_URL = "https://api.resend.com/emails"
APP_URL        = os.environ.get("APP_URL", "http://localhost:3000")

async def send_email(to: str, subject: str, html: str) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY non configurée — email ignoré")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as h:
            r = await h.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            )
            if r.status_code not in (200, 201):
                logger.error(f"Resend {r.status_code}: {r.text}")
                return False
            logger.info(f"Email envoyé → {to}")
            return True
    except Exception as e:
        logger.error(f"send_email error: {e}")
        return False

def _base_template(title: str, body: str) -> str:
    year = datetime.now().year
    return f"""<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#050505;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
      <tr><td style="background:#0A0A0A;border-radius:16px 16px 0 0;padding:32px;text-align:center;border-bottom:1px solid #1A1A1A">
        <div style="font-size:22px;font-weight:700;color:#D4AF37;letter-spacing:1px">✦ PRESTIGE MONEY TRANSFER</div>
        <div style="color:#555;font-size:11px;margin-top:6px;letter-spacing:3px;text-transform:uppercase">Canada ↔ Bénin</div>
      </td></tr>
      <tr><td style="background:#0F0F0F;padding:40px 32px">{body}</td></tr>
      <tr><td style="background:#0A0A0A;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;border-top:1px solid #1A1A1A">
        <p style="color:#555;font-size:12px;margin:0">© {year} Prestige Horizon Inc. · Enregistré CANAFE<br>
        <a href="{APP_URL}" style="color:#D4AF37;text-decoration:none">{APP_URL}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

def _row(label: str, value: str, gold: bool = False) -> str:
    color = "#D4AF37" if gold else "#fff"
    size  = "18px" if gold else "14px"
    bg    = "background:#D4AF3710;" if gold else ""
    return f"""<tr style="{bg}">
      <td style="padding:12px 20px;color:#A1A1AA;font-size:13px;border-bottom:1px solid #1A1A1A">{label}</td>
      <td style="padding:12px 20px;color:{color};font-size:{size};font-weight:700;text-align:right;border-bottom:1px solid #1A1A1A">{value}</td>
    </tr>"""

def email_confirmation(t: dict) -> tuple[str, str]:
    flag      = "🇨🇦→🇧🇯" if t.get("corridor") == "canada_to_benin" else "🇧🇯→🇨🇦"
    sc, rc    = t.get("send_currency","CAD"), t.get("receive_currency","XOF")
    recv_fmt  = f"{t.get('receive_amount',0):,.0f} {rc}" if rc == "XOF" else f"{t.get('receive_amount',0):,.2f} {rc}"
    tracking  = t.get("tracking_number","")
    prenom    = t.get("sender_name","").split()[0]
    instr     = t.get("payment_instructions", {})
    steps_html = ""
    if instr and instr.get("steps"):
        steps_html = "<ol style='padding-left:20px;margin:8px 0 0'>"
        for s in instr["steps"]:
            steps_html += f"<li style='color:#A1A1AA;font-size:13px;margin-bottom:8px;line-height:1.6'>{s}</li>"
        steps_html += "</ol>"
        if instr.get("note"):
            steps_html += f"<p style='color:#555;font-size:12px;margin:12px 0 0;padding:12px;background:#1A1A1A;border-radius:8px'>{instr['note']}</p>"
    instr_block = f"""<div style="border:1px solid #D4AF3740;border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="color:#D4AF37;font-size:14px;font-weight:600;margin-bottom:12px">📋 {instr.get('title','Instructions de paiement')}</div>
      {steps_html}</div>""" if instr else ""
    subject = f"[Prestige] Transfert créé {flag} — {tracking}"
    body = f"""
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Bonjour {prenom} 👋</h2>
    <p style="color:#A1A1AA;font-size:14px;margin:0 0 28px;line-height:1.6">Votre transfert a été créé. Effectuez votre paiement selon les instructions ci-dessous.</p>
    <div style="background:#1A1A1A;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Numéro de suivi</div>
      <div style="color:#D4AF37;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:3px">{tracking}</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;border:1px solid #1A1A1A;border-radius:12px;overflow:hidden;margin-bottom:24px">
      {_row("Vous envoyez", f"{t.get('send_amount',0):,.2f} {sc}")}
      {_row("Frais de service", f"{t.get('fee',0):,.2f} {sc}")}
      {_row("Total à payer", f"{t.get('total_charged',0):,.2f} {sc}")}
      {_row("Le receveur reçoit", recv_fmt, gold=True)}
    </table>
    <div style="background:#1A1A1A;border-radius:12px;padding:16px 20px;margin-bottom:24px">
      <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Receveur</div>
      <div style="color:#fff;font-size:14px;font-weight:600">{t.get('receiver_name','')}</div>
      <div style="color:#A1A1AA;font-size:13px;margin-top:4px">{t.get('receiver_phone') or t.get('receiver_interac_email') or t.get('receiver_bank_account') or ''}</div>
    </div>
    {instr_block}
    <div style="text-align:center;margin-top:28px">
      <a href="{APP_URL}/transfers/{t.get('id','')}" style="display:inline-block;background:#D4AF37;color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none">Voir mon transfert →</a>
    </div>"""
    return subject, _base_template(subject, body)

def email_completed(t: dict) -> tuple[str, str]:
    flag     = "🇨🇦→🇧🇯" if t.get("corridor") == "canada_to_benin" else "🇧🇯→🇨🇦"
    sc, rc   = t.get("send_currency","CAD"), t.get("receive_currency","XOF")
    recv_fmt = f"{t.get('receive_amount',0):,.0f} {rc}" if rc == "XOF" else f"{t.get('receive_amount',0):,.2f} {rc}"
    tracking = t.get("tracking_number","")
    prenom   = t.get("sender_name","").split()[0]
    note_block = f"""<div style="background:#1A1A1A;border-radius:10px;padding:14px 18px;margin-bottom:24px">
      <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Note de notre équipe</div>
      <div style="color:#A1A1AA;font-size:14px;line-height:1.5">{t['admin_notes']}</div></div>""" if t.get("admin_notes") else ""
    subject = f"[Prestige] ✅ Transfert complété {flag} — {tracking}"
    body = f"""
    <div style="text-align:center;margin-bottom:32px">
      <div style="width:64px;height:64px;background:#22c55e20;border:2px solid #22c55e50;border-radius:50%;margin:0 auto 16px;line-height:64px;font-size:28px">✅</div>
      <h2 style="color:#22c55e;font-size:22px;margin:0 0 8px">Transfert complété !</h2>
      <p style="color:#A1A1AA;font-size:14px;margin:0">Bonjour {prenom}, les fonds ont été remis au receveur avec succès.</p>
    </div>
    <div style="background:#1A1A1A;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
      <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Numéro de suivi</div>
      <div style="color:#D4AF37;font-family:monospace;font-size:18px;font-weight:700;letter-spacing:3px">{tracking}</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;border:1px solid #22c55e30;border-radius:12px;overflow:hidden;margin-bottom:24px">
      {_row("Vous avez envoyé", f"{t.get('send_amount',0):,.2f} {sc}")}
      <tr style="background:#22c55e10">
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px">{t.get('receiver_name','')} a reçu</td>
        <td style="padding:14px 20px;color:#22c55e;font-size:20px;font-weight:700;text-align:right">{recv_fmt}</td>
      </tr>
    </table>
    {note_block}
    <p style="color:#A1A1AA;font-size:14px;line-height:1.7;text-align:center;margin:0 0 28px">Merci de faire confiance à <strong style="color:#D4AF37">Prestige Money Transfer</strong> pour vos envois Canada ↔ Bénin. 🙏</p>
    <div style="text-align:center">
      <a href="{APP_URL}/new-transfer" style="display:inline-block;background:#D4AF37;color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none">Faire un autre transfert →</a>
    </div>"""
    return subject, _base_template(subject, body)

# ============================================================
# TAUX DE CHANGE — Cache en mémoire + API externe
# ============================================================

# Cache en mémoire : évite d'appeler l'API à chaque transfert
_rate_cache: dict = {"rate": None, "fetched_at": None}
RATE_CACHE_TTL_MINUTES = 30  # rafraîchissement toutes les 30 min
RATE_FALLBACK_CAD_XOF  = 400.0  # valeur de secours si l'API est indisponible

async def fetch_live_rate_cad_xof() -> float:
    """
    Récupère le taux CAD/XOF depuis l'API open.er-api.com (gratuite, sans clé).
    XOF est arrimé à l'EUR (655,957 XOF = 1 EUR) — on calcule via CAD→EUR→XOF.
    Cache de 30 min pour ne pas surcharger l'API.
    """
    now = datetime.now(timezone.utc)

    # Retourner le cache si encore valide
    if _rate_cache["rate"] and _rate_cache["fetched_at"]:
        age = (now - _rate_cache["fetched_at"]).total_seconds() / 60
        if age < RATE_CACHE_TTL_MINUTES:
            return _rate_cache["rate"]

    try:
        async with httpx.AsyncClient(timeout=8) as h:
            r = await h.get("https://open.er-api.com/v6/latest/CAD")
            if r.status_code == 200:
                data = r.json()
                rates = data.get("rates", {})
                # XOF est directement disponible dans cette API
                xof_rate = rates.get("XOF")
                if xof_rate and xof_rate > 0:
                    # Arrondir à 2 décimales pour l'affichage
                    rate = round(float(xof_rate), 2)
                    _rate_cache["rate"]       = rate
                    _rate_cache["fetched_at"] = now
                    logger.info(f"Taux live CAD/XOF mis à jour : {rate}")
                    return rate
    except Exception as e:
        logger.warning(f"Impossible de récupérer le taux live: {e}")

    # Fallback : taux admin en DB, puis constante
    rate_doc = await db.settings.find_one({"key": "rate_cad_xof"})
    if rate_doc:
        logger.info(f"Taux fallback depuis DB : {rate_doc['value']}")
        return float(rate_doc["value"])

    logger.warning(f"Taux fallback constant utilisé : {RATE_FALLBACK_CAD_XOF}")
    return RATE_FALLBACK_CAD_XOF

# ============================================================
# CORRIDORS & SERVICES
# ============================================================

CORRIDORS = {
    "canada_to_benin": {
        "label": "Canada → Bénin",
        "from_country": "Canada", "to_country": "Bénin",
        "from_currency": "CAD",   "to_currency": "XOF",
        "payment_methods":  ["interac", "crypto_usdc"],
        "delivery_methods": ["mtn", "moov", "bank_transfer"],
        "fee_percentage": 2.0, "flat_fee_cad": 5.0,
        "min_amount_cad": 50.0, "max_amount_cad": 5000.0,
        "estimated_time": "24-48h"
    },
    "benin_to_canada": {
        "label": "Bénin → Canada",
        "from_country": "Bénin", "to_country": "Canada",
        "from_currency": "XOF",  "to_currency": "CAD",
        "payment_methods":  ["bank_transfer", "mtn", "moov"],
        "delivery_methods": ["interac"],
        "fee_percentage": 2.5, "flat_fee_xof": 2500.0,
        "min_amount_xof": 25000.0, "max_amount_xof": 2500000.0,
        "estimated_time": "2-5 jours ouvrables"
    }
}

PAYMENT_METHOD_LABELS = {
    "interac":       {"label": "Virement Interac / Bancaire", "icon": "bank",   "currency": "CAD"},
    "crypto_usdc":   {"label": "Crypto (USDC)",               "icon": "crypto", "currency": "USDC"},
    "bank_transfer": {"label": "Virement Bancaire",           "icon": "bank",   "currency": "XOF"},
    "mtn":           {"label": "MTN MoMo",                    "color": "#FFCC00", "icon": "mtn"},
    "moov":          {"label": "Moov Money",                  "color": "#00a51b", "icon": "moov"},
}

DELIVERY_METHOD_LABELS = {
    "mtn":           {"label": "MTN Mobile Money",   "color": "#FFCC00", "icon": "mtn"},
    "moov":          {"label": "Moov Money",         "color": "#00a51b", "icon": "moov"},
    "bank_transfer": {"label": "Virement Bancaire",  "color": "#D4AF37", "icon": "bank"},
    "interac":       {"label": "Interac / Bancaire", "color": "#D4AF37", "icon": "bank"},
}

PAYMENT_INSTRUCTIONS = {
    "interac": {
        "title": "Envoyez votre virement Interac",
        "steps": [
            "Connectez-vous à votre banque en ligne (Desjardins, RBC, TD, BMO, Scotia, etc.)",
            "Initiez un virement Interac e-Transfer",
            "Destinataire : prestigehorizonbj@gmail.com",
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
            "Banque : Prestige Money Transfer — Bank of Africa Bénin",
            "IBAN / Numéro de compte : BJ66 BJ00 6101 8800 3000 0000 000",
            "Montant : {total_charged} XOF",
            "Motif du virement : {tracking_number}",
            "Téléchargez votre reçu de virement ci-dessous."
        ],
        "note": "Les virements béninois sont traités sous 1-3 jours ouvrables."
    },
    "mtn": {
        "title": "Effectuez votre paiement MTN Mobile Money",
        "steps": [
            "Numéro marchand : 97 XX XX XX",
            "Montant : {total_charged} XOF",
            "Référence : {tracking_number}",
            "Téléchargez la preuve de paiement ci-dessous."
        ],
        "note": "Votre transfert sera traité après confirmation du paiement MTN Mobile Money."
    },
    "moov": {
        "title": "Effectuez votre paiement Moov Money",
        "steps": [
            "Numéro marchand : 96 XX XX XX",
            "Montant : {total_charged} XOF",
            "Référence : {tracking_number}",
            "Téléchargez la preuve de paiement ci-dessous."
        ],
        "note": "Votre transfert sera traité après confirmation du paiement Moov Money."
    }
}

VALID_STATUSES = ["pending", "payment_received", "processing", "completed", "cancelled", "failed"]

ADMIN_TRANSITIONS = {
    "pending":          ["payment_received", "cancelled"],
    "payment_received": ["processing", "cancelled", "failed"],
    "processing":       ["completed", "failed"],
    "completed":        [], "cancelled": [], "failed": ["pending"]
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
    country: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str; email: str; full_name: str; phone: str; country: str
    is_admin: bool = False; created_at: str

class TransferCreate(BaseModel):
    corridor: str; payment_method: str; delivery_method: str; send_amount: float
    receiver_name: str
    receiver_phone: Optional[str] = None
    receiver_mobile_network: Optional[str] = None
    receiver_bank_name: Optional[str] = None
    receiver_bank_account: Optional[str] = None
    receiver_bank_iban: Optional[str] = None
    receiver_interac_email: Optional[str] = None
    notes: Optional[str] = None

class TransferUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None
    tracking_number: Optional[str] = None
    exchange_rate_applied: Optional[float] = None

class TransferResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str; user_id: str; corridor: str; payment_method: str; delivery_method: str
    send_amount: float; send_currency: str; fee: float; total_charged: float
    receive_amount: float; receive_currency: str; exchange_rate: float
    receiver_name: str
    receiver_phone: Optional[str] = None
    receiver_mobile_network: Optional[str] = None
    receiver_bank_name: Optional[str] = None
    receiver_bank_account: Optional[str] = None
    receiver_bank_iban: Optional[str] = None
    receiver_interac_email: Optional[str] = None
    sender_name: str = ""; sender_email: str = ""; sender_phone: str = ""; sender_country: str = ""
    status: str
    status_label: Optional[str] = None; status_color: Optional[str] = None
    tracking_number: Optional[str] = None; admin_notes: Optional[str] = None
    notes: Optional[str] = None; payment_proof_filename: Optional[str] = None
    payment_instructions: Optional[dict] = None; next_statuses: Optional[List[str]] = None
    created_at: str; updated_at: str

class RateUpdate(BaseModel):
    rate: float

# ============================================================
# HELPERS
# ============================================================

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except: return False

def create_token(user_id: str, is_admin: bool = False) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    return jwt.encode({"user_id": user_id, "is_admin": is_admin, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try: return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expiré")
    except jwt.InvalidTokenError:     raise HTTPException(401, "Token invalide")

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(creds.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user: raise HTTPException(401, "Utilisateur introuvable")
    return user

async def get_admin_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(creds.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user or not user.get("is_admin"): raise HTTPException(403, "Accès admin requis")
    return user

def generate_tracking_number() -> str:
    return f"PMT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4()).upper()[:6]}"

# Prefixes ARCEP Bénin (plan à 10 chiffres post-01)
_MTN_PREFIXES  = {"40","41","42","43","44","45","46","47","50","51","52","53","54","56","57","59","61","62","66","67","69","90","91","96","97"}
_MOOV_PREFIXES = {"48","55","58","60","63","64","65","68","94","95","98","99"}

def validate_benin_mobile_number(phone: str, method: str) -> dict:
    clean = re.sub(r"[\s+]", "", phone)
    if clean.startswith("229"):   clean = clean[3:]
    if len(clean) == 8:           clean = "01" + clean
    if not re.fullmatch(r"01\d{8}", clean):
        raise HTTPException(400, "Numéro béninois invalide. Format attendu : +229 01XX XX XX XX")
    prefix = clean[2:4]
    if   prefix in _MTN_PREFIXES:  network = "mtn"
    elif prefix in _MOOV_PREFIXES: network = "moov"
    else: raise HTTPException(400, "Opérateur non reconnu pour ce préfixe béninois.")
    if method in ("mtn","moov") and network != method:
        raise HTTPException(400, f"Ce numéro appartient à {network.upper()}, méthode choisie : {method.upper()}")
    return {"normalized_phone": f"+229{clean}", "network": network}

async def calculate_transfer(corridor_key: str, send_amount: float) -> dict:
    c       = CORRIDORS[corridor_key]
    fee_pct = c["fee_percentage"] / 100
    rate    = await fetch_live_rate_cad_xof()   # ← taux live

    if corridor_key == "canada_to_benin":
        fee            = round(send_amount * fee_pct + c["flat_fee_cad"], 2)
        total_charged  = round(send_amount + fee, 2)
        receive_amount = round(send_amount * rate, 0)
        return {"send_currency":"CAD","receive_currency":"XOF",
                "fee":fee,"total_charged":total_charged,"receive_amount":receive_amount,"exchange_rate":rate}
    else:
        rate_inv       = round(1 / rate, 6)
        fee            = round(send_amount * fee_pct + c["flat_fee_xof"], 0)
        total_charged  = round(send_amount + fee, 0)
        receive_amount = round(send_amount * rate_inv, 2)
        return {"send_currency":"XOF","receive_currency":"CAD",
                "fee":fee,"total_charged":total_charged,"receive_amount":receive_amount,"exchange_rate":rate_inv}

def build_payment_instructions(payment_method: str, tracking_number: str, total_charged: float) -> dict:
    instr = PAYMENT_INSTRUCTIONS.get(payment_method, {})
    if not instr: return {}
    total_usdc = round(total_charged / 1.36, 2)
    return {
        "title": instr["title"],
        "note":  instr.get("note",""),
        "steps": [s.replace("{total_charged}", str(total_charged))
                   .replace("{tracking_number}", tracking_number)
                   .replace("{total_charged_usdc}", str(total_usdc))
                  for s in instr["steps"]]
    }

def enrich_transfer(t: dict) -> dict:
    s    = t.get("status","pending")
    meta = STATUS_LABELS.get(s,{})
    t["status_label"]   = meta.get("label",s)
    t["status_color"]   = meta.get("color","gray")
    t["next_statuses"]  = ADMIN_TRANSITIONS.get(s,[])
    if not t.get("payment_instructions") and t.get("tracking_number"):
        t["payment_instructions"] = build_payment_instructions(
            t["payment_method"], t["tracking_number"], t["total_charged"])
    return t

# ============================================================
# AUTH ROUTES
# ============================================================

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    if user.country not in ["Canada","Bénin","Benin"]:
        raise HTTPException(400, "Seuls les résidents du Canada et du Bénin peuvent s'inscrire.")
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(400, "Email déjà enregistré")
    uid = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    doc = {"id":uid,"email":user.email,"password":hash_password(user.password),
           "full_name":user.full_name,"phone":user.phone,
           "country":"Bénin" if user.country=="Benin" else user.country,
           "is_admin":False,"created_at":now}
    await db.users.insert_one(doc)
    return {"token": create_token(uid), "user": {k:v for k,v in doc.items() if k not in ("password","_id")}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id":0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(401, "Identifiants invalides")
    return {"token": create_token(user["id"], user.get("is_admin",False)),
            "user": {k:v for k,v in user.items() if k != "password"}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**{k:v for k,v in user.items() if k != "password"})

# ============================================================
# CORRIDOR / RATE ROUTES
# ============================================================

@api_router.get("/corridors")
async def get_corridors():
    live_rate = await fetch_live_rate_cad_xof()
    result = []
    for key, c in CORRIDORS.items():
        rate = live_rate if key == "canada_to_benin" else round(1/live_rate, 6)
        result.append({
            "key": key, "label": c["label"],
            "from_country": c["from_country"], "to_country": c["to_country"],
            "from_currency": c["from_currency"], "to_currency": c["to_currency"],
            "payment_methods":  [{**PAYMENT_METHOD_LABELS[m], "key": m} for m in c["payment_methods"]],
            "delivery_methods": [{**DELIVERY_METHOD_LABELS[m], "key": m} for m in c["delivery_methods"]],
            "fee_percentage": c["fee_percentage"], "estimated_time": c["estimated_time"],
            "exchange_rate": rate,
            "min_amount": c.get("min_amount_cad") or c.get("min_amount_xof"),
            "max_amount": c.get("max_amount_cad") or c.get("max_amount_xof"),
        })
    return result

@api_router.get("/corridors/{corridor_key}/calculate")
async def calculate_route(corridor_key: str, send_amount: float):
    if corridor_key not in CORRIDORS:
        raise HTTPException(404, "Corridor introuvable")
    c = CORRIDORS[corridor_key]
    min_amt = c.get("min_amount_cad") or c.get("min_amount_xof")
    max_amt = c.get("max_amount_cad") or c.get("max_amount_xof")
    if not (min_amt <= send_amount <= max_amt):
        raise HTTPException(400, f"Montant hors limites ({min_amt} – {max_amt})")
    return await calculate_transfer(corridor_key, send_amount)

@api_router.get("/rate/live")
async def get_live_rate():
    """Retourne le taux CAD/XOF actuel avec la source et l'heure de récupération."""
    rate = await fetch_live_rate_cad_xof()
    return {
        "rate_cad_xof":   rate,
        "rate_xof_cad":   round(1 / rate, 6),
        "fetched_at":     _rate_cache.get("fetched_at", datetime.now(timezone.utc)).isoformat(),
        "cache_ttl_min":  RATE_CACHE_TTL_MINUTES,
        "source":         "open.er-api.com" if _rate_cache.get("rate") else "fallback",
    }

@api_router.get("/statuses")
async def get_statuses():
    return [{"key": k, **v} for k, v in STATUS_LABELS.items()]

# ============================================================
# TRANSFER ROUTES
# ============================================================

@api_router.post("/transfers", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(transfer: TransferCreate, user: dict = Depends(get_current_user)):
    if transfer.corridor not in CORRIDORS:
        raise HTTPException(400, "Corridor invalide")
    c = CORRIDORS[transfer.corridor]
    if transfer.payment_method  not in c["payment_methods"]:  raise HTTPException(400, "Méthode de paiement invalide")
    if transfer.delivery_method not in c["delivery_methods"]: raise HTTPException(400, "Méthode de livraison invalide")
    if transfer.delivery_method in ("mtn","moov") and not transfer.receiver_phone:
        raise HTTPException(400, "Numéro Mobile Money requis")
    if transfer.delivery_method == "bank_transfer" and not transfer.receiver_bank_account:
        raise HTTPException(400, "Numéro de compte bancaire requis")
    if transfer.delivery_method == "interac":
        if not transfer.receiver_interac_email:
            raise HTTPException(400, "Email Interac du receveur requis")
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", transfer.receiver_interac_email):
            raise HTTPException(400, "Adresse courriel Interac invalide")
            
    min_amt = c.get("min_amount_cad") or c.get("min_amount_xof")
    max_amt = c.get("max_amount_cad") or c.get("max_amount_xof")
    if not (min_amt <= transfer.send_amount <= max_amt):
        raise HTTPException(400, f"Montant hors limites ({min_amt} – {max_amt})")

    network = None
    if transfer.delivery_method in ("mtn","moov"):
        v = validate_benin_mobile_number(transfer.receiver_phone, transfer.delivery_method)
        transfer.receiver_phone = v["normalized_phone"]
        network = v["network"]

    calc           = await calculate_transfer(transfer.corridor, transfer.send_amount)
    transfer_id    = str(uuid.uuid4())
    tracking       = generate_tracking_number()
    now            = datetime.now(timezone.utc).isoformat()
    instructions   = build_payment_instructions(transfer.payment_method, tracking, calc["total_charged"])

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
        "receiver_mobile_network": network,
        "receiver_bank_name": transfer.receiver_bank_name,
        "receiver_bank_account": transfer.receiver_bank_account,
        "receiver_bank_iban": transfer.receiver_bank_iban,
        "receiver_interac_email": transfer.receiver_interac_email,
        "sender_name": user["full_name"],
        "sender_email": user["email"],
        "sender_phone": user["phone"],
        "sender_country": user["country"],
        "status": "pending",
        "tracking_number": tracking,
        "admin_notes": "",
        "notes": transfer.notes,
        "payment_proof_filename": None,
        "payment_instructions": instructions,
        "created_at": now,
        "updated_at": now
    }
    
    # Insertion en Base de données
    await db.transfers.insert_one(doc)
    
    # 💥 DÉCLENCHEMENT DE L'E-MAIL DE CONFIRMATION
    try:
        subject, html_content = email_confirmation(doc)
        # On utilise une tâche asynchrone en arrière-plan pour ne pas ralentir la réponse API
        import asyncio
        asyncio.create_task(send_email(to=user["email"], subject=subject, html=html_content))
    except Exception as mail_err:
        logger.error(f"Erreur lors de la préparation de l'email : {mail_err}")

    return enrich_transfer(doc)

    # On n'oublie pas d'inclure le routeur dans l'application FastAPI
    app.include_router(api_router)

    # Email de confirmation (non bloquant)
    if doc.get("sender_email"):
        subj, html = email_confirmation(doc)
        await send_email(doc["sender_email"], subj, html)

    return TransferResponse(**enrich_transfer(doc))

@api_router.get("/transfers", response_model=List[TransferResponse])
async def get_user_transfers(user: dict = Depends(get_current_user)):
    ts = await db.transfers.find({"user_id": user["id"]}, {"_id":0}).sort("created_at",-1).to_list(100)
    return [TransferResponse(**enrich_transfer(t)) for t in ts]

@api_router.get("/transfers/{transfer_id}", response_model=TransferResponse)
async def get_transfer(transfer_id: str, user: dict = Depends(get_current_user)):
    t = await db.transfers.find_one({"id": transfer_id, "user_id": user["id"]}, {"_id":0})
    if not t: raise HTTPException(404, "Transfert introuvable")
    return TransferResponse(**enrich_transfer(t))

@api_router.post("/transfers/{transfer_id}/proof")
async def upload_proof(transfer_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    t = await db.transfers.find_one({"id": transfer_id, "user_id": user["id"]}, {"_id":0})
    if not t: raise HTTPException(404, "Transfert introuvable")
    if t["status"] != "pending": raise HTTPException(400, "Preuve uploadable uniquement sur un transfert en attente")
    if file.content_type not in ["image/jpeg","image/png","image/webp","application/pdf"]:
        raise HTTPException(400, "Format accepté : JPG, PNG, WebP, PDF")
    content = await file.read()
    if len(content) > 5*1024*1024: raise HTTPException(400, "Fichier trop volumineux (max 5 Mo)")
    now = datetime.now(timezone.utc).isoformat()
    await db.transfers.update_one({"id": transfer_id}, {"$set": {
        "payment_proof_data": base64.b64encode(content).decode(),
        "payment_proof_filename": file.filename,
        "payment_proof_content_type": file.content_type,
        "payment_proof_uploaded_at": now, "updated_at": now
    }})
    return {"message": "Preuve reçue avec succès", "filename": file.filename}

@api_router.get("/transfers/{transfer_id}/proof")
async def get_proof(transfer_id: str, user: dict = Depends(get_current_user)):
    q = {"id": transfer_id}
    if not user.get("is_admin"): q["user_id"] = user["id"]
    t = await db.transfers.find_one(q)
    if not t or not t.get("payment_proof_data"): raise HTTPException(404, "Aucune preuve de paiement")
    return {"filename": t.get("payment_proof_filename"), "content_type": t.get("payment_proof_content_type"),
            "data": t["payment_proof_data"], "uploaded_at": t.get("payment_proof_uploaded_at")}

@api_router.get("/track/{tracking_number}")
async def track_transfer(tracking_number: str):
    t = await db.transfers.find_one(
        {"tracking_number": tracking_number},
        {"_id":0,"payment_proof_data":0,"user_id":0,"sender_email":0}
    )
    if not t: raise HTTPException(404, "Numéro de suivi introuvable")
    s = t.get("status","pending"); meta = STATUS_LABELS.get(s,{})
    return {
        "tracking_number": tracking_number,
        "corridor": CORRIDORS.get(t["corridor"],{}).get("label", t["corridor"]),
        "send_amount": t["send_amount"], "send_currency": t["send_currency"],
        "receive_amount": t["receive_amount"], "receive_currency": t["receive_currency"],
        "delivery_method": DELIVERY_METHOD_LABELS.get(t["delivery_method"],{}).get("label", t["delivery_method"]),
        "status": s, "status_label": meta.get("label",s), "status_color": meta.get("color","gray"),
        "created_at": t["created_at"], "updated_at": t["updated_at"],
        "estimated_time": CORRIDORS.get(t["corridor"],{}).get("estimated_time",""),
        "receiver_mobile_network": t.get("receiver_mobile_network"),
    }

# ============================================================
# ADMIN ROUTES
# ============================================================

@api_router.get("/admin/transfers", response_model=List[TransferResponse])
async def get_all_transfers(status: Optional[str]=None, corridor: Optional[str]=None, admin: dict=Depends(get_admin_user)):
    q = {}
    if status:   q["status"]   = status
    if corridor: q["corridor"] = corridor
    ts = await db.transfers.find(q, {"_id":0,"payment_proof_data":0}).sort("created_at",-1).to_list(500)
    return [TransferResponse(**enrich_transfer(t)) for t in ts]

@api_router.get("/admin/transfers/{transfer_id}", response_model=TransferResponse)
async def admin_get_transfer(transfer_id: str, admin: dict=Depends(get_admin_user)):
    t = await db.transfers.find_one({"id": transfer_id}, {"_id":0,"payment_proof_data":0})
    if not t: raise HTTPException(404, "Transfert introuvable")
    return TransferResponse(**enrich_transfer(t))

@api_router.put("/admin/transfers/{transfer_id}", response_model=TransferResponse)
async def update_transfer(transfer_id: str, update: TransferUpdate, admin: dict=Depends(get_admin_user)):
    t = await db.transfers.find_one({"id": transfer_id}, {"_id":0})
    if not t: raise HTTPException(404, "Transfert introuvable")
    allowed = ADMIN_TRANSITIONS.get(t["status"], [])
    if update.status not in allowed:
        raise HTTPException(400, f"Transition '{t['status']}' → '{update.status}' non autorisée. Possibles : {allowed}")
    now = datetime.now(timezone.utc).isoformat()
    patch = {"status": update.status, "updated_at": now}
    if update.admin_notes:          patch["admin_notes"]   = update.admin_notes
    if update.tracking_number:      patch["tracking_number"] = update.tracking_number
    if update.exchange_rate_applied: patch["exchange_rate"] = update.exchange_rate_applied
    await db.transfers.update_one({"id": transfer_id}, {"$set": patch})
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id":0,"payment_proof_data":0})

    # Email de complétion (non bloquant via asyncio.create_task)
    if update.status == "completed" and updated.get("sender_email"):
        try:
            subj, html = email_completed(updated)
            import asyncio
            asyncio.create_task(send_email(to=updated["sender_email"], subject=subj, html=html))
            logger.info(f"Tâche d'envoi d'email de complétion lancée pour {updated['sender_email']}")
        except Exception as mail_err:
            logger.error(f"Erreur lors de la préparation de l'email de complétion : {mail_err}")

    return TransferResponse(**enrich_transfer(updated))

@api_router.get("/admin/users")
async def get_all_users(admin: dict=Depends(get_admin_user)):
    return await db.users.find({"is_admin":False},{"_id":0,"password":0}).sort("created_at",-1).to_list(500)

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict=Depends(get_admin_user)):
    total      = await db.transfers.count_documents({})
    by_status  = {s: await db.transfers.count_documents({"status":s}) for s in VALID_STATUSES}
    total_users= await db.users.count_documents({"is_admin":False})
    vol_cad    = await db.transfers.aggregate([{"$match":{"send_currency":"CAD","status":"completed"}},{"$group":{"_id":None,"total":{"$sum":"$send_amount"},"fees":{"$sum":"$fee"}}}]).to_list(1)
    vol_xof    = await db.transfers.aggregate([{"$match":{"send_currency":"XOF","status":"completed"}},{"$group":{"_id":None,"total":{"$sum":"$send_amount"},"fees":{"$sum":"$fee"}}}]).to_list(1)
    thirty     = (datetime.now(timezone.utc)-timedelta(days=30)).isoformat()
    recent     = await db.transfers.aggregate([{"$match":{"created_at":{"$gte":thirty}}},{"$group":{"_id":"$corridor","count":{"$sum":1},"volume_sent":{"$sum":"$send_amount"}}}]).to_list(10)
    return {
        "total_transfers":total,"by_status":by_status,"total_users":total_users,
        "volume_cad_completed": vol_cad[0]["total"] if vol_cad else 0,
        "fees_cad_collected":   vol_cad[0]["fees"]  if vol_cad else 0,
        "volume_xof_completed": vol_xof[0]["total"] if vol_xof else 0,
        "fees_xof_collected":   vol_xof[0]["fees"]  if vol_xof else 0,
        "last_30_days_by_corridor": recent,
    }

@api_router.put("/admin/corridors/{corridor_key}/rate")
async def update_rate_override(corridor_key: str, body: RateUpdate, admin: dict=Depends(get_admin_user)):
    """Permet à l'admin de forcer un taux de secours en DB (utilisé si l'API externe est indisponible)."""
    if corridor_key not in CORRIDORS: raise HTTPException(404, "Corridor introuvable")
    if body.rate <= 0:                raise HTTPException(400, "Le taux doit être positif")
    # Forcer le taux en DB et invalider le cache mémoire
    await db.settings.update_one({"key":"rate_cad_xof"},{"$set":{"value":body.rate,"updated_at":datetime.now(timezone.utc).isoformat()}},upsert=True)
    _rate_cache["rate"] = None  # invalide le cache pour forcer une re-fetch
    return {"message": "Taux de secours mis à jour en DB", "corridor": corridor_key, "rate": body.rate}

@api_router.post("/admin/create-admin")
async def create_admin_user():
    if await db.users.find_one({"email":"admin@prestigemoneytransfer.ca"}):
        return {"message": "Admin déjà existant"}
    uid = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    doc = {"id":uid,"email":"admin@prestigemoneytransfer.ca","password":hash_password("PrestigeAdmin2024!"),
           "full_name":"Admin Prestige","phone":"+1 514 000 0000","country":"Canada","is_admin":True,"created_at":now}
    await db.users.insert_one(doc)
    return {"message":"Admin créé","email":doc["email"],"password":"PrestigeAdmin2024!"}

@api_router.post("/admin/migrate-transfers")
async def migrate_old_transfers(admin: dict=Depends(get_admin_user)):
    r1 = await db.transfers.update_many({"sender_name":{"$exists":False}},{"$set":{"sender_name":"Inconnu","sender_email":"","sender_phone":"","sender_country":""}})
    r2 = await db.transfers.update_many({"corridor":{"$exists":False}},{"$set":{"corridor":"canada_to_benin"}})
    r3 = await db.transfers.update_many({"send_currency":{"$exists":False}},{"$set":{"send_currency":"CAD","receive_currency":"XOF"}})
    return {"migrated_sender_fields":r1.modified_count,"migrated_corridor":r2.modified_count,"migrated_currency":r3.modified_count}

# ============================================================
# HEALTH
# ============================================================

@api_router.get("/")
async def root():
    return {"message":"Prestige Money Transfer API","status":"running","version":"3.0"}

@api_router.get("/health")
async def health():
    return {"status":"healthy"}

# ============================================================
# APP SETUP
# ============================================================

app.include_router(api_router)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()