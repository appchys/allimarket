import { collection, query, orderBy, getDocs, getDoc, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { setupCartButtons } from './store-profile.js';

export async function loadStoreFeed(db, slug, auth) {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) {
        console.error('No se encontró el contenedor del feed (#feed-container)');
        return;
    }

    feedContainer.innerHTML = '<p>Cargando productos...</p>';

    try {
        console.log(`Cargando productos para slug: ${slug}`);
        const productsQuery = query(
            collection(db, 'stores', slug, 'products'),
            orderBy('createdAt', 'desc')
        );
        const productsSnapshot = await getDocs(productsQuery);
        console.log(`Productos encontrados: ${productsSnapshot.size}`);

        if (productsSnapshot.empty) {
            feedContainer.innerHTML = '<p>No hay productos disponibles</p>';
            return;
        }

        const user = auth.currentUser;
        console.log(`Usuario autenticado: ${user ? user.uid : 'No autenticado'}`);
        const storeDoc = await getDoc(doc(db, 'stores', slug));
        console.log(`Documento de tienda existe: ${storeDoc.exists()}`);
        const isOwner = user && storeDoc.exists() && storeDoc.data().owner === user.uid;
        console.log(`Es propietario: ${isOwner}`);

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

        const elements = {
            feedContainer: feedContainer,
            cartCount: document.getElementById('cart-count') // Eliminado cartBubble
        };

        if (isOwner) {
            const optionButtons = feedContainer.querySelectorAll('.options-btn');
            optionButtons.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const popover = btn.nextElementSibling;
                    const isVisible = popover.style.display === 'block';
                    
                    feedContainer.querySelectorAll('.popover').forEach((p) => {
                        p.style.display = 'none';
                    });
        
                    if (!isVisible) {
                        const rect = btn.getBoundingClientRect();
                        popover.style.top = `${rect.height + 5}px`;
                        popover.style.left = `-${popover.offsetWidth - btn.offsetWidth}px`;
                        popover.style.display = 'block';
                    }
                });
            });
        
            feedContainer.addEventListener('click', async (e) => {
                const target = e.target.closest('button');
                if (!target) return;
        
                const productCard = target.closest('.store-product');
                if (!productCard) return;
        
                const productId = productCard.dataset.productId;
                const productRef = doc(db, 'stores', slug, 'products', productId);
        
                if (target.classList.contains('edit-product-btn')) {
                    const newName = prompt('Nuevo nombre del producto:', productCard.querySelector('h3').textContent);
                    const newPrice = prompt('Nuevo precio:', productCard.querySelector('.price').textContent.replace('$', ''));
                    const newDescription = prompt('Nueva descripción:', productCard.querySelector('.description').textContent);
                    if (newName && newPrice && newDescription) {
                        try {
                            await updateDoc(productRef, {
                                name: newName,
                                price: parseFloat(newPrice),
                                description: newDescription
                            });
                            productCard.querySelector('h3').textContent = newName;
                            productCard.querySelector('.price').textContent = `$${parseFloat(newPrice).toFixed(2)}`;
                            productCard.querySelector('.description').textContent = newDescription;
                            alert('Producto actualizado');
                        } catch (error) {
                            console.error('Error al actualizar producto:', error);
                            alert('Error: ' + error.message);
                        }
                    }
                } else if (target.classList.contains('hide-product-btn')) {
                    try {
                        await updateDoc(productRef, { hidden: true });
                        productCard.style.display = 'none';
                        alert('Producto ocultado');
                    } catch (error) {
                        console.error('Error al ocultar producto:', error);
                        alert('Error: ' + error.message);
                    }
                } else if (target.classList.contains('delete-product-btn')) {
                    if (confirm('¿Seguro que quieres eliminar este producto?')) {
                        try {
                            await deleteDoc(productRef);
                            productCard.remove();
                            alert('Producto eliminado');
                        } catch (error) {
                            console.error('Error al eliminar producto:', error);
                            alert('Error: ' + error.message);
                        }
                    }
                }
        
                const popover = target.closest('.popover');
                if (popover) popover.style.display = 'none';
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.options-btn') && !e.target.closest('.popover')) {
                    feedContainer.querySelectorAll('.popover').forEach((p) => {
                        p.style.display = 'none';
                    });
                }
            });
        } else {
            setupCartButtons(slug, db, elements);
        }

        console.log('Feed de productos cargado con éxito');
    } catch (error) {
        console.error('Error al cargar los productos:', error.code, error.message);
        feedContainer.innerHTML = `<p>Error al cargar los productos: ${error.message}</p>`;
    }
}