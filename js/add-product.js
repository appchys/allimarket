// add-product.js
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';
import { addDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export function initializeAddProduct(db, storage, slug, feedContainer) {
    const addProductModal = document.getElementById('add-product-modal');
    const addProductForm = document.getElementById('add-product-form');
    const closeProductModal = document.getElementById('close-product-modal');

    if (!addProductModal || !addProductForm || !closeProductModal) {
        console.error('Elementos necesarios para add-product no encontrados');
        return;
    }

    if (!addProductForm.dataset.submitListenerAdded) {
        addProductForm.dataset.submitListenerAdded = 'true';
        addProductForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            try {
                const productData = {
                    name: document.getElementById('product-name').value,
                    price: parseFloat(document.getElementById('product-price').value),
                    description: document.getElementById('product-description').value,
                    createdAt: new Date().toISOString(),
                };
                const productImage = document.getElementById('product-image').files[0];
                if (productImage) {
                    const imagePath = `stores/${slug}/products/${Date.now()}_${productImage.name}`;
                    const storageRef = ref(storage, imagePath);
                    await uploadBytes(storageRef, productImage);
                    productData.imageUrl = await getDownloadURL(storageRef);
                }
                await addDoc(collection(db, 'stores', slug, 'products'), productData);
                addProductModal.style.display = 'none';
                addProductForm.reset();
                await updateProductFeed(db, slug, feedContainer);
            } catch (error) {
                console.error('Error al añadir producto:', error.message);
                alert('Error al añadir producto: ' + error.message);
            }
        });
    }

    closeProductModal.addEventListener('click', () => {
        addProductModal.style.display = 'none';
        addProductForm.reset();
    });
}

async function updateProductFeed(db, slug, feedContainer) {
    const productsSnapshot = await getDocs(collection(db, 'stores', slug, 'products'));
    feedContainer.innerHTML = '';
    productsSnapshot.forEach((productDoc) => {
        const product = productDoc.data();
        const productId = productDoc.id;
        const productElement = document.createElement('div');
        productElement.classList.add('product', 'store-product');
        productElement.dataset.productId = productId;
        productElement.innerHTML = `
            <div class="product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-actions"></div>
            <div class="product-details">
                <h3>${product.name}</h3>
                <p class="description">${product.description || 'Sin descripción'}</p>
                <p class="price">$${product.price}</p>
            </div>
        `;
        feedContainer.appendChild(productElement);
    });
}