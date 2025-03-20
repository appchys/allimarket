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

    // nav.js (fragmento relevante)
function assignCartButtonEvent() {
    cartBtn = document.getElementById('cart-btn');
    if (cartBtn && !cartBtn.dataset.listenerAdded) {
        cartBtn.addEventListener('click', () => {
            const elements = {
                cartModal: document.getElementById('cart-modal'),
                cartItems: document.getElementById('cart-items'),
                cartCount: document.getElementById('cart-count'), // Mantener cartCount
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
    // nav.js (fragmento ajustado)
fetch('cart.html')
.then(response => response.text())
.then(html => {
    const body = document.body;
    body.insertAdjacentHTML('beforeend', html);
    initializeCart(db); // Inicializa la lógica del carrito
    initializeSidebarEvents(); // Nueva función para manejar eventos de la sidebar
})
.catch(error => console.error('Error al cargar cart.html:', error));

// Nueva función para manejar eventos de la sidebar
function initializeSidebarEvents() {
const cartBtn = document.getElementById('cart-btn');
const cartSidebar = document.getElementById('cart-sidebar');
const closeCartSidebar = document.getElementById('close-cart-sidebar');

// Abrir la sidebar al hacer clic en el botón del carrito
cartBtn.addEventListener('click', () => {
    cartSidebar.classList.add('open');
    updateCartSidebar(); // Nueva función para actualizar el contenido de la sidebar
});

// Cerrar la sidebar al hacer clic en el botón de cerrar
closeCartSidebar.addEventListener('click', () => {
    cartSidebar.classList.remove('open');
});

// Opcional: Cerrar la sidebar al hacer clic fuera de ella
document.addEventListener('click', (e) => {
    if (!cartSidebar.contains(e.target) && e.target !== cartBtn) {
        cartSidebar.classList.remove('open');
    }
});
}
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

// nav.js (agregar al final del archivo)

// Función para actualizar el contenido de la sidebar
async function updateCartSidebar() {
    const cartSidebarContent = document.querySelector('.cart-sidebar-content');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCountElement = document.getElementById('cart-count');
    let totalItems = 0;
    let totalPrice = 0;

    // Limpiar el contenido actual
    cartSidebarContent.innerHTML = '';

    // Obtener los datos del carrito (esto depende de cómo lo almacenes)
    // Aquí asumimos que tienes una función `getCartData` que devuelve los datos del carrito
    const cart = await getCartData(db); // Debes implementar esta función según tu lógica

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

        // Crear una sección para la tienda
        const storeSection = document.createElement('div');
        storeSection.classList.add('cart-store-section');

        // Título de la tienda
        const storeTitle = document.createElement('h3');
        storeTitle.textContent = `Tienda: ${storeId}`; // Puedes obtener el nombre real de la tienda desde Firebase
        storeSection.appendChild(storeTitle);

        // Lista de productos
        const itemList = document.createElement('ul');
        storeItems.forEach(item => {
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
                <button class="remove-item" data-store="${storeId}" data-item="${item.id}">Eliminar</button>
            `;
            itemList.appendChild(listItem);
        });
        storeSection.appendChild(itemList);

        // Subtotal de la tienda
        const storeSubtotalElement = document.createElement('p');
        storeSubtotalElement.classList.add('store-subtotal');
        storeSubtotalElement.textContent = `Subtotal: $${storeSubtotal.toFixed(2)}`;
        storeSection.appendChild(storeSubtotalElement);

        // Botón de checkout para la tienda
        const checkoutBtn = document.createElement('button');
        checkoutBtn.classList.add('checkout-btn');
        checkoutBtn.textContent = 'Checkout';
        checkoutBtn.addEventListener('click', () => {
            handleCheckout(storeId); // Implementar esta función según tu lógica
        });
        storeSection.appendChild(checkoutBtn);

        cartSidebarContent.appendChild(storeSection);
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

// Función para obtener los datos del carrito (ejemplo)
async function getCartData(db) {
    // Implementa esta función según tu lógica de almacenamiento
    // Por ejemplo, si usas Firebase:
    /*
    const userId = auth.currentUser.uid;
    const cartRef = doc(db, 'carts', userId);
    const cartDoc = await getDoc(cartRef);
    return cartDoc.exists() ? cartDoc.data() : {};
    */
    // Por ahora, devolvemos un ejemplo estático
    return {
        "store1": [
            { id: "prod1", name: "12 unidades de Wantan BBQ", price: 2.75, quantity: 2 },
            { id: "prod2", name: "Producto 2", price: 5.00, quantity: 1 }
        ],
        "store2": [
            { id: "prod3", name: "Producto 3", price: 3.50, quantity: 3 }
        ]
    };
}

// Función para manejar el checkout por tienda
function handleCheckout(storeId) {
    console.log(`Iniciando checkout para la tienda: ${storeId}`);
    // Implementa la lógica de checkout aquí (por ejemplo, redirigir a una página de pago)
    // window.location.href = `/checkout?store=${storeId}`;
}

// Agregar evento para eliminar ítems
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-item')) {
        const storeId = e.target.dataset.store;
        const itemId = e.target.dataset.item;
        // Implementa la lógica para eliminar el ítem del carrito
        // Por ejemplo, si usas Firebase:
        /*
        const userId = auth.currentUser.uid;
        const cartRef = doc(db, 'carts', userId);
        await updateDoc(cartRef, {
            [`${storeId}.${itemId}`]: deleteField()
        });
        */
        console.log(`Eliminando ítem ${itemId} de la tienda ${storeId}`);
        updateCartSidebar(); // Actualizar la sidebar después de eliminar
    }
});