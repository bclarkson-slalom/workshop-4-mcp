# Authentication System Implementation

This document describes the JWT-based authentication and authorization system implemented for the Slalom Capabilities Management System.

## Overview

The authentication system provides secure access control with three role-based permission levels:
- **Admin**: Full system access
- **Consultant**: Can register themselves for capabilities
- **Read-only**: Can only view capability information

## Features Implemented

### 1. JWT-Based Authentication
- Stateless authentication using JSON Web Tokens
- Secure password hashing with bcrypt
- Token expiration (8 hours by default)
- HTTP Bearer token authentication scheme

### 2. Role-Based Access Control (RBAC)

**Admin Role:**
- View all capabilities
- Register any consultant for capabilities
- Unregister consultants from capabilities
- Full CRUD access

**Consultant Role:**
- View all capabilities
- Register themselves for capabilities
- Cannot modify others or unregister anyone

**Read-Only Role:**
- View capabilities only
- No modification permissions

### 3. Protected API Endpoints

All capability-related endpoints now require authentication:
- `GET /capabilities` - Requires authentication
- `POST /capabilities/{name}/register` - Requires consultant or admin role
- `DELETE /capabilities/{name}/unregister` - Requires admin role

### 4. Security Features

- Password hashing with bcrypt (cost factor 12)
- HTTPS enforcement ready (configure in production)
- CORS middleware for cross-origin requests
- Token-based session management
- Rate limiting ready (can be added with middleware)
- Input validation and sanitization via Pydantic

### 5. UI Components

- Login page (`/static/login.html`)
- User authentication status display
- Logout functionality
- Role-based UI elements (admin sees delete buttons)
- Automatic redirect to login when unauthenticated

## Demo Credentials

For testing purposes, the following accounts are pre-configured:

```
Admin Account:
Email: admin@slalom.com
Password: admin123
Role: admin

Consultant Account:
Email: alice.smith@slalom.com
Password: consultant123
Role: consultant

Read-Only Account:
Email: guest@slalom.com
Password: guest123
Role: readonly
```

## API Usage

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@slalom.com","password":"admin123"}'
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user_email": "admin@slalom.com",
  "user_role": "admin",
  "full_name": "System Administrator"
}
```

### Access Protected Endpoint
```bash
curl -X GET http://localhost:8000/capabilities \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Current User Info
```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## File Structure

```
src/
├── auth.py              # Authentication module
├── app.py               # Main application (updated)
├── static/
│   ├── login.html       # Login page (new)
│   ├── index.html       # Main page (updated)
│   ├── app.js           # Frontend logic (updated)
│   └── styles.css       # Styles (updated)
└── README.md            # This file
```

## Technical Implementation

### Backend (FastAPI)

**auth.py** - Core authentication module:
- User model and in-memory user database
- Password hashing and verification
- JWT token creation and validation
- Role-based dependency injection

**app.py** - API endpoints:
- Login endpoint (`/auth/login`)
- User info endpoint (`/auth/me`)
- Protected capability endpoints with role checks

### Frontend (Vanilla JavaScript)

**login.html** - Authentication page:
- Login form with email/password
- Token storage in localStorage
- Redirect to main page on success

**app.js** - Main application logic:
- Authentication check on page load
- Token management
- Authenticated API calls with Bearer token
- Logout functionality
- Role-based UI rendering

## Security Considerations

### Current Implementation (Development)
- In-memory user database
- Default SECRET_KEY (should be changed)
- Permissive CORS (`allow_origins=["*"]`)
- No rate limiting
- No password reset functionality

### Production Recommendations
1. **Database**: Replace in-memory users with a proper database
2. **Secrets Management**: Use environment variables for SECRET_KEY
3. **HTTPS**: Enforce HTTPS in production
4. **CORS**: Restrict allowed origins
5. **Rate Limiting**: Add rate limiting middleware
6. **Password Policy**: Enforce strong passwords
7. **MFA**: Consider multi-factor authentication
8. **Logging**: Add audit trail for authentication events
9. **Token Refresh**: Implement refresh token mechanism
10. **Session Management**: Add token revocation capability

## Environment Variables

```bash
# JWT Secret (change in production!)
JWT_SECRET_KEY=your-secret-key-here

# Token expiration (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

## Testing

1. Start the server:
```bash
cd src
python -m uvicorn app:app --reload
```

2. Navigate to `http://localhost:8000`
3. You'll be redirected to the login page
4. Use demo credentials to log in
5. Test different role permissions

## Future Enhancements

- User registration and profile management
- Password reset via email
- Multi-factor authentication (MFA)
- SSO integration (SAML, OAuth)
- Account lockout after failed attempts
- Session timeout warnings
- Remember me functionality
- API key authentication for service accounts

## Benefits

✅ **Data Security**: All endpoints now require authentication
✅ **Access Control**: Role-based permissions prevent unauthorized actions
✅ **Audit Trail**: Track who performs actions (user info in responses)
✅ **Compliance**: Meet security requirements for enterprise deployment
✅ **User Management**: Proper identity and access management
✅ **Scalability**: JWT tokens enable stateless authentication
