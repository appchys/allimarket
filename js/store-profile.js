import { getDoc, setDoc, doc, collection, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { loadOwnerFeatures } from './store-owner.js';
import { normalizePhoneNumber } from './store-utils.js';
import { loadStoreFeed } from './store-feed.js';

// Carrito global almacenado en localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || {};

export async function loadStoreProfile(db, storage, auth) {
    if (window.isProfileLoading) return;
    window.isProfileLoading = true;

    console.log('Iniciando loadStoreProfile - Fecha:', new Date().toISOString());

    // Verificar si estamos en la página correcta
    if (!document.getElementById('store-profile')) {
        console.log('No se encontró #store-profile. Este script está diseñado para la página de perfil de tienda.');
        window.isProfileLoading = false;
        return;
    }

    // Esperar a que el DOM esté listo
    await new Promise(resolve => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
        }
    });

    const elements = {
        storeImage: document.getElementById('store-image'),
        storeName: document.getElementById('store-name'),
        storeFollowers: document.getElementById('store-followers'),
        storeDescription: document.getElementById('store-description'),
        storeActions: document.getElementById('store-actions'),
        storiesContainer: document.getElementById('stories-container'),
        feedContainer: document.getElementById('feed-container'),
        storyViewContainer: document.getElementById('story-view-container'),
        cartBubble: document.getElementById('cart-bubble'),
        cartCount: document.getElementById('cart-count'),
        cartModal: document.getElementById('cart-modal'),
        cartItems: document.getElementById('cart-items'),
        closeCartModal: document.getElementById('close-cart-modal'),
    };

    console.log('Elementos del DOM encontrados:');
    Object.entries(elements).forEach(([key, el]) => {
        console.log(`${key}: ${el ? 'encontrado' : 'no encontrado'}`);
    });

    if (!elements.storeName) {
        console.error('El elemento #store-name no se encontró en el DOM. Abortando.');
        window.isProfileLoading = false;
        return;
    }

    if (!db || !storage || !auth) {
        console.error('Firebase no está inicializado correctamente:', { db, storage, auth });
        elements.storeName.textContent = 'Error: Firebase no inicializado';
        window.isProfileLoading = false;
        return;
    }

    try {
        let slug = window.location.pathname.split('/').filter(Boolean)[0] || new URLSearchParams(window.location.search).get('slug');
        console.log('Slug detectado:', slug);

        if (!slug && auth.currentUser) {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists() && userDoc.data().storeId) {
                slug = userDoc.data().storeId;
                window.history.pushState({}, '', `/${slug}`);
            }
        }

        if (!slug) {
            elements.storeName.textContent = auth.currentUser ? 'Configura tu tienda primero' : 'Error: Tienda no especificada';
            window.isProfileLoading = false;
            return;
        }

        const storeDoc = await getDoc(doc(db, 'stores', slug));
        if (!storeDoc.exists()) {
            elements.storeName.textContent = 'Tienda no encontrada';
            console.error('Tienda no encontrada para slug:', slug);
            return;
        }

        const store = storeDoc.data();
        console.log('Datos de la tienda cargados:', store);
        elements.storeImage.src = store.imageUrl || 'https://placehold.co/100x100';
        elements.storeName.textContent = store.name || 'Sin nombre';
        elements.storeFollowers.textContent = `${store.followers || 0} seguidores`;
        elements.storeDescription.textContent = store.description || 'Sin descripción';

        const isOwner = auth.currentUser && store.owner === auth.currentUser.uid;
        elements.storeActions.innerHTML = '';
        console.log('Es propietario:', isOwner);

        // Cargar características adicionales en bloques try-catch separados
        if (isOwner) {
            try {
                console.log('Cargando características del propietario...');
                await loadOwnerFeatures(db, storage, auth, slug, store, elements);
            } catch (ownerError) {
                console.error('Error al cargar características del propietario:', ownerError.message);
                elements.storeActions.innerHTML = '<p>Error al cargar opciones de edición</p>';
            }
        } else {
            const followBtn = document.createElement('button');
            followBtn.textContent = 'Seguir';
            followBtn.id = 'follow-btn';
            elements.storeActions.appendChild(followBtn);

            const whatsappBtn = document.createElement('button');
            whatsappBtn.textContent = 'WhatsApp';
            whatsappBtn.id = 'whatsapp-btn';
            elements.storeActions.appendChild(whatsappBtn);

            if (store.phone) {
                whatsappBtn.onclick = () => window.open(`https://wa.me/${normalizePhoneNumber(store.phone)}`, '_blank');
            } else {
                whatsappBtn.style.display = 'none';
            }

            followBtn.addEventListener('click', async () => {
                try {
                    const updatedFollowers = (store.followers || 0) + 1;
                    await setDoc(doc(db, 'stores', slug), { followers: updatedFollowers }, { merge: true });
                    elements.storeFollowers.textContent = `${updatedFollowers} seguidores`;
                    followBtn.textContent = 'Siguiendo';
                    followBtn.disabled = true;
                } catch (followError) {
                    console.error('Error al seguir la tienda:', followError.message);
                    alert('Error al seguir la tienda: ' + followError.message);
                }
            });
        }

        // Cargar el feed en un bloque separado
        try {
            console.log('Cargando feed de productos...');
            await loadStoreFeed(db, slug);
        } catch (feedError) {
            console.error('Error al cargar el feed:', feedError.message);
            elements.feedContainer.innerHTML = '<p>Error al cargar los productos</p>';
        }

        // Cargar historias
        try {
            const storiesQuery = query(collection(db, 'stores', slug, 'stories'), orderBy('createdAt', 'desc'));
            const storiesSnapshot = await getDocs(storiesQuery);
            elements.storiesContainer.innerHTML = '';
            console.log(`Historias encontradas: ${storiesSnapshot.size}`);
            storiesSnapshot.forEach((storyDoc) => {
                const story = storyDoc.data();
                const storyElement = document.createElement('div');
                storyElement.classList.add('story');
                storyElement.innerHTML = `<img src="${story.imageUrl}" alt="Story" loading="lazy"><span>${store.name}</span>`;
                storyElement.addEventListener('click', async () => {
                    try {
                        document.getElementById('story-image').src = story.imageUrl;
                        document.getElementById('product-tags').innerHTML = '';
                        if (story.taggedProducts?.length > 0) {
                            for (const tag of story.taggedProducts) {
                                const productDoc = await getDoc(doc(db, 'stores', slug, 'products', tag.productId));
                                if (productDoc.exists()) {
                                    const product = productDoc.data();
                                    const tagElement = document.createElement('div');
                                    tagElement.classList.add('product-tag');
                                    tagElement.style.left = `${tag.x}%`;
                                    tagElement.style.top = `${tag.y}%`;
                                    tagElement.innerHTML = `
                                        <img src="${product.imageUrl}" alt="${product.name}">
                                        <h3>${product.name}</h3>
                                        <p>$${product.price}</p>
                                        <button class="add-to-cart-btn" data-store-id="${slug}" data-product-id="${tag.productId}">Añadir al carrito</button>
                                    `;
                                    document.getElementById('product-tags').appendChild(tagElement);
                                }
                            }
                            setupCartButtons(slug, db, elements);
                        }
                        elements.storyViewContainer.style.display = 'block';
                    } catch (storyError) {
                        console.error('Error al mostrar historia:', storyError.message);
                    }
                });
                elements.storiesContainer.appendChild(storyElement);
            });

            document.getElementById('close-story-view').addEventListener('click', () => {
                elements.storyViewContainer.style.display = 'none';
                document.getElementById('product-tags').innerHTML = '';
            });
        } catch (storiesError) {
            console.error('Error al cargar historias:', storiesError.message);
            elements.storiesContainer.innerHTML = '<p>Error al cargar historias</p>';
        }

        // Configurar carrito
        updateCartBubble(elements);
        elements.cartBubble.addEventListener('click', () => {
            showCartModal(db, elements, slug, store.name);
        });
        elements.closeCartModal.addEventListener('click', () => {
            elements.cartModal.style.display = 'none';
        });

    } catch (error) {
        console.error('Error crítico en loadStoreProfile:', error.message);
        elements.storeName.textContent = 'Error al cargar la tienda: ' + error.message;
    } finally {
        window.isProfileLoading = false;
    }
}

export function setupCartButtons(slug, db, elements) {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    console.log(`Ejecutando setupCartButtons - Botones encontrados: ${addToCartButtons.length}`);
    addToCartButtons.forEach(button => {
        if (button.dataset.listenerAdded) return;
        button.dataset.listenerAdded = 'true';

        button.addEventListener('click', async () => {
            const productId = button.dataset.productId;
            const storeId = button.dataset.storeId || slug;
            try {
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
                    updateCartBubble(elements);
                    console.log('Producto añadido al carrito:', { storeId, productId, name: product.name });
                }
            } catch (cartError) {
                console.error('Error al añadir al carrito:', cartError.message);
            }
        });
    });
}

export function updateCartBubble(elements) {
    const totalItems = Object.values(cart).reduce((sum, items) => sum + items.length, 0);
    elements.cartCount.textContent = totalItems;
    elements.cartBubble.style.display = totalItems > 0 ? 'block' : 'none';
}

export function showCartModal(db, elements, currentSlug, currentStoreName) {
    elements.cartItems.innerHTML = '';
    if (Object.keys(cart).length === 0) {
        elements.cartItems.innerHTML = '<p>El carrito está vacío</p>';
    } else {
        Object.entries(cart).forEach(([slug, items]) => {
            const storeSection = document.createElement('div');
            storeSection.classList.add('cart-store-section');
            const storeDocRef = doc(db, 'stores', slug);

            getDoc(storeDocRef).then(storeDoc => {
                const storeName = storeDoc.exists() ? storeDoc.data().name : slug;
                storeSection.innerHTML = `<h3>${storeName}</h3>`;

                const itemsList = document.createElement('ul');
                items.forEach((item, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `${item.name} - $${item.price} <button class="remove-item" data-store-id="${slug}" data-index="${index}">Eliminar</button>`;
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
                        showCartModal(db, elements, currentSlug, currentStoreName);
                        updateCartBubble(elements);
                    });
                });
            }).catch(error => {
                console.error('Error al obtener nombre de tienda para carrito:', error);
                storeSection.innerHTML = `<h3>${slug} (Nombre no disponible)</h3>`;
            });

            elements.cartItems.appendChild(storeSection);
        });
    }
    elements.cartModal.style.display = 'flex';
}

// Ejecutar solo si Firebase está listo
if (window.db && window.storage && window.auth) {
    console.log('Firebase inicializado, ejecutando loadStoreProfile');
    loadStoreProfile(window.db, window.storage, window.auth);
} else {
    console.error('Esperando inicialización de Firebase...');
}