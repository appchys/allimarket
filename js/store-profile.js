import { getDoc, setDoc, doc, collection, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { loadStoreFeed } from './store-feed.js';
import { normalizePhoneNumber } from './store-utils.js';

// Carrito global almacenado en localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || {};

export async function loadStoreProfile(db, storage, auth) {
    if (window.isProfileLoading) {
        console.log('loadStoreProfile ya está en ejecución, omitiendo llamada adicional');
        return;
    }
    window.isProfileLoading = true;

    console.log('Iniciando loadStoreProfile - Fecha:', new Date().toISOString());

    const elements = {
        storeImage: document.getElementById('store-image'),
        storeName: document.getElementById('store-name'),
        storeFollowers: document.getElementById('store-followers'),
        storeDescription: document.getElementById('store-description'),
        storeActions: document.getElementById('store-actions'),
        storiesContainer: document.getElementById('stories-container'),
        feedContainer: document.getElementById('feed-container'),
        storyViewContainer: document.getElementById('story-view-container'),
        cartCount: document.getElementById('cart-count'), // Eliminado cartBubble
        cartModal: document.getElementById('cart-modal'),
        cartItems: document.getElementById('cart-items'),
        closeCartModal: document.getElementById('close-cart-modal'),
    };

    console.log('Verificando elementos del DOM:');
    Object.entries(elements).forEach(([key, el]) => {
        console.log(`${key}: ${el ? 'encontrado' : 'no encontrado'}`);
    });

    if (!elements.storeName || !elements.storeImage || !elements.storeActions || !elements.storiesContainer || !elements.feedContainer) {
        console.error('Faltan elementos esenciales del DOM para cargar el perfil de la tienda');
        window.isProfileLoading = false;
        return;
    }

    const user = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
    console.log('Usuario actual (después de esperar):', user ? user.uid : 'No autenticado');

    let slug = window.location.pathname.split('/').filter(Boolean)[0];
    console.log('Slug detectado en URL:', slug);

    if (!slug && user) {
        console.log('No hay slug en la URL, intentando obtenerlo del usuario:', user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().storeId) {
            slug = userDoc.data().storeId;
            console.log('Slug obtenido del usuario:', slug);
            if (window.location.search !== `?slug=${slug}`) {
                window.history.pushState({}, '', `/${slug}`);
            }
        }
    }

    if (!slug) {
        console.error('No se proporcionó slug y no se pudo obtener del usuario');
        elements.storeName.textContent = user ? 'Configura tu tienda primero' : 'Error: Tienda no especificada';
        window.isProfileLoading = false;
        return;
    }

    try {
        console.log('Buscando tienda con slug:', slug);
        const storeDoc = await getDoc(doc(db, 'stores', slug));
        if (!storeDoc.exists()) {
            console.error('Tienda no encontrada:', slug);
            elements.storeName.textContent = 'Tienda no encontrada';
            return;
        }
        console.log('Datos de la tienda:', storeDoc.data());

        const store = storeDoc.data();
        elements.storeImage.src = store.imageUrl || 'https://placehold.co/100x100';
        elements.storeName.textContent = store.name || 'Sin nombre';
        elements.storeFollowers.textContent = `${store.followers || 0} seguidores`;
        elements.storeDescription.textContent = store.description || 'Sin descripción';

        const isOwner = user && store.owner === user.uid;
        console.log('Es propietario:', isOwner);
        elements.storeActions.innerHTML = '';

        if (isOwner) {
            // Lógica de propietario (delegada a store-owner.js)
            await import('./store-owner.js').then(module => {
                module.loadOwnerFeatures(db, storage, auth, slug, store, elements);
            });
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
                const updatedFollowers = (store.followers || 0) + 1;
                await setDoc(doc(db, 'stores', slug), { followers: updatedFollowers }, { merge: true });
                elements.storeFollowers.textContent = `${updatedFollowers} seguidores`;
                followBtn.textContent = 'Siguiendo';
                followBtn.disabled = true;
            });
        }

        // Cargar historias
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
            });
            elements.storiesContainer.appendChild(storyElement);
        });

        document.getElementById('close-story-view').addEventListener('click', () => {
            elements.storyViewContainer.style.display = 'none';
            document.getElementById('product-tags').innerHTML = '';
        });

        // Cargar el feed de productos (delegado a store-feed.js)
        await loadStoreFeed(db, slug, auth);

        updateCartBubble(elements);
        // Eliminado el evento de cartBubble porque ahora el contador está en #cart-btn
        elements.closeCartModal && elements.closeCartModal.addEventListener('click', () => {
            elements.cartModal.style.display = 'none';
        });

    } catch (error) {
        console.error('Error en loadStoreProfile:', error.message);
        const storeNameElement = document.getElementById('store-name');
        if (storeNameElement) {
            storeNameElement.textContent = 'Error al cargar la tienda: ' + error.message;
        } else {
            console.error('No se pudo actualizar el nombre de la tienda: el elemento #store-name no se encontró en el DOM');
            const main = document.querySelector('main');
            if (main && !document.getElementById('store-name')) {
                const newStoreName = document.createElement('h2');
                newStoreName.id = 'store-name';
                newStoreName.textContent = 'Error al cargar la tienda: ' + error.message;
                main.insertBefore(newStoreName, main.firstChild);
            }
        }
    } finally {
        window.isProfileLoading = false;
    }
}

// Mantener las funciones relacionadas con el carrito
export function setupCartButtons(slug, db, elements) {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    console.log(`Ejecutando setupCartButtons - Botones encontrados: ${addToCartButtons.length}`);
    addToCartButtons.forEach(button => {
        if (button.dataset.listenerAdded) {
            console.log(`Botón ${button.dataset.productId} ya tiene listener, omitiendo`);
            return;
        }
        button.dataset.listenerAdded = 'true';

        button.addEventListener('click', async () => {
            const productId = button.dataset.productId;
            const storeId = button.dataset.storeId || slug;
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
        });
    });
}

export function updateCartBubble(elements) {
    const totalItems = Object.values(cart).reduce((sum, items) => sum + items.length, 0);
    if (elements.cartCount) {
        elements.cartCount.textContent = totalItems;
        elements.cartCount.classList.toggle('active', totalItems > 0); // Mostrar u ocultar según el total
    }
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
                console.error('Error al obtener nombre de tienda:', error);
                storeSection.innerHTML = `<h3>${slug} (Nombre no disponible)</h3>`;
            });

            elements.cartItems.appendChild(storeSection);
        });
    }
    elements.cartModal.style.display = 'flex';
}

window.addEventListener('load', () => {
    console.log('store-profile.js cargado, esperando Firebase...');
    if (!window.db || !window.storage || !window.auth) {
        console.error('Firebase no está inicializado, esperando autenticación...');
        window.auth.onAuthStateChanged((user) => {
            if (window.db && window.storage && window.auth) {
                console.log('Firebase inicializado, ejecutando loadStoreProfile');
                loadStoreProfile(window.db, window.storage, window.auth);
            } else {
                console.error('Firebase aún no está completamente inicializado');
                const storeName = document.getElementById('store-name');
                if (storeName) {
                    storeName.textContent = 'Error: Firebase no inicializado';
                } else {
                    console.error('Elemento #store-name no encontrado para mostrar el error');
                }
            }
        });
    } else {
        console.log('Firebase inicializado, ejecutando loadStoreProfile');
        loadStoreProfile(window.db, window.storage, window.auth);
    }
});