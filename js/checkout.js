import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Obtener auth y db desde el objeto window (definido en checkout.html)
const auth = window.firebaseAuth;
const db = window.firebaseDb;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('store');

    if (storeId) {
        document.querySelector('h1').textContent = `Checkout - ${storeId}`;
        await loadCartDetails(storeId);
    } else {
        alert('No se especificó una tienda para el checkout.');
        window.location.href = '/';
    }
});

async function loadCartDetails(storeId) {
    const cartDetails = document.getElementById('cart-details');
    const shippingCostElement = document.getElementById('shipping-cost');
    const totalCostElement = document.getElementById('total-cost');

    try {
        // Verificar si el usuario está autenticado
        if (!auth.currentUser) {
            console.error('Usuario no autenticado');
            cartDetails.innerHTML = '<p>Por favor, inicia sesión para ver tu carrito.</p>';
            return;
        }

        const userId = auth.currentUser.uid;
        const cartRef = doc(db, 'carts', userId);
        const cartDoc = await getDoc(cartRef);

        if (cartDoc.exists()) {
            const cartData = cartDoc.data();
            const storeItems = cartData[storeId] || {};

            // Verificar si hay productos para esta tienda
            if (Object.keys(storeItems).length === 0) {
                cartDetails.innerHTML = '<p>No hay productos en el carrito para esta tienda.</p>';
                shippingCostElement.textContent = '$0.00';
                totalCostElement.textContent = '$0.00';
                return;
            }

            let subtotal = 0;
            cartDetails.innerHTML = ''; // Limpiar contenido previo

            // Renderizar los productos
            for (const itemId in storeItems) {
                const item = storeItems[itemId];
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;

                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                itemElement.innerHTML = `
                    <p>${item.name} (x${item.quantity}) - $${itemTotal.toFixed(2)}</p>
                `;
                cartDetails.appendChild(itemElement);
            }

            const shippingCost = 5.00; // Costo de envío fijo (ajustable)
            const totalCost = subtotal + shippingCost;

            shippingCostElement.textContent = `$${shippingCost.toFixed(2)}`;
            totalCostElement.textContent = `$${totalCost.toFixed(2)}`;
        } else {
            cartDetails.innerHTML = '<p>El carrito está vacío.</p>';
            shippingCostElement.textContent = '$0.00';
            totalCostElement.textContent = '$0.00';
        }
    } catch (error) {
        console.error('Error al cargar los datos del carrito:', error);
        cartDetails.innerHTML = '<p>Error al cargar el carrito. Intenta de nuevo más tarde.</p>';
    }
}

// Manejar el botón de proceder al pago
document.getElementById('proceed-to-payment').addEventListener('click', () => {
    alert('Procesando el pago...');
    // Aquí puedes agregar la lógica real de pago (ej. integración con pasarela de pago)
});