// nav.js
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { showCartModal } from './store-profile.js';
import { initializeAddMenu } from './add-menu.js';
import { initializeCart } from './cart.js';

export function initializeNavEvents(auth, db, storage, provider) {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');
    let homeBtn = document.getElementById('home-btn');
    let cartBtn = document.getElementById('cart-btn');

    function updateAuthUI(user) {
        if (user) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
        }
    }

    // nav.js
function updateNavBasedOnRole(userData) {
    if (!homeBtn || !cartBtn || !profileBtn) return;

    const newBtn = document.getElementById('new-btn'); // Agregar referencia al botón "Añadir"

    if (userData && userData.role === 'store') {
        homeBtn.style.display = 'block';
        cartBtn.style.display = 'none';
        profileBtn.style.display = 'block';
        newBtn.style.display = 'block'; // Visible para tiendas
    } else if (userData && userData.role === 'creator') {
        homeBtn.style.display = 'block';
        cartBtn.style.display = 'none'; // Creadores no tienen carrito
        profileBtn.style.display = 'block';
        newBtn.style.display = 'block'; // Visible para creadores
    } else if (userData && userData.role === 'client') {
        homeBtn.style.display = 'block';
        cartBtn.style.display = 'block';
        profileBtn.style.display = 'block';
        newBtn.style.display = 'none'; // Oculto para clientes
    } else {
        homeBtn.style.display = 'block';
        cartBtn.style.display = 'none';
        profileBtn.style.display = 'block';
        newBtn.style.display = 'none'; // Oculto si no hay rol definido
    }
}

    auth.onAuthStateChanged(async (user) => {
        updateAuthUI(user);
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            updateNavBasedOnRole(userDoc.exists() ? userDoc.data() : null);
        } else {
            updateNavBasedOnRole(null);
        }
    });

    loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch((error) => {
            console.error('Error al iniciar sesión:', error);
        });
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error al cerrar sesión:', error);
        });
    });

    if (profileBtn) {
        profileBtn.addEventListener('click', async () => {
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.role === 'store' && userData.storeId) {
                        window.location.href = `/${userData.storeId}`;
                    } else if (userData.role === 'client' || userData.role === 'creator') {
                        window.location.href = 'profile.html';
                    } else {
                        window.location.href = 'create-store.html';
                    }
                } else {
                    window.location.href = 'create-store.html';
                }
            } else {
                signInWithPopup(auth, provider).catch((error) => {
                    console.error('Error al iniciar sesión:', error);
                });
            }
        });
    }

    function assignHomeButtonEvent() {
        homeBtn = document.getElementById('home-btn');
        if (homeBtn && !homeBtn.dataset.listenerAdded) {
            homeBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
            homeBtn.dataset.listenerAdded = 'true';
        }
    }

    function assignCartButtonEvent() {
        cartBtn = document.getElementById('cart-btn');
        if (cartBtn && !cartBtn.dataset.listenerAdded) {
            cartBtn.addEventListener('click', () => {
                const elements = {
                    cartModal: document.getElementById('cart-modal'),
                    cartItems: document.getElementById('cart-items'),
                    cartCount: document.getElementById('cart-count'),
                    closeCartModal: document.getElementById('close-cart-modal')
                };
                if (!elements.cartModal || !elements.cartItems) return;
                const slug = new URLSearchParams(window.location.search).get('slug') || 'unknown';
                showCartModal(db, elements, slug, 'Tienda actual');
            });
            cartBtn.dataset.listenerAdded = 'true';
        }
    }

    // Cargar el menú dinámicamente dentro de bottom-nav
    fetch('add-menu.html')
        .then(response => response.text())
        .then(html => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) {
                nav.insertAdjacentHTML('beforeend', html);
                initializeAddMenu(auth, db, storage);
            } else {
                console.error('No se encontró .bottom-nav para insertar add-menu');
            }
        })
        .catch(error => console.error('Error al cargar add-menu.html:', error));

    // Cargar el carrito dinámicamente
    fetch('cart.html')
        .then(response => response.text())
        .then(html => {
            const body = document.body;
            body.insertAdjacentHTML('beforeend', html);
            initializeCart(db);
        })
        .catch(error => console.error('Error al cargar cart.html:', error));

    // Cargar el modal de productos dinámicamente
    fetch('add-product.html')
        .then(response => response.text())
        .then(html => {
            const body = document.body;
            body.insertAdjacentHTML('beforeend', html); // Inserta el modal en el DOM
            const feedContainer = document.querySelector('.feed-container') || document.createElement('div'); // Asegúrate de tener un contenedor para el feed
            initializeAddProduct(db, storage, auth.currentUser ? auth.currentUser.storeId : 'unknown', feedContainer); // Inicializa la lógica del modal
        })
        .catch(error => console.error('Error al cargar add-product.html:', error));

    assignHomeButtonEvent();
    assignCartButtonEvent();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                const navContainer = document.getElementById('nav-container');
                if (navContainer && (navContainer.querySelector('#home-btn') || navContainer.querySelector('#cart-btn'))) {
                    assignHomeButtonEvent();
                    assignCartButtonEvent();
                    observer.disconnect();
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}