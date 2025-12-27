# Quick Start Guide - Bank of Somaliland

## 🚀 Fast Setup (5 Minutes)

### Step 1: Install PostgreSQL
Download and install PostgreSQL from: https://www.postgresql.org/download/

### Step 2: Create Database
Open PowerShell and run:
```powershell
# Create database
createdb bank_of_somaliland

# Import schema
psql -d bank_of_somaliland -f "database/schema.sql"
```

### Step 3: Install Python Dependencies
```powershell
cd backend
pip install -r requirements.txt
```

### Step 4: Configure Environment
Create `backend/.env` file:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost/bank_of_somaliland
SECRET_KEY=your-super-secret-key-here
```

### Step 5: Start Backend
```powershell
cd backend
python main.py
```

Backend will run at: http://localhost:8000

### Step 6: Start Frontend
Open new PowerShell window:
```powershell
# Using Python
python -m http.server 3000

# OR using npx
npx serve -p 3000
```

Frontend will run at: http://localhost:3000

### Step 7: Test the System

1. **Register Account**
   - Open http://localhost:3000
   - Click "Register"
   - Fill in details
   - Submit

2. **View Dashboard**
   - See your balance
   - View account number

3. **Test Transfer**
   - Create second account (register with different email)
   - Copy account number
   - Login to first account
   - Click "Send Money"
   - Enter receiver account number and amount
   - Confirm transfer
   - Check both accounts - balances updated!

## 🎯 Key Features to Test

### Authentication
- ✅ Register new account
- ✅ Login with credentials
- ✅ Failed login attempts (5 attempts locks account)
- ✅ Logout

### Banking Operations
- ✅ View total balance
- ✅ Send money (ACID-compliant)
- ✅ View transaction history
- ✅ Multiple accounts per user

### Security
- ✅ Security alerts
- ✅ Audit logging
- ✅ IP tracking
- ✅ Account lockout

## 📊 API Documentation

Once backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Troubleshooting

### Database Connection Error
```
Error: could not connect to database
```
**Solution**: Check PostgreSQL is running and DATABASE_URL is correct

### Port Already in Use
```
Error: Address already in use
```
**Solution**: Change port number or kill existing process

### Import Error
```
ModuleNotFoundError: No module named 'fastapi'
```
**Solution**: Run `pip install -r requirements.txt`

## 🎨 UI Preview

The system features:
- 🌙 Dark theme with glassmorphism
- 📱 Responsive mobile design
- ⚡ Real-time updates
- 🔔 Security notifications
- 💳 Modern banking interface

## 📝 Default Test Accounts

After running schema.sql, you'll have:
- Email: `ahmed@example.com`
- Email: `fatima@example.com`
- Password: `password123` (for both)

## 🔐 Security Notes

⚠️ **For Production**:
1. Change SECRET_KEY to random string
2. Use strong passwords
3. Enable HTTPS
4. Configure CORS properly
5. Set up database backups
6. Add rate limiting
7. Enable 2FA

## 📚 Next Steps

1. Read full [README.md](README.md)
2. Explore API at `/docs`
3. Customize UI in `css/style.css`
4. Add features in `backend/main.py`
5. Deploy to production

## 💡 Tips

- Dashboard auto-refreshes every 30 seconds
- Click alerts to mark as read
- Transaction history shows last 5 by default
- Daily transfer limits are enforced
- All transfers are atomic (ACID-compliant)

Enjoy your secure banking system! 🏦
