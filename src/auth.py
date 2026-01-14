"""
Authentication and Authorization Module

Provides JWT-based authentication and role-based access control (RBAC)
for the Slalom Capabilities Management System.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Security configuration
SECRET_KEY = "slalom-capabilities-secret-key-change-in-production"  # TODO: Use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token handling
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class UserRole(str, Enum):
    """Hierarchical roles for Slalom consultants"""
    PARTNER = "Partner"
    MANAGING_DIRECTOR = "ManagingDirector"
    SENIOR_MANAGER = "SeniorManager"
    CONSULTANT = "Consultant"
    VIEWER = "Viewer"


class User(BaseModel):
    """User model with consulting context"""
    email: EmailStr
    hashed_password: str
    role: UserRole
    full_name: str
    market: str
    is_active: bool = True
    created_at: datetime = datetime.now()
    last_login: Optional[datetime] = None


class UserInDB(User):
    """User model for database storage"""
    pass


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str
    user: dict


class TokenData(BaseModel):
    """Token payload data"""
    email: Optional[str] = None
    role: Optional[str] = None


# In-memory user database (replace with real database in production)
users_db = {
    "partner@slalom.com": User(
        email="partner@slalom.com",
        hashed_password=pwd_context.hash("partner123"),
        role=UserRole.PARTNER,
        full_name="Patricia Partner",
        market="Seattle"
    ),
    "director@slalom.com": User(
        email="director@slalom.com",
        hashed_password=pwd_context.hash("director123"),
        role=UserRole.MANAGING_DIRECTOR,
        full_name="David Director",
        market="Chicago"
    ),
    "manager@slalom.com": User(
        email="manager@slalom.com",
        hashed_password=pwd_context.hash("manager123"),
        role=UserRole.SENIOR_MANAGER,
        full_name="Melissa Manager",
        market="Boston"
    ),
    "consultant@slalom.com": User(
        email="consultant@slalom.com",
        hashed_password=pwd_context.hash("consultant123"),
        role=UserRole.CONSULTANT,
        full_name="Carlos Consultant",
        market="Seattle"
    ),
    "viewer@slalom.com": User(
        email="viewer@slalom.com",
        hashed_password=pwd_context.hash("viewer123"),
        role=UserRole.VIEWER,
        full_name="Victor Viewer",
        market="Austin"
    )
}


# Role-based permission matrix
ROLE_PERMISSIONS = {
    UserRole.PARTNER: {
        "read:capabilities",
        "write:capabilities",
        "delete:capabilities",
        "manage:users",
        "read:all_consultants",
        "write:all_registrations",
        "delete:all_registrations"
    },
    UserRole.MANAGING_DIRECTOR: {
        "read:capabilities",
        "write:capabilities",
        "read:all_consultants",
        "write:all_registrations",
        "delete:all_registrations"
    },
    UserRole.SENIOR_MANAGER: {
        "read:capabilities",
        "write:capabilities",
        "read:all_consultants",
        "write:registrations"
    },
    UserRole.CONSULTANT: {
        "read:capabilities",
        "read:consultants",
        "write:own_registration"
    },
    UserRole.VIEWER: {
        "read:capabilities",
        "read:consultants"
    }
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for storage"""
    return pwd_context.hash(password)


def get_user(email: str) -> Optional[User]:
    """Retrieve a user from the database"""
    return users_db.get(email)


def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = get_user(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get the current authenticated user from the token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
    
    user = get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Update last login
    user.last_login = datetime.now()
    
    return user


def require_role(allowed_roles: List[UserRole]):
    """Dependency to require specific roles"""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


def require_permission(permission: str):
    """Dependency to require specific permission"""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_permissions = ROLE_PERMISSIONS.get(current_user.role, set())
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission}"
            )
        return current_user
    return permission_checker


def has_permission(user: User, permission: str) -> bool:
    """Check if a user has a specific permission"""
    user_permissions = ROLE_PERMISSIONS.get(user.role, set())
    return permission in user_permissions
