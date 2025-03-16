import { collection, query, orderBy, getDocs, getDoc, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export async function loadStoreFeed(db, slug, auth) {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) {
        console.error('No se encontró el contenedor del feed');
        return;
    }

    feedContainer.innerHTML = '<p>Cargando productos...</p>';

    try {
        const productsQuery = query(
            collection(db, 'stores', slug, 'products'),
            orderBy('createdAt', 'desc')
        );
        const productsSnapshot = await getDocs(productsQuery);

        if (productsSnapshot.empty) {
            feedContainer.innerHTML = '<p>No hay productos disponibles</p>';
            return;
        }

        const user = auth.currentUser;
        const storeDoc = await getDoc(doc(db, 'stores', slug));
        const isOwner = user && storeDoc.exists() && storeDoc.data().owner === user.uid;

        feedContainer.innerHTML = '';
        productsSnapshot.forEach((doc) => {
            const product = doc.data();
            const productElement = document.createElement('div');
            productElement.classList.add('product', 'store-product');
            productElement.dataset.productId = doc.id;

            productElement.innerHTML = `
                <div class="product-image-container">
                    <img src="${product.imageUrl || 'https://placehold.co/200x200'}" alt="${product.name}" loading="lazy">
                    ${isOwner ? `
                        <button class="options-btn" data-product-id="${doc.id}">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <div class="popover" style="display: none;">
                            <button class="edit-product-btn">Editar</button>
                            <button class="hide-product-btn">Ocultar</button>
                            <button class="delete-product-btn">Eliminar</button>
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
            setupOwnerOptions(db, slug, feedContainer);
        } else {
            setupCartButtons(slug, db, feedContainer);
        }

        // Actualizar el feed si hay cambios (puedes añadir un listener de tiempo real si usas onSnapshot)
        console.log('Feed de productos cargado con éxito');
    } catch (error) {
        console.error('Error al cargar los productos:', error);
        feedContainer.innerHTML = '<p>Error al cargar los productos</p>';
    }
}

// Mantener las funciones auxiliares existentes
function setupOwnerOptions(db, slug, feedContainer) {
    const optionsButtons = feedContainer.querySelectorAll('.options-btn');
    optionsButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const popover = btn.nextElementSibling;
            popover.style.display = popover.style.display === 'none' ? 'block' : 'none';
        });

        const productCard = btn.closest('.store-product');
        const productId = productCard.dataset.productId;
        const productRef = doc(db, 'stores', slug, 'products', productId);

        productCard.querySelector('.edit-product-btn').addEventListener('click', async () => {
            const newName = prompt('Nuevo nombre:', productCard.querySelector('h3').textContent);
            const newDescription = prompt('Nueva descripción:', productCard.querySelector('.description').textContent);
            const newPrice = prompt('Nuevo precio:', productCard.querySelector('.price').textContent.replace('$', ''));
            if (newName && newDescription && newPrice) {
                await updateDoc(productRef, {
                    name: newName,
                    description: newDescription,
                    price: parseFloat(newPrice)
                });
                productCard.querySelector('h3').textContent = newName;
                productCard.querySelector('.description').textContent = newDescription;
                productCard.querySelector('.price').textContent = `$${parseFloat(newPrice).toFixed(2)}`;
            }
        });

        productCard.querySelector('.hide-product-btn').addEventListener('click', async () => {
            await updateDoc(productRef, { hidden: true });
            productCard.style.display = 'none';
        });

        productCard.querySelector('.delete-product-btn').addEventListener('click', async () => {
            if (confirm('¿Seguro que quieres eliminar este producto?')) {
                await deleteDoc(productRef);
                productCard.remove();
            }
        });
    });
}

function setupCartButtons(slug, db, feedContainer) {
    const addToCartButtons = feedContainer.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const productId = button.dataset.productId;
            const productDoc = await getDoc(doc(db, 'stores', slug, 'products', productId));
            if (productDoc.exists()) {
                const product = productDoc.data();
                let cart = JSON.parse(localStorage.getItem('cart')) || {};
                if (!cart[slug]) cart[slug] = [];
                cart[slug].push({
                    productId,
                    name: product.name,
                    price: product.price
                });
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartBubble();
            }
        });
    });
}

function updateCartBubble() {
    const cartBubble = document.getElementById('cart-bubble');
    const cartCount = document.getElementById('cart-count');
    const cart = JSON.parse(localStorage.getItem('cart')) || {};
    const totalItems = Object.values(cart).reduce((sum, items) => sum + items.length, 0);
    if (cartCount) cartCount.textContent = totalItems;
    if (cartBubble) cartBubble.style.display = totalItems > 0 ? 'block' : 'none';
}