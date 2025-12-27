"""
Bank of Somaliland - FastAPI Backend
ACID Compliant Banking System with Secure Money Transfers
"""

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime, timedelta
import asyncpg
import bcrypt
import jwt
import uuid
import os
from decimal import Decimal

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/bank_of_somaliland")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(
    title="Bank of Somaliland API",
    description="Secure Banking System with ACID Compliance",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database connection pool
db_pool = None

# ============================================
# DATABASE CONNECTION
# ============================================

@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)

@app.on_event("shutdown")
async def shutdown():
    await db_pool.close()

async def get_db():
    async with db_pool.acquire() as connection:
        yield connection

# ============================================
# PYDANTIC MODELS
# ============================================

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TransferRequest(BaseModel):
    receiver_account_number: str
    amount: float
    description: Optional[str] = ""
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        if v > 1000000:
            raise ValueError('Amount exceeds maximum transfer limit')
        return v

class AccountCreate(BaseModel):
    account_type: str
    
    @validator('account_type')
    def validate_account_type(cls, v):
        if v not in ['SAVINGS', 'CURRENT', 'BUSINESS']:
            raise ValueError('Invalid account type')
        return v

class TransactionResponse(BaseModel):
    transaction_id: str
    amount: float
    transaction_type: str
    status: str
    description: Optional[str]
    created_at: datetime

class AccountResponse(BaseModel):
    account_id: str
    account_number: str
    balance: float
    account_type: str
    status: str

class SecurityAlertResponse(BaseModel):
    alert_id: str
    alert_type: str
    severity: str
    message: str
    is_read: bool
    created_at: datetime

# ============================================
# AUTHENTICATION UTILITIES
# ============================================

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.fetchrow("SELECT * FROM users WHERE user_id = $1", uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return dict(user)

async def log_audit(
    db,
    user_id: Optional[uuid.UUID],
    action_type: str,
    action_description: str,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS"
):
    """Log audit trail"""
    await db.execute(
        """
        INSERT INTO audit_logs (user_id, action_type, action_description, ip_address, status)
        VALUES ($1, $2, $3, $4, $5)
        """,
        user_id, action_type, action_description, ip_address, status
    )

async def create_security_alert(
    db,
    user_id: uuid.UUID,
    alert_type: str,
    message: str,
    severity: str = "MEDIUM",
    ip_address: Optional[str] = None
):
    """Create security alert"""
    await db.execute(
        """
        INSERT INTO security_alerts (user_id, alert_type, severity, message, ip_address)
        VALUES ($1, $2, $3, $4, $5)
        """,
        user_id, alert_type, severity, message, ip_address
    )

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {
        "message": "Bank of Somaliland API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister, request: Request, db = Depends(get_db)):
    """Register new user"""
    try:
        # Check if user already exists
        existing = await db.fetchrow(
            "SELECT user_id FROM users WHERE email = $1 OR phone = $2",
            user.email, user.phone
        )
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Hash password
        password_hash = hash_password(user.password)
        
        # Create user
        user_id = await db.fetchval(
            """
            INSERT INTO users (full_name, email, password_hash, phone)
            VALUES ($1, $2, $3, $4)
            RETURNING user_id
            """,
            user.full_name, user.email, password_hash, user.phone
        )
        
        # Create default savings account
        account_number = f"SL{str(uuid.uuid4().int)[:10]}"
        await db.execute(
            """
            INSERT INTO accounts (user_id, account_number, account_type)
            VALUES ($1, $2, 'SAVINGS')
            """,
            user_id, account_number
        )
        
        # Log audit
        await log_audit(db, user_id, "USER_REGISTRATION", f"New user registered: {user.email}", request.client.host)
        
        # Create access token
        access_token = create_access_token({"user_id": str(user_id)})
        
        return {
            "message": "User registered successfully",
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login(credentials: UserLogin, request: Request, db = Depends(get_db)):
    """User login"""
    try:
        # Get user
        user = await db.fetchrow(
            "SELECT * FROM users WHERE email = $1",
            credentials.email
        )
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if account is locked
        if user['account_locked_until'] and user['account_locked_until'] > datetime.utcnow():
            raise HTTPException(status_code=403, detail="Account temporarily locked")
        
        # Verify password
        if not verify_password(credentials.password, user['password_hash']):
            # Increment failed attempts
            failed_attempts = user['failed_login_attempts'] + 1
            lock_until = None
            
            if failed_attempts >= 5:
                lock_until = datetime.utcnow() + timedelta(minutes=30)
                await create_security_alert(
                    db, user['user_id'], "FAILED_LOGIN",
                    f"Account locked due to {failed_attempts} failed login attempts",
                    "HIGH", request.client.host
                )
            
            await db.execute(
                """
                UPDATE users 
                SET failed_login_attempts = $1, account_locked_until = $2
                WHERE user_id = $3
                """,
                failed_attempts, lock_until, user['user_id']
            )
            
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Reset failed attempts and update last login
        await db.execute(
            """
            UPDATE users 
            SET failed_login_attempts = 0, account_locked_until = NULL, last_login = CURRENT_TIMESTAMP
            WHERE user_id = $1
            """,
            user['user_id']
        )
        
        # Create security alert for successful login
        await create_security_alert(
            db, user['user_id'], "ACCOUNT_ACCESS",
            f"Successful login from IP: {request.client.host}",
            "LOW", request.client.host
        )
        
        # Log audit
        await log_audit(db, user['user_id'], "USER_LOGIN", f"User logged in: {credentials.email}", request.client.host)
        
        # Create access token
        access_token = create_access_token({"user_id": str(user['user_id'])})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": str(user['user_id']),
                "full_name": user['full_name'],
                "email": user['email'],
                "kyc_status": user['kyc_status']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accounts", response_model=List[AccountResponse])
async def get_accounts(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get user accounts"""
    accounts = await db.fetch(
        "SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC",
        uuid.UUID(current_user['user_id'])
    )
    return [dict(account) for account in accounts]

@app.post("/api/transfer")
async def transfer_money(
    transfer: TransferRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Transfer money between accounts (ACID compliant)"""
    try:
        # Get sender's primary account
        sender_account = await db.fetchrow(
            """
            SELECT account_id FROM accounts 
            WHERE user_id = $1 AND status = 'ACTIVE'
            ORDER BY created_at ASC LIMIT 1
            """,
            uuid.UUID(current_user['user_id'])
        )
        
        if not sender_account:
            raise HTTPException(status_code=404, detail="No active account found")
        
        # Get receiver account
        receiver_account = await db.fetchrow(
            "SELECT account_id FROM accounts WHERE account_number = $1 AND status = 'ACTIVE'",
            transfer.receiver_account_number
        )
        
        if not receiver_account:
            raise HTTPException(status_code=404, detail="Receiver account not found")
        
        # Generate reference number
        reference_number = f"TXN{uuid.uuid4().hex[:12].upper()}"
        
        # Execute atomic transfer using database function
        result = await db.fetchval(
            """
            SELECT transfer_money($1, $2, $3, $4, $5)
            """,
            sender_account['account_id'],
            receiver_account['account_id'],
            Decimal(str(transfer.amount)),
            transfer.description,
            reference_number
        )
        
        # Parse result
        import json
        result_data = json.loads(result)
        
        if not result_data['success']:
            # Log failed transaction
            await log_audit(
                db, uuid.UUID(current_user['user_id']),
                "TRANSFER_FAILED",
                f"Failed transfer: {result_data['error']}",
                request.client.host, "FAILED"
            )
            raise HTTPException(status_code=400, detail=result_data['error'])
        
        # Create security alert for large transfers
        if transfer.amount > 10000:
            await create_security_alert(
                db, uuid.UUID(current_user['user_id']),
                "LARGE_WITHDRAWAL",
                f"Large transfer of {transfer.amount} SLSH completed",
                "MEDIUM", request.client.host
            )
        
        # Log successful transaction
        await log_audit(
            db, uuid.UUID(current_user['user_id']),
            "TRANSFER_SUCCESS",
            f"Transfer of {transfer.amount} SLSH to {transfer.receiver_account_number}",
            request.client.host
        )
        
        return {
            "success": True,
            "transaction_id": result_data['transaction_id'],
            "reference_number": reference_number,
            "message": "Transfer completed successfully",
            "amount": transfer.amount
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user transaction history"""
    # Get user's accounts
    account_ids = await db.fetch(
        "SELECT account_id FROM accounts WHERE user_id = $1",
        uuid.UUID(current_user['user_id'])
    )
    
    if not account_ids:
        return []
    
    account_id_list = [str(acc['account_id']) for acc in account_ids]
    
    # Get transactions
    transactions = await db.fetch(
        """
        SELECT * FROM transactions 
        WHERE sender_account_id = ANY($1::uuid[]) OR receiver_account_id = ANY($1::uuid[])
        ORDER BY created_at DESC
        LIMIT $2
        """,
        account_id_list, limit
    )
    
    return [dict(txn) for txn in transactions]

@app.get("/api/security-alerts", response_model=List[SecurityAlertResponse])
async def get_security_alerts(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user security alerts"""
    alerts = await db.fetch(
        """
        SELECT * FROM security_alerts 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        uuid.UUID(current_user['user_id']), limit
    )
    
    return [dict(alert) for alert in alerts]

@app.post("/api/security-alerts/{alert_id}/mark-read")
async def mark_alert_read(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark security alert as read"""
    await db.execute(
        """
        UPDATE security_alerts 
        SET is_read = TRUE 
        WHERE alert_id = $1 AND user_id = $2
        """,
        uuid.UUID(alert_id), uuid.UUID(current_user['user_id'])
    )
    
    return {"message": "Alert marked as read"}

@app.get("/api/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get dashboard data"""
    # Get total balance across all accounts
    total_balance = await db.fetchval(
        """
        SELECT COALESCE(SUM(balance), 0) FROM accounts 
        WHERE user_id = $1 AND status = 'ACTIVE'
        """,
        uuid.UUID(current_user['user_id'])
    )
    
    # Get recent transactions count
    account_ids = await db.fetch(
        "SELECT account_id FROM accounts WHERE user_id = $1",
        uuid.UUID(current_user['user_id'])
    )
    account_id_list = [str(acc['account_id']) for acc in account_ids]
    
    recent_transactions = await db.fetchval(
        """
        SELECT COUNT(*) FROM transactions 
        WHERE (sender_account_id = ANY($1::uuid[]) OR receiver_account_id = ANY($1::uuid[]))
        AND created_at > CURRENT_DATE - INTERVAL '7 days'
        """,
        account_id_list
    )
    
    # Get unread alerts count
    unread_alerts = await db.fetchval(
        "SELECT COUNT(*) FROM security_alerts WHERE user_id = $1 AND is_read = FALSE",
        uuid.UUID(current_user['user_id'])
    )
    
    return {
        "total_balance": float(total_balance or 0),
        "recent_transactions_count": recent_transactions or 0,
        "unread_alerts_count": unread_alerts or 0,
        "user": {
            "full_name": current_user['full_name'],
            "email": current_user['email'],
            "kyc_status": current_user['kyc_status']
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
