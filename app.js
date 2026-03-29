// 1. Initial State DB (V2)
const initDB = {
    accounts: [
        { id: 1, name: 'Billetera Principal', currency: 'USD', balance: 1222.00 }
    ],
    categories: [
        { id: 1, name: 'Comestibles', type: 'expense', visual_color: '#B23A1E', icon: 'fa-shopping-basket', budget: 500 },
        { id: 2, name: 'Sueldo', type: 'income', visual_color: '#005F56', icon: 'fa-briefcase', budget: 0 },
        { id: 3, name: 'Facturas', type: 'expense', visual_color: '#2B2B2B', icon: 'fa-file-invoice-dollar', budget: 0 },
        { id: 4, name: 'Lienzos', type: 'expense', visual_color: '#DDA629', icon: 'fa-masks-theater', budget: 100 }
    ],
    transactions: [],
    goals: [
        { id: 1, name: 'Fondo Europeo', target: 5000, current: 2300, icon: 'fa-plane', account_id: null }
    ]
};

let db = JSON.parse(localStorage.getItem('schiele_db')) || initDB;
// Patches for backward compatibility
db.transactions.forEach(t => { if(!t.type) t.type = 'standard'; });
db.categories.forEach(c => { if(c.budget === undefined) c.budget = 0; });

let currentType = 'expense';
let currentAnalyticsFilter = 'all';

// DOM Elements
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const accountsCarousel = document.getElementById('accounts-carousel');
const transactionsList = document.getElementById('transactions-list');
const savingsList = document.getElementById('savings-list');

const txModal = document.getElementById('transaction-modal');
const txForm = document.getElementById('transaction-form');
const catSelect = document.getElementById('category');
const accSelect = document.getElementById('tx-account');

const accModal = document.getElementById('account-modal');
const accForm = document.getElementById('account-form');
const catModal = document.getElementById('category-modal');
const catForm = document.getElementById('category-form');

const transferModal = document.getElementById('transfer-modal');
const transferForm = document.getElementById('transfer-form');
const targetFrom = document.getElementById('trans-from');
const targetTo = document.getElementById('trans-to');

const goalModal = document.getElementById('goal-modal');
const goalForm = document.getElementById('goal-form');
const fundGoalModal = document.getElementById('fund-goal-modal');
const fundGoalForm = document.getElementById('fund-goal-form');

// Nav Logic
navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        btn.classList.add('active');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(btn.dataset.target).classList.add('active');
        if(btn.dataset.target === 'view-analytics') renderAnalytics();
    });
});

window.toggleAnalyticsFilter = function(type) {
    if(currentAnalyticsFilter === type) currentAnalyticsFilter = 'all';
    else currentAnalyticsFilter = type;
    
    // Always clear sub-filter when switching main tab to avoid confusion
    const subFilterSelect = document.getElementById('analytics-sub-filter');
    subFilterSelect.dataset.type = 'none';
    
    renderAnalytics();
}

// Transaction Helpers
function renderTransactionHTML(tx) {
    if(tx.type === 'transfer') {
        const fAcc = db.accounts.find(a => a.id === tx.from_account_id) || {name: '?'};
        const tAcc = db.accounts.find(a => a.id === tx.to_account_id) || {name: '?'};
        return `
        <div class="transaction-item" onclick="openEditDispatcher('${tx.id}')" style="cursor: pointer;">
            <div class="t-left">
                <div class="t-icon" style="background-color: var(--text-secondary); color: var(--bg-primary);"><i class="fas fa-exchange-alt"></i></div>
                <div>
                    <span class="t-cat" style="font-size: 1.1rem;">Transferencia</span>
                    <span class="t-date">${new Date(tx.date).toLocaleDateString()} &bull; ${fAcc.name} ➔ ${tAcc.name}</span>
                </div>
            </div>
            <div class="t-amount" style="color: var(--text-secondary)">$${(tx.amount_extracted||0).toFixed(2)}</div>
        </div>`;
    } else {
        const cat = db.categories.find(c => c.id === tx.category_id) || {name: 'Borrada', type: 'expense', visual_color: '#000', icon: 'fa-ghost'};
        const sign = cat.type === 'income' ? '+' : '-';
        const cssClass = cat.type === 'income' ? 'amount-income' : 'amount-expense';
        const acc = db.accounts.find(a => a.id === tx.account_id) || {name: 'Desaparecida'};
        return `
        <div class="transaction-item" onclick="openEditDispatcher('${tx.id}')" style="cursor: pointer;">
            <div class="t-left">
                <div class="t-icon" style="background-color: ${cat.visual_color}"><i class="fas ${cat.icon}"></i></div>
                <div>
                    <span class="t-cat">${cat.name}</span>
                    <span class="t-date">${new Date(tx.date).toLocaleDateString()} &bull; ${acc.name}</span>
                </div>
            </div>
            <div class="t-amount ${cssClass}">${sign}${(tx.amount||0).toFixed(2)}</div>
        </div>`;
    }
}

// Universal Edit Dispatcher
window.openEditDispatcher = function(id) {
    const tx = db.transactions.find(t => t.id === id);
    if(tx.type === 'transfer') openTransferModal(tx.id);
    else {
        const cat = db.categories.find(c => c.id === tx.category_id) || {type: 'expense'};
        openModal(cat.type, tx.id);
    }
}


// Modals: Transactions (Income/Expense/Transfers)
window.openModal = function(type, txId = null) {
    currentType = type;
    document.getElementById('modal-title').textContent = txId ? 'Retocar Trazo' : (type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso');
    accSelect.innerHTML = db.accounts.map(a => `<option value="${a.id}">${a.name} (${a.currency})</option>`).join('');
    catSelect.innerHTML = db.categories.filter(c => c.type === type).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    if (txId) {
        const tx = db.transactions.find(t => t.id === txId);
        document.getElementById('tx-edit-id').value = tx.id;
        document.getElementById('date').value = tx.date.split('T')[0];
        document.getElementById('amount').value = tx.amount;
        document.getElementById('notes').value = tx.notes || '';
        accSelect.value = tx.account_id;
        catSelect.value = tx.category_id;
        document.getElementById('tx-save-btn').textContent = "Aplicar Retoque";
        document.getElementById('tx-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('tx-edit-id').value = "";
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        document.getElementById('tx-save-btn').textContent = "Sellar en Lienzo";
        document.getElementById('tx-delete-btn').classList.add('hidden');
    }
    txModal.classList.remove('hidden');
};
document.getElementById('close-modal').addEventListener('click', () => { txModal.classList.add('hidden'); txForm.reset(); });

txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('tx-edit-id').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const accId = parseInt(accSelect.value);
    const catId = parseInt(catSelect.value);
    const dateVal = document.getElementById('date').value + "T12:00:00.000Z";

    if (editId) {
        const oldTx = db.transactions.find(t => t.id === editId);
        const oldAcc = db.accounts.find(a => a.id === oldTx.account_id);
        const oldCat = db.categories.find(c => c.id === oldTx.category_id) || {type: currentType};
        if(oldCat.type === 'expense') oldAcc.balance += oldTx.amount; else oldAcc.balance -= oldTx.amount;
        
        oldTx.amount = amount; oldTx.account_id = accId; oldTx.category_id = catId; 
        oldTx.date = dateVal; oldTx.notes = document.getElementById('notes').value;
    } else {
        db.transactions.push({
            id: crypto.randomUUID(), type: 'standard', account_id: accId, category_id: catId, amount: amount,
            date: dateVal, notes: document.getElementById('notes').value
        });
    }

    const acc = db.accounts.find(a => a.id === accId);
    if(currentType === 'expense') acc.balance -= amount; else acc.balance += amount;
    
    saveDB(); txModal.classList.add('hidden'); txForm.reset(); renderHome(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
});

window.deleteCurrentTx = function() {
    const editId = document.getElementById('tx-edit-id').value;
    if(!editId) return;
    if(confirm("¿Estás seguro de blanquear este trazo?")) {
        const oldTx = db.transactions.find(t => t.id === editId);
        const oldAcc = db.accounts.find(a => a.id === oldTx.account_id);
        const oldCat = db.categories.find(c => c.id === oldTx.category_id) || {type: 'expense'};
        
        if(oldCat.type === 'expense') oldAcc.balance += oldTx.amount; 
        else oldAcc.balance -= oldTx.amount;

        db.transactions = db.transactions.filter(t => t.id !== editId);
        saveDB(); txModal.classList.add('hidden'); txForm.reset(); renderHome(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
    }
}


// Transfers Modal
window.openTransferModal = (txId = null, preselectToAccountId = null) => {
    targetFrom.innerHTML = db.accounts.map(a => `<option value="${a.id}">${a.name} ($${a.balance.toFixed(2)} ${a.currency})</option>`).join('');
    targetTo.innerHTML = db.accounts.map(a => `<option value="${a.id}">${a.name} (${a.currency})</option>`).join('');
    
    if (txId) {
        const tx = db.transactions.find(t => t.id === txId);
        document.getElementById('trans-edit-id').value = tx.id;
        document.getElementById('trans-date').value = tx.date.split('T')[0];
        targetFrom.value = tx.from_account_id;
        targetTo.value = tx.to_account_id;
        document.getElementById('trans-amount').value = tx.amount_extracted;
        document.getElementById('trans-received').value = tx.amount_received;
        
        document.getElementById('transfer-modal-h2').textContent = "Retocar Transferencia";
        document.getElementById('trans-save-btn').textContent = "Aplicar Retoque";
        document.getElementById('trans-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('trans-edit-id').value = "";
        document.getElementById('trans-date').value = new Date().toISOString().split('T')[0];
        if (preselectToAccountId) targetTo.value = preselectToAccountId;
        document.getElementById('transfer-modal-h2').textContent = "Transferencia Divina";
        document.getElementById('trans-save-btn').textContent = "Ejecutar Flujo";
        document.getElementById('trans-delete-btn').classList.add('hidden');
    }
    transferModal.classList.remove('hidden');
};
window.closeTransferModal = () => { transferModal.classList.add('hidden'); transferForm.reset(); };
transferForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('trans-edit-id').value;
    const fromId = parseInt(targetFrom.value);
    const toId = parseInt(targetTo.value);
    const amountExtracted = parseFloat(document.getElementById('trans-amount').value);
    const amountReceived = parseFloat(document.getElementById('trans-received').value);
    const dateVal = document.getElementById('trans-date').value + "T12:00:00.000Z";

    if(fromId === toId) return alert("Pincelada redundante: La misma bóveda de origen y destino.");
    const fromAcc = db.accounts.find(a => a.id === fromId);
    const toAcc = db.accounts.find(a => a.id === toId);

    if (editId) {
        const oldTx = db.transactions.find(t => t.id === editId);
        const oldFrom = db.accounts.find(a => a.id === oldTx.from_account_id);
        const oldTo = db.accounts.find(a => a.id === oldTx.to_account_id);
        
        if(oldFrom) oldFrom.balance += oldTx.amount_extracted;
        if(oldTo) oldTo.balance -= oldTx.amount_received;

        oldTx.from_account_id = fromId; oldTx.to_account_id = toId;
        oldTx.amount_extracted = amountExtracted; oldTx.amount_received = amountReceived;
        oldTx.date = dateVal;
    } else {
        db.transactions.push({
            id: crypto.randomUUID(), type: 'transfer', from_account_id: fromId, to_account_id: toId,
            amount_extracted: amountExtracted, amount_received: amountReceived, date: dateVal
        });
    }

    fromAcc.balance -= amountExtracted;
    toAcc.balance += amountReceived;

    saveDB(); closeTransferModal(); renderHome(); renderSettings(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
});

window.deleteCurrentTransfer = function() {
    const editId = document.getElementById('trans-edit-id').value;
    if(!editId) return;
    if(confirm("¿Desvanecer esta transferencia del historial?")) {
        const oldTx = db.transactions.find(t => t.id === editId);
        const oldFrom = db.accounts.find(a => a.id === oldTx.from_account_id);
        const oldTo = db.accounts.find(a => a.id === oldTx.to_account_id);
        
        if(oldFrom) oldFrom.balance += oldTx.amount_extracted;
        if(oldTo) oldTo.balance -= oldTx.amount_received;

        db.transactions = db.transactions.filter(t => t.id !== editId);
        saveDB(); transferModal.classList.add('hidden'); transferForm.reset(); renderHome(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
    }
}


// Modals Settings: Cuentas y Categorías
window.openAccountModal = () => accModal.classList.remove('hidden');
window.closeAccountModal = () => { accModal.classList.add('hidden'); accForm.reset(); };
accForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const typeMultiplier = document.getElementById('acc-type') ? parseFloat(document.getElementById('acc-type').value) : 1;
    let finalBalance = parseFloat(document.getElementById('acc-balance').value);
    
    // Si la persona ya escribe un negativo, respetamos el signo. Si escribe positivo en 'Deuda', lo hacemos negativo.
    if(typeMultiplier === -1 && finalBalance > 0) finalBalance = -finalBalance;
    if(typeMultiplier === 1 && finalBalance < 0) finalBalance = Math.abs(finalBalance);

    db.accounts.push({
        id: Date.now(), name: document.getElementById('acc-name').value,
        currency: document.getElementById('acc-currency').value, balance: finalBalance
    });
    saveDB(); closeAccountModal(); renderHome(); renderSettings();
});

window.openCategoryModal = (catId = null) => {
    if (catId && typeof catId === 'number') {
        const c = db.categories.find(x => x.id === catId);
        document.getElementById('cat-edit-id').value = c.id;
        document.getElementById('cat-name').value = c.name;
        document.getElementById('cat-type').value = c.type;
        document.getElementById('cat-budget').value = c.budget || "";
        document.getElementById('cat-color').value = c.visual_color;
        document.getElementById('cat-icon').value = c.icon || 'fa-tag';
        
        document.querySelectorAll('#cat-icon-selector i').forEach(i => i.classList.remove('selected'));
        const activeIcon = document.querySelector(`#cat-icon-selector i[data-icon="${c.icon || 'fa-tag'}"]`);
        if(activeIcon) activeIcon.classList.add('selected');

        document.getElementById('modal-title-cat').textContent = "Retocar Categoría";
        document.getElementById('cat-save-btn').textContent = "Aplicar Trazos";
        document.getElementById('cat-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('cat-edit-id').value = "";
        document.getElementById('modal-title-cat').textContent = "Nueva Categoría";
        document.getElementById('cat-save-btn').textContent = "Añadir a la Paleta";
        document.getElementById('cat-delete-btn').classList.add('hidden');
        document.getElementById('cat-budget').value = "";
    }
    catModal.classList.remove('hidden');
};
window.closeCategoryModal = () => { catModal.classList.add('hidden'); catForm.reset(); };

catForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('cat-edit-id').value;
    const name = document.getElementById('cat-name').value;
    const type = document.getElementById('cat-type').value;
    const budgetRaw = document.getElementById('cat-budget').value;
    const budget = budgetRaw ? parseFloat(budgetRaw) : 0;
    const visual_color = document.getElementById('cat-color').value;
    const icon = document.getElementById('cat-icon').value;

    if (editId) {
        const c = db.categories.find(x => x.id === parseInt(editId));
        c.name = name; c.type = type; c.budget = budget; c.visual_color = visual_color; c.icon = icon;
    } else {
        db.categories.push({
            id: Date.now(), name, type, budget, visual_color, icon
        });
    }
    saveDB(); closeCategoryModal(); renderSettings();
    if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
});

window.deleteCurrentCategory = function() {
    const editId = document.getElementById('cat-edit-id').value;
    if(!editId) return;
    if(db.categories.length <= 1) return alert("Pintura destrozada: No puedes destruir tu última categoría.");
    if(confirm("¿Borrar este tinte permanente?")) { 
        db.categories = db.categories.filter(c => c.id !== parseInt(editId)); 
        saveDB(); closeCategoryModal(); renderSettings(); 
        if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
    }
}

// Modals: Metas de Ahorro
window.openGoalModal = (goalId = null) => {
    const goalAccSelect = document.getElementById('goal-account');
    goalAccSelect.innerHTML = '<option value="">-- Sin Vincular (Aporte Manual) --</option>' + 
                              db.accounts.map(a => `<option value="${a.id}">${a.name} (${a.currency})</option>`).join('');

    if (goalId && typeof goalId === 'number') {
        const g = db.goals.find(x => x.id === goalId);
        document.getElementById('goal-edit-id').value = g.id;
        document.getElementById('goal-name').value = g.name;
        document.getElementById('goal-target').value = g.target;
        document.getElementById('goal-account').value = g.account_id || "";
        document.getElementById('goal-icon').value = g.icon || "fa-bullseye";
        
        document.querySelectorAll('#goal-icon-selector i').forEach(i => i.classList.remove('selected'));
        const activeIcon = document.querySelector(`#goal-icon-selector i[data-icon="${g.icon || 'fa-bullseye'}"]`);
        if(activeIcon) activeIcon.classList.add('selected');

        document.getElementById('goal-modal-title').textContent = "Retocar Meta";
        document.getElementById('goal-save-btn').textContent = "Aplicar Trazos";
        document.getElementById('goal-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('goal-edit-id').value = "";
        document.getElementById('goal-modal-title').textContent = "Nuevo Horizonte";
        document.getElementById('goal-save-btn').textContent = "Sellar Meta";
        document.getElementById('goal-delete-btn').classList.add('hidden');
    }
    goalModal.classList.remove('hidden');
};

window.closeGoalModal = () => { goalModal.classList.add('hidden'); goalForm.reset(); };

goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('goal-edit-id').value;
    const name = document.getElementById('goal-name').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    const icon = document.getElementById('goal-icon').value || 'fa-bullseye';
    const rawAccId = document.getElementById('goal-account').value;
    const accId = rawAccId ? parseInt(rawAccId) : null;

    if (editId) {
        const g = db.goals.find(x => x.id === parseInt(editId));
        g.name = name; g.target = target; g.icon = icon; g.account_id = accId;
    } else {
        db.goals.push({ id: Date.now(), name, target, current: 0, icon, account_id: accId });
    }
    saveDB(); closeGoalModal(); renderHome(); renderSettings();
});

window.deleteCurrentGoal = function() {
    const editId = document.getElementById('goal-edit-id').value;
    if(!editId) return;
    if(confirm("¿Abandonar esta visión (Borrar Meta)?")) {
        db.goals = db.goals.filter(g => g.id !== parseInt(editId));
        saveDB(); closeGoalModal(); renderHome(); renderSettings();
    }
}

window.openFundGoalModal = (id) => {
    const goal = db.goals.find(g => g.id === id);
    if(!goal) return;
    document.getElementById('fund-goal-id').value = id;
    document.getElementById('modal-fund-title').textContent = `Aportar a: ${goal.name}`;
    fundGoalModal.classList.remove('hidden');
};
window.closeFundGoalModal = () => { fundGoalModal.classList.add('hidden'); fundGoalForm.reset(); };
fundGoalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('fund-goal-id').value);
    const amt = parseFloat(document.getElementById('fund-amount').value);
    const goal = db.goals.find(g => g.id === id);
    if(goal && !goal.account_id) { goal.current += amt; }
    saveDB(); closeFundGoalModal(); renderHome(); renderSettings();
});

window.deleteAccount = function(id) {
    if(db.accounts.length <= 1) return alert("Pintura destrozada: No puedes destruir tu última bóveda.");
    if(confirm("¿Destruir billetera?")) { db.accounts = db.accounts.filter(a => a.id !== id); saveDB(); renderHome(); renderSettings(); }
}
window.deleteGoal = function(id) {
    if(confirm("¿Rendirte con esta meta?")) { db.goals = db.goals.filter(g => g.id !== id); saveDB(); renderHome(); renderSettings(); }
}

function saveDB() { 
    db.transactions.sort((a,b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('schiele_db', JSON.stringify(db)); 
}


// -- RENDER HTML INTERFACE --
function renderHome() {
    accountsCarousel.innerHTML = db.accounts.map(acc => {
        const balanceColor = acc.balance < 0 ? 'color: var(--action-expense);' : '';
        return `
        <div class="account-card">
            <i class="fas fa-asterisk ac-bg-lines"></i>
            <span class="ac-currency">${acc.currency}</span>
            <h2 class="ac-balance" style="${balanceColor}">${acc.balance.toLocaleString('en-US', {style:'currency', currency: acc.currency})}</h2>
            <p class="ac-name">${acc.name}</p>
        </div>
    `}).join('');

    const recents = db.transactions.slice(0, 10);
    if(recents.length === 0) { transactionsList.innerHTML = '<div class="empty-state">El lienzo está en blanco.</div>'; } 
    else { transactionsList.innerHTML = recents.map(tx => renderTransactionHTML(tx)).join(''); }

    if(db.goals.length === 0) { savingsList.innerHTML = '<div class="empty-state">No hay metas artísticas trazadas.</div>'; }
    else {
        savingsList.innerHTML = db.goals.map(g => {
            const currentAmount = g.account_id ? (db.accounts.find(a => a.id === g.account_id)?.balance || 0) : (g.current || 0);
            const percent = Math.min(100, Math.round((currentAmount / g.target) * 100)) || 0;
            const actionOnClick = g.account_id ? `openTransferModal(null, ${g.account_id})` : `openFundGoalModal(${g.id})`;
            const actionIcon = g.account_id ? "fa-exchange-alt" : "fa-arrow-up";
            
            return `
            <div class="saving-card" onclick="openGoalModal(${g.id})">
                <div class="saving-header">
                    <div class="t-left">
                        <div class="t-icon" style="background-color: #2B2B2B"><i class="fas ${g.icon}"></i></div>
                        <div class="saving-info">
                            <h4>${g.name} ${g.account_id ? '<i class="fas fa-link" style="font-size: 0.7rem; color: var(--text-secondary); margin-left: 5px;" title="Vinculado a Bóveda"></i>' : ''}</h4>
                            <p class="saving-amount">$${currentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} / $${g.target.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    <button class="saving-progress-btn" onclick="event.stopPropagation(); ${actionOnClick}"><i class="fas ${actionIcon}"></i></button>
                </div>
                <div class="saving-progress-container">
                    <div class="saving-progress-bar-wrap">
                        <div class="saving-progress-bar" style="width: ${percent}%; background-color: var(--accent-gold);"></div>
                    </div>
                    <div class="saving-meta">
                        <span>Lienzo llenado</span>
                        <span>${percent}%</span>
                    </div>
                </div>
            </div>
        `}).join('');
    }
    renderSettings();
}

window.renderAnalytics = function() {
    const timeFilter = document.getElementById('analytics-time-filter').value;
    let totalIncome = 0; let totalExpense = 0; let totalTransferred = 0;
    const catTotals = {}; // Stores total spent/gained per category

    const now = new Date();
    const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    const getWeek = d => { const j = new Date(d.getFullYear(), 0, 1); return Math.ceil((((d - j) / 86400000) + j.getDay() + 1) / 7); };

    let timeFilteredHistory = [];

    db.transactions.forEach(tx => {
        const d = new Date(tx.date);
        if(timeFilter === 'day' && !isSameDay(d, now)) return;
        if(timeFilter === 'week' && (d.getFullYear() !== now.getFullYear() || getWeek(d) !== getWeek(now))) return;
        if(timeFilter === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return;
        if(timeFilter === 'year' && d.getFullYear() !== now.getFullYear()) return;

        timeFilteredHistory.push(tx);

        if(tx.type === 'transfer') {
            totalTransferred += tx.amount_extracted;
        } else {
            const cat = db.categories.find(c => c.id === tx.category_id);
            if(!cat) return;
            if(cat.type === 'income') { totalIncome += tx.amount; catTotals[cat.id] = (catTotals[cat.id] || 0) + tx.amount; } 
            else { totalExpense += tx.amount; catTotals[cat.id] = (catTotals[cat.id] || 0) + tx.amount; }
        }
    });
    
    document.getElementById('stat-income').textContent = `$${totalIncome.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('stat-expense').textContent = `$${totalExpense.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('stat-transfer').textContent = `$${totalTransferred.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;

    // Manage UI active styles for stat cards
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-filter'));
    if(currentAnalyticsFilter !== 'all') {
        const activeElem = document.getElementById(`card-${currentAnalyticsFilter}`);
        if(activeElem) activeElem.classList.add('active-filter');
    }

    const subFilterBox = document.getElementById('analytics-sub-filter-box');
    const subFilterSelect = document.getElementById('analytics-sub-filter');

    if (currentAnalyticsFilter === 'expense' || currentAnalyticsFilter === 'income') {
        if(subFilterSelect.dataset.type !== currentAnalyticsFilter) {
            const catsForType = db.categories.filter(c => c.type === currentAnalyticsFilter);
            let opts = '<option value="all">Ver Todas las Categorías</option>';
            catsForType.forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
            subFilterSelect.innerHTML = opts;
            subFilterSelect.dataset.type = currentAnalyticsFilter;
            subFilterSelect.value = 'all'; 
        }
        subFilterBox.classList.remove('hidden');
    } else {
        subFilterBox.classList.add('hidden');
        subFilterSelect.dataset.type = 'none';
        subFilterSelect.value = 'all';
    }

    const activeCatId = (currentAnalyticsFilter === 'expense' || currentAnalyticsFilter === 'income') ? subFilterSelect.value : 'all';
    const rateContainer = document.querySelector('.current-rate');

    if (currentAnalyticsFilter === 'all') {
        const expenseCatsTotal = db.categories.filter(c=>c.type==='expense').map(c=>c.id);
        const sortedCats = Object.keys(catTotals).filter(k => expenseCatsTotal.includes(parseInt(k))).sort((a,b) => catTotals[b] - catTotals[a]);
        
        if(sortedCats.length === 0) {
            rateContainer.innerHTML = '<h3>Distribución de Gastos</h3><div class="empty-state">Lienzo impoluto en este periodo.</div>';
            return;
        }
        let rateHTML = '<h3>Distribución de Gastos</h3><div class="rate-list">';
        sortedCats.forEach(catId => {
            const cat = db.categories.find(c => c.id == catId);
            const amount = catTotals[catId];
            const percent = Math.min(100, Math.round((amount / totalExpense) * 100));
            rateHTML += `
                <div class="rate-item">
                    <div class="rate-info">
                        <div class="t-icon" style="background-color: ${cat.visual_color}; width: 35px; height: 35px; font-size: 1rem; border-radius: 4px;"><i class="fas ${cat.icon}"></i></div>
                        <div class="rate-text">
                            <span class="t-cat" style="font-size: 1.1rem; line-height: 1;">${cat.name}</span>
                            <span class="t-date" style="font-weight: 700; color: var(--text-primary);">${percent}% del espectro total</span>
                        </div>
                    </div>
                    <div class="t-amount amount-expense" style="font-size: 1.1rem;">-$${amount.toFixed(2)}</div>
                </div>
                <div class="progress-bar-wrap" style="height: 6px; margin-bottom: 20px; background: var(--bg-primary);">
                    <div class="progress-bar" style="width: ${percent}%; background-color: ${cat.visual_color};"></div>
                </div>`;
        });
        rateHTML += '</div>';
        rateContainer.innerHTML = rateHTML;
    } else {
        const historyTitle = currentAnalyticsFilter === 'income' ? 'Historial de Ingresos' : (currentAnalyticsFilter === 'expense' ? 'Historial de Gastos' : 'Historial de Traslados');
        
        // Progress Bars for categories (Budgets for 'expense')
        let headerContentHTML = '';
        if(currentAnalyticsFilter === 'expense') {
            const expenseCats = db.categories.filter(c => c.type === 'expense');
            const targetCats = activeCatId === 'all' ? expenseCats.filter(c=>c.budget>0) : expenseCats.filter(c => c.id == activeCatId);
            
            targetCats.forEach(cat => {
                const amountSpent = catTotals[cat.id] || 0;
                if(cat.budget > 0) {
                    const percent = Math.min(100, Math.round((amountSpent / cat.budget) * 100));
                    headerContentHTML += `
                        <div class="rate-item" style="margin-top: 5px; margin-bottom: 5px;">
                            <div class="rate-info">
                                <div class="t-icon" style="background-color: ${cat.visual_color}; width: 35px; height: 35px; font-size: 1rem; border-radius: 4px;"><i class="fas ${cat.icon}"></i></div>
                                <div class="rate-text">
                                    <span class="t-cat" style="font-size: 1.1rem; line-height: 1;">${cat.name}</span>
                                    <span class="t-date" style="font-weight: 700; color: var(--text-primary);">${percent}% del Límite</span>
                                </div>
                            </div>
                            <div class="t-amount amount-expense" style="font-size: 1.1rem; text-align: right; line-height: 1;">
                                -$${amountSpent.toFixed(2)} <br><span style="font-size: 0.8rem; color: var(--text-secondary);">/ $${cat.budget.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="progress-bar-wrap" style="height: 6px; margin-bottom: 15px; background: var(--bg-primary);">
                            <div class="progress-bar" style="width: ${percent}%; background-color: ${cat.visual_color};"></div>
                        </div>
                    `;
                } else if(activeCatId !== 'all') {
                     headerContentHTML += `
                        <div class="rate-item" style="margin-top: 5px; margin-bottom: 15px;">
                            <div class="rate-info">
                                <div class="t-icon" style="background-color: ${cat.visual_color}; width: 35px; height: 35px; font-size: 1rem; border-radius: 4px;"><i class="fas ${cat.icon}"></i></div>
                                <div class="rate-text">
                                    <span class="t-cat" style="font-size: 1.1rem; line-height: 1;">${cat.name}</span>
                                    <span class="t-date" style="font-weight: 700; color: var(--text-primary);">Sin límite presupuestal</span>
                                </div>
                            </div>
                            <div class="t-amount amount-expense" style="font-size: 1.1rem;">-$${amountSpent.toFixed(2)}</div>
                        </div>
                     `;
                }
            });
        }

        const finalHistory = timeFilteredHistory.filter(tx => {
            if(currentAnalyticsFilter === 'transfer') return tx.type === 'transfer';
            if(tx.type === 'transfer') return false;
            const cat = db.categories.find(c => c.id === tx.category_id);
            if(!cat || cat.type !== currentAnalyticsFilter) return false;
            if(activeCatId !== 'all' && cat.id != activeCatId) return false;
            return true;
        });

        if(finalHistory.length === 0) {
            rateContainer.innerHTML = `${headerContentHTML}<h3>${historyTitle}</h3><div class="empty-state">No hay trazos en este bloque de tiempo.</div>`;
        } else {
            const listHTML = finalHistory.map(tx => renderTransactionHTML(tx)).join('');
            rateContainer.innerHTML = `${headerContentHTML}<h3>${historyTitle}</h3><div class="transactions-list mt-10">${listHTML}</div>`;
        }
    }
}

function renderSettings() {
    document.getElementById('settings-accounts').innerHTML = db.accounts.map(a => {
        const balanceColor = a.balance < 0 ? 'color: var(--action-expense); font-weight: bold;' : '';
        return `
        <div class="setting-row">
            <span><strong>${a.name}</strong> (${a.currency})</span>
            <span><span style="${balanceColor}">$${a.balance.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span> <i class="fas fa-trash trash-btn" onclick="deleteAccount(${a.id})"></i></span>
        </div>
    `}).join('');
    
    document.getElementById('settings-categories').innerHTML = db.categories.map(c => `
        <div class="setting-row">
            <span onclick="openCategoryModal(${c.id})" style="cursor: pointer; display: flex; align-items: center; gap: 10px;">
                <i class="fas ${c.icon}" style="color:${c.visual_color}; width:20px;"></i>
                <span>
                    <strong>${c.name}</strong> <small>(${c.type === 'income' ? 'Ingreso':'Gasto'})</small>
                    ${c.budget > 0 ? `<br><small style="color:var(--text-secondary)">Límite: $${c.budget}</small>` : ''}
                </span>
            </span>
            <i class="fas fa-trash trash-btn" onclick="openCategoryModal(${c.id})"></i>
        </div>
    `).join('');

    const sg = document.getElementById('settings-goals');
    if(sg) {
        sg.innerHTML = db.goals.map(g => {
            const currentAmount = g.account_id ? (db.accounts.find(a => a.id === g.account_id)?.balance || 0) : (g.current || 0);
            return `
            <div class="setting-row">
                <span onclick="openGoalModal(${g.id})" style="cursor: pointer;"><i class="fas ${g.icon}" style="width:20px;"></i> <strong>${g.name}</strong> ($${currentAmount.toFixed(0)} / $${g.target.toFixed(0)})</span>
                <i class="fas fa-trash trash-btn" onclick="deleteGoal(${g.id})"></i>
            </div>
        `}).join('');
    }
}

// Selector Visual de Íconos
document.querySelectorAll('.icon-selector i').forEach(icon => {
    icon.addEventListener('click', function() {
        const parent = this.parentElement;
        parent.querySelectorAll('i').forEach(i => i.classList.remove('selected'));
        this.classList.add('selected');
        const hiddenInput = parent.parentElement.querySelector('input[type="hidden"]');
        hiddenInput.value = this.dataset.icon;
    });
});

// Tema y Exportación
let currentTheme = localStorage.getItem('schiele_theme') || 'light';
if(currentTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
document.addEventListener('DOMContentLoaded', () => {
    const thI = document.querySelector('#theme-toggle i');
    if(thI) thI.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
});

window.toggleTheme = function() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('schiele_theme', currentTheme);
    document.querySelector('#theme-toggle i').className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

window.exportToCSV = function() {
    let csvContent = "data:text/csv;charset=utf-8,ID,Fecha,Tipo_Trazo,Monto_Principal,Balance_Secundario,Boveda_Origen,Boveda_Destino,Categoria,Notas\n";
    
    db.transactions.forEach(tx => {
        let date = new Date(tx.date).toLocaleDateString();
        // Replace commas with spaces in notes
        let notes = (tx.notes || '').replace(/,/g, ' ');

        if(tx.type === 'transfer') {
            const fAcc = db.accounts.find(a => a.id === tx.from_account_id)?.name || 'Borrada';
            const tAcc = db.accounts.find(a => a.id === tx.to_account_id)?.name || 'Borrada';
            csvContent += `${tx.id},${date},Transferencia,${tx.amount_extracted},${tx.amount_received},${fAcc},${tAcc},-,${notes}\n`;
        } else {
            const catObj = db.categories.find(c => c.id === tx.category_id);
            const cat = catObj?.name || 'Borrada';
            const subType = catObj?.type === 'income' ? 'Ingreso' : 'Gasto';
            const acc = db.accounts.find(a => a.id === tx.account_id)?.name || 'Borrada';
            
            csvContent += `${tx.id},${date},${subType},${tx.amount},0,${acc},-,${cat},${notes}\n`;
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Finanzas_Schiele_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Iniciar aplicación
renderHome();
