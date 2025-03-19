// store-feed.js
import { collection, query, orderBy, getDocs, getDoc, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export async function loadStoreFeed(db, slug, auth) {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) {
        console.error('No se encontró el contenedor del feed (#feed-container)');
        return;
    }

    feedContainer.innerHTML = '<p>Cargando productos...</p>';

    try {
        console.log(`Cargando productos para slug: ${slug}`); // Depuración
        const productsQuery = query(
            collection(db, 'stores', slug, 'products'),
            orderBy('createdAt', 'desc')
        );
        const productsSnapshot = await getDocs(productsQuery);
        console.log(`Productos encontrados: ${productsSnapshot.size}`); // Depuración

        if (productsSnapshot.empty) {
            feedContainer.innerHTML = '<p>No hay productos disponibles</p>';
            return;
        }

        const user = auth.currentUser;
        console.log(`Usuario autenticado: ${user ? user.uid : 'No autenticado'}`); // Depuración
        const storeDoc = await getDoc(doc(db, 'stores', slug));
        console.log(`Documento de tienda existe: ${storeDoc.exists()}`); // Depuración
        const isOwner = user && storeDoc.exists() && storeDoc.data().owner === user.uid;
        console.log(`Es propietario: ${isOwner}`); // Depuración

        feedContainer.innerHTML = '';
        productsSnapshot.forEach((doc) => {
            const product = doc.data();
            const productElement = document.createElement('div');
            productElement.classList.add('product', 'store-product');
            productElement.dataset.productId = doc.id;

            productElement.innerHTML = `
                <div class="product-image-container" style="position: relative;">
                    <img src="${product.imageUrl || 'https://placehold.co/200x200'}" alt="${product.name}" loading="lazy">
                    ${isOwner ? `
                        <button class="options-btn" data-product-id="${doc.id}">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <div class="popover" style="display: none;">
                            <button class="edit-product-btn"><i class="bi bi-pencil"></i> Editar</button>
                            <button class="hide-product-btn"><i class="bi bi-eye-slash"></i> Ocultar</button>
                            <button class="delete-product-btn"><i class="bi bi-trash"></i> Eliminar</button>
                        </div>
                    ` : ''}
                </div>
                <div class="product-details">
                    <h3>${product.name || 'Sin nombre'}</h3>
                    <p class="description">${product.description || 'Sin descripción'}</p>
                    <p class="price">$${product.price || '0.00'}</p>
                </div>
                ${!isOwner ? `<button class="add-to-cart-btn" data-product-id="${doc.id}"><i class="bi bi-cart-plus"></i> Añadir al carrito</button>` : ''}
            `;

            feedContainer.appendChild(productElement);
        });

        if (isOwner) {
            // Configurar popovers y botones de edición
            // ... (código omitido por brevedad)
        } else {
            setupCartButtons(slug, db, feedContainer);
        }

        console.log('Feed de productos cargado con éxito');
    } catch (error) {
        console.error('Error al cargar los productos:', error.code, error.message); // Mostrar código y mensaje
        feedContainer.innerHTML = `<p>Error al cargar los productos: ${error.message}</p>`; // Mostrar mensaje en UI
    }
}

// Resto del código (setupCartButtons, updateCartBubble) permanece igual