// Bank of Somaliland - Frontend Application
// API Configuration
const API_BASE_URL = 'http://localhost:8000';
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// DOM Elements
const screens = {
    login: document.getElementById('loginScreen'),
    register: document.getElementById('registerScreen'),
    dashboard: document.getElementById('dashboardScreen')
};

const forms = {
    login: document.getElementById('loginForm'),
    register: document.getElementById('registerForm'),
    transfer: document.getElementById('transferForm')
};

const modals = {
    transfer: document.getElementById('transferModal'),
    alerts: document.getElementById('alertsModal')
};

// Utility Functions
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showModal(modalName) {
    modals[modalName].classList.add('active');
}

function hideModal(modalName) {
    modals[modalName].classList.remove('active');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...options
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication
async function login(email, password) {
    try {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        authToken = data.access_token;
        localStorage.setItem('authToken', authToken);
        currentUser = data.user;
        
        showToast('Login successful!', 'success');
        showScreen('dashboard');
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function register(fullName, email, phone, password) {
    try {
        const data = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                full_name: fullName,
                email,
                phone,
                password
            })
        });
        
        authToken = data.access_token;
        localStorage.setItem('authToken', authToken);
        
        showToast('Account created successfully!', 'success');
        showScreen('dashboard');
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showScreen('login');
    showToast('Logged out successfully', 'info');
}

// Dashboard Functions
async function loadDashboard() {
    try {
        // Load dashboard data
        const dashboardData = await apiRequest('/api/dashboard');
        
        // Update user info
        document.getElementById('userName').textContent = dashboardData.user.full_name;
        document.getElementById('kycStatus').textContent = dashboardData.user.kyc_status;
        
        // Update balance
        document.getElementById('totalBalance').textContent = formatCurrency(dashboardData.total_balance);
        
        // Update stats
        document.getElementById('recentTxCount').textContent = dashboardData.recent_transactions_count;
        document.getElementById('alertCount').textContent = dashboardData.unread_alerts_count;
        document.getElementById('alertBadge').textContent = dashboardData.unread_alerts_count;
        
        // Load accounts
        await loadAccounts();
        
        // Load recent transactions
        await loadTransactions();
        
    } catch (error) {
        showToast('Failed to load dashboard', 'error');
        console.error(error);
    }
}

async function loadAccounts() {
    try {
        const accounts = await apiRequest('/api/accounts');
        const accountsList = document.getElementById('accountsList');
        
        if (accounts.length === 0) {
            accountsList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No accounts found</p>
                </div>
            `;
            return;
        }
        
        accountsList.innerHTML = accounts.map(account => `
            <div class="account-item">
                <div class="account-info">
                    <div class="account-type">${account.account_type} Account</div>
                    <div class="account-number">${account.account_number}</div>
                </div>
                <div class="account-balance">
                    ${formatCurrency(account.balance)}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load accounts:', error);
    }
}

async function loadTransactions(limit = 5) {
    try {
        const transactions = await apiRequest(`/api/transactions?limit=${limit}`);
        const transactionsList = document.getElementById('recentTransactions');
        
        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No recent transactions</p>
                </div>
            `;
            return;
        }
        
        transactionsList.innerHTML = transactions.map(tx => {
            const isReceived = tx.transaction_type === 'DEPOSIT' || 
                              (tx.transaction_type === 'TRANSFER' && tx.receiver_account_id);
            const amountClass = isReceived ? 'amount-positive' : 'amount-negative';
            const amountPrefix = isReceived ? '+' : '-';
            
            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-type">${tx.transaction_type}</div>
                        <div class="transaction-date">${formatDate(tx.created_at)}</div>
                    </div>
                    <div class="transaction-amount ${amountClass}">
                        ${amountPrefix}${formatCurrency(tx.amount)}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Failed to load transactions:', error);
    }
}

async function loadSecurityAlerts() {
    try {
        const alerts = await apiRequest('/api/security-alerts?limit=20');
        const alertsList = document.getElementById('alertsList');
        
        if (alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <p>No security alerts</p>
                </div>
            `;
            return;
        }
        
        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item severity-${alert.severity.toLowerCase()} ${!alert.is_read ? 'unread' : ''}" 
                 data-alert-id="${alert.alert_id}">
                <div class="alert-info">
                    <div class="alert-type">${alert.alert_type.replace(/_/g, ' ')}</div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${formatDate(alert.created_at)}</div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers to mark as read
        document.querySelectorAll('.alert-item.unread').forEach(item => {
            item.addEventListener('click', async () => {
                const alertId = item.dataset.alertId;
                try {
                    await apiRequest(`/api/security-alerts/${alertId}/mark-read`, {
                        method: 'POST'
                    });
                    item.classList.remove('unread');
                    await loadDashboard(); // Refresh badge count
                } catch (error) {
                    console.error('Failed to mark alert as read:', error);
                }
            });
        });
        
    } catch (error) {
        console.error('Failed to load alerts:', error);
    }
}

async function transferMoney(receiverAccount, amount, description) {
    try {
        const data = await apiRequest('/api/transfer', {
            method: 'POST',
            body: JSON.stringify({
                receiver_account_number: receiverAccount,
                amount: parseFloat(amount),
                description
            })
        });
        
        showToast(`Transfer successful! Reference: ${data.reference_number}`, 'success');
        hideModal('transfer');
        forms.transfer.reset();
        
        // Reload dashboard
        await loadDashboard();
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    if (authToken) {
        showScreen('dashboard');
        loadDashboard();
    } else {
        showScreen('login');
    }
    
    // Login form
    forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
    });
    
    // Register form
    forms.register.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const phone = document.getElementById('registerPhone').value;
        const password = document.getElementById('registerPassword').value;
        await register(fullName, email, phone, password);
    });
    
    // Transfer form
    forms.transfer.addEventListener('submit', async (e) => {
        e.preventDefault();
        const receiverAccount = document.getElementById('receiverAccount').value;
        const amount = document.getElementById('transferAmount').value;
        const description = document.getElementById('transferDescription').value;
        await transferMoney(receiverAccount, amount, description);
    });
    
    // Show register screen
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register');
    });
    
    // Show login screen
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('login');
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Send money button
    document.getElementById('sendMoneyBtn').addEventListener('click', () => {
        showModal('transfer');
    });
    
    // View transactions button
    document.getElementById('viewTransactionsBtn').addEventListener('click', async () => {
        await loadTransactions(20);
    });
    
    // View accounts button
    document.getElementById('viewAccountsBtn').addEventListener('click', async () => {
        await loadAccounts();
    });
    
    // View all transactions button
    document.getElementById('viewAllTxBtn').addEventListener('click', async () => {
        await loadTransactions(20);
    });
    
    // Alerts button
    document.getElementById('alertsBtn').addEventListener('click', async () => {
        showModal('alerts');
        await loadSecurityAlerts();
    });
    
    // Close modals
    document.getElementById('closeTransferModal').addEventListener('click', () => {
        hideModal('transfer');
    });
    
    document.getElementById('closeAlertsModal').addEventListener('click', () => {
        hideModal('alerts');
    });
    
    // Close modals on outside click
    Object.values(modals).forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (authToken && screens.dashboard.classList.contains('active')) {
        loadDashboard();
    }
}, 30000);
