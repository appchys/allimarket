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
                        <div class="order-map" id="map-${docSnap.id}"></div>
                        <div class="order-content">
                            <div class="client-info">
                                <h3 class="client-name">${order.customerInfo.fullName}</h3>
                            </div>
                            <div class="cart-details">
                                ${Object.entries(order.cartItems).map(([_, item]) => `
                                    <p>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</p>
                                `).join('')}
                                <p><strong>Total: $${order.totalCost.toFixed(2)}</strong></p>
                            </div>
                            <div class="status-section">
                                <span class="status-tag">${order.status || 'Pendiente'}</span>
                                <div class="status-actions">
                                    ${order.status !== 'Entregado' ? `
                                        <button class="status-btn prepare-btn" data-id="${docSnap.id}">
                                            ${order.status === 'En preparación' ? 'Entregar' : 'Preparar'}
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                    ordersContainer.appendChild(orderElement);
                
                    const mapDiv = document.getElementById(`map-${docSnap.id}`);
                    if (mapDiv && order.customerInfo && order.customerInfo.location) {
                        const map = L.map(mapDiv, {
                            dragging: false,
                            touchZoom: false,
                            doubleClickZoom: false,
                            scrollWheelZoom: false,
                            boxZoom: false,
                            keyboard: false,
                            zoomControl: false
                        }).setView([order.customerInfo.location.latitude, order.customerInfo.location.longitude], 13);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }).addTo(map);
                        L.marker([order.customerInfo.location.latitude, order.customerInfo.location.longitude]).addTo(map);
                    } else {
                        mapDiv.innerHTML = '<small>No hay ubicación disponible</small>';
                    }
                });

                document.querySelectorAll('.prepare-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const orderId = event.target.dataset.id;
                        const orderRef = doc(db, 'orders', orderId);
                        const orderSnapshot = await getDocs(query(collection(db, 'orders'), where('__name__', '==', orderId)));
                        const orderData = orderSnapshot.docs[0].data();
                        
                        const newStatus = orderData.status === 'En preparación' ? 'Entregado' : 'En preparación';
                        
                        await updateDoc(orderRef, { status: newStatus });
                        
                        // Actualizar la UI
                        const statusTag = event.target.closest('.order-card').querySelector('.status-tag');
                        const actionButton = event.target.closest('.order-card').querySelector('.prepare-btn');
                        
                        statusTag.textContent = newStatus;
                        if(newStatus === 'Entregado') {
                            event.target.closest('.status-actions').innerHTML = '';
                        } else {
                            actionButton.textContent = newStatus === 'En preparación' ? 'Entregar' : 'Preparar';
                        }
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