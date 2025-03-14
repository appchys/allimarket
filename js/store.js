import { getDoc, setDoc, doc, addDoc, collection, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

export async function loadStoreProfile(db, storage, auth) {
    console.log('Iniciando loadStoreProfile - Fecha:', new Date().toISOString());
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    console.log('URL completa:', window.location.href);
    console.log('Slug detectado:', slug);

    if (!slug) {
        console.error('No se proporcionó slug en la URL');
        const storeName = document.getElementById('store-name');
        if (storeName) storeName.textContent = 'Error: Tienda no especificada';
        else console.error('Elemento store-name no encontrado en el DOM');
        return;
    }

    const storeImage = document.getElementById('store-image');
    const storeName = document.getElementById('store-name');
    const storeFollowers = document.getElementById('store-followers');
    const storeDescription = document.getElementById('store-description');
    const storeActions = document.getElementById('store-actions');
    const storiesContainer = document.getElementById('stories-container');
    const feedContainer = document.getElementById('feed-container');
    const storyImage = document.getElementById('story-image');
    const productTags = document.getElementById('product-tags');
    const storyViewContainer = document.getElementById('story-view-container');
    const closeStoryView = document.getElementById('close-story-view');
    const addActionModal = document.getElementById('add-action-modal');
    const addProductOption = document.getElementById('add-product-option');
    const addStoryOption = document.getElementById('add-story-option');
    const closeAddAction = document.getElementById('close-add-action');
    const postStoryModal = document.getElementById('post-story-modal');
    const storyCameraBtn = document.getElementById('story-camera');
    const storyGalleryBtn = document.getElementById('story-gallery');
    const storySourceOptions = document.getElementById('story-source-options');
    const storyPreviewContainer = document.getElementById('story-preview-container');
    const previewImage = document.getElementById('preview-image');
    const previewTags = document.getElementById('preview-tags');
    const tagProductsBtn = document.getElementById('tag-products-btn');
    const publishStoryBtn = document.getElementById('publish-story-btn');
    const storyProductSelect = document.getElementById('story-product');
    const closeStoryModal = document.getElementById('close-story-modal');
    const editProfileSidebar = document.getElementById('edit-profile-sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const editStoreForm = document.getElementById('edit-store-form');
    const editStoreName = document.getElementById('edit-store-name');
    const editStoreDescription = document.getElementById('edit-store-description');
    const editStorePhone = document.getElementById('edit-store-phone');
    const editStoreImage = document.getElementById('edit-store-image');
    const editStoreImagePreview = document.getElementById('edit-store-image-preview');
    const navAddBtn = document.getElementById('new-btn');

    console.log('Verificando elementos del DOM:');
    [storeName, storeImage, storeActions, storiesContainer, feedContainer, editProfileSidebar, navAddBtn].forEach(el => {
        console.log(el ? el.id + ': encontrado' : el + ': no encontrado');
    });

    if (!storeName || !storeImage || !storeActions || !storiesContainer || !feedContainer || !editProfileSidebar) {
        console.error('Faltan elementos esenciales del DOM:', {
            storeName, storeImage, storeActions, storiesContainer, feedContainer, editProfileSidebar
        });
        return;
    }

    try {
        console.log('Obteniendo documento de tienda:', slug);
        const storeDoc = await getDoc(doc(db, 'stores', slug));
        console.log('Documento existe:', storeDoc.exists());
        if (!storeDoc.exists()) {
            console.error('Tienda no encontrada:', slug);
            storeName.textContent = 'Tienda no encontrada';
            return;
        }

        const store = storeDoc.data();
        console.log('Datos de la tienda:', store);
        storeImage.src = store.imageUrl || 'https://placehold.co/100x100';
        storeName.textContent = store.name || 'Sin nombre';
        storeFollowers.textContent = `${store.followers || 0} seguidores`;
        storeDescription.textContent = store.description || 'Sin descripción';

        const user = auth.currentUser;
        const isOwner = user && store.owner === user.uid;
        console.log('Usuario actual:', user ? user.uid : 'No autenticado', 'Es propietario:', isOwner);

        storeActions.innerHTML = '';
        if (isOwner) {
            console.log('Usuario es propietario, mostrando botones de propietario');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar Perfil';
            editBtn.id = 'edit-btn';
            storeActions.appendChild(editBtn);

            const editProductsBtn = document.createElement('button');
            editProductsBtn.textContent = 'Editar productos';
            editProductsBtn.id = 'edit-products-btn';
            storeActions.appendChild(editProductsBtn);

            editBtn.addEventListener('click', () => {
                console.log('Abriendo panel lateral de edición y cargando datos');
                editProfileSidebar.style.display = 'block';
                editStoreName.value = store.name || '';
                editStoreDescription.value = store.description || '';
                editStorePhone.value = store.phone || '';
                editStoreImagePreview.src = store.imageUrl || 'https://placehold.co/100x100';
            });

            closeSidebar.addEventListener('click', () => {
                console.log('Cerrando panel lateral');
                editProfileSidebar.style.display = 'none';
            });

            editStoreForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                console.log('Guardando cambios del formulario');
                try {
                    const updatedData = {
                        name: editStoreName.value,
                        description: editStoreDescription.value,
                        phone: editStorePhone.value || null,
                    };
                    if (editStoreImage.files && editStoreImage.files[0]) {
                        const imageFile = editStoreImage.files[0];
                        const imagePath = `stores/${slug}/profile_${Date.now()}.jpg`;
                        const storageRef = ref(storage, imagePath);
                        await uploadBytes(storageRef, imageFile);
                        updatedData.imageUrl = await getDownloadURL(storageRef);
                    }
                    await setDoc(doc(db, 'stores', slug), updatedData, { merge: true });
                    console.log('Datos guardados exitosamente');
                    editProfileSidebar.style.display = 'none';
                    loadStoreProfile(db, storage, auth);
                } catch (error) {
                    console.error('Error al guardar los cambios:', error.message);
                    alert('Error al guardar los cambios: ' + error.message);
                }
            });

            if (navAddBtn) {
                navAddBtn.addEventListener('click', () => {
                    console.log('Botón + clicado, mostrando #add-action-modal');
                    if (addActionModal) addActionModal.style.display = 'flex';
                    else console.error('#add-action-modal no encontrado en el DOM');
                });
            }

            let isEditingProducts = false;
            editProductsBtn.addEventListener('click', () => {
                isEditingProducts = !isEditingProducts;
                console.log('Modo edición de productos:', isEditingProducts ? 'activado' : 'desactivado');
                const productCards = feedContainer.querySelectorAll('.store-product');
                productCards.forEach(card => {
                    let editBtn = card.querySelector('.edit-product-btn');
                    let hideBtn = card.querySelector('.hide-product-btn');
                    let deleteBtn = card.querySelector('.delete-product-btn');
                    
                    if (!editBtn) {
                        editBtn = document.createElement('button');
                        editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
                        editBtn.className = 'edit-product-btn';
                        editBtn.style.display = 'none';
                        card.querySelector('.product-actions').appendChild(editBtn);
                    }
                    if (!hideBtn) {
                        hideBtn = document.createElement('button');
                        hideBtn.innerHTML = '<i class="bi bi-eye"></i>';
                        hideBtn.className = 'hide-product-btn';
                        hideBtn.style.display = 'none';
                        card.querySelector('.product-actions').appendChild(hideBtn);
                    }
                    if (!deleteBtn) {
                        deleteBtn = document.createElement('button');
                        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                        deleteBtn.className = 'delete-product-btn';
                        deleteBtn.style.display = 'none';
                        card.querySelector('.product-actions').appendChild(deleteBtn);
                    }

                    editBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
                    hideBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
                    deleteBtn.style.display = isEditingProducts ? 'inline-block' : 'none';
                });
            });

            addProductOption.addEventListener('click', () => {
                console.log('Opción Añadir Producto clicada');
                const addProductModal = document.getElementById('add-product-modal');
                if (addProductModal) addProductModal.style.display = 'flex';
                else console.error('#add-product-modal no encontrado en el DOM');
                if (addActionModal) addActionModal.style.display = 'none';
            });

            addStoryOption.addEventListener('click', () => {
                console.log('Opción Añadir Historia clicada');
                if (postStoryModal) postStoryModal.style.display = 'flex';
                else console.error('#post-story-modal no encontrado en el DOM');
                if (addActionModal) addActionModal.style.display = 'none';
                if (storySourceOptions) storySourceOptions.style.display = 'flex';
                if (storyPreviewContainer) storyPreviewContainer.style.display = 'none';
            });

            closeAddAction.addEventListener('click', () => {
                console.log('Cerrando #add-action-modal');
                if (addActionModal) addActionModal.style.display = 'none';
            });

            let taggedProducts = [];
            let storyImageFile = null;

            storyCameraBtn.addEventListener('click', () => {
                console.log('Abriendo cámara para historia');
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'camera';
                input.onchange = (e) => handleImageSelect(e, slug);
                input.click();
            });

            storyGalleryBtn.addEventListener('click', () => {
                console.log('Abriendo galería para historia');
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => handleImageSelect(e, slug);
                input.click();
            });

            tagProductsBtn.addEventListener('click', () => {
                console.log('Etiquetando productos en historia');
                if (storyProductSelect) storyProductSelect.style.display = 'block';
                if (previewImage) previewImage.style.cursor = 'crosshair';
                populateStoryProductSelect(slug);
            });

            previewImage.addEventListener('click', (e) => {
                if (storyProductSelect && storyProductSelect.style.display !== 'block') return;
                const productId = storyProductSelect ? storyProductSelect.value : '';
                if (!productId) {
                    alert('Selecciona un producto para etiquetar');
                    return;
                }

                const rect = previewImage.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                taggedProducts.push({ productId, x, y });

                const tag = document.createElement('div');
                tag.classList.add('preview-tag');
                tag.style.left = `${x}%`;
                tag.style.top = `${y}%`;
                tag.textContent = storyProductSelect.options[storyProductSelect.selectedIndex].text;
                if (previewTags) previewTags.appendChild(tag);
            });

            publishStoryBtn.addEventListener('click', async () => {
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
                    console.log('Historia publicada con éxito');
                    if (postStoryModal) postStoryModal.style.display = 'none';
                    taggedProducts = [];
                    storyImageFile = null;
                    if (previewTags) previewTags.innerHTML = '';
                    loadStoreProfile(db, storage, auth);
                } catch (error) {
                    console.error('Error al publicar la historia:', error);
                    alert('Error al publicar la historia: ' + error.message);
                }
            });

            closeStoryModal.addEventListener('click', () => {
                console.log('Cerrando #post-story-modal');
                if (postStoryModal) postStoryModal.style.display = 'none';
                taggedProducts = [];
                storyImageFile = null;
                if (previewTags) previewTags.innerHTML = '';
                if (storySourceOptions) storySourceOptions.style.display = 'flex';
                if (storyPreviewContainer) storyPreviewContainer.style.display = 'none';
            });

            function handleImageSelect(e, slug) {
                storyImageFile = e.target.files[0];
                if (storyImageFile) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (previewImage) previewImage.src = event.target.result;
                        if (storySourceOptions) storySourceOptions.style.display = 'none';
                        if (storyPreviewContainer) storyPreviewContainer.style.display = 'block';
                        if (storyProductSelect) storyProductSelect.style.display = 'none';
                        if (previewTags) previewTags.innerHTML = '';
                    };
                    reader.readAsDataURL(storyImageFile);
                }
            }

            async function populateStoryProductSelect(slug) {
                const productsSnapshot = await getDocs(collection(db, 'stores', slug, 'products'));
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
        } else {
            console.log('Usuario no es propietario, mostrando botones de visitante');
            const followBtn = document.createElement('button');
            followBtn.textContent = 'Seguir';
            followBtn.id = 'follow-btn';
            storeActions.appendChild(followBtn);

            const whatsappBtn = document.createElement('button');
            whatsappBtn.textContent = 'WhatsApp';
            whatsappBtn.id = 'whatsapp-btn';
            storeActions.appendChild(whatsappBtn);

            if (store.phone) {
                const phoneNumber = normalizePhoneNumber(store.phone);
                whatsappBtn.onclick = () => {
                    window.open(`https://wa.me/${phoneNumber}`, '_blank');
                };
            } else {
                whatsappBtn.style.display = 'none';
            }

            followBtn.addEventListener('click', async () => {
                const updatedFollowers = (store.followers || 0) + 1;
                await setDoc(doc(db, 'stores', slug), { followers: updatedFollowers }, { merge: true });
                storeFollowers.textContent = `${updatedFollowers} seguidores`;
                followBtn.textContent = 'Siguiendo';
                followBtn.disabled = true;
            });
        }

        const storiesQuery = query(collection(db, 'stores', slug, 'stories'), orderBy('createdAt', 'desc'));
        const storiesSnapshot = await getDocs(storiesQuery);
        storiesContainer.innerHTML = '';
        console.log(`Historias encontradas: ${storiesSnapshot.size}`);
        storiesSnapshot.forEach((storyDoc) => {
            const story = storyDoc.data();
            const storyElement = document.createElement('div');
            storyElement.classList.add('story');
            storyElement.innerHTML = `<img src="${story.imageUrl}" alt="Story" loading="lazy"><span>${store.name}</span>`;
            storyElement.addEventListener('click', async () => {
                if (storyImage) storyImage.src = story.imageUrl;
                if (productTags) productTags.innerHTML = '';
                if (story.taggedProducts && story.taggedProducts.length > 0) {
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
                                <button>Añadir al carrito</button>
                            `;
                            if (productTags) productTags.appendChild(tagElement);
                        }
                    }
                }
                if (storyViewContainer) storyViewContainer.style.display = 'block';
            });
            if (storiesContainer) storiesContainer.appendChild(storyElement);
        });

        closeStoryView.addEventListener('click', () => {
            if (storyViewContainer) storyViewContainer.style.display = 'none';
            if (productTags) productTags.innerHTML = '';
        });

        const productsSnapshot = await getDocs(collection(db, 'stores', slug, 'products'));
        feedContainer.innerHTML = '';
        console.log(`Productos encontrados: ${productsSnapshot.size}`);
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
                <div class="product-actions">
                    <button class="edit-product-btn" style="display: none;"><i class="bi bi-pencil"></i></button>
                    <button class="hide-product-btn" style="display: none;"><i class="bi bi-eye"></i></button>
                    <button class="delete-product-btn" style="display: none;"><i class="bi bi-trash"></i></button>
                </div>
                <div class="product-details">
                    <p class="description">${product.description || 'Sin descripción'}</p>
                    <p class="price">$${product.price}</p>
                </div>
            `;
            if (feedContainer) feedContainer.appendChild(productElement);
        });
    } catch (error) {
        console.error('Error en loadStoreProfile:', error.message);
        const storeName = document.getElementById('store-name');
        if (storeName) storeName.textContent = 'Error al cargar la tienda: ' + error.message;
        else console.error('Elemento store-name no encontrado para mostrar el error');
    }
}

function normalizePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('52') ? cleaned : '52' + cleaned;
}

window.addEventListener('load', () => {
    console.log('store.js cargado, esperando Firebase...');
    if (window.db && window.storage && window.auth) {
        console.log('Firebase inicializado, ejecutando loadStoreProfile');
        loadStoreProfile(window.db, window.storage, window.auth);
    } else {
        console.error('Firebase no está inicializado correctamente');
        const storeName = document.getElementById('store-name');
        if (storeName) storeName.textContent = 'Error: Firebase no inicializado';
        else console.error('Elemento store-name no encontrado para mostrar el error');
    }
});