import { getDoc, doc, updateDoc, deleteField, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { initializeAddMenu } from './add-menu.js';

// Variables globales para almacenar db y auth
let db = null;
let auth = null;

export function initializeNavEvents(authInstance, dbInstance, storage, provider) {
    // Asignar las instancias a las variables globales
    db = dbInstance;
    auth = authInstance;

    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');
    let homeBtn = document.getElementById('home-btn');
    let cartBtn = document.getElementById('cart-btn');

    // Función para actualizar la interfaz de autenticación
    function updateAuthUI(user) {
        if (user) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
        }
    }

    // Función para ajustar la navegación según el rol del usuario
    function updateNavBasedOnRole(userData) {
        if (!homeBtn || !cartBtn || !profileBtn) return;

        const newBtn = document.getElementById('new-btn');

        if (userData && userData.role === 'store') {
            homeBtn.style.display = 'block';
            cartBtn.style.display = 'none';
            profileBtn.style.display = 'block';
            newBtn.style.display = 'block';
        } else if (userData && userData.role === 'creator') {
            homeBtn.style.display = 'block';
            cartBtn.style.display = 'none';
            profileBtn.style.display = 'block';
            newBtn.style.display = 'block';
        } else if (userData && userData.role === 'client') {
            homeBtn.style.display = 'block';
            cartBtn.style.display = 'block';
            profileBtn.style.display = 'block';
            newBtn.style.display = 'none';
        } else {
            homeBtn.style.display = 'block';
            cartBtn.style.display = 'none';
            profileBtn.style.display = 'block';
            newBtn.style.display = 'none';
        }
    }

    // Escuchar cambios en el estado de autenticación
    auth.onAuthStateChanged(async (user) => {
        updateAuthUI(user);
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            updateNavBasedOnRole(userDoc.exists() ? userDoc.data() : null);
        } else {
            updateNavBasedOnRole(null);
        }
    });

    // Evento para iniciar sesión con Google
    loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch((error) => {
            console.error('Error al iniciar sesión:', error);
        });
    });

    // Evento para cerrar sesión
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error al cerrar sesión:', error);
        });
    });

    // Evento para el botón de perfil
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

    // Asignar evento al botón de inicio
    function assignHomeButtonEvent() {
        homeBtn = document.getElementById('home-btn');
        if (homeBtn && !homeBtn.dataset.listenerAdded) {
            homeBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
            homeBtn.dataset.listenerAdded = 'true';
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

    // Cargar el modal de productos dinámicamente
    fetch('add-product.html')
        .then(response => response.text())
        .then(html => {
            const body = document.body;
            body.insertAdjacentHTML('beforeend', html);
            const feedContainer = document.querySelector('.feed-container') || document.createElement('div');
            initializeAddProduct(db, storage, auth.currentUser ? auth.currentUser.storeId : 'unknown', feedContainer);
        })
        .catch(error => console.error('Error al cargar add-product.html:', error));

    // Cargar la sidebar del carrito dinámicamente
    fetch('cart.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initializeCartSidebar(); // Inicializar eventos después de cargar
        })
        .catch(error => console.error('Error al cargar cart.html:', error));

    // Función para inicializar los eventos de la sidebar del carrito
    function initializeCartSidebar() {
        const cartSidebar = document.getElementById('cart-sidebar');
        const closeCartBtn = document.getElementById('close-cart-sidebar');
        cartBtn = document.getElementById('cart-btn');

        // Función para abrir/cerrar la sidebar
        function toggleCartSidebar() {
            if (cartSidebar) {
                cartSidebar.classList.toggle('open');
            }
        }

        // Evento para abrir la sidebar al hacer clic en el botón del carrito
        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleCartSidebar();
            });
        }

        // Evento para cerrar la sidebar al hacer clic en el botón de cerrar
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleCartSidebar();
            });
        }
    }

    assignHomeButtonEvent();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                const navContainer = document.getElementById('nav-container');
                if (navContainer && navContainer.querySelector('#home-btn')) {
                    assignHomeButtonEvent();
                    observer.disconnect();
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Función para inicializar eventos de productos (si es necesario en otras partes)
function initializeAddProduct(db, storage, storeId, feedContainer) {
    console.log('Inicializando add-product para', storeId);
}