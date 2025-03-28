import { getDoc, doc, updateDoc, deleteField, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { initializeAddProduct } from './add-product.js';
import { initializeCart } from './cart.js';

// Estado de la aplicación
const appState = {
    componentsLoaded: false,
    auth: null,
    db: null,
    storage: null,
    provider: null
};

export function initializeNavEvents(auth, db, storage, provider) {
    // Guardar instancias en el estado
    appState.auth = auth;
    appState.db = db;
    appState.storage = storage;
    appState.provider = provider;

    // Cargar componentes una sola vez
    if (!appState.componentsLoaded) {
        loadNavComponents().then(() => {
            setupAuthHandlers();
            setupAddMenu();
            setupCart();
            appState.componentsLoaded = true;
        });
    } else {
        // Si ya estaban cargados, solo actualizar handlers
        setupAuthHandlers();
    }
}

// ----------------------
// Funciones principales
// ----------------------

async function loadNavComponents() {
    try {
        // Cargar componentes en paralelo
        await Promise.all([
            loadComponent('add-menu.html', '.bottom-nav'),
            loadComponent('add-product.html', 'body'),
            loadComponent('cart.html', 'body')
        ]);
    } catch (error) {
        console.error('Error loading nav components:', error);
    }
}

function setupAuthHandlers() {
    const { auth, provider } = appState;
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');

    // Actualizar UI según autenticación
    auth.onAuthStateChanged(async (user) => {
        updateAuthUI(user);
        if (user) {
            const userDoc = await getDoc(doc(appState.db, 'users', user.uid));
            updateNavBasedOnRole(userDoc.exists() ? userDoc.data() : null);
        } else {
            updateNavBasedOnRole(null);
        }
    });

    // Handlers de autenticación
    if (loginBtn) loginBtn.onclick = () => signInWithPopup(auth, provider).catch(console.error);
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut().then(() => window.location.href = 'index.html');
    if (profileBtn) profileBtn.onclick = handleProfileClick;
}

function setupAddMenu() {
    const newBtn = document.getElementById('new-btn');
    const addMenu = document.getElementById('add-menu');

    if (!newBtn || !addMenu) return;

    newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addMenu.style.display = addMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!addMenu.contains(e.target) && e.target !== newBtn) {
            addMenu.style.display = 'none';
        }
    });

    // Delegación de eventos para las opciones
    addMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('#add-product-option')) {
            handleAddProductOption();
        } else if (e.target.closest('#add-story-option')) {
            handleAddStoryOption();
        }
    });
}

function setupCart() {
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        initializeCart(appState.db);
        cartBtn.addEventListener('click', () => {
            document.getElementById('cart-sidebar').classList.add('open');
        });
    }
}

// ----------------------
// Handlers específicos
// ----------------------

async function handleAddProductOption() {
    const { db, storage, auth } = appState;
    const addProductModal = document.getElementById('add-product-modal');
    
    if (!addProductModal) {
        console.error('Modal de producto no encontrado');
        return;
    }

    // Obtener storeId del contexto actual
    let storeId = 'default';
    if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
            storeId = userDoc.data().storeId || storeId;
        }
    }

    // Usar el feedContainer de la página actual o crear uno temporal
    const feedContainer = document.querySelector('.feed-container') || document.createElement('div');
    
    // Inicializar y mostrar modal
    initializeAddProduct(db, storage, storeId, feedContainer);
    addProductModal.style.display = 'flex';
    document.getElementById('add-menu').style.display = 'none';
}

function handleAddStoryOption() {
    const storyModal = document.getElementById('upload-story-modal');
    if (storyModal) {
        storyModal.style.display = 'flex';
        document.getElementById('add-menu').style.display = 'none';
    }
}

function handleProfileClick() {
    const { auth, db } = appState;
    if (!auth.currentUser) {
        signInWithPopup(auth, appState.provider).catch(console.error);
        return;
    }

    getDoc(doc(db, 'users', auth.currentUser.uid)).then((userDoc) => {
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'store' && userData.storeId) {
                window.location.href = `/${userData.storeId}`;
            } else {
                window.location.href = 'profile.html';
            }
        } else {
            window.location.href = 'create-store.html';
        }
    });
}

// ----------------------
// Funciones de utilidad
// ----------------------

async function loadComponent(url, containerSelector) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const container = document.querySelector(containerSelector);
        if (container && !container.querySelector(url.replace('.html', ''))) {
            container.insertAdjacentHTML('beforeend', html);
        }
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
    }
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginBtn) loginBtn.style.display = user ? 'none' : 'block';
    if (logoutBtn) logoutBtn.style.display = user ? 'block' : 'none';
}

function updateNavBasedOnRole(userData) {
    const homeBtn = document.getElementById('home-btn');
    const cartBtn = document.getElementById('cart-btn');
    const profileBtn = document.getElementById('profile-btn');
    const newBtn = document.getElementById('new-btn');

    if (!homeBtn || !cartBtn || !profileBtn || !newBtn) return;

    const role = userData?.role || 'guest';
    
    homeBtn.style.display = 'block';
    profileBtn.style.display = 'block';
    
    // Configuración por rol
    switch (role) {
        case 'store':
            cartBtn.style.display = 'none';
            newBtn.style.display = 'block';
            break;
        case 'creator':
            cartBtn.style.display = 'none';
            newBtn.style.display = 'block';
            break;
        case 'client':
            cartBtn.style.display = 'block';
            newBtn.style.display = 'none';
            break;
        default:
            cartBtn.style.display = 'none';
            newBtn.style.display = 'none';
    }
}