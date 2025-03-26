// orders.js
import { getDocs, query, where, orderBy, collection, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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
                ordersSnapshot.forEach((docSnap) => {
                    const order = docSnap.data();
                    const orderElement = document.createElement('div');
                    orderElement.classList.add('order-card');
                    orderElement.innerHTML = `
                        <div class="order-header">
                            <h3>Orden #${docSnap.id}</h3>
                            <span class="status">${order.status}</span>
                        </div>
                        <div class="order-body">
                            <p><strong>Cliente:</strong> ${order.customerInfo.fullName}</p>
                            <p><strong>Teléfono:</strong> ${order.customerInfo.phone}</p>
                            <p><strong>Dirección:</strong> ${order.customerInfo.address}</p>
                            <p><strong>Total:</strong> $${order.totalCost.toFixed(2)}</p>
                            <h4>Productos:</h4>
                            <ul>
                                ${Object.entries(order.cartItems).map(([_, item]) => `
                                    <li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="order-footer">
                            <button class="update-status" data-id="${docSnap.id}">Cambiar Estado</button>
                        </div>
                    `;
                    ordersContainer.appendChild(orderElement);
                });

                document.querySelectorAll('.update-status').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const orderId = event.target.dataset.id;
                        const orderRef = doc(db, 'orders', orderId);
                        
                        let newStatus;
                        const orderSnapshot = await getDocs(query(collection(db, 'orders'), where('__name__', '==', orderId)));
                        const orderData = orderSnapshot.docs[0].data();
                        
                        switch (orderData.status) {
                            case 'Pendiente':
                                newStatus = 'En proceso';
                                break;
                            case 'En proceso':
                                newStatus = 'Entregado';
                                break;
                            default:
                                newStatus = 'Pendiente';
                                break;
                        }
                        
                        await updateDoc(orderRef, { status: newStatus });
                        event.target.parentElement.parentElement.querySelector('.status').textContent = newStatus;
                    });
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
