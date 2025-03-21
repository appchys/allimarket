// orders.js
import { getDocs, query, where, orderBy, collection } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('store');

    const ordersContainer = document.getElementById('orders-container');
    const logoutBtn = document.getElementById('logout-btn');

    if (!storeId) {
        ordersContainer.innerHTML = '<p>No se especificó una tienda.</p>';
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.addEventListener('click', () => auth.signOut().then(() => window.location.href = '/'));

            try {
                // Consultar órdenes donde storeId coincida con el slug de la tienda
                const ordersQuery = query(
                    collection(db, 'orders'),
                    where('storeId', '==', storeId),
                    orderBy('createdAt', 'desc')
                );
                const ordersSnapshot = await getDocs(ordersQuery);

                if (ordersSnapshot.empty) {
                    ordersContainer.innerHTML = '<p>No hay órdenes para esta tienda.</p>';
                    return;
                }

                ordersContainer.innerHTML = '';
                ordersSnapshot.forEach((doc) => {
                    const order = doc.data();
                    const orderElement = document.createElement('div');
                    orderElement.classList.add('order-item');
                    orderElement.innerHTML = `
                        <h3>Orden #${doc.id}</h3>
                        <p><strong>Cliente:</strong> ${order.customerInfo.fullName}</p>
                        <p><strong>Email:</strong> ${order.customerInfo.email}</p>
                        <p><strong>Teléfono:</strong> ${order.customerInfo.phone}</p>
                        <p><strong>Dirección:</strong> ${order.customerInfo.address}</p>
                        <p><strong>Estado:</strong> ${order.status}</p>
                        <p><strong>Total:</strong> $${order.totalCost.toFixed(2)}</p>
                        <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                        <p><strong>Comprobante:</strong> <a href="${order.transferProofUrl}" target="_blank">Ver</a></p>
                        <h4>Productos:</h4>
                        <ul>
                            ${Object.entries(order.cartItems).map(([itemId, item]) => `
                                <li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>
                            `).join('')}
                        </ul>
                    `;
                    ordersContainer.appendChild(orderElement);
                });
            } catch (error) {
                console.error('Error al cargar las órdenes:', error);
                ordersContainer.innerHTML = '<p>Error al cargar las órdenes.</p>';
            }
        } else {
            ordersContainer.innerHTML = '<p>Debes iniciar sesión para ver las órdenes.</p>';
            window.location.href = '/';
        }
    });
});