// loadHomeContent.js
import { getDocs, collection, query, orderBy, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { showStoryModal } from './story-modal.js';

// Variable global movida aquí (o podrías manejarla como parámetro)
let isContentLoaded = false;
let cart = JSON.parse(localStorage.getItem('cart')) || {};

export async function loadHomeContent(db) {
    console.log('loadHomeContent llamado');
    if (isContentLoaded) {
        console.log('Contenido ya cargado, omitiendo');
        return;
    }
    isContentLoaded = true;

    const storiesContainer = document.getElementById('stories-container');
    const feedContainer = document.getElementById('feed-container');
    const loading = document.getElementById('loading');
    const cartBubble = document.getElementById('cart-bubble');
    const cartCount = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const cartItems = document.getElementById('cart-items');
    const closeCartModal = document.getElementById('close-cart-modal');

    console.log('Iniciando carga de contenido en Inicio');
    console.log('Elementos del DOM:', { storiesContainer, feedContainer, loading, cartBubble, cartModal });

    if (!storiesContainer || !feedContainer) {
        console.error('Faltan elementos esenciales del DOM en index.html');
        return;
    }

    try {
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        console.log('Tiendas encontradas:', storesSnapshot.size);
        if (storesSnapshot.empty) {
            console.log('No hay tiendas en Firestore');
            storiesContainer.innerHTML = '<p>No hay historias disponibles</p>';
            feedContainer.innerHTML = '<p>No hay productos disponibles</p>';
            if (loading) loading.style.display = 'none';
            return;
        }

        const allStories = [];
        for (const storeDoc of storesSnapshot.docs) {
            const slug = storeDoc.id;
            const store = storeDoc.data();
            console.log(`Procesando tienda: ${slug}`);

            const storiesQuery = query(collection(db, 'stores', slug, 'stories'), orderBy('createdAt', 'desc'));
            const storiesSnapshot = await getDocs(storiesQuery);
            console.log(`Historias en ${slug}: ${storiesSnapshot.size}`);

            storiesSnapshot.forEach((storyDoc) => {
                const story = storyDoc.data();
                allStories.push({
                    id: storyDoc.id,
                    slug: slug,
                    storeName: store.name,
                    imageUrl: story.imageUrl,
                    taggedProducts: story.taggedProducts || [],
                    createdAt: story.createdAt ? new Date(story.createdAt) : new Date()
                });
            });
        }

        allStories.sort((a, b) => b.createdAt - a.createdAt);
        storiesContainer.innerHTML = '';
        console.log('Historias totales:', allStories.length);
        if (allStories.length === 0) {
            storiesContainer.innerHTML = '<p>No hay historias disponibles</p>';
        } else {
            allStories.forEach((story) => {
                const storyElement = document.createElement('div');
                storyElement.classList.add('story');
                storyElement.innerHTML = `<img src="${story.imageUrl}" alt="Story" loading="lazy"><span>${story.storeName}</span>`;
                storyElement.addEventListener('click', async () => {
                    let tags = '';
                    if (story.taggedProducts.length > 0) {
                        const tagPromises = story.taggedProducts.map(async (tag) => {
                            const productDoc = await getDoc(doc(db, 'stores', story.slug, 'products', tag.productId));
                            if (productDoc.exists()) {
                                const product = productDoc.data();
                                return `${product.name} - $${product.price}`;
                            }
                            return '';
                        });
                        const tagResults = await Promise.all(tagPromises);
                        tags = tagResults.filter(tag => tag).join(', ');
                    }
                    console.log('Abriendo modal para historia con ID:', story.id);
                    showStoryModal(story.imageUrl, tags, story.id, story.slug); // Añadir story.slug
                });
                storiesContainer.appendChild(storyElement);
            });
        }

        feedContainer.innerHTML = '';
        let hasProducts = false;
        for (const storeDoc of storesSnapshot.docs) {
            const slug = storeDoc.id;
            const store = storeDoc.data();
            const productsSnapshot = await getDocs(collection(db, 'stores', slug, 'products'));
            console.log(`Productos en ${slug}: ${productsSnapshot.size}`);
            if (!productsSnapshot.empty) {
                hasProducts = true;
                productsSnapshot.forEach((productDoc) => {
                    const product = productDoc.data();
                    const productElement = document.createElement('div');
                    productElement.classList.add('product');
                    productElement.innerHTML = `
                        <div class="product-image-container">
                            <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                            <a href="/${slug}" class="store-name-overlay">${store.name}</a>
                        </div>
                        <div class="product-details">
                            <h3>${product.name}</h3>
                            <p class="description">${product.description || 'Sin descripción'}</p>
                            <p class="price">$${product.price}</p>
                            <div class="product-actions">
                                <button class="action-btn like-btn"><i class="bi bi-heart"></i></button>
                                <button class="action-btn comment-btn"><i class="bi bi-chat"></i></button>
                                <button class="action-btn add-to-cart-btn" data-store-id="${slug}" data-product-id="${productDoc.id}"><i class="bi bi-cart-plus"></i></button>
                            </div>
                        </div>
                    `;
                    feedContainer.appendChild(productElement);
                });
            }
        }

        if (!hasProducts) {
            feedContainer.innerHTML = '<p>No hay productos disponibles</p>';
        }
        if (loading) loading.style.display = 'none';
        console.log('Carga completada');

        // Configurar botones "Añadir al carrito" después de cargar el feed
        setupCartButtons(db);

        // Inicializar la burbuja del carrito
        updateCartBubble();

        // Configurar eventos de la burbuja y modal del carrito
        if (cartBubble && cartModal && cartItems && closeCartModal) {
            cartBubble.addEventListener('click', () => {
                showCartModal(db);
            });
            closeCartModal.addEventListener('click', () => {
                cartModal.style.display = 'none';
            });
        } else {
            console.warn('Faltan elementos del carrito en index.html');
        }
    } catch (error) {
        console.error('Error al cargar contenido:', error);
        if (loading) loading.textContent = 'Error al cargar: ' + error.message;
    }
}

function setupCartButtons(db) {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    console.log(`Ejecutando setupCartButtons - Botones encontrados: ${addToCartButtons.length}`);
    addToCartButtons.forEach(button => {
        if (button.dataset.listenerAdded) {
            console.log(`Botón ${button.dataset.productId} ya tiene listener, omitiendo`);
            return;
        }
        button.dataset.listenerAdded = 'true';

        button.addEventListener('click', async () => {
            const storeId = button.dataset.storeId;
            const productId = button.dataset.productId;
            const productDoc = await getDoc(doc(db, 'stores', storeId, 'products', productId));
            if (productDoc.exists()) {
                const product = productDoc.data();
                if (!cart[storeId]) cart[storeId] = [];
                cart[storeId].push({
                    productId,
                    name: product.name,
                    price: product.price
                });
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartBubble();
                console.log('Producto añadido al carrito desde index:', { storeId, productId, name: product.name });
            }
        });
    });
}

function updateCartBubble() {
    const cartBubble = document.getElementById('cart-bubble');
    const cartCount = document.getElementById('cart-count');
    if (!cartBubble || !cartCount) return;

    const totalItems = Object.values(cart).reduce((sum, items) => sum + items.length, 0);
    cartCount.textContent = totalItems;
    cartBubble.style.display = totalItems > 0 ? 'block' : 'none';
}

function showCartModal(db) {
    const cartItems = document.getElementById('cart-items');
    const cartModal = document.getElementById('cart-modal');
    if (!cartItems || !cartModal) return;

    cartItems.innerHTML = '';
    if (Object.keys(cart).length === 0) {
        cartItems.innerHTML = '<p>El carrito está vacío</p>';
    } else {
        Object.entries(cart).forEach(([storeId, items]) => {
            const storeSection = document.createElement('div');
            storeSection.classList.add('cart-store-section');
            const storeDocRef = doc(db, 'stores', storeId);

            getDoc(storeDocRef).then(storeDoc => {
                const storeName = storeDoc.exists() ? storeDoc.data().name : storeId;
                storeSection.innerHTML = `<h3>${storeName}</h3>`;

                const itemsList = document.createElement('ul');
                items.forEach((item, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `${item.name} - $${item.price} <button class="remove-item" data-store-id="${storeId}" data-index="${index}">Eliminar</button>`;
                    itemsList.appendChild(li);
                });
                storeSection.appendChild(itemsList);

                const checkoutBtn = document.createElement('button');
                checkoutBtn.textContent = 'Confirmar';
                checkoutBtn.className = 'checkout-btn';
                checkoutBtn.addEventListener('click', () => {
                    alert(`Checkout para ${storeName} - Total: $${items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}`);
                });
                storeSection.appendChild(checkoutBtn);

                const removeButtons = storeSection.querySelectorAll('.remove-item');
                removeButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const storeId = button.dataset.storeId;
                        const index = parseInt(button.dataset.index);
                        cart[storeId].splice(index, 1);
                        if (cart[storeId].length === 0) delete cart[storeId];
                        localStorage.setItem('cart', JSON.stringify(cart));
                        showCartModal(db);
                        updateCartBubble();
                    });
                });
            }).catch(error => {
                console.error('Error al obtener nombre de tienda:', error);
                storeSection.innerHTML = `<h3>${storeId} (Nombre no disponible)</h3>`;
            });

            cartItems.appendChild(storeSection);
        });
    }
    cartModal.style.display = 'flex';
}

// Exportar funciones adicionales si es necesario
export { setupCartButtons, updateCartBubble, showCartModal };