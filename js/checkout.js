// checkout.js
import { auth, db } from './firebase.js'; // Ajusta la ruta según tu estructura
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('store');

    if (storeId) {
        document.querySelector('h1').textContent = `Checkout - ${storeId}`;
        // Verificar el estado de autenticación
        auth.onAuthStateChanged((user) => {
            if (user) {
                // Si hay usuario autenticado, cargar los datos del carrito
                loadCartDetails(storeId, user.uid);
            } else {
                // Si no hay usuario, mostrar mensaje y redirigir
                console.error('Usuario no autenticado');
                alert('Debes iniciar sesión para proceder al checkout.');
                window.location.href = '/'; // Redirigir a la página principal o de inicio de sesión
            }
        });
    } else {
        alert('No se especificó una tienda para el checkout.');
        window.location.href = '/';
    }
});

async function loadCartDetails(storeId, userId) {
    const cartDetails = document.getElementById('cart-details');
    const shippingCostElement = document.getElementById('shipping-cost');
    const totalCostElement = document.getElementById('total-cost');

    try {
        const cartRef = doc(db, 'carts', userId);
        const cartDoc = await getDoc(cartRef);

        if (cartDoc.exists()) {
            const cartData = cartDoc.data();
            const storeItems = cartData[storeId] || {};

            if (Object.keys(storeItems).length === 0) {
                cartDetails.innerHTML = '<p>No hay productos en el carrito para esta tienda.</p>';
                shippingCostElement.textContent = '$0.00';
                totalCostElement.textContent = '$0.00';
                return;
            }

            let subtotal = 0;
            cartDetails.innerHTML = '';

            for (const itemId in storeItems) {
                const item = storeItems[itemId];
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;

                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                itemElement.innerHTML = `<p>${item.name} (x${item.quantity}) - $${itemTotal.toFixed(2)}</p>`;
                cartDetails.appendChild(itemElement);
            }

            const shippingCost = 5.00; // Ejemplo de costo de envío fijo
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

// Datos bancarios (puedes ajustarlos según la información real)
const bankDetails = {
    pichincha: "Banco Pichincha<br>Cuenta Corriente: 1234567890<br>Titular: Multitienda S.A.<br>RUC: 0991234567001",
    guayaquil: "Banco Guayaquil<br>Cuenta Corriente: 0987654321<br>Titular: Multitienda S.A.<br>RUC: 0991234567001",
    pacifico: "Banco Pacífico<br>Cuenta Corriente: 1122334455<br>Titular: Multitienda S.A.<br>RUC: 0991234567001",
    produbanco: "Banco Produbanco<br>Cuenta Corriente: 5566778899<br>Titular: Multitienda S.A.<br>RUC: 0991234567001"
};

// Manejar la selección del banco
document.getElementById('bank-select').addEventListener('change', (event) => {
    const selectedBank = event.target.value;
    const bankDetailsDiv = document.getElementById('bank-details');
    const bankInfo = document.getElementById('bank-info');

    if (selectedBank && bankDetails[selectedBank]) {
        bankInfo.innerHTML = bankDetails[selectedBank];
        bankDetailsDiv.style.display = 'block';
    } else {
        bankDetailsDiv.style.display = 'none';
    }
});

// Manejar el envío de la transferencia
document.getElementById('submit-transfer').addEventListener('click', async () => {
    const bankSelect = document.getElementById('bank-select').value;
    const transferProof = document.getElementById('transfer-proof').files[0];

    if (!bankSelect) {
        alert('Por favor, selecciona un banco.');
        return;
    }

    if (!transferProof) {
        alert('Por favor, sube la captura de la transferencia.');
        return;
    }

    try {
        // Aquí podrías integrar Firebase Storage para subir la captura
        // Por ahora, simulamos el proceso
        alert(`Compra finalizada con éxito.\nBanco seleccionado: ${bankSelect}\nCaptura recibida: ${transferProof.name}`);
        
        // Opcional: Limpiar el formulario después de enviar
        document.getElementById('checkout-form').reset();
        document.getElementById('bank-select').value = '';
        document.getElementById('transfer-proof').value = '';
        document.getElementById('bank-details').style.display = 'none';
    } catch (error) {
        console.error('Error al finalizar la compra:', error);
        alert('Ocurrió un error al procesar tu compra. Intenta de nuevo.');
    }
});