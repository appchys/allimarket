// store-owner.js
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';
import { setDoc, doc, addDoc, collection, getDocs, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { initializeAddProduct } from './add-product.js';

export async function loadOwnerFeatures(db, storage, auth, slug, store, elements) {
    if (!elements.feedContainer) {
        console.error('El contenedor de feed (#feed-container) no está disponible');
        return;
    }

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar Perfil';
    editBtn.id = 'edit-btn';
    elements.storeActions.appendChild(editBtn);

    const editProductsBtn = document.createElement('button');
    editProductsBtn.textContent = 'Editar productos';
    editProductsBtn.id = 'edit-products-btn';
    elements.storeActions.appendChild(editProductsBtn);

    const editProfileSidebar = document.getElementById('edit-profile-sidebar');
    const editStoreForm = document.getElementById('edit-store-form');
    const addActionModal = document.getElementById('add-action-modal');
    const postStoryModal = document.getElementById('post-story-modal');

    fetch('add-product.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            const addProductModal = document.getElementById('add-product-modal');
            if (addProductModal) {
                initializeAddProduct(db, storage, slug, elements.feedContainer);

                document.getElementById('add-product-option').addEventListener('click', () => {
                    addProductModal.style.display = 'flex';
                    if (addActionModal) addActionModal.style.display = 'none';
                });
            } else {
                console.error('#add-product-modal no encontrado en el DOM');
            }
        })
        .catch(error => console.error('Error al cargar add-product.html:', error));

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
                    const metadata = { customMetadata: { owner: auth.currentUser.uid } };
                    await uploadBytes(storageRef, editStoreImage, metadata);
                    updatedData.imageUrl = await getDownloadURL(storageRef);
                }
                await setDoc(doc(db, 'stores', slug), updatedData, { merge: true });
                editProfileSidebar.style.display = 'none';
                elements.storeName.textContent = updatedData.name;
                elements.storeDescription.textContent = updatedData.description;
                if (updatedData.imageUrl) elements.storeImage.src = updatedData.imageUrl;
            } catch (error) {
                console.error('Error al guardar los cambios:', error.message);
                alert('Error al guardar los cambios: ' + error.message);
            }
        });
    }

    let isEditingProducts = false;
    editProductsBtn.addEventListener('click', () => {
        isEditingProducts = !isEditingProducts;
        editProductsBtn.textContent = isEditingProducts ? 'Terminar Edición' : 'Editar productos';
        const productCards = elements.feedContainer.querySelectorAll('.store-product');
        productCards.forEach(card => {
            let editBtn = card.querySelector('.edit-product-btn') || createButton('Editar', 'edit-product-btn');
            let hideBtn = card.querySelector('.hide-product-btn') || createButton('Ocultar', 'hide-product-btn');
            let deleteBtn = card.querySelector('.delete-product-btn') || createButton('Eliminar', 'delete-product-btn');
            const actionsContainer = card.querySelector('.product-actions') || card.appendChild(document.createElement('div'));
            actionsContainer.className = 'product-actions';
            actionsContainer.append(editBtn, hideBtn, deleteBtn);
            editBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
            hideBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
            deleteBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
        });

        if (isEditingProducts) {
            setupProductOptions(db, slug, elements.feedContainer);
        } else {
            closeAllPopovers();
            removeEventListeners(elements.feedContainer); // Limpiar eventos al salir del modo edición
        }
    });

    let clickOutsideListener = null;

    function setupProductOptions(db, slug, feedContainer) {
        const optionsButtons = feedContainer.querySelectorAll('.options-btn');
        console.log(`Botones .options-btn encontrados: ${optionsButtons.length}`); // Depuración

        if (optionsButtons.length === 0) {
            console.warn('No se encontraron botones .options-btn. Asegúrate de que loadStoreFeed se ejecutó primero.');
            return;
        }

        optionsButtons.forEach((btn) => {
            // Añadir evento de clic al botón de opciones
            const togglePopover = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clic en .options-btn'); // Depuración
                const popover = btn.nextElementSibling;
                if (popover) {
                    // Cierra otros popovers
                    closeAllPopovers();
                    // Alterna la visibilidad del popover
                    const isVisible = popover.style.display === 'block';
                    popover.style.display = isVisible ? 'none' : 'block';
                    btn.dataset.popoverOpen = isVisible ? 'false' : 'true';
                }
            };

            btn.addEventListener('click', togglePopover);
            btn.dataset.eventAdded = 'true'; // Marca que el evento se añadió

            const productCard = btn.closest('.store-product');
            const productId = productCard.dataset.productId;
            const productRef = doc(db, 'stores', slug, 'products', productId);

            productCard.querySelector('.edit-product-btn').addEventListener('click', async () => {
                const newName = prompt('Nuevo nombre:', productCard.querySelector('h3').textContent);
                const newDescription = prompt('Nueva descripción:', productCard.querySelector('.description').textContent);
                const newPrice = prompt('Nuevo precio:', productCard.querySelector('.price').textContent.replace('$', ''));
                if (newName && newDescription && newPrice) {
                    try {
                        await updateDoc(productRef, {
                            name: newName,
                            description: newDescription,
                            price: parseFloat(newPrice)
                        });
                        productCard.querySelector('h3').textContent = newName;
                        productCard.querySelector('.description').textContent = newDescription;
                        productCard.querySelector('.price').textContent = `$${parseFloat(newPrice).toFixed(2)}`;
                        alert('Producto actualizado');
                        closeAllPopovers();
                    } catch (error) {
                        console.error('Error al actualizar producto:', error);
                        alert('Error: ' + error.message);
                    }
                }
            });

            productCard.querySelector('.hide-product-btn').addEventListener('click', async () => {
                try {
                    await updateDoc(productRef, { hidden: true });
                    productCard.style.display = 'none';
                    alert('Producto ocultado');
                    closeAllPopovers();
                } catch (error) {
                    console.error('Error al ocultar producto:', error);
                    alert('Error: ' + error.message);
                }
            });

            productCard.querySelector('.delete-product-btn').addEventListener('click', async () => {
                if (confirm('¿Seguro que quieres eliminar este producto?')) {
                    try {
                        await deleteDoc(productRef);
                        productCard.remove();
                        alert('Producto eliminado');
                        closeAllPopovers();
                    } catch (error) {
                        console.error('Error al eliminar producto:', error);
                        alert('Error: ' + error.message);
                    }
                }
            });
        });

        // Limpiar el listener anterior si existe
        if (clickOutsideListener) {
            document.removeEventListener('click', clickOutsideListener);
        }

        // Añadir evento para cerrar al hacer clic afuera
        clickOutsideListener = (e) => {
            const openPopovers = feedContainer.querySelectorAll('[data-popover-open="true"]');
            openPopovers.forEach(btn => {
                const popover = btn.nextElementSibling;
                if (popover && !btn.contains(e.target) && !popover.contains(e.target)) {
                    popover.style.display = 'none';
                    btn.dataset.popoverOpen = 'false';
                }
            });
        };
        document.addEventListener('click', clickOutsideListener);
    }

    function closeAllPopovers() {
        const openPopovers = elements.feedContainer.querySelectorAll('[data-popover-open="true"]');
        openPopovers.forEach(btn => {
            const popover = btn.nextElementSibling;
            if (popover) {
                popover.style.display = 'none';
                btn.dataset.popoverOpen = 'false';
            }
        });
    }

    function removeEventListeners(feedContainer) {
        const optionsButtons = feedContainer.querySelectorAll('.options-btn');
        optionsButtons.forEach(btn => {
            if (btn.dataset.eventAdded === 'true') {
                btn.replaceWith(btn.cloneNode(true)); // Clona el botón para eliminar eventos
                btn.dataset.eventAdded = 'false';
            }
        });
        if (clickOutsideListener) {
            document.removeEventListener('click', clickOutsideListener);
            clickOutsideListener = null;
        }
    }

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

    function createButton(text, className) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = className;
        btn.style.display = 'none';
        return btn;
    }
}