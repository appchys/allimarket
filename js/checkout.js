// checkout.js
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const storage = window.firebaseStorage;

    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('store');

    if (storeId) {
        document.querySelector('h1').textContent = `Checkout - ${storeId}`;
        auth.onAuthStateChanged((user) => {
            if (user) {
                loadCartDetails(storeId, user.uid);
                initializeMap();
            } else {
                console.error('Usuario no autenticado');
                alert('Debes iniciar sesión para proceder al checkout.');
                window.location.href = '/';
            }
        });
    } else {
        alert('No se especificó una tienda para el checkout.');
        window.location.href = '/';
    }
});

async function loadCartDetails(storeId, userId) {
    const db = window.firebaseDb; // Asegurar que db esté definido aquí
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

            const shippingCost = 5.00;
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

// Función para inicializar el mapa
function initializeMap() {
    const map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let marker = L.marker([0, 0], { draggable: true }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 13);
                marker.setLatLng([lat, lng]);
                updateCoordinates(lat, lng);
            },
            (error) => {
                console.error('Error al obtener la ubicación:', error);
                alert('No se pudo obtener tu ubicación. Por favor, ajusta el marcador manualmente.');
                map.setView([-0.180653, -78.467834], 13);
                marker.setLatLng([-0.180653, -78.467834]);
                updateCoordinates(-0.180653, -78.467834);
            }
        );
    } else {
        console.error('Geolocalización no soportada por el navegador');
        alert('Tu navegador no soporta geolocalización. Ajusta el marcador manualmente.');
        map.setView([-0.180653, -78.467834], 13);
        marker.setLatLng([-0.180653, -78.467834]);
        updateCoordinates(-0.180653, -78.467834);
    }

    marker.on('dragend', (event) => {
        const position = marker.getLatLng();
        updateCoordinates(position.lat, position.lng);
    });
}

function updateCoordinates(lat, lng) {
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;
}

// Datos bancarios
const bankDetails = {
    pichincha: "Banco Pichincha<br>Cuenta Corriente: 1234567890<br>Titular: All I Market.<br>RUC: 0991234567001",
    guayaquil: "Banco Guayaquil<br>Cuenta Corriente: 0987654321<br>Titular: All I Market.<br>RUC: 0991234567001",
    pacifico: "Banco Pacífico<br>Cuenta Corriente: 1122334455<br>Titular: All I Market.<br>RUC: 0991234567001",
    produbanco: "Banco Produbanco<br>Cuenta Corriente: 5566778899<br>Titular: All I Market.<br>RUC: 0991234567001"
};

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

document.getElementById('submit-transfer').addEventListener('click', async () => {
    const db = window.firebaseDb; // Asegurar que db esté definido aquí
    const storage = window.firebaseStorage; // Asegurar que storage esté definido aquí
    const bankSelect = document.getElementById('bank-select').value;
    const transferProof = document.getElementById('transfer-proof').files[0];
    const user = window.firebaseAuth.currentUser;
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('store');

    if (!bankSelect) {
        alert('Por favor, selecciona un banco.');
        return;
    }

    if (!transferProof) {
        alert('Por favor, sube la captura de la transferencia.');
        return;
    }

    if (!user) {
        alert('Usuario no autenticado. Por favor, inicia sesión.');
        return;
    }

    try {
        const formData = {
            fullName: document.getElementById('full-name').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            references: document.getElementById('references').value,
            location: {
                latitude: parseFloat(document.getElementById('latitude').value),
                longitude: parseFloat(document.getElementById('longitude').value)
            }
        };

        const cartRef = doc(db, 'carts', user.uid);
        const cartDoc = await getDoc(cartRef);
        const cartData = cartDoc.exists() ? cartDoc.data()[storeId] : {};
        const shippingCost = 5.00;
        const totalCost = Object.values(cartData).reduce((sum, item) => sum + item.price * item.quantity, 0) + shippingCost;

        const transferRef = ref(storage, `transfers/${user.uid}/${Date.now()}_${transferProof.name}`);
        await uploadBytes(transferRef, transferProof);
        const transferUrl = await getDownloadURL(transferRef);

        const orderData = {
            userId: user.uid,
            storeId: storeId,
            customerInfo: formData,
            cartItems: cartData,
            bank: bankSelect,
            transferProofUrl: transferUrl,
            shippingCost: shippingCost,
            totalCost: totalCost,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const orderId = `${user.uid}_${Date.now()}`;
        await setDoc(doc(db, 'orders', orderId), orderData);

        alert(`Compra finalizada con éxito.\nOrden ID: ${orderId}\nBanco: ${bankSelect}\nComprobante subido correctamente.`);

        document.getElementById('checkout-form').reset();
        document.getElementById('bank-select').value = '';
        document.getElementById('transfer-proof').value = '';
        document.getElementById('bank-details').style.display = 'none';
        document.getElementById('cart-details').innerHTML = '<p>Carrito vacío.</p>';
        document.getElementById('shipping-cost').textContent = '$0.00';
        document.getElementById('total-cost').textContent = '$0.00';
    } catch (error) {
        console.error('Error al finalizar la compra:', error);
        alert('Ocurrió un error al procesar tu compra. Intenta de nuevo.');
    }
});