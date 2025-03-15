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
        elements.storeImage.src = store.imageUrl || 'https://placehold.co/100x100';
        elements.storeName.textContent = store.name || 'Sin nombre';
        elements.storeFollowers.textContent = `${store.followers || 0} seguidores`;
        elements.storeDescription.textContent = store.description || 'Sin descripción';

        const isOwner = auth.currentUser && store.owner === auth.currentUser.uid;
        elements.storeActions.innerHTML = '';

        if (isOwner) {
            await loadOwnerFeatures(db, storage, auth, slug, store, elements);
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

        await loadStoreFeed(db, slug); // Cargar el feed
        // Resto de la lógica (historias, carrito, etc.) se mantiene igual...

    } catch (error) {
        console.error('Error en loadStoreProfile:', error.message);
        elements.storeName.textContent = 'Error al cargar la tienda: ' + error.message;
    } finally {
        window.isProfileLoading = false;
    }
}

// ... resto de las funciones (setupCartButtons, updateCartBubble, showCartModal) sin cambios ...

// Ejecutar solo si Firebase está listo
if (window.db && window.storage && window.auth) {
    loadStoreProfile(window.db, window.storage, window.auth);
} else {
    console.error('Esperando inicialización de Firebase...');
}