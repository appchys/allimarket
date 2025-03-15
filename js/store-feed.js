import { collection, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export async function loadStoreFeed(db, slug) {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) {
        console.error('No se encontró el contenedor del feed');
        return;
    }

    // Limpia el contenido actual del feed
    feedContainer.innerHTML = '<p>Cargando productos...</p>';

    try {
        // Consulta los productos de la tienda desde Firestore usando la API modular
        const productsQuery = query(
            collection(db, 'stores', slug, 'products'),
            orderBy('createdAt', 'desc')
        );
        const productsSnapshot = await getDocs(productsQuery);

        // Verifica si hay productos
        if (productsSnapshot.empty) {
            feedContainer.innerHTML = '<p>No hay productos disponibles</p>';
            return;
        }

        // Renderiza los productos en el feed
        feedContainer.innerHTML = '';
        productsSnapshot.forEach((doc) => {
            const product = doc.data();
            const productElement = document.createElement('div');
            productElement.classList.add('product');
            productElement.innerHTML = `
                <img src="${product.imageUrl || 'https://placehold.co/200x200'}" alt="${product.name}">
                <h3>${product.name || 'Sin nombre'}</h3>
                <p class="description">${product.description || 'Sin descripción'}</p>
                <p class="price">$${product.price || '0.00'}</p>
                <button class="add-to-cart-btn" data-product-id="${doc.id}"><i class="bi bi-cart-plus"></i> Añadir al carrito</button>
            `;
            feedContainer.appendChild(productElement);
        });
    } catch (error) {
        console.error('Error al cargar los productos:', error);
        feedContainer.innerHTML = '<p>Error al cargar los productos</p>';
    }
}