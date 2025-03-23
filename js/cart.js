import { doc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Función para actualizar el carrito en la barra lateral
export async function updateCartSidebar(db, userId) {
    const cartSidebarContent = document.querySelector('.cart-sidebar-content');
    const cartTotalElement = document.getElementById('cart-total');
    const cartRef = doc(db, 'carts', userId);

    // Escuchar cambios en tiempo real en el carrito
    onSnapshot(cartRef, (cartDoc) => {
        if (cartDoc.exists()) {
            const cartData = cartDoc.data();
            let grandTotal = 0;

            // Limpiar el contenido actual
            cartSidebarContent.innerHTML = '';

            // Iterar sobre cada tienda en el carrito
            for (const storeId in cartData) {
                const storeItems = cartData[storeId];
                
                // Verificar si la tienda tiene ítems
                if (Object.keys(storeItems).length === 0) {
                    continue; // Saltar esta tienda si no tiene productos
                }

                // Calcular el subtotal de la tienda
                const subtotal = Object.values(storeItems).reduce((sum, item) => sum + item.price * item.quantity, 0);
                grandTotal += subtotal;

                // Crear la sección de la tienda
                const storeSection = document.createElement('div');
                storeSection.classList.add('cart-store-section');
                storeSection.dataset.storeId = storeId;

                // Añadir el nombre de la tienda
                const storeTitle = document.createElement('h3');
                storeTitle.textContent = `Tienda: ${storeId}`; // Podrías mapear storeId a un nombre real si tienes esa info
                storeSection.appendChild(storeTitle);

                // Añadir la lista de productos
                const itemList = document.createElement('ul');
                for (const itemId in storeItems) {
                    const item = storeItems[itemId];
                    const itemTotal = item.price * item.quantity;
                    const listItem = document.createElement('li');
                    listItem.textContent = `${item.name} (x${item.quantity}) - $${itemTotal.toFixed(2)}`;
                    itemList.appendChild(listItem);
                }
                storeSection.appendChild(itemList);

                // Añadir el botón de checkout
                const checkoutButton = document.createElement('button');
                checkoutButton.classList.add('checkout-store-btn');
                checkoutButton.dataset.storeId = storeId;
                checkoutButton.textContent = 'Checkout';
                storeSection.appendChild(checkoutButton);

                // Añadir la sección al contenedor
                cartSidebarContent.appendChild(storeSection);
            }

            // Actualizar el total general
            cartTotalElement.textContent = `$${grandTotal.toFixed(2)}`;

            // Si no hay tiendas con productos, mostrar mensaje
            if (cartSidebarContent.children.length === 0) {
                cartSidebarContent.innerHTML = '<p>El carrito está vacío.</p>';
            }
        } else {
            // Si el carrito no existe, mostrar mensaje
            cartSidebarContent.innerHTML = '<p>El carrito está vacío.</p>';
            cartTotalElement.textContent = '$0.00';
        }
    }, (error) => {
        console.error('Error al actualizar el carrito:', error);
        cartSidebarContent.innerHTML = '<p>Error al cargar el carrito.</p>';
    });
}

// Inicializar el carrito cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;

    auth.onAuthStateChanged((user) => {
        if (user) {
            updateCartSidebar(db, user.uid);
        } else {
            const cartSidebarContent = document.querySelector('.cart-sidebar-content');
            cartSidebarContent.innerHTML = '<p>Inicia sesión para ver tu carrito.</p>';
            document.getElementById('cart-total').textContent = '$0.00';
        }
    });
});

// Exportar la función si es necesario para otros módulos
export { updateCartSidebar };