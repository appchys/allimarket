import { collectionGroup, query, orderBy, limit, startAfter, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export async function loadGeneralFeed(db) {
    const storiesContainer = document.getElementById('stories-container');
    const feedContainer = document.getElementById('feed-container');
    const loadingIndicator = document.getElementById('loading');
    const storyImage = document.getElementById('story-image');
    const productTags = document.getElementById('product-tags');
    const storyViewModal = document.getElementById('story-view-modal');

    if (!feedContainer || !loadingIndicator) {
        console.error('Elementos necesarios no encontrados:', { feedContainer, loadingIndicator });
        return;
    }

    let lastProductDoc = null;
    const PRODUCTS_PER_PAGE = 4;

    // Carrito global
    let cart = JSON.parse(localStorage.getItem('cart')) || {};

    // Cargar historias
    if (storiesContainer) {
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        storiesContainer.innerHTML = '';
        for (const storeDoc of storesSnapshot.docs) {
            const store = storeDoc.data();
            const storiesQuery = query(collection(db, 'stores', storeDoc.id, 'stories'), orderBy('createdAt', 'desc'));
            const storiesSnapshot = await getDocs(storiesQuery);
            storiesSnapshot.forEach((storyDoc) => {
                const story = storyDoc.data();
                const storyElement = document.createElement('div');
                storyElement.classList.add('story');
                storyElement.innerHTML = `
                    <img src="${story.imageUrl}" alt="Story" loading="lazy">
                    <span>${store.name}</span>
                `;
                storyElement.addEventListener('click', async () => {
                    storyImage.src = story.imageUrl;
                    productTags.innerHTML = '';
                    if (story.taggedProducts && story.taggedProducts.length > 0) {
                        for (const tag of story.taggedProducts) {
                            const productDoc = await getDoc(doc(db, 'stores', storeDoc.id, 'products', tag.productId));
                            if (productDoc.exists()) {
                                const product = productDoc.data();
                                const tagElement = document.createElement('div');
                                tagElement.classList.add('product-tag');
                                tagElement.style.left = `${tag.x}%`;
                                tagElement.style.top = `${tag.y}%`;
                                tagElement.innerHTML = `
                                    <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                                    <h3>${product.name}</h3>
                                    <p>$${product.price}</p>
                                    <button class="add-to-cart-btn" data-store-id="${storeDoc.id}" data-product-id="${tag.productId}"><i class="bi bi-cart-plus"></i></button>
                                `;
                                productTags.appendChild(tagElement);
                            }
                        }
                        setupCartButtons(db, cart); // Configurar botones de carrito en historias
                    }
                    storyViewModal.style.display = 'flex';
                });
                storiesContainer.appendChild(storyElement);
            });
        }
    }

    // Cargar productos iniciales con paginación real
    feedContainer.innerHTML = '';
    await loadProducts(feedContainer, null, PRODUCTS_PER_PAGE, db, (doc) => { lastProductDoc = doc; }, cart);

    // Configurar Intersection Observer para carga infinita
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && lastProductDoc) {
            console.log('Cargando más productos desde:', lastProductDoc.id);
            loadingIndicator.style.display = 'block';
            await loadProducts(feedContainer, lastProductDoc, PRODUCTS_PER_PAGE, db, (doc) => { lastProductDoc = doc; }, cart);
            loadingIndicator.style.display = 'none';
        }
    }, { rootMargin: '200px' });

    observer.observe(loadingIndicator);

    // Configurar eventos de la burbuja y modal del carrito
    setupCartUI(db, cart);
}

// Cargar productos con paginación
async function loadProducts(container, lastDoc, limitCount, db, setLastDoc, cart) {
    try {
        let q = query(
            collectionGroup(db, 'products'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        if (lastDoc) q = query(q, startAfter(lastDoc));

        const productsSnapshot = await getDocs(q);
        if (productsSnapshot.empty) {
            console.log('No hay más productos para cargar');
            setLastDoc(null);
            return;
        }

        for (const productDoc of productsSnapshot.docs) {
            const product = productDoc.data();
            const storeId = productDoc.ref.parent.parent.id;
            const storeDoc = await getDoc(doc(db, 'stores', storeId));
            const store = storeDoc.exists() ? storeDoc.data() : { name: storeId };

            const productElement = document.createElement('div');
            productElement.classList.add('product');
            productElement.innerHTML = `
                <div class="product-image-container">
                    <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                    <a href="/${storeId}" class="store-name-overlay">${store.name}</a>
                </div>
                <div class="product-details">
                    <h3>${product.name}</h3>
                    <p class="description">${product.description || 'Sin descripción'}</p>
                    <p class="price">$${product.price}</p>
                    <div class="product-actions">
                        <button class="action-btn like-btn"><i class="bi bi-heart"></i></button>
                        <button class="action-btn comment-btn"><i class="bi bi-chat"></i></button>
                        <button class="action-btn save-btn"><i class="bi bi-bookmark"></i></button>
                        <button class="action-btn add-to-cart-btn" data-store-id="${storeId}" data-product-id="${productDoc.id}"><i class="bi bi-cart-plus"></i></button>
                    </div>
                </div>
            `;
            container.appendChild(productElement);
        }

        // Configurar botones "Añadir al carrito" después de cargar productos
        setupCartButtons(db, cart);

        setLastDoc(productsSnapshot.docs[productsSnapshot.docs.length - 1]);
        console.log(`Cargados ${productsSnapshot.size} productos, último doc:`, productsSnapshot.docs[productsSnapshot.docs.length - 1]?.id);
    } catch (error) {
        console.error('Error al cargar productos:', error);
        container.innerHTML += '<p>Error al cargar productos</p>';
    }
}

// Configurar los botones de "Añadir al carrito"
function setupCartButtons(db, cart) {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        // Evitar múltiples listeners
        if (button.dataset.listenerAdded) return;
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
                updateCartBubble(cart);
                console.log('Producto añadido al carrito desde feed:', { storeId, productId, name: product.name });
            }
        });
    });
}

// Actualizar la burbuja del carrito
function updateCartBubble(cart) {
    const cartBubble = document.getElementById('cart-bubble');
    const cartCount = document.getElementById('cart-count');
    if (!cartBubble || !cartCount) return;

    const totalItems = Object.values(cart).reduce((sum, items) => sum + items.length, 0);
    cartCount.textContent = totalItems;
    cartBubble.style.display = totalItems > 0 ? 'block' : 'none';
}

// Configurar UI del carrito (burbuja y modal)
function setupCartUI(db, cart) {
    const cartBubble = document.getElementById('cart-bubble');
    const cartModal = document.getElementById('cart-modal');
    const cartItems = document.getElementById('cart-items');
    const closeCartModal = document.getElementById('close-cart-modal');

    if (!cartBubble || !cartModal || !cartItems || !closeCartModal) {
        console.error('Elementos del carrito no encontrados en el DOM');
        return;
    }

    updateCartBubble(cart);

    cartBubble.addEventListener('click', () => {
        showCartModal(db, cart, cartItems, cartModal);
    });

    closeCartModal.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
}

// Mostrar el contenido del carrito en el modal
function showCartModal(db, cart, cartItems, cartModal) {
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

                // Configurar eliminación de ítems
                const removeButtons = storeSection.querySelectorAll('.remove-item');
                removeButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const storeId = button.dataset.storeId;
                        const index = parseInt(button.dataset.index);
                        cart[storeId].splice(index, 1);
                        if (cart[storeId].length === 0) delete cart[storeId];
                        localStorage.setItem('cart', JSON.stringify(cart));
                        showCartModal(db, cart, cartItems, cartModal); // Actualizar modal
                        updateCartBubble(cart);
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

// Cerrar modal de historia
document.getElementById('close-story-view')?.addEventListener('click', () => {
    document.getElementById('story-view-modal').style.display = 'none';
});