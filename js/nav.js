import { getDoc, doc, updateDoc, deleteField, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { initializeAddMenu } from './add-menu.js';
import { initializeCart } from './cart.js';

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

    // Cargar el carrito dinámicamente
    fetch('cart.html')
        .then(response => response.text())
        .then(html => {
            const body = document.body;
            body.insertAdjacentHTML('beforeend', html);
            initializeCart(db);
            initializeSidebarEvents();
        })
        .catch(error => console.error('Error al cargar cart.html:', error));

    // Nueva función para manejar eventos de la sidebar
    function initializeSidebarEvents() {
        const waitForElements = setInterval(() => {
            const cartBtn = document.getElementById('cart-btn');
            const cartSidebar = document.getElementById('cart-sidebar');
            const closeCartSidebar = document.getElementById('close-cart-sidebar');

            if (cartBtn && cartSidebar && closeCartSidebar) {
                clearInterval(waitForElements);

                cartBtn.removeEventListener('click', openSidebarHandler);
                closeCartSidebar.removeEventListener('click', closeSidebarHandler);
                document.removeEventListener('click', outsideClickHandler);

                cartBtn.addEventListener('click', openSidebarHandler);
                function openSidebarHandler(e) {
                    e.stopPropagation();
                    cartSidebar.classList.add('open');
                    updateCartSidebar();
                }

                closeCartSidebar.addEventListener('click', closeSidebarHandler);
                function closeSidebarHandler(e) {
                    e.stopPropagation();
                    cartSidebar.classList.remove('open');
                }

                document.addEventListener('click', outsideClickHandler);
                function outsideClickHandler(e) {
                    if (!cartSidebar.contains(e.target) && e.target !== cartBtn && !cartBtn.contains(e.target)) {
                        cartSidebar.classList.remove('open');
                    }
                }
            }
        }, 100);
    }

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

// Función para actualizar el contenido de la sidebar
async function updateCartSidebar() {
    const cartSidebarContent = document.querySelector('.cart-sidebar-content');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCountElement = document.getElementById('cart-count');
    let totalItems = 0;
    let totalPrice = 0;

    if (!cartSidebarContent || !cartTotalElement || !cartCountElement) {
        console.error('Elementos de la sidebar no encontrados');
        return;
    }

    // Limpiar el contenido actual
    cartSidebarContent.innerHTML = '';

    // Obtener los datos del carrito
    const cart = await getCartData();

    if (!cart || Object.keys(cart).length === 0) {
        cartSidebarContent.innerHTML = '<p>El carrito está vacío.</p>';
        cartTotalElement.textContent = '$0.00';
        cartCountElement.textContent = '0';
        cartCountElement.classList.remove('active');
        return;
    }

    // Iterar sobre cada tienda en el carrito
    for (const storeId in cart) {
        const storeItems = cart[storeId];
        let storeSubtotal = 0;
        const itemCount = Object.keys(storeItems).length;

        // Solo crear la sección si hay ítems en la tienda
        if (itemCount > 0) {
            const storeSection = document.createElement('div');
            storeSection.classList.add('cart-store-section');
            storeSection.dataset.storeId = storeId;

            // Título de la tienda
            const storeTitle = document.createElement('h3');
            storeTitle.textContent = `Tienda: ${storeId}`;
            storeSection.appendChild(storeTitle);

            // Lista de productos
            const itemList = document.createElement('ul');
            for (const itemId in storeItems) {
                const item = storeItems[itemId];
                const itemTotal = item.price * item.quantity;
                storeSubtotal += itemTotal;
                totalPrice += itemTotal;
                totalItems += item.quantity;

                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <div class="item-details">
                        <p>${item.name}</p>
                    </div>
                    <span class="item-quantity">x${item.quantity}</span>
                    <span class="item-total">$${(itemTotal).toFixed(2)}</span>
                    <button class="remove-item" data-store="${storeId}" data-item="${itemId}">Eliminar</button>
                `;
                itemList.appendChild(listItem);
            }
            storeSection.appendChild(itemList);

            // Subtotal de la tienda
            const storeSubtotalElement = document.createElement('p');
            storeSubtotalElement.classList.add('store-subtotal');
            storeSubtotalElement.textContent = `Subtotal: $${storeSubtotal.toFixed(2)}`;
            storeSection.appendChild(storeSubtotalElement);

            // Botón de checkout para la tienda
            const checkoutBtn = document.createElement('button');
            checkoutBtn.classList.add('checkout-store-btn');
            checkoutBtn.setAttribute('data-store-id', storeId);
            checkoutBtn.textContent = 'Checkout';
            storeSection.appendChild(checkoutBtn);

            cartSidebarContent.appendChild(storeSection);
        }
    }

    // Actualizar el total general y el contador
    cartTotalElement.textContent = `$${totalPrice.toFixed(2)}`;
    cartCountElement.textContent = totalItems;
    if (totalItems > 0) {
        cartCountElement.classList.add('active');
    } else {
        cartCountElement.classList.remove('active');
    }
}

// Función para obtener los datos del carrito desde Firebase
async function getCartData() {
    try {
        if (!auth.currentUser) {
            console.error('Usuario no autenticado');
            return {};
        }

        const userId = auth.currentUser.uid;
        console.log('Obteniendo carrito para el usuario:', userId);

        const cartRef = doc(db, 'carts', userId);
        const cartDoc = await getDoc(cartRef);

        if (cartDoc.exists()) {
            const cartData = cartDoc.data();
            console.log('Datos del carrito obtenidos:', cartData);

            // Limpiar tiendas vacías del objeto cartData
            for (const storeId in cartData) {
                if (Object.keys(cartData[storeId]).length === 0) {
                    delete cartData[storeId];
                }
            }
            return cartData;
        } else {
            console.log('El carrito está vacío o no existe');
            return {};
        }
    } catch (error) {
        console.error('Error al obtener los datos del carrito:', error);
        return {};
    }
}

// Función para agregar un producto al carrito
export async function addToCart(storeId, product) {
    try {
        if (!auth.currentUser) {
            console.error('Usuario no autenticado');
            return;
        }

        const userId = auth.currentUser.uid;
        const cartRef = doc(db, 'carts', userId);

        // Verificar si el producto ya está en el carrito
        const cartDoc = await getDoc(cartRef);
        let cartData = cartDoc.exists() ? cartDoc.data() : {};

        if (cartData[storeId] && cartData[storeId][product.id]) {
            cartData[storeId][product.id].quantity += 1;
        } else {
            if (!cartData[storeId]) {
                cartData[storeId] = {};
            }
            cartData[storeId][product.id] = {
                name: product.name,
                price: product.price,
                quantity: 1
            };
        }

        await setDoc(cartRef, cartData, { merge: true });
        console.log(`Producto ${product.id} añadido al carrito para la tienda ${storeId}`);
        updateCartSidebar();
    } catch (error) {
        console.error('Error al añadir el producto al carrito:', error);
    }
}

// Función para manejar el checkout por tienda
function handleCheckout(storeId) {
    console.log(`Iniciando checkout para la tienda: ${storeId}`);
    window.location.href = `/checkout.html?store=${storeId}`;
}

// Agregar evento para eliminar ítems
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-item')) {
        const storeId = e.target.dataset.store;
        const itemId = e.target.dataset.item;

        try {
            if (!auth.currentUser) {
                console.error('Usuario no autenticado');
                return;
            }

            const userId = auth.currentUser.uid;
            const cartRef = doc(db, 'carts', userId);

            // Eliminar el ítem del carrito
            await updateDoc(cartRef, {
                [`${storeId}.${itemId}`]: deleteField()
            });

            // Obtener datos actualizados del carrito
            const cartDoc = await getDoc(cartRef);
            const cartData = cartDoc.exists() ? cartDoc.data() : {};

            // Si la tienda no tiene más ítems, eliminarla completamente
            if (cartData[storeId] && Object.keys(cartData[storeId]).length === 0) {
                await updateDoc(cartRef, {
                    [storeId]: deleteField()
                });
            }

            console.log(`Ítem ${itemId} eliminado de la tienda ${storeId}`);
            updateCartSidebar();
        } catch (error) {
            console.error('Error al eliminar el ítem:', error);
        }
    }

    // Agregar evento para los botones de checkout
    if (e.target.classList.contains('checkout-store-btn')) {
        const storeId = e.target.dataset.storeId;
        handleCheckout(storeId);
    }
});

// Función para inicializar eventos de productos (si es necesario en otras partes)
function initializeAddProduct(db, storage, storeId, feedContainer) {
    // Esta función parece incompleta en el contexto original; aquí se deja como placeholder
    console.log('Inicializando add-product para', storeId);
}