# Bank of Somaliland - Secure Banking System

A modern, secure banking system with ACID-compliant transactions, built with FastAPI backend and vanilla JavaScript frontend.

## Features

### 🔐 Security
- JWT-based authentication
- Password hashing with bcrypt
- Account lockout after failed login attempts
- Security alerts for suspicious activities
- Audit logging for all transactions
- IP address tracking

### 💰 Banking Operations
- **ACID-compliant money transfers** - Guaranteed atomicity
- Multiple account types (Savings, Current, Business)
- Real-time balance updates
- Transaction history
- Daily transfer limits
- Account management

### 📊 Dashboard
- Total balance overview
- Recent transactions
- Security alerts
- Account status (KYC)
- Quick actions for common tasks

### 🎨 Modern UI
- Dark theme with glassmorphism effects
- Smooth animations and transitions
- Responsive design for mobile and desktop
- Real-time updates
- Toast notifications

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - ACID-compliant database
- **asyncpg** - Async PostgreSQL driver
- **bcrypt** - Password hashing
- **JWT** - Token-based authentication

### Frontend
- **Vanilla JavaScript** - No frameworks, pure performance
- **CSS3** - Modern styling with animations
- **HTML5** - Semantic markup

## Database Schema

### Tables
1. **users** - User accounts with KYC status
2. **accounts** - Bank accounts with balances
3. **transactions** - All financial transactions
4. **audit_logs** - Complete audit trail
5. **security_alerts** - Security notifications

### Key Features
- UUID primary keys
- Proper foreign key constraints
- Indexes for performance
- Triggers for automatic timestamps
- Stored procedure for atomic transfers

## Installation

### Prerequisites
- Python 3.9+
- PostgreSQL 13+
- Node.js (for development server)

### Backend Setup

1. **Install PostgreSQL** and create database:
```bash
createdb bank_of_somaliland
```

2. **Run database schema**:
```bash
psql -d bank_of_somaliland -f database/schema.sql
```

3. **Install Python dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

4. **Configure environment variables**:
```bash
export DATABASE_URL="postgresql://user:password@localhost/bank_of_somaliland"
export SECRET_KEY="your-secret-key-change-in-production"
```

5. **Run the backend**:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Update API URL** in `js/app.js` if needed:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

2. **Serve the frontend**:
```bash
# Using Python
python -m http.server 3000

# Or using Node.js
npx serve -p 3000
```

3. **Open browser**:
```
http://localhost:3000
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

#### Banking
- `GET /api/dashboard` - Dashboard data
- `GET /api/accounts` - List user accounts
- `POST /api/transfer` - Transfer money (ACID-compliant)
- `GET /api/transactions` - Transaction history

#### Security
- `GET /api/security-alerts` - Get security alerts
- `POST /api/security-alerts/{id}/mark-read` - Mark alert as read

## ACID Compliance

The money transfer system ensures **ACID** properties:

### Atomicity
- All or nothing - money is either transferred completely or not at all
- Uses PostgreSQL stored procedure with transaction management

### Consistency
- Database constraints ensure valid states
- Balance cannot go negative
- Daily limits are enforced

### Isolation
- Row-level locking prevents concurrent transfer issues
- `FOR UPDATE` locks ensure serializable transactions

### Durability
- PostgreSQL's WAL ensures committed transactions persist
- All transactions are logged in audit trail

## Security Features

### Authentication
- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens with expiration
- Secure token storage in localStorage

### Protection
- Account lockout after 5 failed attempts (30 min)
- Daily transfer limits
- IP address logging
- Security alerts for:
  - Failed login attempts
  - Suspicious transactions
  - Large withdrawals
  - Account access from new IPs

### Audit Trail
- All actions logged with:
  - User ID
  - Action type
  - IP address
  - Timestamp
  - Old/new values (for updates)

## Usage

### Register Account
1. Click "Register" on login screen
2. Enter full name, email, phone, password
3. Account created with default savings account

### Login
1. Enter email and password
2. Dashboard loads with account overview

### Send Money
1. Click "Send Money" button
2. Enter receiver account number
3. Enter amount and optional description
4. Confirm transfer
5. Transaction processed atomically

### View Transactions
1. Recent transactions shown on dashboard
2. Click "View All" for complete history
3. Transactions auto-refresh every 30 seconds

### Security Alerts
1. Click bell icon in header
2. View all security notifications
3. Click alert to mark as read
4. Badge shows unread count

## Development

### Database Migrations
To modify the schema:
1. Update `database/schema.sql`
2. Create migration script
3. Test on development database
4. Apply to production

### Adding Features
1. Update database schema if needed
2. Add API endpoints in `backend/main.py`
3. Update frontend in `js/app.js`
4. Add UI components in `index.html`
5. Style in `css/style.css`

## Production Deployment

### Backend
1. Use production-grade WSGI server (Gunicorn)
2. Set strong SECRET_KEY
3. Use environment variables for config
4. Enable HTTPS
5. Configure CORS properly
6. Set up database backups
7. Monitor with logging service

### Frontend
1. Minify CSS/JS
2. Enable gzip compression
3. Use CDN for static assets
4. Configure CSP headers
5. Enable HTTPS

### Database
1. Regular backups
2. Replication for high availability
3. Connection pooling
4. Query optimization
5. Monitor performance

## Testing

### Test Accounts
The schema includes sample users:
- Email: `ahmed@example.com`
- Email: `fatima@example.com`
- Password: `password123` (hashed)

### Test Transfer
1. Login with test account
2. Get account number from dashboard
3. Create second account or use existing
4. Transfer money between accounts
5. Verify atomicity and balance updates

## License

This project is for educational purposes. Modify as needed for production use.

## Support

For issues or questions:
- Check API documentation at `/docs`
- Review database schema in `database/schema.sql`
- Examine frontend code in `js/app.js`

## Security Notice

⚠️ **Important**: This is a demonstration system. For production use:
- Use strong SECRET_KEY
- Enable HTTPS everywhere
- Implement rate limiting
- Add 2FA authentication
- Regular security audits
- Penetration testing
- Compliance with banking regulations
