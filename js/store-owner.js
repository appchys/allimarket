// store-owner.js
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';
import { setDoc, doc, addDoc, collection, getDocs, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { initializeAddProduct } from './add-product.js';

export async function loadOwnerFeatures(db, storage, auth, slug, store, elements) {
    // No necesitamos cargar store-feed.html aquí si ya está manejado en store-profile.js o el HTML principal
    // Verificamos si feedContainer existe, pero no lo creamos dinámicamente
    if (!elements.feedContainer) {
        console.error('El contenedor de feed (#feed-container) no está disponible');
        return;
    }

    // Botones de acción del propietario
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar Perfil';
    editBtn.id = 'edit-btn';
    elements.storeActions.appendChild(editBtn);

    const editProductsBtn = document.createElement('button');
    editProductsBtn.textContent = 'Editar productos';
    editProductsBtn.id = 'edit-products-btn';
    elements.storeActions.appendChild(editProductsBtn);

    // Elementos del DOM
    const editProfileSidebar = document.getElementById('edit-profile-sidebar');
    const editStoreForm = document.getElementById('edit-store-form');
    const addActionModal = document.getElementById('add-action-modal');
    const postStoryModal = document.getElementById('post-story-modal');

    // Cargar dinámicamente el formulario de añadir producto
    fetch('add-product.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            const addProductModal = document.getElementById('add-product-modal');
            if (addProductModal) {
                initializeAddProduct(db, storage, slug, elements.feedContainer);

                // Evento para abrir el modal de añadir producto
                document.getElementById('add-product-option').addEventListener('click', () => {
                    addProductModal.style.display = 'flex';
                    if (addActionModal) addActionModal.style.display = 'none';
                });
            } else {
                console.error('#add-product-modal no encontrado en el DOM');
            }
        })
        .catch(error => console.error('Error al cargar add-product.html:', error));

    // Lógica para editar el perfil de la tienda
    editBtn.addEventListener('click', () => {
        if (editProfileSidebar) {
            editProfileSidebar.style.display = 'block';
            document.getElementById('edit-store-name').value = store.name || '';
            document.getElementById('edit-store-description').value = store.description || '';
            document.getElementById('edit-store-phone').value = store.phone || '';
            document.getElementById('edit-store-image-preview').src = store.imageUrl || 'https://placehold.co/100x100';
        } else {
            console.error('#edit-profile-sidebar no encontrado en el DOM');
        }
    });

    document.getElementById('close-sidebar').addEventListener('click', () => {
        if (editProfileSidebar) {
            editProfileSidebar.style.display = 'none';
        }
    });

    if (editStoreForm) {
        editStoreForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                const updatedData = {
                    name: document.getElementById('edit-store-name').value,
                    description: document.getElementById('edit-store-description').value,
                    phone: document.getElementById('edit-store-phone').value || null,
                };
                const editStoreImage = document.getElementById('edit-store-image').files[0];
                if (editStoreImage) {
                    const imagePath = `stores/${slug}/profile_${Date.now()}.jpg`;
                    const storageRef = ref(storage, imagePath);
                    const metadata = {
                        customMetadata: {
                            owner: auth.currentUser.uid
                        }
                    };
                    await uploadBytes(storageRef, editStoreImage, metadata);
                    updatedData.imageUrl = await getDownloadURL(storageRef);
                }
                await setDoc(doc(db, 'stores', slug), updatedData, { merge: true });
                editProfileSidebar.style.display = 'none';
                // Actualización dinámica en lugar de recargar (opcional)
                // window.location.reload();
                elements.storeName.textContent = updatedData.name;
                elements.storeDescription.textContent = updatedData.description;
                if (updatedData.imageUrl) elements.storeImage.src = updatedData.imageUrl;
            } catch (error) {
                console.error('Error al guardar los cambios:', error.message);
                alert('Error al guardar los cambios: ' + error.message);
            }
        });
    }

    // Gestionar edición de productos
    let isEditingProducts = false;
    editProductsBtn.addEventListener('click', () => {
        isEditingProducts = !isEditingProducts;
        editProductsBtn.textContent = isEditingProducts ? 'Terminar Edición' : 'Editar productos';
        const productCards = elements.feedContainer.querySelectorAll('.store-product');
        productCards.forEach(card => {
            let editBtn = card.querySelector('.edit-product-btn') || createButton('bi-pencil', 'edit-product-btn');
            let hideBtn = card.querySelector('.hide-product-btn') || createButton('bi-eye-slash', 'hide-product-btn');
            let deleteBtn = card.querySelector('.delete-product-btn') || createButton('bi-trash', 'delete-product-btn');
            const actionsContainer = card.querySelector('.product-actions') || card.appendChild(document.createElement('div'));
            actionsContainer.className = 'product-actions';
            actionsContainer.append(editBtn, hideBtn, deleteBtn);
            editBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
            hideBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
            deleteBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
        });
    });

    elements.feedContainer.addEventListener('click', async (e) => {
        if (!isEditingProducts) return;

        const productCard = e.target.closest('.store-product');
        if (!productCard) return;

        const productId = productCard.dataset.productId;
        if (!productId) {
            console.error('No se encontró productId en la tarjeta del producto');
            return;
        }

        const productRef = doc(db, 'stores', slug, 'products', productId);
        const clickedButton = e.target.closest('button');
        if (!clickedButton) return;

        console.log('Botón clicado:', clickedButton.className);

        if (clickedButton.classList.contains('edit-product-btn')) {
            console.log('Editando producto:', productId);
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
        } else if (clickedButton.classList.contains('hide-product-btn')) {
            console.log('Ocultando producto:', productId);
            try {
                await updateDoc(productRef, { hidden: true });
                productCard.style.display = 'none';
                alert('Producto ocultado');
            } catch (error) {
                console.error('Error al ocultar producto:', error);
                alert('Error: ' + error.message);
            }
        } else if (clickedButton.classList.contains('delete-product-btn')) {
            console.log('Eliminando producto:', productId);
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
    });

    // Evento para abrir el modal de añadir historia
    document.getElementById('add-story-option').addEventListener('click', () => {
        if (postStoryModal) {
            postStoryModal.style.display = 'flex';
            if (addActionModal) addActionModal.style.display = 'none';
            document.getElementById('story-source-options').style.display = 'flex';
            document.getElementById('story-preview-container').style.display = 'none';
        } else {
            console.error('#post-story-modal no encontrado en el DOM');
        }
    });

    document.getElementById('close-add-action').addEventListener('click', () => {
        if (addActionModal) {
            addActionModal.style.display = 'none';
        }
    });

    // Lógica para historias
    let taggedProducts = [];
    let storyImageFile = null;

    document.getElementById('story-camera').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'camera';
        input.onchange = (e) => handleImageSelect(e, slug);
        input.click();
    });

    document.getElementById('story-gallery').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => handleImageSelect(e, slug);
        input.click();
    });

    document.getElementById('tag-products-btn').addEventListener('click', () => {
        const storyProductSelect = document.getElementById('story-product');
        if (storyProductSelect) {
            storyProductSelect.style.display = 'block';
            document.getElementById('preview-image').style.cursor = 'crosshair';
            populateStoryProductSelect(slug);
        }
    });

    document.getElementById('preview-image').addEventListener('click', (e) => {
        const storyProductSelect = document.getElementById('story-product');
        if (storyProductSelect && storyProductSelect.style.display !== 'block') return;
        const productId = storyProductSelect ? storyProductSelect.value : '';
        if (!productId) {
            alert('Selecciona un producto para etiquetar');
            return;
        }

        const rect = document.getElementById('preview-image').getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        taggedProducts.push({ productId, x, y });
        const tag = document.createElement('div');
        tag.classList.add('preview-tag');
        tag.style.left = `${x}%`;
        tag.style.top = `${y}%`;
        tag.textContent = storyProductSelect.options[storyProductSelect.selectedIndex].text;
        document.getElementById('preview-tags').appendChild(tag);
    });

    document.getElementById('publish-story-btn').addEventListener('click', async () => {
        if (!storyImageFile) {
            alert('Por favor selecciona una imagen primero');
            return;
        }
        try {
            const storyPath = `stores/${slug}/stories/${Date.now()}_${storyImageFile.name}`;
            const storageRef = ref(storage, storyPath);
            await uploadBytes(storageRef, storyImageFile);
            const imageUrl = await getDownloadURL(storageRef);

            const storyData = {
                imageUrl,
                createdAt: new Date().toISOString(),
                taggedProducts: taggedProducts.length > 0 ? taggedProducts : []
            };

            await addDoc(collection(db, 'stores', slug, 'stories'), storyData);
            if (postStoryModal) postStoryModal.style.display = 'none';
            taggedProducts = [];
            storyImageFile = null;
            document.getElementById('preview-tags').innerHTML = '';
            // Actualización dinámica en lugar de recargar (opcional)
            // window.location.reload();
        } catch (error) {
            console.error('Error al publicar la historia:', error);
            alert('Error al publicar la historia: ' + error.message);
        }
    });

    document.getElementById('close-story-modal').addEventListener('click', () => {
        if (postStoryModal) {
            postStoryModal.style.display = 'none';
            taggedProducts = [];
            storyImageFile = null;
            document.getElementById('preview-tags').innerHTML = '';
            document.getElementById('story-source-options').style.display = 'flex';
            document.getElementById('story-preview-container').style.display = 'none';
        }
    });

    // Funciones auxiliares
    function handleImageSelect(e, slug) {
        storyImageFile = e.target.files[0];
        if (storyImageFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('preview-image').src = event.target.result;
                document.getElementById('story-source-options').style.display = 'none';
                document.getElementById('story-preview-container').style.display = 'block';
                document.getElementById('story-product').style.display = 'none';
                document.getElementById('preview-tags').innerHTML = '';
            };
            reader.readAsDataURL(storyImageFile);
        }
    }

    async function populateStoryProductSelect(slug) {
        const productsSnapshot = await getDocs(collection(db, 'stores', slug, 'products'));
        const storyProductSelect = document.getElementById('story-product');
        if (storyProductSelect) {
            storyProductSelect.innerHTML = '<option value="">Selecciona un producto</option>';
            productsSnapshot.forEach((doc) => {
                const product = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = product.name;
                storyProductSelect.appendChild(option);
            });
        }
    }

    function createButton(iconClass, className) {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="bi ${iconClass}"></i>`;
        btn.className = className;
        btn.style.display = 'none';
        return btn;
    }
}