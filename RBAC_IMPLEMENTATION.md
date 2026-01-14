# RBAC Implementation - Slalom Capabilities Management

## Overview

This branch implements a complete **Role-Based Access Control (RBAC)** system with JWT authentication for the Slalom Capabilities Management application.

## 🔐 Security Features Added

### Authentication
- **JWT Token-based authentication** using `python-jose`
- **Password hashing** with bcrypt via `passlib`
- **Session management** with localStorage
- **Token expiration** (8 hours default)
- **Automatic logout** on token expiration

### Authorization
- **Hierarchical role system** for Slalom consulting structure
- **Permission-based access control**
- **Endpoint protection** with role checks
- **Granular permissions** for different operations

## 👥 Role Hierarchy

```
Partner (Highest)
    ↓
Managing Director
    ↓
Senior Manager
    ↓
Consultant
    ↓
Viewer (Lowest)
```

## 🔑 Test Credentials

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| partner@slalom.com | partner123 | Partner | Full system access |
| director@slalom.com | director123 | Managing Director | Market/practice leadership |
| manager@slalom.com | manager123 | Senior Manager | Capability management |
| consultant@slalom.com | consultant123 | Consultant | Self-service only |
| viewer@slalom.com | viewer123 | Viewer | Read-only access |

## 📋 Permission Matrix

| Permission | Partner | Managing Director | Senior Manager | Consultant | Viewer |
|-----------|---------|-------------------|----------------|------------|--------|
| **Read Capabilities** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Read All Consultants** | ✅ | ✅ | ✅ | ⚠️ Own only | ✅ |
| **Register Consultants** | ✅ | ✅ | ✅ | ⚠️ Self only | ❌ |
| **Unregister Consultants** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Manage Capabilities** | ✅ | ✅ | ⚠️ Own only | ❌ | ❌ |
| **Manage Users** | ✅ | ❌ | ❌ | ❌ | ❌ |

## 🏗️ Architecture Changes

### New Files
- **`src/auth.py`** - Authentication and authorization module
  - User model and role definitions
  - JWT token creation and validation
  - Password hashing utilities
  - Permission checking functions
  - Role-based dependencies

### Modified Files
- **`requirements.txt`** - Added authentication dependencies
  - `python-jose[cryptography]` - JWT handling
  - `passlib[bcrypt]` - Password hashing
  - `python-multipart` - Form data support

- **`src/app.py`** - Enhanced with RBAC
  - New `/token` login endpoint
  - New `/auth/me` user info endpoint
  - Protected all existing endpoints
  - Role-based permission checks
  - CORS middleware for security

- **`src/static/index.html`** - Added login UI
  - Login modal with form
  - User info display in header
  - Logout functionality
  - Test credentials reference

- **`src/static/app.js`** - Authentication handling
  - Token management with localStorage
  - Login/logout functions
  - Authorization headers on API calls
  - Role-based UI rendering
  - Automatic logout on 401 responses

- **`src/static/styles.css`** - Login styling
  - Modal dialog design
  - Form styling
  - User info display
  - Button styles
  - Responsive design

## 🚀 API Endpoints

### Authentication Endpoints

#### POST `/token`
**Purpose:** Login and obtain JWT token

**Request:**
```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=consultant@slalom.com&password=consultant123"
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "email": "consultant@slalom.com",
    "role": "Consultant",
    "full_name": "Carlos Consultant",
    "market": "Seattle"
  }
}
```

#### GET `/auth/me`
**Purpose:** Get current user information

**Request:**
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer {token}"
```

### Protected Endpoints

#### GET `/capabilities`
- **Authentication:** Required
- **Authorization:** All authenticated users
- **Purpose:** View all capabilities

#### POST `/capabilities/{capability_name}/register`
- **Authentication:** Required
- **Authorization:** 
  - Consultants can only register themselves
  - Managers and above can register anyone
- **Purpose:** Register consultant for a capability

#### DELETE `/capabilities/{capability_name}/unregister`
- **Authentication:** Required
- **Authorization:** Senior Manager and above only
- **Purpose:** Remove consultant from a capability

## 💻 Local Development

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Application
```bash
cd src
python app.py
```

### 3. Access the Application
- **Web UI:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc

### 4. Login
Use any of the test credentials listed above.

## 🧪 Testing the RBAC System

### Test 1: Consultant Self-Registration
1. Login as `consultant@slalom.com`
2. Try to register yourself - ✅ Should succeed
3. Try to register someone else - ❌ Should fail with 403

### Test 2: Manager Registration
1. Login as `manager@slalom.com`
2. Register any email address - ✅ Should succeed

### Test 3: Unregister Permissions
1. Login as `consultant@slalom.com`
2. Try to unregister someone - ❌ Delete button not visible
3. Login as `manager@slalom.com`
4. Try to unregister someone - ✅ Should succeed

### Test 4: Token Expiration
1. Login with any credentials
2. Wait for token expiration (or manually delete from localStorage)
3. Try to access any endpoint - Should redirect to login

## 🔒 Security Best Practices Implemented

### ✅ Password Security
- Bcrypt hashing with automatic salt generation
- No plain-text password storage
- Secure password comparison

### ✅ Token Security
- JWT with expiration timestamps
- Secret key for signing (should be env variable in production)
- Token validation on every request

### ✅ Frontend Security
- Token storage in localStorage
- Automatic logout on 401
- HTTPS recommended for production
- CORS configuration

### ✅ API Security
- All endpoints require authentication
- Role-based authorization checks
- Permission validation before operations
- Comprehensive error messages

## 🚨 Production Considerations

### Required Changes for Production

1. **Environment Variables**
   ```python
   # Replace in auth.py
   SECRET_KEY = os.getenv("SECRET_KEY")  # Generate with: openssl rand -hex 32
   ```

2. **Database Integration**
   - Replace in-memory `users_db` with PostgreSQL/MySQL
   - Add user registration endpoint
   - Implement password reset flow

3. **CORS Configuration**
   ```python
   # In app.py, restrict origins
   allow_origins=["https://yourdomain.com"]
   ```

4. **HTTPS Only**
   - Deploy behind HTTPS proxy (Nginx, Cloudflare)
   - Set secure cookie flags

5. **Rate Limiting**
   - Add rate limiting on login endpoint
   - Protect against brute force attacks

6. **Audit Logging**
   - Log all authentication attempts
   - Track all permission-based actions
   - Monitor for suspicious activity

7. **Token Refresh**
   - Implement refresh token mechanism
   - Allow token renewal without re-login

## 📊 Comparison: Before vs After

| Feature | Before RBAC | After RBAC |
|---------|-------------|------------|
| **Authentication** | None | JWT-based |
| **Authorization** | None | Role-based |
| **User Management** | None | 5 roles with hierarchy |
| **API Security** | Open | Protected |
| **Password Security** | N/A | Bcrypt hashed |
| **Session Management** | None | Token-based |
| **Permission System** | None | Granular permissions |
| **Audit Trail** | None | User actions tracked |

## 🎓 Key Learning Outcomes

1. **JWT Authentication** - Industry-standard token-based auth
2. **RBAC Implementation** - Hierarchical role design
3. **Password Security** - Proper hashing with bcrypt
4. **FastAPI Security** - OAuth2 and dependency injection
5. **Frontend Auth Flow** - Token management and UI updates
6. **Permission Design** - Granular vs role-based approaches

## 📚 Additional Resources

- [FastAPI Security Tutorial](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io](https://jwt.io/) - JWT debugger
- [OWASP Auth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OAuth 2.0 Spec](https://oauth.net/2/)

## 🤝 Contributing

To extend this RBAC system:
1. Add new roles in `auth.py` UserRole enum
2. Update ROLE_PERMISSIONS matrix
3. Create role-specific endpoints
4. Add tests for new permissions
5. Update this documentation

## 📝 License

Same as parent project - MIT License
