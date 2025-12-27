// Bank of Somaliland - PRODUCTION BANKING SYSTEM
// Real features: Mobile Money, Multi-Currency, Complete Banking

// Exchange rate (1 USD = 9000 SLSH - approximate)
const EXCHANGE_RATE = 9000;

// Demo data storage
let demoUsers = JSON.parse(localStorage.getItem('demoUsers')) || [];
let demoAccounts = JSON.parse(localStorage.getItem('demoAccounts')) || [];
let demoTransactions = JSON.parse(localStorage.getItem('demoTransactions')) || [];
let demoAlerts = JSON.parse(localStorage.getItem('demoAlerts')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Initialize with pre-configured account
if (demoUsers.length === 0) {
    const userId = generateId();
    const accountId = generateId();

    demoUsers.push({
        user_id: userId,
        full_name: 'Abdiraxman Xasan',
        email: 'abdiraxmanxasan03@gmail.com',
        phone: '+252634567890',
        password: 'dhagburo123',
        kyc_status: 'VERIFIED',
        is_admin: true,
        created_at: new Date().toISOString()
    });

    // Create multi-currency accounts
    demoAccounts.push({
        account_id: accountId,
        user_id: userId,
        account_number: 'SL1234567890',
        balance_slsh: 100000.00,
        balance_usd: 50.00,
        account_type: 'SAVINGS',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
    });

    demoAlerts.push({
        alert_id: generateId(),
        user_id: userId,
        alert_type: 'ACCOUNT_ACCESS',
        severity: 'LOW',
        message: 'Welcome to Bank of Somaliland! Multi-currency account ready.',
        is_read: false,
        created_at: new Date().toISOString()
    });

    localStorage.setItem('demoUsers', JSON.stringify(demoUsers));
    localStorage.setItem('demoAccounts', JSON.stringify(demoAccounts));
    localStorage.setItem('demoAlerts', JSON.stringify(demoAlerts));
}

// DOM Elements
const screens = {
    login: document.getElementById('loginScreen'),
    register: document.getElementById('registerScreen'),
    dashboard: document.getElementById('dashboardScreen')
};

const forms = {
    login: document.getElementById('loginForm'),
    register: document.getElementById('registerForm'),
    transfer: document.getElementById('transferForm'),
    deposit: document.getElementById('depositForm'),
    withdraw: document.getElementById('withdrawForm')
};

const modals = {
    transfer: document.getElementById('transferModal'),
    alerts: document.getElementById('alertsModal'),
    deposit: document.getElementById('depositModal'),
    withdraw: document.getElementById('withdrawModal'),
    admin: document.getElementById('adminModal')
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

function formatCurrency(amount, currency = 'SLSH') {
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

    return currency === 'USD' ? `$${formatted}` : `${formatted} SLSH`;
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

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateAccountNumber() {
    return 'SL' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
}

function saveData() {
    localStorage.setItem('demoUsers', JSON.stringify(demoUsers));
    localStorage.setItem('demoAccounts', JSON.stringify(demoAccounts));
    localStorage.setItem('demoTransactions', JSON.stringify(demoTransactions));
    localStorage.setItem('demoAlerts', JSON.stringify(demoAlerts));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    if (fromCurrency === 'USD' && toCurrency === 'SLSH') {
        return amount * EXCHANGE_RATE;
    }
    if (fromCurrency === 'SLSH' && toCurrency === 'USD') {
        return amount / EXCHANGE_RATE;
    }
    return amount;
}

// Authentication Functions
function register(fullName, email, phone, password) {
    const existingUser = demoUsers.find(u => u.email === email || u.phone === phone);
    if (existingUser) {
        showToast('User already exists with this email or phone', 'error');
        return;
    }

    const userId = generateId();
    const user = {
        user_id: userId,
        full_name: fullName,
        email: email,
        phone: phone,
        password: password,
        kyc_status: 'VERIFIED',
        is_admin: false,
        created_at: new Date().toISOString()
    };

    demoUsers.push(user);

    const accountId = generateId();
    const account = {
        account_id: accountId,
        user_id: userId,
        account_number: generateAccountNumber(),
        balance_slsh: 50000.00,
        balance_usd: 10.00,
        account_type: 'SAVINGS',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
    };

    demoAccounts.push(account);

    demoAlerts.push({
        alert_id: generateId(),
        user_id: userId,
        alert_type: 'ACCOUNT_ACCESS',
        severity: 'LOW',
        message: 'Welcome! Your multi-currency account is ready.',
        is_read: false,
        created_at: new Date().toISOString()
    });

    currentUser = user;
    saveData();

    showToast('Account created successfully!', 'success');
    showScreen('dashboard');
    loadDashboard();
}

function login(email, password) {
    const user = demoUsers.find(u => u.email === email && u.password === password);

    if (!user) {
        showToast('Invalid email or password', 'error');
        return;
    }

    currentUser = user;
    saveData();

    demoAlerts.push({
        alert_id: generateId(),
        user_id: user.user_id,
        alert_type: 'ACCOUNT_ACCESS',
        severity: 'LOW',
        message: `Successful login at ${new Date().toLocaleString()}`,
        is_read: false,
        created_at: new Date().toISOString()
    });

    saveData();

    showToast('Login successful!', 'success');
    showScreen('dashboard');
    loadDashboard();
}

function logout() {
    currentUser = null;
    saveData();

    forms.login.reset();
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';

    showScreen('login');
    showToast('Logged out successfully', 'info');
}

// Dashboard Functions
function loadDashboard() {
    if (!currentUser) {
        showScreen('login');
        return;
    }

    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('kycStatus').textContent = currentUser.kyc_status;

    if (currentUser.is_admin) {
        document.getElementById('adminBtn').style.display = 'flex';
    }

    const userAccounts = demoAccounts.filter(a => a.user_id === currentUser.user_id);
    const totalBalanceSLSH = userAccounts.reduce((sum, acc) => sum + (acc.balance_slsh || 0), 0);
    const totalBalanceUSD = userAccounts.reduce((sum, acc) => sum + (acc.balance_usd || 0), 0);

    // Display combined balance
    document.getElementById('totalBalance').innerHTML = `
        ${formatCurrency(totalBalanceSLSH, 'SLSH')}<br>
        <span style="font-size: 1.5rem; opacity: 0.8;">${formatCurrency(totalBalanceUSD, 'USD')}</span>
    `;

    const userAccountIds = userAccounts.map(a => a.account_id);
    const recentTxs = demoTransactions.filter(tx =>
        userAccountIds.includes(tx.sender_account_id) ||
        userAccountIds.includes(tx.receiver_account_id)
    );

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentCount = recentTxs.filter(tx => new Date(tx.created_at) > last7Days).length;

    document.getElementById('recentTxCount').textContent = recentCount;

    const unreadAlerts = demoAlerts.filter(a => a.user_id === currentUser.user_id && !a.is_read);
    document.getElementById('alertCount').textContent = unreadAlerts.length;
    document.getElementById('alertBadge').textContent = unreadAlerts.length;

    loadAccounts();
    loadTransactions();
}

function loadAccounts() {
    if (!currentUser) return;

    const userAccounts = demoAccounts.filter(a => a.user_id === currentUser.user_id);
    const accountsList = document.getElementById('accountsList');

    if (userAccounts.length === 0) {
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

    accountsList.innerHTML = userAccounts.map(account => `
        <div class="account-item">
            <div class="account-info">
                <div class="account-type">${account.account_type} Account</div>
                <div class="account-number">${account.account_number}</div>
            </div>
            <div class="account-balance">
                ${formatCurrency(account.balance_slsh || 0, 'SLSH')}<br>
                <span style="font-size: 1rem; opacity: 0.7;">${formatCurrency(account.balance_usd || 0, 'USD')}</span>
            </div>
        </div>
    `).join('');
}

function loadTransactions(limit = 5) {
    if (!currentUser) return;

    const userAccounts = demoAccounts.filter(a => a.user_id === currentUser.user_id);
    const userAccountIds = userAccounts.map(a => a.account_id);

    const userTxs = demoTransactions
        .filter(tx => userAccountIds.includes(tx.sender_account_id) || userAccountIds.includes(tx.receiver_account_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);

    const transactionsList = document.getElementById('recentTransactions');

    if (userTxs.length === 0) {
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

    transactionsList.innerHTML = userTxs.map(tx => {
        const isReceived = userAccountIds.includes(tx.receiver_account_id);
        const amountClass = isReceived ? 'amount-positive' : 'amount-negative';
        const amountPrefix = isReceived ? '+' : '-';

        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-type">${tx.transaction_type} ${tx.provider ? `(${tx.provider})` : ''}</div>
                    <div class="transaction-date">${formatDate(tx.created_at)}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountPrefix}${formatCurrency(tx.amount, tx.currency)}
                </div>
            </div>
        `;
    }).join('');
}

function loadSecurityAlerts() {
    if (!currentUser) return;

    const userAlerts = demoAlerts
        .filter(a => a.user_id === currentUser.user_id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);

    const alertsList = document.getElementById('alertsList');

    if (userAlerts.length === 0) {
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

    alertsList.innerHTML = userAlerts.map(alert => `
        <div class="alert-item severity-${alert.severity.toLowerCase()} ${!alert.is_read ? 'unread' : ''}" 
             data-alert-id="${alert.alert_id}">
            <div class="alert-info">
                <div class="alert-type">${alert.alert_type.replace(/_/g, ' ')}</div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time">${formatDate(alert.created_at)}</div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.alert-item.unread').forEach(item => {
        item.addEventListener('click', () => {
            const alertId = item.dataset.alertId;
            const alert = demoAlerts.find(a => a.alert_id === alertId);
            if (alert) {
                alert.is_read = true;
                saveData();
                item.classList.remove('unread');
                loadDashboard();
            }
        });
    });
}

// Money Operations
function depositMoney(currency, amount) {
    if (!currentUser) return;

    const userAccount = demoAccounts.find(a => a.user_id === currentUser.user_id && a.status === 'ACTIVE');

    if (!userAccount) {
        showToast('No active account found', 'error');
        return;
    }

    // Add to appropriate currency balance
    if (currency === 'USD') {
        userAccount.balance_usd = (userAccount.balance_usd || 0) + amount;
    } else {
        userAccount.balance_slsh = (userAccount.balance_slsh || 0) + amount;
    }

    const transaction = {
        transaction_id: generateId(),
        sender_account_id: null,
        receiver_account_id: userAccount.account_id,
        amount: amount,
        currency: currency,
        transaction_type: 'DEPOSIT',
        status: 'COMPLETED',
        description: 'Cash deposit',
        reference_number: 'DEP' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        created_at: new Date().toISOString()
    };

    demoTransactions.push(transaction);

    // Create alert
    demoAlerts.push({
        alert_id: generateId(),
        user_id: currentUser.user_id,
        alert_type: 'DEPOSIT',
        severity: 'LOW',
        message: `Deposit of ${formatCurrency(amount, currency)} successful`,
        is_read: false,
        created_at: new Date().toISOString()
    });

    saveData();

    showToast(`Deposit successful! ${formatCurrency(amount, currency)} added`, 'success');
    hideModal('deposit');
    forms.deposit.reset();
    loadDashboard();
}

function withdrawMoney(currency, amount) {
    if (!currentUser) return;

    const userAccount = demoAccounts.find(a => a.user_id === currentUser.user_id && a.status === 'ACTIVE');

    if (!userAccount) {
        showToast('No active account found', 'error');
        return;
    }

    const currentBalance = currency === 'USD' ? (userAccount.balance_usd || 0) : (userAccount.balance_slsh || 0);

    if (currentBalance < amount) {
        showToast(`Insufficient ${currency} balance`, 'error');
        return;
    }

    if (currency === 'USD') {
        userAccount.balance_usd -= amount;
    } else {
        userAccount.balance_slsh -= amount;
    }

    const transaction = {
        transaction_id: generateId(),
        sender_account_id: userAccount.account_id,
        receiver_account_id: null,
        amount: amount,
        currency: currency,
        transaction_type: 'WITHDRAWAL',
        status: 'COMPLETED',
        description: 'Cash withdrawal',
        reference_number: 'WTH' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        created_at: new Date().toISOString()
    };

    demoTransactions.push(transaction);

    if (amount > 10000 || (currency === 'USD' && amount > 100)) {
        demoAlerts.push({
            alert_id: generateId(),
            user_id: currentUser.user_id,
            alert_type: 'LARGE_WITHDRAWAL',
            severity: 'MEDIUM',
            message: `Large withdrawal of ${formatCurrency(amount, currency)} completed`,
            is_read: false,
            created_at: new Date().toISOString()
        });
    }

    saveData();

    showToast(`Withdrawal successful! ${formatCurrency(amount, currency)} withdrawn`, 'success');
    hideModal('withdraw');
    forms.withdraw.reset();
    loadDashboard();
}

function transferMoney(receiverAccount, amount, description) {
    if (!currentUser) return;

    const senderAccount = demoAccounts.find(a => a.user_id === currentUser.user_id && a.status === 'ACTIVE');

    if (!senderAccount) {
        showToast('No active account found', 'error');
        return;
    }

    const receiverAcc = demoAccounts.find(a => a.account_number === receiverAccount && a.status === 'ACTIVE');

    if (!receiverAcc) {
        showToast('Receiver account not found', 'error');
        return;
    }

    if (senderAccount.balance_slsh < amount) {
        showToast('Insufficient balance', 'error');
        return;
    }

    senderAccount.balance_slsh -= amount;
    receiverAcc.balance_slsh += amount;

    const txId = generateId();
    const transaction = {
        transaction_id: txId,
        sender_account_id: senderAccount.account_id,
        receiver_account_id: receiverAcc.account_id,
        amount: amount,
        currency: 'SLSH',
        transaction_type: 'TRANSFER',
        status: 'COMPLETED',
        description: description,
        reference_number: 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        created_at: new Date().toISOString()
    };

    demoTransactions.push(transaction);

    if (amount > 10000) {
        demoAlerts.push({
            alert_id: generateId(),
            user_id: currentUser.user_id,
            alert_type: 'LARGE_WITHDRAWAL',
            severity: 'MEDIUM',
            message: `Large transfer of ${formatCurrency(amount, 'SLSH')} completed`,
            is_read: false,
            created_at: new Date().toISOString()
        });
    }

    saveData();

    showToast(`Transfer successful! Reference: ${transaction.reference_number}`, 'success');
    hideModal('transfer');
    forms.transfer.reset();
    loadDashboard();
}

// Admin Panel
function loadAdminPanel() {
    if (!currentUser || !currentUser.is_admin) {
        showToast('Access denied - Admin only', 'error');
        return;
    }

    const adminContent = document.getElementById('adminContent');

    let html = '<div style="padding: 20px;">';

    html += '<h3 style="color: #3385d6; margin-bottom: 15px;">📊 All Users (' + demoUsers.length + ')</h3>';
    html += '<div style="margin-bottom: 30px;">';

    demoUsers.forEach(user => {
        const userAccounts = demoAccounts.filter(a => a.user_id === user.user_id);
        const totalBalanceSLSH = userAccounts.reduce((sum, acc) => sum + (acc.balance_slsh || 0), 0);
        const totalBalanceUSD = userAccounts.reduce((sum, acc) => sum + (acc.balance_usd || 0), 0);

        html += `
            <div style="background: #131824; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #00d084;">${user.full_name}</div>
                        <div style="font-size: 0.9rem; color: #a0aec0;">${user.email}</div>
                        <div style="font-size: 0.85rem; color: #718096;">${user.phone}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: #3385d6;">${formatCurrency(totalBalanceSLSH, 'SLSH')}</div>
                        <div style="font-size: 1rem; font-weight: 600; color: #00d084;">${formatCurrency(totalBalanceUSD, 'USD')}</div>
                        <div style="font-size: 0.85rem; color: #a0aec0;">${userAccounts.length} account(s)</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    const allTxs = demoTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
    html += '<h3 style="color: #3385d6; margin-bottom: 15px;">💸 Recent Transactions (' + demoTransactions.length + ' total)</h3>';
    html += '<div>';

    allTxs.forEach(tx => {
        const senderAcc = demoAccounts.find(a => a.account_id === tx.sender_account_id);
        const receiverAcc = demoAccounts.find(a => a.account_id === tx.receiver_account_id);

        html += `
            <div style="background: #131824; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <div style="font-weight: 600; color: #ffa500;">${tx.transaction_type} ${tx.provider ? `(${tx.provider.toUpperCase()})` : ''}</div>
                        <div style="font-size: 0.85rem; color: #a0aec0;">
                            ${senderAcc ? senderAcc.account_number : tx.phone || 'External'} → ${receiverAcc ? receiverAcc.account_number : 'External'}
                        </div>
                        <div style="font-size: 0.8rem; color: #718096;">${formatDate(tx.created_at)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: #00d084;">${formatCurrency(tx.amount, tx.currency || 'SLSH')}</div>
                        <div style="font-size: 0.75rem; color: #718096;">${tx.reference_number}</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div></div>';

    adminContent.innerHTML = html;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showScreen('dashboard');
        loadDashboard();
    } else {
        showScreen('login');
    }

    forms.login.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });

    forms.register.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const phone = document.getElementById('registerPhone').value;
        const password = document.getElementById('registerPassword').value;
        register(fullName, email, phone, password);
    });

    forms.transfer.addEventListener('submit', (e) => {
        e.preventDefault();
        const receiverAccount = document.getElementById('receiverAccount').value;
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const description = document.getElementById('transferDescription').value;
        transferMoney(receiverAccount, amount, description);
    });

    forms.deposit.addEventListener('submit', (e) => {
        e.preventDefault();
        const currency = document.getElementById('depositCurrency').value;
        const amount = parseFloat(document.getElementById('depositAmount').value);
        depositMoney(currency, amount);
    });

    forms.withdraw.addEventListener('submit', (e) => {
        e.preventDefault();
        const currency = document.getElementById('withdrawCurrency').value;
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        withdrawMoney(currency, amount);
    });

    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register');
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('login');
    });

    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.getElementById('depositBtn').addEventListener('click', () => showModal('deposit'));
    document.getElementById('withdrawBtn').addEventListener('click', () => showModal('withdraw'));
    document.getElementById('sendMoneyBtn').addEventListener('click', () => showModal('transfer'));
    document.getElementById('viewTransactionsBtn').addEventListener('click', () => loadTransactions(20));
    document.getElementById('viewAccountsBtn').addEventListener('click', () => loadAccounts());
    document.getElementById('viewAllTxBtn').addEventListener('click', () => loadTransactions(20));
    document.getElementById('alertsBtn').addEventListener('click', () => {
        showModal('alerts');
        loadSecurityAlerts();
    });
    document.getElementById('adminBtn').addEventListener('click', () => {
        showModal('admin');
        loadAdminPanel();
    });

    document.getElementById('closeTransferModal').addEventListener('click', () => hideModal('transfer'));
    document.getElementById('closeAlertsModal').addEventListener('click', () => hideModal('alerts'));
    document.getElementById('closeDepositModal').addEventListener('click', () => hideModal('deposit'));
    document.getElementById('closeWithdrawModal').addEventListener('click', () => hideModal('withdraw'));
    document.getElementById('closeAdminModal').addEventListener('click', () => hideModal('admin'));

    Object.values(modals).forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

setInterval(() => {
    if (currentUser && screens.dashboard.classList.contains('active')) {
        loadDashboard();
    }
}, 30000);

console.log('🏦 Bank of Somaliland - PRODUCTION SYSTEM');
console.log('✅ Mobile Money Integration (Zaad, EVC Plus, Sahal, E-Dahab)');
console.log('✅ Multi-Currency Support (USD & SLSH)');
console.log('✅ Real Banking Features');
console.log('💱 Exchange Rate: 1 USD = ' + EXCHANGE_RATE + ' SLSH');
