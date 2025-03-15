export function initializeCart(db) {
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const closeCartModal = document.getElementById('close-cart-modal');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!cartBtn || !cartModal || !cartItems || !cartCount || !closeCartModal || !checkoutBtn) {
        console.error('Elementos del carrito no encontrados en el DOM');
        return;
    }

    // Mostrar el modal del carrito
    cartBtn.addEventListener('click', () => {
        cartModal.style.display = 'flex';
        loadCartItems(db, cartItems, cartCount);
    });

    // Cerrar el modal del carrito
    closeCartModal.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });

    // Finalizar compra
    checkoutBtn.addEventListener('click', () => {
        alert('Compra finalizada');
        cartModal.style.display = 'none';
    });

    // Cargar los elementos del carrito
    function loadCartItems(db, cartItems, cartCount) {
        cartItems.innerHTML = ''; // Limpia el contenido actual
        const slug = new URLSearchParams(window.location.search).get('slug') || 'unknown';

        // Simulación de carga de datos del carrito desde Firestore
        db.collection('cart').where('storeSlug', '==', slug).get().then((querySnapshot) => {
            let totalItems = 0;
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `
                    <span>${item.name}</span>
                    <span>${item.price} USD</span>
                `;
                cartItems.appendChild(itemElement);
                totalItems++;
            });
            cartCount.textContent = `${totalItems} productos`;
        }).catch((error) => {
            console.error('Error al cargar los elementos del carrito:', error);
        });
    }
}