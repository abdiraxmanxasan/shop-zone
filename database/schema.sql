-- ============================================
-- Bank of Somaliland - Database Schema
-- ACID Compliant Banking System
-- ============================================

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    account_locked_until TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);

-- ============================================
-- ACCOUNTS TABLE
-- ============================================
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('SAVINGS', 'CURRENT', 'BUSINESS')),
    currency VARCHAR(3) DEFAULT 'SLSH', -- Somaliland Shilling
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    daily_transfer_limit DECIMAL(15, 2) DEFAULT 100000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster account lookups
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_account_id UUID REFERENCES accounts(account_id),
    receiver_account_id UUID REFERENCES accounts(account_id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'FEE')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
    description TEXT,
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    fee_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    failure_reason TEXT
);

-- Indexes for transaction queries
CREATE INDEX idx_transactions_sender ON transactions(sender_account_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference_number);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    admin_id UUID REFERENCES users(user_id),
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- SECURITY ALERTS TABLE
-- ============================================
CREATE TABLE security_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('FAILED_LOGIN', 'SUSPICIOUS_TRANSACTION', 'ACCOUNT_ACCESS', 'PASSWORD_CHANGE', 'LARGE_WITHDRAWAL')),
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    message TEXT NOT NULL,
    ip_address VARCHAR(45),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for security alerts
CREATE INDEX idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX idx_security_alerts_is_read ON security_alerts(is_read);
CREATE INDEX idx_security_alerts_created_at ON security_alerts(created_at DESC);

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION FOR ATOMIC MONEY TRANSFER
-- ============================================
CREATE OR REPLACE FUNCTION transfer_money(
    p_sender_account_id UUID,
    p_receiver_account_id UUID,
    p_amount DECIMAL(15, 2),
    p_description TEXT,
    p_reference_number VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
    v_sender_balance DECIMAL(15, 2);
    v_sender_limit DECIMAL(15, 2);
    v_daily_total DECIMAL(15, 2);
    v_transaction_id UUID;
    v_result JSON;
BEGIN
    -- Start transaction (implicit in function)
    
    -- Lock sender account row for update
    SELECT balance, daily_transfer_limit INTO v_sender_balance, v_sender_limit
    FROM accounts
    WHERE account_id = p_sender_account_id AND status = 'ACTIVE'
    FOR UPDATE;
    
    -- Check if sender account exists and is active
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Sender account not found or inactive');
    END IF;
    
    -- Check if receiver account exists and is active
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_id = p_receiver_account_id AND status = 'ACTIVE') THEN
        RETURN json_build_object('success', false, 'error', 'Receiver account not found or inactive');
    END IF;
    
    -- Check sufficient balance
    IF v_sender_balance < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    -- Check daily transfer limit
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_total
    FROM transactions
    WHERE sender_account_id = p_sender_account_id
    AND DATE(created_at) = CURRENT_DATE
    AND status = 'COMPLETED';
    
    IF (v_daily_total + p_amount) > v_sender_limit THEN
        RETURN json_build_object('success', false, 'error', 'Daily transfer limit exceeded');
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        sender_account_id,
        receiver_account_id,
        amount,
        transaction_type,
        status,
        description,
        reference_number
    ) VALUES (
        p_sender_account_id,
        p_receiver_account_id,
        p_amount,
        'TRANSFER',
        'PENDING',
        p_description,
        p_reference_number
    ) RETURNING transaction_id INTO v_transaction_id;
    
    -- Deduct from sender
    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_id = p_sender_account_id;
    
    -- Add to receiver
    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_id = p_receiver_account_id;
    
    -- Mark transaction as completed
    UPDATE transactions
    SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
    WHERE transaction_id = v_transaction_id;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', 'Transfer completed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback happens automatically
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (FOR TESTING)
-- ============================================

-- Insert sample user
INSERT INTO users (full_name, email, password_hash, phone, kyc_status)
VALUES 
    ('Ahmed Mohamed', 'ahmed@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgONJFe2i', '+252634567890', 'VERIFIED'),
    ('Fatima Hassan', 'fatima@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgONJFe2i', '+252634567891', 'VERIFIED');

-- Insert sample accounts
INSERT INTO accounts (user_id, account_number, balance, account_type)
SELECT user_id, 'SL' || LPAD((ROW_NUMBER() OVER ())::TEXT, 10, '0'), 50000.00, 'SAVINGS'
FROM users;
