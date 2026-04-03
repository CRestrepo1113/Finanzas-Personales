// 1. Initial State DB (V3 - Phase I Engineering)
const initDB = {
    settings: {
        baseCurrency: 'USD',
        exchangeRates: { 'USD': 1, 'EUR': 0.92, 'COP': 3900, 'RUB': 90 }
    },
    accounts: [
        { id: 1, name: 'Cuenta de Ahorros', currency: 'USD', balance: 1222.00, type: 'asset' },
        { id: 2, name: 'Tarjeta Especial', currency: 'USD', balance: -200.00, type: 'liability' }
    ],
    categories: [
        { id: 1, name: 'Sueldo', type: 'income', subtype: 'fixed', visual_color: '#005F56', icon: 'fa-briefcase', budget: 0 },
        { id: 2, name: 'Vivienda', type: 'expense', subtype: 'fixed', visual_color: '#2B2B2B', icon: 'fa-home', budget: 800 },
        { id: 3, name: 'Comestibles', type: 'expense', subtype: 'variable', visual_color: '#B23A1E', icon: 'fa-shopping-basket', budget: 400 },
        { id: 4, name: 'Suscripciones', type: 'expense', subtype: 'fixed', visual_color: '#DDA629', icon: 'fa-credit-card', budget: 50 },
        { id: 5, name: 'Transporte', type: 'expense', subtype: 'variable', visual_color: '#00A896', icon: 'fa-car', budget: 150 }
    ],
    transactions: [],
    goals: [
        { id: 1, name: 'Fondo de Emergencia', target: 5000, current: 2300, icon: 'fa-shield-alt', account_id: null, is_emergency: true }
    ]
};

function getFreshDB() { return JSON.parse(JSON.stringify(initDB)); }

let profilesState = JSON.parse(localStorage.getItem('finance_profiles_v1'));

if (!profilesState) {
    let oldDB = JSON.parse(localStorage.getItem('finance_db_v3'));
    if (oldDB) {
        profilesState = {
            activeProfileId: 'profile_1',
            profiles: [ { id: 'profile_1', name: 'Principal', db: oldDB } ]
        };
    } else {
        profilesState = {
            activeProfileId: 'profile_1',
            profiles: [ { id: 'profile_1', name: 'Principal', db: getFreshDB() } ]
        };
    }
    localStorage.setItem('finance_profiles_v1', JSON.stringify(profilesState));
}

let activeProfileId = profilesState.activeProfileId;
let activeProfile = profilesState.profiles.find(p => p.id === activeProfileId);
if(!activeProfile) {
    activeProfile = profilesState.profiles[0];
    activeProfileId = activeProfile.id;
    profilesState.activeProfileId = activeProfileId;
}
let db = activeProfile.db;

function patchDB(database) {
    if(!database.settings) database.settings = { baseCurrency: 'USD', exchangeRates: { 'USD': 1, 'EUR': 0.92, 'COP': 3900, 'RUB': 90 } };
    database.transactions.forEach(t => { if(!t.type) t.type = 'standard'; });
    database.categories.forEach(c => { if(c.budget === undefined) c.budget = 0; if(!c.subtype) c.subtype = 'variable'; });
    database.accounts.forEach(a => { if(!a.type) a.type = a.balance < 0 ? 'liability' : 'asset'; });
    database.goals.forEach(g => { if(g.is_emergency === undefined) g.is_emergency = false; });
}
patchDB(db);

// Patch Profiles for v2
profilesState.profiles.forEach(p => {
    if(!p.color) p.color = '#7A6A53';
    if(!p.icon) p.icon = 'fa-user';
});

document.addEventListener('DOMContentLoaded', () => {
    const greeting = document.getElementById('profile-greeting');
    if(greeting) greeting.innerHTML = `<i class="fas ${activeProfile.icon}" style="color: ${activeProfile.color}; margin-right: 8px;"></i>${activeProfile.name} <i class="fas fa-caret-down" style="font-size: 0.8rem; margin-left: 5px; opacity: 0.7;"></i>`;

    // Initialize global swatches and icons selectors
    document.querySelectorAll('.color-selector').forEach(sel => {
        const inputId = sel.id.replace('-selector', '');
        const inputElem = document.getElementById(inputId);
        sel.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                sel.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                if(inputElem) inputElem.value = swatch.dataset.color;
            });
        });
    });

    document.querySelectorAll('.icon-selector').forEach(sel => {
        const inputId = sel.id.replace('-selector', '');
        const inputElem = document.getElementById(inputId);
        sel.querySelectorAll('i').forEach(icon => {
            icon.addEventListener('click', () => {
                sel.querySelectorAll('i').forEach(i => i.classList.remove('selected'));
                icon.classList.add('selected');
                if(inputElem) inputElem.value = icon.dataset.icon;
            });
        });
    });
});

let currentType = 'expense';
let currentAnalyticsFilter = 'all';
let showingAllTx = false;

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
        if(btn.dataset.target === 'view-settings') renderSettings();
    });
});

window.toggleShowAllTx = function() {
    showingAllTx = !showingAllTx;
    renderHome();
};

window.toggleAnalyticsFilter = function(type) {
    if(currentAnalyticsFilter === type) currentAnalyticsFilter = 'all';
    else currentAnalyticsFilter = type;
    
    // Always clear sub-filter when switching main tab to avoid confusion
    const subFilterSelect = document.getElementById('analytics-sub-filter');
    subFilterSelect.dataset.type = 'none';
    
    renderAnalytics();
}

window.toggleCategorySubtype = function() {
    const type = document.getElementById('cat-type').value;
    const group = document.getElementById('cat-subtype-group');
    if(group) {
        if(type === 'income') group.classList.add('hidden');
        else group.classList.remove('hidden');
    }
}

// Transaction Helpers
function renderTransactionHTML(tx) {
    if(tx.type === 'transfer') {
        let fAcc, tAcc;
        if(tx.is_cross_profile) {
            const foreignSide = String(tx.id).endsWith('_recv') ? 'from' : 'to';
            if (foreignSide === 'from') {
                fAcc = {name: tx.foreign_account_name || 'Cuenta Externa', currency: 'USD'};
                tAcc = db.accounts.find(a => String(a.id) === String(tx.to_account_id)) || {name: '?', currency: 'USD'};
            } else {
                fAcc = db.accounts.find(a => String(a.id) === String(tx.from_account_id)) || {name: '?', currency: 'USD'};
                tAcc = {name: tx.foreign_account_name || 'Cuenta Externa', currency: 'USD'};
            }
            if(fAcc.currency === 'USD') { // Fallback heurístico para moneda
                 const sampleLocalAcc = db.accounts.find(a => true);
                 if(sampleLocalAcc) fAcc.currency = sampleLocalAcc.currency;
            }
        } else {
            fAcc = db.accounts.find(a => String(a.id) === String(tx.from_account_id)) || {name: '?', currency: 'USD'};
            tAcc = db.accounts.find(a => String(a.id) === String(tx.to_account_id)) || {name: '?', currency: 'USD'};
        }
        const currSymbol = {USD:'$',EUR:'€',COP:'$',RUB:'₽'}[fAcc.currency] || '$';
        return `
        <div class="transaction-item" onclick="openEditDispatcher('${tx.id}')" style="cursor: pointer;">
            <div class="t-left">
                <div class="t-icon" style="background-color: var(--text-secondary); color: var(--bg-primary);"><i class="fas fa-exchange-alt"></i></div>
                <div>
                    <span class="t-cat" style="font-size: 1.1rem;">${tx.comment || 'Transferencia'}</span>
                    <span class="t-date">${new Date(tx.date).toLocaleDateString()} &bull; ${fAcc.name} ➔ ${tAcc.name}</span>
                </div>
            </div>
            <div class="t-amount" style="color: var(--text-secondary)">${currSymbol}${(tx.amount_extracted||0).toFixed(2)} ${fAcc.currency}</div>
        </div>`;
    } else {
        const cat = db.categories.find(c => String(c.id) === String(tx.category_id)) || {name: 'Borrada', type: 'expense', visual_color: '#000', icon: 'fa-ghost'};
        const sign = cat.type === 'income' ? '+' : '-';
        const cssClass = cat.type === 'income' ? 'amount-income' : 'amount-expense';
        const acc = db.accounts.find(a => String(a.id) === String(tx.account_id)) || {name: 'Desaparecida'};
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
    if(!tx) return; // Guard: transacción no encontrada
    if(tx.type === 'transfer') openTransferModal(tx.id);
    else {
        const cat = db.categories.find(c => String(c.id) === String(tx.category_id)) || {type: 'expense'};
        openModal(cat.type, tx.id);
    }
}


// Modals: Transactions (Income/Expense/Transfers)
window.openModal = function(type, txId = null) {
    currentType = type;
    document.getElementById('modal-title').textContent = txId ? 'Editar Transacción' : (type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso');
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
        document.getElementById('tx-save-btn').textContent = "Guardar Cambios";
        document.getElementById('tx-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('tx-edit-id').value = "";
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        document.getElementById('amount').value = "";
        document.getElementById('notes').value = "";
        document.getElementById('tx-save-btn').textContent = "Registrar Transacción";
        document.getElementById('tx-delete-btn').classList.add('hidden');
    }
    txModal.classList.remove('hidden');
};
document.getElementById('close-modal').addEventListener('click', () => { txModal.classList.add('hidden'); txForm.reset(); });

txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('tx-edit-id').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const accId = accSelect.value;
    const catId = catSelect.value;
    const dateVal = document.getElementById('date').value + "T00:00:00"; // Hora local, sin desfase UTC

    // Validar monto positivo
    if(!amount || amount <= 0) return alert('El monto debe ser un número positivo mayor a cero.');

    // Derivar tipo de la categoría seleccionada, no de la variable global
    const selectedCat = db.categories.find(c => String(c.id) === String(catId)) || {type: currentType};
    const txType = selectedCat.type; // 'income' o 'expense'

    if (editId) {
        const oldTx = db.transactions.find(t => String(t.id) === String(editId));
        const oldAcc = db.accounts.find(a => String(a.id) === String(oldTx.account_id));
        const oldCat = db.categories.find(c => String(c.id) === String(oldTx.category_id)) || {type: 'expense'};
        if (oldAcc) {
            if(oldCat.type === 'expense') oldAcc.balance += oldTx.amount; else oldAcc.balance -= oldTx.amount;
        }
        
        oldTx.amount = amount; oldTx.account_id = accId; oldTx.category_id = catId; 
        oldTx.date = dateVal; oldTx.notes = document.getElementById('notes').value;
    } else {
        db.transactions.push({
            id: crypto.randomUUID(), type: 'standard', account_id: accId, category_id: catId, amount: amount,
            date: dateVal, notes: document.getElementById('notes').value
        });
    }

    const acc = db.accounts.find(a => String(a.id) === String(accId));
    if (acc) {
        if(txType === 'expense') acc.balance -= amount; else acc.balance += amount;
    }
    
    saveDB(); txModal.classList.add('hidden'); txForm.reset(); renderHome(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
});

window.deleteCurrentTx = function() {
    const editId = document.getElementById('tx-edit-id').value;
    if(!editId) return;
    if(confirm("¿Estás seguro de eliminar esta transacción?")) {
        const oldTx = db.transactions.find(t => String(t.id) === String(editId));
        if (oldTx) {
            const oldAcc = db.accounts.find(a => String(a.id) === String(oldTx.account_id));
            const oldCat = db.categories.find(c => String(c.id) === String(oldTx.category_id)) || {type: 'expense'};
            
            if (oldAcc) {
                if(oldCat.type === 'expense') oldAcc.balance += oldTx.amount; 
                else oldAcc.balance -= oldTx.amount;
            }
        }

        db.transactions = db.transactions.filter(t => String(t.id) !== String(editId));
        saveDB(); txModal.classList.add('hidden'); txForm.reset(); renderHome(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
    }
}


// Tra// Transfers Modal
window.openTransferModal = (txId = null, preselectToAccountId = null) => {
    targetFrom.innerHTML = db.accounts.map(a => `<option value="${a.id}">${a.name} ($${a.balance.toFixed(2)} ${a.currency})</option>`).join('');
    
    let toOptions = `<optgroup label="Mismo Perfil">`;
    toOptions += db.accounts.map(a => `<option value="${a.id}">${a.name} (${a.currency})</option>`).join('');
    toOptions += `</optgroup>`;

    if(profilesState.profiles.length > 1) {
        toOptions += `<optgroup label="Otros Perfiles">`;
        profilesState.profiles.forEach(p => {
            if(p.id !== activeProfileId) {
                p.db.accounts.forEach(a => {
                    toOptions += `<option value="CROSS|${p.id}|${a.id}">[${p.name}] ${a.name} (${a.currency})</option>`;
                });
            }
        });
        toOptions += `</optgroup>`;
    }
    targetTo.innerHTML = toOptions;
    
    if (txId) {
        const tx = db.transactions.find(t => t.id === txId);
        document.getElementById('trans-edit-id').value = tx.id;
        document.getElementById('trans-date').value = tx.date.split('T')[0];
        targetFrom.value = tx.from_account_id;
        
        if(tx.is_cross_profile) {
            targetTo.innerHTML = `<option value="LOCKED" selected>${tx.foreign_account_name || 'Cuenta Externa'}</option>`;
            targetTo.disabled = true;
        } else {
            targetTo.value = tx.to_account_id;
            targetTo.disabled = false;
        }

        document.getElementById('trans-amount').value = tx.amount_extracted;
        document.getElementById('trans-received').value = tx.amount_received;
        document.getElementById('trans-comment').value = tx.comment || '';
        
        document.getElementById('transfer-modal-h2').textContent = "Editar Transferencia";
        document.getElementById('trans-save-btn').textContent = "Guardar Cambios";
        document.getElementById('trans-delete-btn').classList.remove('hidden');
    } else {
        targetTo.disabled = false;
        document.getElementById('trans-edit-id').value = "";
        document.getElementById('trans-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('trans-comment').value = "";
        if (preselectToAccountId) targetTo.value = preselectToAccountId;
        document.getElementById('transfer-modal-h2').textContent = "Transferencia de Fondos";
        document.getElementById('trans-save-btn').textContent = "Registrar Movimiento";
        document.getElementById('trans-delete-btn').classList.add('hidden');
    }
    transferModal.classList.remove('hidden');
};

window.closeTransferModal = () => { transferModal.classList.add('hidden'); transferForm.reset(); };

transferForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('trans-edit-id').value;
    const fromId = targetFrom.value;
    const toId = targetTo.value;
    const amountExtracted = parseFloat(document.getElementById('trans-amount').value);
    const amountReceived = parseFloat(document.getElementById('trans-received').value);
    const commentVal = document.getElementById('trans-comment').value.trim();
    const dateVal = document.getElementById('trans-date').value + "T00:00:00"; // Hora local, sin desfase UTC

    if(fromId === toId) return alert("Operación inválida: La cuenta de origen no puede ser la misma que la de destino.");
    if(!amountExtracted || amountExtracted <= 0 || !amountReceived || amountReceived <= 0) return alert('Los montos deben ser positivos.');
    
    const fromAcc = db.accounts.find(a => String(a.id) === String(fromId));

    if(toId.startsWith('CROSS|')) {
        if (editId) return alert("No se pueden editar transferencias multi-perfil. Elimina y vuelve a crearla.");
        const [_, targetProfileId, targetAccId] = toId.split('|');
        const targetProfile = profilesState.profiles.find(p => p.id === targetProfileId);
        const crossAcc = targetProfile.db.accounts.find(a => String(a.id) === targetAccId);
        
        const txIdStr = crypto.randomUUID();
        db.transactions.push({
            id: txIdStr, type: 'transfer', from_account_id: fromId, to_account_id: targetAccId,
            amount_extracted: amountExtracted, amount_received: amountReceived, comment: commentVal, date: dateVal,
            foreign_account_name: `[${targetProfile.name}] ${crossAcc.name}`, is_cross_profile: true, cross_link_id: txIdStr + '_recv', target_profile_id: targetProfileId
        });
        
        targetProfile.db.transactions.push({
            id: txIdStr + '_recv', type: 'transfer', from_account_id: fromId, to_account_id: targetAccId,
            amount_extracted: amountExtracted, amount_received: amountReceived, comment: commentVal, date: dateVal,
            foreign_account_name: `[${activeProfile.name}] ${fromAcc.name}`, is_cross_profile: true, cross_link_id: txIdStr, target_profile_id: activeProfileId
        });
        
        if (fromAcc) fromAcc.balance -= amountExtracted;
        if (crossAcc) crossAcc.balance += amountReceived;

    } else {
        const toAcc = db.accounts.find(a => String(a.id) === String(toId));
        if (editId) {
            const oldTx = db.transactions.find(t => String(t.id) === String(editId));
            if (oldTx) {
                if (oldTx.is_cross_profile) return alert("No puedes aplicar edición regular a transferencias cruzadas.");
                const oldFrom = db.accounts.find(a => String(a.id) === String(oldTx.from_account_id));
                const oldTo = db.accounts.find(a => String(a.id) === String(oldTx.to_account_id));
                
                if(oldFrom) oldFrom.balance += oldTx.amount_extracted;
                if(oldTo) oldTo.balance -= oldTx.amount_received;
                
                oldTx.from_account_id = fromId; oldTx.to_account_id = toId;
                oldTx.amount_extracted = amountExtracted; oldTx.amount_received = amountReceived;
                oldTx.comment = commentVal;
                oldTx.date = dateVal;
            }
        } else {
            db.transactions.push({
                id: crypto.randomUUID(), type: 'transfer', from_account_id: fromId, to_account_id: toId,
                amount_extracted: amountExtracted, amount_received: amountReceived, comment: commentVal, date: dateVal
            });
        }
        if (fromAcc) fromAcc.balance -= amountExtracted;
        if (toAcc) toAcc.balance += amountReceived;
    }

    saveDB(); closeTransferModal(); renderHome(); renderSettings(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
});

window.deleteCurrentTransfer = function() {
    const editId = document.getElementById('trans-edit-id').value;
    if(!editId) return;
    if(confirm("¿Eliminar permanentemente esta transferencia del historial? Si es cruzada, se revertirá en ambos perfiles.")) {
        const oldTx = db.transactions.find(t => String(t.id) === String(editId));
        if (oldTx) {
            if (oldTx.is_cross_profile) {
                const oldFrom = db.accounts.find(a => String(a.id) === String(oldTx.from_account_id));
                if(oldFrom) oldFrom.balance += oldTx.amount_extracted;
                
                // Revert in target profile
                const targetProfile = profilesState.profiles.find(p => p.id === oldTx.target_profile_id);
                if (targetProfile) {
                    const linkedTx = targetProfile.db.transactions.find(t => String(t.id) === String(oldTx.cross_link_id));
                    if (linkedTx) {
                        const targetAcc = targetProfile.db.accounts.find(a => String(a.id) === String(linkedTx.to_account_id));
                        // Wait, in the target profile it was received, so we must subtract
                        // But wait! from_account_id was the origin, so target is to_account. In the dest profile it's the `to_account_id`.
                        if (targetAcc) targetAcc.balance -= linkedTx.amount_received;
                        // Actually wait: if I am deleting the sender's side, sender side was from, recipient was to.
                        // If I am deleting the receiver's side, receiver side is to, sender is from.
                        // Reverting a cross profile entirely:
                        // Find the account in current profile: if I am the sender, my acc === from_account. I add amount_extracted.
                        // Wait, the easiest way is: just restore the old.balance locally. If my local account is from_account_id, add amount_extracted. If my local account is to_account_id, subtract amount_received.
                    }
                    targetProfile.db.transactions = targetProfile.db.transactions.filter(t => String(t.id) !== String(oldTx.cross_link_id));
                }
            } else {
                const oldFrom = db.accounts.find(a => String(a.id) === String(oldTx.from_account_id));
                const oldTo = db.accounts.find(a => String(a.id) === String(oldTx.to_account_id));
                if(oldFrom) oldFrom.balance += oldTx.amount_extracted;
                if(oldTo) oldTo.balance -= oldTx.amount_received;
            }
        }
        db.transactions = db.transactions.filter(t => String(t.id) !== String(editId));
        saveDB(); transferModal.classList.add('hidden'); transferForm.reset(); renderHome(); if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
    }
}


// Modals Settings: Cuentas y Categorías
window.openAccountModal = (id = null) => {
    if (id) {
        const a = db.accounts.find(acc => String(acc.id) === String(id));
        document.getElementById('acc-edit-id').value = a.id;
        document.getElementById('acc-name').value = a.name;
        document.getElementById('acc-currency').value = a.currency;
        document.getElementById('acc-type').value = a.type || (a.balance < 0 ? 'liability' : 'asset');
        document.getElementById('acc-balance').value = a.balance;
        document.getElementById('acc-balance').readOnly = true;
        document.getElementById('acc-balance-group').style.opacity = '0.6';
        document.getElementById('acc-balance-hint').textContent = "(Auditoría Cerrada: Usa Transacciones para cuadres)";
        document.getElementById('acc-color').value = a.color || '#DDA629';
        
        document.getElementById('modal-title-acc').textContent = "Editar Cuenta";
        document.getElementById('acc-save-btn').textContent = "Guardar Cambios";
        document.getElementById('acc-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('acc-edit-id').value = "";
        document.getElementById('acc-balance').value = "";
        document.getElementById('acc-balance').readOnly = false;
        document.getElementById('acc-balance-group').style.opacity = '1';
        document.getElementById('acc-balance-hint').textContent = "";
        document.getElementById('acc-color').value = '#DDA629';
        document.getElementById('modal-title-acc').textContent = "Nueva Cuenta";
        document.getElementById('acc-save-btn').textContent = "Registrar Cuenta";
        document.getElementById('acc-delete-btn').classList.add('hidden');
    }
    accModal.classList.remove('hidden');
};

window.closeAccountModal = () => { accModal.classList.add('hidden'); accForm.reset(); };

accForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('acc-edit-id').value;
    const name = document.getElementById('acc-name').value;
    const currency = document.getElementById('acc-currency').value;
    const type = document.getElementById('acc-type').value;
    const color = document.getElementById('acc-color').value;

    if (editId) {
        const a = db.accounts.find(x => String(x.id) === String(editId));
        a.name = name; a.currency = currency; a.type = type; a.color = color;
    } else {
        let finalBalance = parseFloat(document.getElementById('acc-balance').value);
        if(type === 'liability' && finalBalance > 0) finalBalance = -finalBalance;
        if(type === 'asset' && finalBalance < 0) finalBalance = Math.abs(finalBalance);

        db.accounts.push({
            id: crypto.randomUUID(), name: name, currency: currency, balance: finalBalance, type: type, color: color
        });
    }
    saveDB(); closeAccountModal(); renderHome(); renderSettings();
});

window.deleteCurrentAccount = function() {
    const editId = document.getElementById('acc-edit-id').value;
    if(!editId) return;
    if(db.accounts.length <= 1) return alert("Acción denegada: No puedes destruir tu última cuenta estructurada.");
    if(confirm("¿Eliminar cuenta permanentemente? Sus transacciones formarán agujeros contables.")) {
        db.accounts = db.accounts.filter(a => String(a.id) !== String(editId)); 
        saveDB(); closeAccountModal(); renderHome(); renderSettings(); 
    }
}

window.moveAccountOrder = function(index, direction) {
    if(direction === -1 && index > 0) {
        const temp = db.accounts[index];
        db.accounts[index] = db.accounts[index - 1];
        db.accounts[index - 1] = temp;
    } else if(direction === 1 && index < db.accounts.length - 1) {
        const temp = db.accounts[index];
        db.accounts[index] = db.accounts[index + 1];
        db.accounts[index + 1] = temp;
    }
    saveDB(); renderHome(); renderSettings();
}

window.openCategoryModal = (catId = null) => {
    if (catId) {
        const c = db.categories.find(x => String(x.id) === String(catId));
        document.getElementById('cat-edit-id').value = c.id;
        document.getElementById('cat-name').value = c.name;
        document.getElementById('cat-type').value = c.type;
        document.getElementById('cat-budget').value = c.budget || "";
        document.getElementById('cat-color').value = c.visual_color;
        document.getElementById('cat-icon').value = c.icon || 'fa-tag';
        if(document.getElementById('cat-subtype')) {
            document.getElementById('cat-subtype').value = c.subtype || 'variable';
            toggleCategorySubtype();
        }
        
        document.querySelectorAll('#cat-icon-selector i').forEach(i => i.classList.remove('selected'));    // Set color swatch visually
    const catColorSel = document.getElementById('cat-color-selector');
    if(catColorSel) {
        catColorSel.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        const swatch = catColorSel.querySelector(`.color-swatch[data-color="${document.getElementById('cat-color').value}"]`);
        if(swatch) swatch.classList.add('selected');
    }

    const icons = document.querySelectorAll('#cat-icon-selector i');
    icons.forEach(i => i.classList.remove('selected'));
    const iElem = document.querySelector(`#cat-icon-selector i[data-icon="${document.getElementById('cat-icon').value}"]`);
    if(iElem) iElem.classList.add('selected');

    catModal.classList.remove('hidden');

        document.getElementById('modal-title-cat').textContent = "Editar Categoría";
        document.getElementById('cat-save-btn').textContent = "Guardar Cambios";
        document.getElementById('cat-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('cat-edit-id').value = "";
        if(document.getElementById('cat-subtype')) document.getElementById('cat-subtype').value = 'variable';
        toggleCategorySubtype();
        document.getElementById('modal-title-cat').textContent = "Nueva Categoría";
        document.getElementById('cat-save-btn').textContent = "Guardar Categoría";
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
    const subtypeElem = document.getElementById('cat-subtype');
    const subtype = (type === 'expense' && subtypeElem) ? subtypeElem.value : 'fixed';
    const budgetRaw = document.getElementById('cat-budget').value;
    const budget = budgetRaw ? parseFloat(budgetRaw) : 0;
    const visual_color = document.getElementById('cat-color').value;
    const icon = document.getElementById('cat-icon').value;

    if (editId) {
        const c = db.categories.find(x => String(x.id) === String(editId));
        c.name = name; c.type = type; c.budget = budget; c.visual_color = visual_color; c.icon = icon; c.subtype = subtype;
    } else {
        db.categories.push({
            id: crypto.randomUUID(), name, type, subtype, budget, visual_color, icon
        });
    }
    saveDB(); closeCategoryModal(); renderSettings();
    if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
});

window.deleteCurrentCategory = function() {
    const editId = document.getElementById('cat-edit-id').value;
    if(!editId) return;
    if(db.categories.length <= 1) return alert("Acción denegada: El sistema requiere al menos una categoría vital.");
    if(confirm("¿Deseas eliminar permanentemente esta categoría estructural?")) { 
        db.categories = db.categories.filter(c => String(c.id) !== String(editId)); 
        saveDB(); closeCategoryModal(); renderSettings(); 
        if(!document.getElementById('view-analytics').classList.contains('hidden')) renderAnalytics();
    }
}

// Modals: Metas de Ahorro
window.openGoalModal = (goalId = null) => {
    const goalAccSelect = document.getElementById('goal-account');
    goalAccSelect.innerHTML = '<option value="">-- Sin Vincular (Aporte Manual) --</option>' + 
                              db.accounts.map(a => `<option value="${a.id}">${a.name} (${a.currency})</option>`).join('');

    if (goalId) {
        const g = db.goals.find(x => String(x.id) === String(goalId));
        document.getElementById('goal-edit-id').value = g.id;
        document.getElementById('goal-name').value = g.name;
        document.getElementById('goal-target').value = g.target;
        document.getElementById('goal-account').value = g.account_id || "";
        document.getElementById('goal-icon').value = g.icon || "fa-bullseye";
        
        const isEmergencyElem = document.getElementById('goal-is-emergency');
        if(isEmergencyElem) isEmergencyElem.checked = g.is_emergency || false;
        
        document.querySelectorAll('#goal-icon-selector i').forEach(i => i.classList.remove('selected'));
        const activeIcon = document.querySelector(`#goal-icon-selector i[data-icon="${g.icon || 'fa-bullseye'}"]`);
        if(activeIcon) activeIcon.classList.add('selected');

        document.getElementById('goal-modal-title').textContent = "Editar Meta / Fondo";
        document.getElementById('goal-save-btn').textContent = "Guardar Cambios";
        document.getElementById('goal-delete-btn').classList.remove('hidden');
    } else {
        document.getElementById('goal-edit-id').value = "";
        const isEmergencyElem = document.getElementById('goal-is-emergency');
        if(isEmergencyElem) isEmergencyElem.checked = false;
        document.getElementById('goal-modal-title').textContent = "Nuevo Horizonte Económico";
        document.getElementById('goal-save-btn').textContent = "Registrar Meta";
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
    const accId = rawAccId ? (/^\d+$/.test(rawAccId) ? parseInt(rawAccId) : rawAccId) : null;
    const isEmergencyElem = document.getElementById('goal-is-emergency');
    const isEmergency = isEmergencyElem ? isEmergencyElem.checked : false;

    if (editId) {
        const g = db.goals.find(x => String(x.id) === String(editId));
        g.name = name; g.target = target; g.icon = icon; g.account_id = accId; g.is_emergency = isEmergency;
    } else {
        db.goals.push({ id: crypto.randomUUID(), name, target, current: 0, icon, account_id: accId, is_emergency: isEmergency });
    }
    saveDB(); closeGoalModal(); renderHome(); renderSettings();
});

window.deleteCurrentGoal = function() {
    const editId = document.getElementById('goal-edit-id').value;
    if(!editId) return;
    if(confirm("¿Abandonar este objetivo económico (Borrar Meta)?")) {
        db.goals = db.goals.filter(g => String(g.id) !== String(editId));
        saveDB(); closeGoalModal(); renderHome(); renderSettings();
    }
}

window.openFundGoalModal = (id) => {
    const goal = db.goals.find(g => String(g.id) === String(id));
    if(!goal) return;
    document.getElementById('fund-goal-id').value = id;
    document.getElementById('modal-title').textContent = id ? "Editar Objetivo" : "Nuevo Objetivo Financiero";
    
    const icons = document.querySelectorAll('#goal-icon-selector i');
    icons.forEach(i => i.classList.remove('selected'));
    const iElem = document.querySelector(`#goal-icon-selector i[data-icon="${document.getElementById('goal-icon').value}"]`);
    if(iElem) iElem.classList.add('selected');
    
    goalModal.classList.remove('hidden');
};
window.closeFundGoalModal = () => { fundGoalModal.classList.add('hidden'); fundGoalForm.reset(); };
fundGoalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('fund-goal-id').value;
    const amt = parseFloat(document.getElementById('fund-amount').value);
    const goal = db.goals.find(g => String(g.id) === String(id));
    if(goal && !goal.account_id) { goal.current += amt; }
    saveDB(); closeFundGoalModal(); renderHome(); renderSettings();
});

window.deleteGoal = function(id) {
    if(confirm("¿Renunciar a este objetivo?")) { db.goals = db.goals.filter(g => String(g.id) !== String(id)); saveDB(); renderHome(); renderSettings(); }
}

function saveDB() { 
    db.transactions.sort((a,b) => new Date(b.date) - new Date(a.date));
    try {
        localStorage.setItem('finance_profiles_v1', JSON.stringify(profilesState));
    } catch(e) {
        alert('⚠️ Error al guardar: El almacenamiento del navegador está lleno. Exporta tu backup CSV antes de continuar.');
        console.error('localStorage full:', e);
    }
}

window.openProfileManager = function() {
    const list = document.getElementById('profiles-list');
    list.innerHTML = profilesState.profiles.map(p => `
        <div class="transaction-item" style="border-left: 5px solid ${p.color};">
            <div class="t-left" onclick="switchProfile('${p.id}')" style="cursor: pointer; flex: 1;">
                <div class="t-icon" style="background-color: ${p.color}; color: #F4ECD8;"><i class="fas ${p.icon}"></i></div>
                <div>
                    <span class="t-cat" style="font-size: 1.1rem;">${p.name}</span>
                    <span class="t-date">${p.id === activeProfileId ? 'Perfil Activo' : 'Toca para cambiar'}</span>
                </div>
            </div>
            <div class="header-actions">
                <button class="btn-icon" onclick="openProfileEditModal('${p.id}')" style="font-size: 1rem;"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-icon" onclick="deleteProfile('${p.id}')" style="font-size: 1rem; color: var(--action-expense); margin-left: 5px;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    document.getElementById('profile-manager-modal').classList.remove('hidden');
};

window.closeProfileManager = function() { document.getElementById('profile-manager-modal').classList.add('hidden'); };

window.openProfileEditModal = function(id = null) {
    closeProfileManager(); // ensure it closes the manager
    const modal = document.getElementById('profile-edit-modal');
    if(id) {
        const p = profilesState.profiles.find(x => x.id === id);
        document.getElementById('profile-edit-id').value = id;
        document.getElementById('profile-name').value = p.name;
        document.getElementById('profile-color').value = p.color;
        document.getElementById('profile-icon').value = p.icon;
        document.getElementById('modal-title-profile').textContent = "Editar Perfil";
    } else {
        document.getElementById('profile-edit-id').value = "";
        document.getElementById('profile-name').value = "";
        document.getElementById('profile-color').value = "#8C9970";
        document.getElementById('profile-icon').value = "fa-user";
        document.getElementById('modal-title-profile').textContent = "Nuevo Perfil";
    }

    // Update color swatch
    const colSel = document.getElementById('profile-color-selector');
    colSel.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    const currColor = document.getElementById('profile-color').value;
    const swatch = colSel.querySelector(`.color-swatch[data-color="${currColor}"]`) || colSel.querySelector('.color-swatch');
    if(swatch) swatch.classList.add('selected');

    // Update icon
    const icSel = document.getElementById('profile-icon-selector');
    icSel.querySelectorAll('i').forEach(i => i.classList.remove('selected'));
    const currIcon = document.getElementById('profile-icon').value;
    const iconElem = icSel.querySelector(`i[data-icon="${currIcon}"]`) || icSel.querySelector('i');
    if(iconElem) iconElem.classList.add('selected');

    modal.classList.remove('hidden');
};

window.closeProfileEditModal = function() {
    document.getElementById('profile-edit-modal').classList.add('hidden');
    openProfileManager(); // reopen manager
};

document.getElementById('profile-edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('profile-edit-id').value;
    const name = document.getElementById('profile-name').value;
    const color = document.getElementById('profile-color').value;
    const icon = document.getElementById('profile-icon').value;

    if(id) {
        const p = profilesState.profiles.find(x => x.id === id);
        p.name = name;
        p.color = color;
        p.icon = icon;
    } else {
        const newId = crypto.randomUUID();
        profilesState.profiles.push({ id: newId, name: name.trim(), db: getFreshDB(), color, icon });
        // Since we created it, let's switch to it? 
        // Not necessarily, let's just create it.
    }
    
    saveDB();
    closeProfileEditModal(); // Will open profile manager behind
    
    // Update greet if needed
    if(id === activeProfileId) {
        const greeting = document.getElementById('profile-greeting');
        if(greeting) greeting.innerHTML = `<i class="fas ${icon}" style="color: ${color}; margin-right: 8px;"></i>${name} <i class="fas fa-caret-down" style="font-size: 0.8rem; margin-left: 5px; opacity: 0.7;"></i>`;
    }
});

window.deleteProfile = function(id) {
    if(profilesState.profiles.length <= 1) return alert("No puedes eliminar el único perfil disponible.");
    const conf = prompt(`Para eliminar permanentemente el perfil y todo su historial, escribe la palabra "ELIMINAR" en mayúsculas:`);
    if(conf === 'ELIMINAR') {
        profilesState.profiles = profilesState.profiles.filter(x => x.id !== id);
        if(id === activeProfileId) profilesState.activeProfileId = profilesState.profiles[0].id;
        saveDB();
        location.reload(); 
    }
};

window.switchProfile = function(id) {
    if(id === activeProfileId) return closeProfileManager();
    profilesState.activeProfileId = id;
    saveDB();
    location.reload(); 
};


// -- RENDER HTML INTERFACE --
function renderNetWorth() {
    let tAssets = 0; let tLiabilities = 0;
    const baseCur = db.settings.baseCurrency || 'USD';
    const rates = db.settings.exchangeRates || {USD: 1, EUR: 0.92, COP: 3900, RUB: 90};

    db.accounts.forEach(acc => {
        const rate = rates[acc.currency] || 1;
        const baseValue = acc.balance / rate;

        if(acc.type === 'asset' && acc.balance > 0) tAssets += baseValue;
        else if (acc.type === 'asset' && acc.balance < 0) tLiabilities += Math.abs(baseValue); // En caso de sobregiro
        
        if(acc.type === 'liability' && acc.balance < 0) tLiabilities += Math.abs(baseValue);
        else if (acc.type === 'liability' && acc.balance > 0) tAssets += baseValue; // En caso de pago excedente
    });
    
    const net = tAssets - tLiabilities;
    
    document.getElementById('total-net-worth').textContent = `${baseCur} ${net.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits:2})}`;
    document.getElementById('total-assets').textContent = `${baseCur} ${tAssets.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits:2})}`;
    document.getElementById('total-liabilities').textContent = `${baseCur} ${tLiabilities.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits:2})}`;
}

function renderHome() {
    renderNetWorth();
    accountsCarousel.innerHTML = db.accounts.map(acc => {
        const balanceColor = acc.balance < 0 ? 'color: var(--action-expense);' : '';
        const cardColor = acc.color || 'var(--accent-gold)';
        return `
        <div class="account-card" style="background-color: ${cardColor}; border-color: ${cardColor};">
            <i class="fas fa-asterisk ac-bg-lines"></i>
            <span class="ac-currency">${acc.currency}</span>
            <h2 class="ac-balance" style="${balanceColor}">${acc.balance.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${acc.currency}</h2>
            <p class="ac-name">${acc.name}</p>
        </div>
    `}).join('');

    const txToShow = showingAllTx ? db.transactions : db.transactions.slice(0, 10);
    if(txToShow.length === 0) { transactionsList.innerHTML = '<div class="empty-state">No hay transacciones registradas. Registra movimientos para comenzar.</div>'; } 
    else { transactionsList.innerHTML = txToShow.map(tx => renderTransactionHTML(tx)).join(''); }
    // Actualizar texto de "Ver todo"
    const seeAllBtn = document.querySelector('.see-all');
    if(seeAllBtn) {
        seeAllBtn.textContent = showingAllTx ? 'Ver recientes' : `Ver todo (${db.transactions.length})`;
        if(db.transactions.length <= 10) seeAllBtn.style.display = 'none'; else seeAllBtn.style.display = '';
    }

    if(db.goals.length === 0) { savingsList.innerHTML = '<div class="empty-state">No hay vectores de inversión ni fondos trazados.</div>'; }
    else {
        savingsList.innerHTML = db.goals.map(g => {
            const currentAmount = g.account_id ? (db.accounts.find(a => a.id === g.account_id)?.balance || 0) : (g.current || 0);
            const percent = Math.min(100, Math.round((currentAmount / g.target) * 100)) || 0;
            const actionOnClick = g.account_id ? `openTransferModal(null, '${g.account_id}')` : `openFundGoalModal('${g.id}')`;
            const actionIcon = g.account_id ? "fa-exchange-alt" : "fa-arrow-up";
            
            return `
            <div class="saving-card" onclick="openGoalModal('${g.id}')">
                <div class="saving-header">
                    <div class="t-left">
                        <div class="t-icon" style="background-color: #2B2B2B"><i class="fas ${g.icon}"></i></div>
                        <div class="saving-info">
                            <h4>${g.name} ${g.account_id ? '<i class="fas fa-link" style="font-size: 0.7rem; color: var(--text-secondary); margin-left: 5px;" title="Vinculado a Cuenta"></i>' : ''}</h4>
                            <p class="saving-amount">$${currentAmount.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} / $${g.target.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    <button class="saving-progress-btn" onclick="event.stopPropagation(); ${actionOnClick}"><i class="fas ${actionIcon}"></i></button>
                </div>
                <div class="saving-progress-container">
                    <div class="saving-progress-bar-wrap">
                        <div class="saving-progress-bar" style="width: ${percent}%; background-color: var(--accent-gold);"></div>
                    </div>
                    <div class="saving-meta">
                        <span>Patrimonio analizado</span>
                        <span>${percent}%</span>
                    </div>
                </div>
            </div>
        `}).join('');
    }
    // Solo renderizar Settings si la vista está activa (optimización de rendimiento)
    if(document.getElementById('view-settings')?.classList.contains('active')) renderSettings();
}

window.renderAnalytics = function() {
    const timeFilter = document.getElementById('analytics-time-filter').value;
    const customDateInput = document.getElementById('analytics-custom-date');
    if(timeFilter === 'custom') customDateInput.classList.remove('hidden');
    else customDateInput.classList.add('hidden');

    let totalIncome = 0; let totalExpense = 0; let totalTransferred = 0;
    const catTotals = {}; // Stores total spent/gained per category

    const now = new Date();
    let customDate = null;
    if (timeFilter === 'custom' && customDateInput.value) {
        customDate = new Date(customDateInput.value + "T00:00:00");
    }

    const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    const getWeek = d => { const j = new Date(d.getFullYear(), 0, 1); return Math.ceil((((d - j) / 86400000) + j.getDay() + 1) / 7); };

    let timeFilteredHistory = [];

    db.transactions.forEach(tx => {
        const d = new Date(tx.date);
        if(timeFilter === 'day' && !isSameDay(d, now)) return;
        if(timeFilter === 'week' && (d.getFullYear() !== now.getFullYear() || getWeek(d) !== getWeek(now))) return;
        if(timeFilter === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return;
        if(timeFilter === 'year' && d.getFullYear() !== now.getFullYear()) return;
        if(timeFilter === 'custom') {
            if(!customDate) return;
            if(!isSameDay(d, customDate)) return;
        }

        timeFilteredHistory.push(tx);

        if(tx.type === 'transfer') {
            totalTransferred += tx.amount_extracted;
        } else {
            const cat = db.categories.find(c => String(c.id) === String(tx.category_id));
            if(!cat) return;
            if(cat.type === 'income') { totalIncome += tx.amount; catTotals[cat.id] = (catTotals[cat.id] || 0) + tx.amount; } 
            else { totalExpense += tx.amount; catTotals[cat.id] = (catTotals[cat.id] || 0) + tx.amount; }
        }
    });
    
    document.getElementById('stat-income').textContent = `$${totalIncome.toLocaleString('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('stat-expense').textContent = `$${totalExpense.toLocaleString('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('stat-transfer').textContent = `$${totalTransferred.toLocaleString('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2})}`;

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
        const expenseCatsTotal = db.categories.filter(c=>c.type==='expense').map(c=>String(c.id));
        const sortedCats = Object.keys(catTotals).filter(k => expenseCatsTotal.includes(k)).sort((a,b) => catTotals[b] - catTotals[a]);
        
        const distHeader = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><h3 style="margin: 0;">Distribución de Gastos</h3><span style="font-size: 1.1rem; font-weight: bold; color: var(--action-expense);">-$${totalExpense.toLocaleString('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>`;
        if(sortedCats.length === 0) {
            rateContainer.innerHTML = `${distHeader}<div class="empty-state">No hay transacciones en este periodo.</div>`;
            return;
        }
        let rateHTML = `${distHeader}<div class="rate-list">`;
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
            const cat = db.categories.find(c => String(c.id) === String(tx.category_id));
            if(!cat || cat.type !== currentAnalyticsFilter) return false;
            if(activeCatId !== 'all' && cat.id != activeCatId) return false;
            return true;
        });

        let filteredSum = 0;
        finalHistory.forEach(tx => filteredSum += (tx.type === 'transfer' ? (tx.amount_extracted || 0) : (tx.amount || 0)));

        let sumColor = 'var(--text-secondary)';
        let sumSign = '';
        if(currentAnalyticsFilter === 'expense') { sumColor = 'var(--action-expense)'; sumSign = '-'; }
        if(currentAnalyticsFilter === 'income') { sumColor = 'var(--action-income)'; sumSign = '+'; }

        const historyHeader = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0;">${historyTitle}</h3>
            <span style="font-size: 1.1rem; font-weight: bold; color: ${sumColor};">${sumSign}$${filteredSum.toLocaleString('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
        </div>`;

        if(finalHistory.length === 0) {
            rateContainer.innerHTML = `${headerContentHTML}${historyHeader}<div class="empty-state">No hay transacciones registradas.</div>`;
        } else {
            const listHTML = finalHistory.map(tx => renderTransactionHTML(tx)).join('');
            rateContainer.innerHTML = `${headerContentHTML}${historyHeader}<div class="transactions-list mt-10">${listHTML}</div>`;
        }
    }
}

function renderExchangeRatesUI() {
    const container = document.getElementById('settings-exchange-rates');
    if(!container) return;
    
    const availableCurrencies = ['USD', 'EUR', 'COP', 'RUB'];
    const baseCur = db.settings.baseCurrency || 'USD';
    
    let html = `
        <div class="input-group">
            <label>Moneda Base del Patrimonio</label>
            <select id="base-currency-select" onchange="updateBaseCurrency()">
                ${availableCurrencies.map(c => `<option value="${c}" ${baseCur === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">Ingresa la tasa de cambio: <br>¿Cuántas unidades equivalen a <strong>1 ${baseCur}</strong>?</p>
    `;
    
    availableCurrencies.forEach(c => {
        if(c === baseCur) return;
        const rate = db.settings.exchangeRates[c] || 1;
        html += `
            <div class="setting-row" style="border-bottom: 1px dotted var(--text-secondary); padding: 5px 0;">
                <span style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span><strong>${c}</strong></span>
                    <input type="number" id="rate-${c}" value="${rate}" step="any" inputmode="decimal" 
                           style="width: 120px; padding: 5px; font-family: var(--font-body); border-radius: 4px; border: 2px solid var(--text-primary); text-align: right; background: var(--bg-primary); color: var(--text-primary);">
                </span>
            </div>
        `;
    });
    
    html += `<button class="btn btn-save" style="padding: 10px; margin-top: 15px; font-size: 1.1rem;" onclick="saveExchangeRates()">Actualizar Matriz</button>`;
    
    container.innerHTML = html;
}

window.updateBaseCurrency = function() {
    const newBase = document.getElementById('base-currency-select').value;
    db.settings.baseCurrency = newBase;
    db.settings.exchangeRates[newBase] = 1;
    saveDB();
    renderSettings();
    renderHome();
}

window.saveExchangeRates = function() {
    const availableCurrencies = ['USD', 'EUR', 'COP', 'RUB'];
    availableCurrencies.forEach(c => {
        if(c === db.settings.baseCurrency) return;
        const input = document.getElementById(`rate-${c}`);
        if(input) {
            db.settings.exchangeRates[c] = parseFloat(input.value) || 1;
        }
    });
    saveDB(); 
    renderHome(); 
    alert("Matriz de tipos de cambio guardada. Patrimonio estructurado.");
}

function renderSettings() {
    renderExchangeRatesUI();
    const renderAccountRow = (a, index) => {
        const balanceColor = a.balance < 0 ? 'color: var(--action-expense); font-weight: bold;' : '';
        const cardColor = a.color || 'var(--accent-gold)';
        return `
        <div class="setting-row">
            <span onclick="openAccountModal('${a.id}')" style="cursor: pointer; display: flex; align-items: center; gap: 10px; flex: 1;">
                <span style="display:inline-block; width: 14px; height: 14px; border-radius: 50%; background-color: ${cardColor}; border: 1px solid var(--text-primary);"></span>
                <span><strong>${a.name}</strong> (${a.currency})</span>
            </span>
            <span style="display: flex; align-items: center; gap: 10px;">
                <span style="${balanceColor}">$${a.balance.toLocaleString('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2})}</span> 
                <div style="display: flex; flex-direction: column; opacity: 0.6; cursor: pointer; padding: 0 5px;">
                    <i class="fas fa-chevron-up" style="font-size: 0.8rem; padding: 2px;" onclick="moveAccountOrder(${index}, -1)"></i>
                    <i class="fas fa-chevron-down" style="font-size: 0.8rem; padding: 2px;" onclick="moveAccountOrder(${index}, 1)"></i>
                </div>
            </span>
        </div>
        `;
    };

    let assetsHTML = ''; let liabilitiesHTML = '';
    db.accounts.forEach((acc, i) => {
        if(acc.type === 'asset' || (acc.type !== 'liability' && acc.balance >= 0)) assetsHTML += renderAccountRow(acc, i);
        else liabilitiesHTML += renderAccountRow(acc, i);
    });

    document.getElementById('settings-accounts').innerHTML = `
        <h5 style="margin: 5px 0 5px; font-family: var(--font-heading); color: var(--action-income); font-size: 1rem;">Activos</h5>
        ${assetsHTML || '<p style="color:var(--text-secondary);font-size:0.9rem; margin-bottom: 10px;">No registrados</p>'}
        <h5 style="margin: 15px 0 5px; font-family: var(--font-heading); color: var(--action-expense); font-size: 1rem;">Pasivos</h5>
        ${liabilitiesHTML || '<p style="color:var(--text-secondary);font-size:0.9rem;">No registrados</p>'}
    `;
    
    const renderCategoryRow = (c) => `
        <div class="setting-row">
            <span onclick="openCategoryModal('${c.id}')" style="cursor: pointer; display: flex; align-items: center; gap: 10px; flex: 1;">
                <i class="fas ${c.icon}" style="color:${c.visual_color}; width:20px;"></i>
                <span>
                    <strong>${c.name}</strong>
                    ${c.budget > 0 ? `<br><small style="color:var(--text-secondary)">Límite: $${c.budget}</small>` : ''}
                </span>
            </span>
            <i class="fas fa-pencil-alt" style="cursor: pointer; color: var(--text-secondary); padding: 5px;" onclick="openCategoryModal('${c.id}')"></i>
        </div>
    `;

    let incomeCatHTML = ''; let expenseCatHTML = '';
    db.categories.forEach(c => {
        if(c.type === 'income') incomeCatHTML += renderCategoryRow(c);
        else expenseCatHTML += renderCategoryRow(c);
    });

    document.getElementById('settings-categories').innerHTML = `
        <h5 style="margin: 5px 0 5px; font-family: var(--font-heading); color: var(--action-income); font-size: 1rem;">Ingresos</h5>
        ${incomeCatHTML || '<p style="color:var(--text-secondary);font-size:0.9rem; margin-bottom: 10px;">No registrados</p>'}
        <h5 style="margin: 15px 0 5px; font-family: var(--font-heading); color: var(--action-expense); font-size: 1rem;">Gastos</h5>
        ${expenseCatHTML || '<p style="color:var(--text-secondary);font-size:0.9rem;">No registrados</p>'}
    `;

    const sg = document.getElementById('settings-goals');
    if(sg) {
        sg.innerHTML = db.goals.map(g => {
            const currentAmount = g.account_id ? (db.accounts.find(a => a.id === g.account_id)?.balance || 0) : (g.current || 0);
            return `
            <div class="setting-row">
                <span onclick="openGoalModal('${g.id}')" style="cursor: pointer; flex: 1;"><i class="fas ${g.icon}" style="width:20px;"></i> <strong>${g.name}</strong> ($${currentAmount.toFixed(0)} / $${g.target.toFixed(0)})</span>
                <i class="fas fa-pencil-alt" style="cursor: pointer; color: var(--text-secondary); padding: 5px;" onclick="openGoalModal('${g.id}')"></i>
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

// Exportación
// Limpieza de legado: remover referencias al tema oscuro eliminado
document.documentElement.removeAttribute('data-theme');
localStorage.removeItem('schiele_theme');

window.exportToCSV = function() {
    if(!confirm('¿Exportar una copia de seguridad consolidada de TODOS tus perfiles?')) return;

    let csvContent = "";
    
    profilesState.profiles.forEach(p => {
        csvContent += `@@@ PROFILE_START | ${p.id} | ${p.name} @@@\n\n`;
        
        csvContent += "### AJUSTES_SISTEMA ###\nBaseCurrency,ExchangeRates\n";
        csvContent += `${p.db.settings.baseCurrency},"${JSON.stringify(p.db.settings.exchangeRates).replace(/"/g, '""')}"\n\n`;

        csvContent += "### BLOQUE_CUENTAS ###\nid,name,currency,balance,type,color\n";
        p.db.accounts.forEach(a => { csvContent += `${a.id},"${a.name}",${a.currency},${a.balance},${a.type},${a.color || ''}\n`; });
        csvContent += "\n";

        csvContent += "### BLOQUE_CATEGORIAS ###\nid,name,type,budget,visual_color,icon,subtype\n";
        p.db.categories.forEach(c => { csvContent += `${c.id},"${c.name}",${c.type},${c.budget},${c.visual_color},${c.icon},${c.subtype || 'variable'}\n`; });
        csvContent += "\n";

        csvContent += "### BLOQUE_METAS ###\nid,name,target,current,icon,account_id,is_emergency\n";
        p.db.goals.forEach(g => { csvContent += `${g.id},"${g.name}",${g.target},${g.current},${g.icon},${g.account_id || ''},${g.is_emergency ? 'true' : 'false'}\n`; });
        csvContent += "\n";

        csvContent += "### BLOQUE_TRANSACCIONES ###\nid,type,date,amount,amount_extracted,amount_received,from_account_id,to_account_id,category_id,account_id,notes,foreign_account_name,is_cross_profile,cross_link_id,target_profile_id\n";
        p.db.transactions.forEach(tx => {
            let notes = (tx.notes || '').replace(/"/g, '""');
            let fAccName = (tx.foreign_account_name || '').replace(/"/g, '""');
            csvContent += `${tx.id},${tx.type},${tx.date},${tx.amount || 0},${tx.amount_extracted || 0},${tx.amount_received || 0},${tx.from_account_id || ''},${tx.to_account_id || ''},${tx.category_id || ''},${tx.account_id || ''},"${notes}","${fAccName}",${tx.is_cross_profile?'true':'false'},${tx.cross_link_id||''},${tx.target_profile_id||''}\n`;
        });
        csvContent += "\n";
    });

    const blob = new Blob(["\uFEFF"+csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Finanzas_BackupFullProfiles_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.importFromCSV = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    if(!confirm("⚠️ ADVERTENCIA CRÍTICA: Importar esta copia sobrescribirá TODOS tus perfiles y datos financieros. ¿Confirmas esta acción destructiva?")) {
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        
        if(!text.includes('### BLOQUE_CUENTAS ###')) {
            alert("Carga cancelada: El archivo no cumple con el formato estructurado del nuevo Sistema de Backup.");
            event.target.value = '';
            return;
        }

        const lines = text.split('\n').map(l => l.trim());
        let mode = '';
        let pArr = [];
        let currentProfileObj = null;
        
        const parseCSVLine = (str) => {
            const arr = []; let inQuote = false; let val = "";
            for (let i = 0; i < str.length; i++) {
                const c = str[i];
                if(c === '"') {
                    if(inQuote && str[i+1] === '"') { val += '"'; i++; }
                    else { inQuote = !inQuote; }
                } else if(c === ',' && !inQuote) { arr.push(val); val = ""; }
                else { val += c; }
            }
            arr.push(val); return arr;
        };

        for(let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if(!line) continue;
            
            if(line.startsWith('@@@ PROFILE_START')) {
                const parts = line.split('|').map(s=>s.trim());
                currentProfileObj = {
                    id: parts[1],
                    name: parts[2].replace('@@@', '').trim(),
                    db: { settings: { baseCurrency: 'USD', exchangeRates: {} }, accounts: [], categories: [], goals: [], transactions: [] }
                };
                pArr.push(currentProfileObj);
                continue;
            }
            
            if(!currentProfileObj) {
                currentProfileObj = {
                    id: 'profile_1', name: 'Principal (Importado)',
                    db: { settings: { baseCurrency: 'USD', exchangeRates: {} }, accounts: [], categories: [], goals: [], transactions: [] }
                };
                pArr.push(currentProfileObj);
            }

            if(line.startsWith('### ')) {
                mode = line; i++; continue;
            }

            const cols = parseCSVLine(line);
            const _db = currentProfileObj.db;

            if(mode === '### AJUSTES_SISTEMA ###') {
                if(cols.length >= 2) {
                    _db.settings.baseCurrency = cols[0];
                    try { _db.settings.exchangeRates = JSON.parse(cols[1]); } catch(err){}
                }
            }
            else if(mode === '### BLOQUE_CUENTAS ###') {
                if(cols.length >= 6) {
                    const accId = isNaN(Number(cols[0])) ? cols[0] : Number(cols[0]);
                    _db.accounts.push({ id: accId, name: cols[1], currency: cols[2], balance: parseFloat(cols[3]) || 0, type: cols[4], color: cols[5] });
                }
            }
            else if(mode === '### BLOQUE_CATEGORIAS ###') {
                if(cols.length >= 6) {
                    const catId = isNaN(Number(cols[0])) ? cols[0] : Number(cols[0]);
                    _db.categories.push({ id: catId, name: cols[1], type: cols[2], budget: parseFloat(cols[3]) || 0, visual_color: cols[4], icon: cols[5], subtype: cols[6] || 'variable' });
                }
            }
            else if(mode === '### BLOQUE_METAS ###') {
                if(cols.length >= 6) {
                    const goalId = isNaN(Number(cols[0])) ? cols[0] : Number(cols[0]);
                    _db.goals.push({ id: goalId, name: cols[1], target: parseFloat(cols[2]) || 0, current: parseFloat(cols[3]) || 0, icon: cols[4], account_id: cols[5] ? (isNaN(Number(cols[5])) ? cols[5] : Number(cols[5])) : null, is_emergency: cols[6] === 'true' });
                }
            }
            else if(mode === '### BLOQUE_TRANSACCIONES ###') {
                if(cols.length >= 11) { 
                    const parseId = (v) => v ? (isNaN(Number(v)) ? v : Number(v)) : null;
                    _db.transactions.push({
                        id: cols[0], type: cols[1], date: cols[2], amount: parseFloat(cols[3]) || 0,
                        amount_extracted: parseFloat(cols[4]) || 0, amount_received: parseFloat(cols[5]) || 0,
                        from_account_id: parseId(cols[6]), to_account_id: parseId(cols[7]),
                        category_id: parseId(cols[8]), account_id: parseId(cols[9]), notes: cols[10],
                        foreign_account_name: cols[11] || '', is_cross_profile: cols[12] === 'true',
                        cross_link_id: cols[13] || '', target_profile_id: cols[14] || ''
                    });
                }
            }
        }
        
        if(pArr.length > 0) {
            pArr.forEach(p => { p.db.transactions.sort((a,b) => new Date(b.date) - new Date(a.date)); });
            profilesState.profiles = pArr;
            profilesState.activeProfileId = pArr[0].id;
            saveDB();
            location.reload();
        } else {
            alert(`Error: Formato CSV incompatible o corrupto. Imposible efectuar la restauración.`);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// --- MODULO ZBB (Zero-Based Budgeting 50/30/20) ---
let currentZBBPlan = {};

function initZBBView() {
    const categoriesList = document.getElementById('zbb-categories-list');
    const allCategories = db.categories.filter(c => c.type === 'expense');
    const allGoals = db.goals || [];
    
    if(allCategories.length === 0 && allGoals.length === 0) {
        categoriesList.innerHTML = '<div class="empty-state">No hay categorías ni metas para presupuestar. Crea algunas en Configuración.</div>';
        return;
    }

    let html = '';
    
    // 1a. Gastos: Necesidades (50%)
    const needs = allCategories.filter(c => c.subtype === 'fixed');
    needs.forEach(cat => {
        html += `
            <div class="zbb-cat-item">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="t-icon" style="background-color: ${cat.visual_color}; width: 40px; height: 40px; font-size: 1.1rem; border-radius: 4px; display: flex; justify-content: center; align-items: center; color: var(--bg-primary); border: 1px solid var(--text-primary);">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div>
                        <span style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; line-height: 1;">${cat.name}</span>
                        <br><span style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Necesidad (50%)</span>
                    </div>
                </div>
                <div>
                    <input type="number" class="zbb-cat-input" data-cat-id="${cat.id}" data-cat-name="${cat.name}" data-cat-type="needs" placeholder="0.00" oninput="calculateZBBDelta()" inputmode="decimal" step="any">
                </div>
            </div>
        `;
    });

    // 1b. Gastos: Deseos (30%)
    const wants = allCategories.filter(c => c.subtype !== 'fixed');
    wants.forEach(cat => {
        html += `
            <div class="zbb-cat-item">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="t-icon" style="background-color: ${cat.visual_color}; width: 40px; height: 40px; font-size: 1.1rem; border-radius: 4px; display: flex; justify-content: center; align-items: center; color: var(--bg-primary); border: 1px solid var(--text-primary);">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div>
                        <span style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; line-height: 1;">${cat.name}</span>
                        <br><span style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Deseo (30%)</span>
                    </div>
                </div>
                <div>
                    <input type="number" class="zbb-cat-input" data-cat-id="${cat.id}" data-cat-name="${cat.name}" data-cat-type="wants" placeholder="0.00" oninput="calculateZBBDelta()" inputmode="decimal" step="any">
                </div>
            </div>
        `;
    });
    
    // 2. Metas Económicas (Futuros)
    allGoals.forEach(goal => {
        html += `
            <div class="zbb-cat-item">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="t-icon" style="background-color: #DDA629; width: 40px; height: 40px; font-size: 1.1rem; border-radius: 4px; display: flex; justify-content: center; align-items: center; color: var(--bg-primary); border: 1px solid var(--text-primary);">
                        <i class="fas ${goal.icon || 'fa-bullseye'}"></i>
                    </div>
                    <div>
                        <span style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; line-height: 1;">${goal.name}</span>
                        <br><span style="font-size: 0.8rem; color: #DDA629; text-transform: uppercase; font-weight: 700;">FUTURO (20%)</span>
                    </div>
                </div>
                <div>
                    <input type="number" class="zbb-cat-input" data-cat-id="goal-${goal.id}" data-cat-name="${goal.name}" data-cat-type="future" placeholder="0.00" oninput="calculateZBBDelta()" inputmode="decimal" step="any">
                </div>
            </div>
        `;
    });

    // 3. Pasivos / Deudas (Futuros)
    const liabilities = db.accounts.filter(a => a.type === 'liability');
    liabilities.forEach(account => {
        html += `
            <div class="zbb-cat-item">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="t-icon" style="background-color: #DDA629; width: 40px; height: 40px; font-size: 1.1rem; border-radius: 4px; display: flex; justify-content: center; align-items: center; color: var(--bg-primary); border: 1px solid var(--text-primary);">
                        <i class="fas fa-credit-card"></i>
                    </div>
                    <div>
                        <span style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; line-height: 1;">${account.name}</span>
                        <br><span style="font-size: 0.8rem; color: #DDA629; text-transform: uppercase; font-weight: 700;">FUTURO (20%)</span>
                    </div>
                </div>
                <div>
                    <input type="number" class="zbb-cat-input" data-cat-id="acc-${account.id}" data-cat-name="${account.name}" data-cat-type="future" placeholder="0.00" oninput="calculateZBBDelta()" inputmode="decimal" step="any">
                </div>
            </div>
        `;
    });
    
    categoriesList.innerHTML = html;
}

window.updateZBB = function() {
    const rawIncome = document.getElementById('zbb-income-input').value;
    const income = parseFloat(rawIncome) || 0;
    const guideModule = document.getElementById('zbb-guide-module');
    const floatWidget = document.getElementById('zbb-floating-delta');
    
    if(income > 0) {
        guideModule.classList.remove('hidden');
        floatWidget.classList.remove('hidden');
        
        // Calcular Guía Heurística
        document.getElementById('zbb-guide-needs').textContent = `$${(income * 0.50).toFixed(2)}`;
        document.getElementById('zbb-guide-wants').textContent = `$${(income * 0.30).toFixed(2)}`;
        document.getElementById('zbb-guide-savings').textContent = `$${(income * 0.20).toFixed(2)}`;
        
        // Init categories view if empty
        if(document.getElementById('zbb-categories-list').innerHTML.trim() === '' || document.getElementById('zbb-categories-list').innerHTML.includes('<!-- Injected by JS -->')) {
            initZBBView();
        }
        
        calculateZBBDelta();
    } else {
        guideModule.classList.add('hidden');
        floatWidget.classList.add('hidden');
    }
}

window.calculateZBBDelta = function() {
    const income = parseFloat(document.getElementById('zbb-income-input').value) || 0;
    const inputs = document.querySelectorAll('.zbb-cat-input');
    
    let totalAssigned = 0;
    let allocations = [];
    let hasAnyAllocation = false;
    
    inputs.forEach(input => {
        const val = parseFloat(input.value) || 0;
        if(val > 0) {
            totalAssigned += val;
            hasAnyAllocation = true;
            allocations.push({
                category_id: input.dataset.catId,
                category_name: input.dataset.catName,
                amount: val,
                category_type: input.dataset.catType
            });
        }
    });
    
    const delta = income - totalAssigned;
    const floatWidget = document.getElementById('zbb-floating-delta');
    const deltaValLabel = document.getElementById('zbb-delta-val');
    const saveBtn = document.getElementById('zbb-save-plan');
    const syncBtn = document.getElementById('zbb-sync-budgets');
    
    deltaValLabel.textContent = `$${delta.toFixed(2)}`;
    
    // Cleanup classes
    floatWidget.classList.remove('status-idle', 'status-perfect', 'status-danger');
    
    // Sync button: habilitado si hay al menos una asignación
    if(syncBtn) syncBtn.disabled = !hasAnyAllocation;

    let currentStatus = 'Capital Ocioso';
    if(delta === 0 && income > 0) {
        floatWidget.classList.add('status-perfect');
        saveBtn.disabled = false;
        currentStatus = 'Maestría ZBB';
    } else if(delta > 0) {
        floatWidget.classList.add('status-idle');
        saveBtn.disabled = true;
    } else {
        floatWidget.classList.add('status-danger');
        saveBtn.disabled = true;
        currentStatus = 'Sobreasignación';
    }
    
    // Store in global
    const now = new Date();
    currentZBBPlan = {
        month_id: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}`,
        total_income: income,
        created_at: now.toISOString(),
        allocations: allocations,
        metrics: {
            total_allocated: totalAssigned,
            delta: delta,
            status: currentStatus
        }
    };
}

window.syncZBBToBudgets = function() {
    const inputs = document.querySelectorAll('.zbb-cat-input');
    let synced = 0;

    inputs.forEach(input => {
        if(input.dataset.catType === "future") return; // Ignoramos las metas de Futuro y pasivos para topes de categoría
        const catId = input.dataset.catId;
        const val = parseFloat(input.value) || 0;
        const cat = db.categories.find(c => String(c.id) === String(catId));
        if(cat && val > 0) {
            cat.budget = val;
            synced++;
        }
    });

    if(synced === 0) {
        alert('No hay asignaciones para sincronizar. Ingresa montos en las categorías primero.');
        return;
    }

    // Feedback visual PRIMERO (antes de operaciones pesadas)
    const btn = document.getElementById('zbb-sync-budgets');
    if(btn) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Listo';
        btn.classList.add('zbb-confirmed');
        setTimeout(() => { btn.innerHTML = originalHTML; btn.classList.remove('zbb-confirmed'); }, 1500);
    }

    // Persistir y renderizar de forma diferida para no bloquear el paint del feedback
    requestAnimationFrame(() => {
        saveDB();
        renderSettings();
    });
}

window.saveZBBPlan = function() {
    if(!currentZBBPlan || currentZBBPlan.metrics.delta !== 0) return;
    
    // Guardamos en un registro paralelo en localStorage para historial persistente si se desea,
    // pero por ahora solo confirmamos visualmente que el plan se guardó en este mes.
    let zbbHistory = JSON.parse(localStorage.getItem('finance_zbb_history')) || [];
    // Replace old plan for this month if exists
    zbbHistory = zbbHistory.filter(p => p.month_id !== currentZBBPlan.month_id);
    zbbHistory.push(currentZBBPlan);
    localStorage.setItem('finance_zbb_history', JSON.stringify(zbbHistory));

    // Feedback visual: flash en el botón
    const btn = document.getElementById('zbb-save-plan');
    if(btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Guardado';
        btn.classList.add('zbb-confirmed');
        setTimeout(() => { btn.textContent = originalText; btn.classList.remove('zbb-confirmed'); }, 1500);
    }
}

window.exportZBBPlan = function() {
    let zbbHistory = JSON.parse(localStorage.getItem('finance_zbb_history')) || [];
    
    // Si hay un plan actual en pantalla, ofrecemos exportar ese, o el último guardado.
    let planToExport = null;
    if(currentZBBPlan && currentZBBPlan.total_income > 0) {
        planToExport = currentZBBPlan;
    } else if (zbbHistory.length > 0) {
        planToExport = zbbHistory[zbbHistory.length - 1]; // tomar el más reciente
    }
    
    if(!planToExport) {
        alert('No hay un plan ZBB activo o guardado para exportar.');
        return;
    }
    
    const dataStr = JSON.stringify(planToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZBB_Plan_${planToExport.month_id}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Iniciar aplicación
renderHome();
