let tg = window.Telegram.WebApp;
let userData = tg.initDataUnsafe?.user || {};
let currentView = 'shop';
let balance = 0;
let gifts = [];
let categories = [];
let inventory = [];

// Инициализация
tg.ready();
tg.expand();

// Загружаем данные
async function loadData() {
    await loadBalance();
    await loadGifts();
    await loadInventory();
}

async function loadBalance() {
    try {
        const response = await fetch('/webapp-data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'get_balance'})
        });
        const data = await response.json();
        balance = data.balance;
        updateBalance();
    } catch (e) {
        console.error('Balance error:', e);
    }
}

async function loadGifts() {
    try {
        const response = await fetch('/webapp-data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'get_gifts'})
        });
        const data = await response.json();
        gifts = data.gifts;
        categories = data.categories;
        renderShop();
    } catch (e) {
        console.error('Gifts error:', e);
    }
}

async function loadInventory() {
    try {
        const response = await fetch('/webapp-data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'get_inventory'})
        });
        const data = await response.json();
        inventory = data.inventory;
        if (currentView === 'inventory') renderInventory();
    } catch (e) {
        console.error('Inventory error:', e);
    }
}

function updateBalance() {
    document.querySelector('.balance-amount').textContent = balance;
}

// Показать магазин
function showShop() {
    currentView = 'shop';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.nav-btn:first-child').classList.add('active');
    renderShop();
}

// Показать инвентарь
function showInventory() {
    currentView = 'inventory';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.nav-btn:last-child').classList.add('active');
    renderInventory();
}

// Рендер магазина
function renderShop() {
    const content = document.getElementById('content');
    
    let html = `
        <div class="categories">
            <div class="category-chip active" onclick="filterCategory('all')">Все</div>
    `;
    
    categories.forEach(cat => {
        html += `<div class="category-chip" onclick="filterCategory(${cat.id})">${cat.emoji} ${cat.name}</div>`;
    });
    
    html += `</div><div class="shop-grid" id="shopGrid">`;
    
    gifts.forEach(gift => {
        const available = gift.supply === 0 || gift.sold < gift.supply;
        const endsSoon = gift.ends_at && new Date(gift.ends_at) < new Date(Date.now() + 86400000);
        
        html += `
            <div class="gift-card" onclick="showGiftDetails(${gift.id})">
                <img src="${gift.preview_file_id || 'placeholder.png'}" class="gift-preview">
                <div class="gift-name">${gift.name}</div>
                <div class="gift-price">
                    <span>💰</span>
                    <span>${gift.price}</span>
                </div>
                ${gift.supply > 0 ? `
                    <div class="gift-sold">Осталось: ${gift.supply - gift.sold}</div>
                ` : ''}
                ${endsSoon ? '<div class="gift-badge">🔥 Скоро конец</div>' : ''}
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
}

// Рендер инвентаря
function renderInventory() {
    const content = document.getElementById('content');
    
    if (inventory.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 50px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
                <h3>Инвентарь пуст</h3>
                <p>Купите подарки в магазине!</p>
                <button class="btn" onclick="showShop()">В магазин</button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="inventory-grid">';
    
    inventory.forEach(item => {
        html += `
            <div class="inventory-item ${item.is_used ? 'used' : ''}" onclick="showGiftActions(${item.id})">
                <img src="${item.preview_file_id || 'placeholder.png'}" class="gift-preview">
                <div class="gift-name">${item.name}</div>
                ${item.is_used ? '<div class="inventory-badge">Использован</div>' : ''}
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
}

// Показать детали подарка
function showGiftDetails(giftId) {
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    const available = gift.supply === 0 || gift.sold < gift.supply;
    const canBuy = balance >= gift.price && available;
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            <div class="gift-details">
                <img src="${gift.preview_file_id || 'placeholder.png'}" class="gift-large-preview">
                <h2>${gift.name}</h2>
                <p class="gift-description">${gift.description || 'Нет описания'}</p>
                
                <div class="gift-stats">
                    <div class="stat">
                        <span class="stat-value">${gift.price}</span>
                        <span class="stat-label">Цена</span>
                    </div>
                    ${gift.supply > 0 ? `
                        <div class="stat">
                            <span class="stat-value">${gift.supply - gift.sold}</span>
                            <span class="stat-label">Осталось</span>
                        </div>
                    ` : ''}
                </div>
                
                ${gift.ends_at ? `
                    <p>⏰ До: ${new Date(gift.ends_at).toLocaleDateString()}</p>
                ` : ''}
                
                <button class="btn" ${!canBuy ? 'disabled' : ''} onclick="buyGift(${gift.id})">
                    ${canBuy ? 'Купить' : (balance < gift.price ? 'Недостаточно средств' : 'Нет в наличии')}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Показать действия с подарком
function showGiftActions(userGiftId) {
    const item = inventory.find(i => i.id === userGiftId);
    if (!item || item.is_used) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            <div class="gift-details">
                <img src="${item.preview_file_id || 'placeholder.png'}" class="gift-large-preview">
                <h2>${item.name}</h2>
                
                <button class="btn" onclick="useGift(${userGiftId})">Использовать</button>
                <button class="btn btn-outline" onclick="showSendForm(${userGiftId})">Подарить другу</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Купить подарок
async function buyGift(giftId) {
    try {
        const response = await fetch('/webapp-data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'purchase',
                gift_id: giftId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Подарок куплен!');
            await loadBalance();
            await loadInventory();
            document.querySelector('.modal')?.remove();
        } else {
            showToast('❌ ' + result.error);
        }
    } catch (e) {
        showToast('❌ Ошибка при покупке');
    }
}

// Использовать подарок
async function useGift(userGiftId) {
    try {
        const response = await fetch('/webapp-data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'use_gift',
                user_gift_id: userGiftId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Подарок использован!');
            await loadInventory();
            document.querySelector('.modal')?.remove();
        }
    } catch (e) {
        showToast('❌ Ошибка');
    }
}

// Показать форму отправки
function showSendForm(userGiftId) {
    const modal = document.querySelector('.modal.active');
    if (!modal) return;
    
    const content = modal.querySelector('.modal-content');
    
    content.innerHTML = `
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        <h2>🎁 Подарить другу</h2>
        
        <div class="send-form">
            <input type="text" id="sendUsername" placeholder="@username">
            <textarea id="sendMessage" placeholder="Сообщение (необязательно)"></textarea>
            <button class="btn" onclick="sendGift(${userGiftId})">Отправить</button>
            <button class="btn btn-outline" onclick="showGiftActions(${userGiftId})">Назад</button>
        </div>
    `;
}

// Отправить подарок
async function sendGift(userGiftId) {
    const username = document.getElementById('sendUsername').value;
    const message = document.getElementById('sendMessage').value;
    
    if (!username) {
        showToast('❌ Введите username');
        return;
    }
    
    try {
        const response = await fetch('/webapp-data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'send_gift',
                user_gift_id: userGiftId,
                to_username: username,
                message: message
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Подарок отправлен!');
            await loadInventory();
            document.querySelector('.modal')?.remove();
        } else {
            showToast('❌ ' + result.error);
        }
    } catch (e) {
        showToast('❌ Ошибка');
    }
}

// Показать уведомление
function showToast(text) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// Загрузка при старте
loadData();