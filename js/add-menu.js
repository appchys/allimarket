import { getDoc, doc, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

export function initializeAddMenu(auth, db, storage) {
    const newBtn = document.getElementById('new-btn');
    const addMenu = document.getElementById('add-menu');

    if (!newBtn || !addMenu) {
        console.error('Elementos necesarios para add-menu no encontrados en el DOM');
        return;
    }

    // Mostrar/Ocultar menú
    newBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (addMenu.style.display === 'block') {
            addMenu.style.display = 'none';
            return;
        }

        addMenu.style.display = 'block';

        if (!auth.currentUser) {
            addMenu.innerHTML = '<button disabled><i class="bi bi-lock"></i> Inicia sesión</button>';
            return;
        }

        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
            addMenu.innerHTML = '<button disabled><i class="bi bi-gear"></i> Configura tu perfil</button>';
            return;
        }

        const userData = userDoc.data();
        if (userData.role === 'store') {
            addMenu.innerHTML = `
                <button id="add-product-option"><i class="bi bi-box"></i> Producto</button>
                <button id="add-story-option"><i class="bi bi-image"></i> Historia</button>
            `;
        } else if (userData.role === 'client' || userData.role === 'creator') {
            addMenu.innerHTML = `
                <button id="add-story-option"><i class="bi bi-image"></i> Historia</button>
            `;
        } else {
            addMenu.innerHTML = '<button disabled><i class="bi bi-x-circle"></i> Rol no permitido</button>';
        }

        // Configurar eventos para las opciones
        const addProductOption = document.getElementById('add-product-option');
        const addStoryOption = document.getElementById('add-story-option');

        if (addProductOption) {
            addProductOption.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Opción Añadir Producto clicada');
                addMenu.style.display = 'none';
                const addProductModal = document.getElementById('add-product-modal');
                if (addProductModal) {
                    addProductModal.style.display = 'flex';
                } else {
                    redirectToStoreOrAlert(userData);
                }
            });
        }

        if (addStoryOption) {
            addStoryOption.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Opción Añadir Historia clicada');
                addMenu.style.display = 'none';
                const uploadStoryModal = document.getElementById('upload-story-modal');
                if (uploadStoryModal) {
                    uploadStoryModal.style.display = 'flex';
                    initializeStoryModal(auth, db, storage, userData);
                } else {
                    console.error('Modal #upload-story-modal no encontrado en el DOM');
                }
            });
        }
    });

    // Cerrar el menú si se hace clic fuera de él
    document.addEventListener('click', (e) => {
        if (!addMenu.contains(e.target) && e.target !== newBtn) {
            addMenu.style.display = 'none';
        }
    });

    // Función auxiliar para redirigir o mostrar alerta
    function redirectToStoreOrAlert(userData) {
        if (userData.role === 'store' && userData.storeId) {
            window.location.href = `/${userData.storeId}`;
        } else {
            alert('Necesitas configurar una tienda para esta acción.');
        }
    }

    // Lógica del modal de historias
    function initializeStoryModal(auth, db, storage, userData) {
        const uploadStoryModal = document.getElementById('upload-story-modal');
        const storyCameraBtn = document.getElementById('story-camera');
        const storyGalleryBtn = document.getElementById('story-gallery');
        const storyPreviewContainer = document.getElementById('story-preview-container');
        const storySourceOptions = document.getElementById('story-source-options');
        const previewImage = document.getElementById('preview-image');
        const previewTags = document.getElementById('preview-tags');
        const tagProductsBtn = document.getElementById('tag-products-btn');
        const storyProductSelect = document.getElementById('story-product');
        const publishStoryBtn = document.getElementById('publish-story-btn');
        const closeStoryModal = document.getElementById('close-story-modal');

        let taggedProducts = [];
        let storyImageFile = null;
        const slug = userData.storeId; // Asumimos que storeId es el slug de la tienda

        if (!slug) {
            alert('No se pudo determinar la tienda. Configura tu perfil con un storeId.');
            uploadStoryModal.style.display = 'none';
            return;
        }

        // Verificar que todos los elementos existen
        if (!storyCameraBtn || !storyGalleryBtn || !closeStoryModal || !previewImage || !previewTags || !tagProductsBtn || !storyProductSelect || !publishStoryBtn) {
            console.error('Faltan elementos en el modal de historias:', {
                storyCameraBtn, storyGalleryBtn, closeStoryModal, previewImage, previewTags, tagProductsBtn, storyProductSelect, publishStoryBtn
            });
            return;
        }

        // Botón Cámara
        storyCameraBtn.addEventListener('click', () => {
            console.log('Botón Cámara clicado');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'camera';
            input.onchange = (e) => handleImageSelect(e);
            input.click();
        });

        // Botón Galería
        storyGalleryBtn.addEventListener('click', () => {
            console.log('Botón Galería clicado');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => handleImageSelect(e);
            input.click();
        });

        // Botón Etiquetar Productos
        tagProductsBtn.addEventListener('click', () => {
            console.log('Botón Etiquetar Productos clicado');
            storyProductSelect.style.display = 'block';
            previewImage.style.cursor = 'crosshair';
            populateStoryProductSelect();
        });

        // Clic en la imagen para etiquetar
        previewImage.addEventListener('click', (e) => {
            if (storyProductSelect.style.display !== 'block') return;
            const productId = storyProductSelect.value;
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
            previewTags.appendChild(tag);
        });

        // Botón Publicar
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
                alert('Historia publicada con éxito');
                uploadStoryModal.style.display = 'none';
                taggedProducts = [];
                storyImageFile = null;
                previewTags.innerHTML = '';
                storySourceOptions.style.display = 'flex';
                storyPreviewContainer.style.display = 'none';
            } catch (error) {
                console.error('Error al publicar la historia:', error);
                alert('Error al publicar la historia: ' + error.message);
            }
        });

        // Botón Cerrar
        closeStoryModal.addEventListener('click', () => {
            console.log('Botón Cerrar clicado');
            uploadStoryModal.style.display = 'none';
            taggedProducts = [];
            storyImageFile = null;
            previewTags.innerHTML = '';
            storySourceOptions.style.display = 'flex';
            storyPreviewContainer.style.display = 'none';
        });

        // Cerrar el modal al hacer clic fuera del contenido
        uploadStoryModal.addEventListener('click', (e) => {
            if (e.target === uploadStoryModal) {
                uploadStoryModal.style.display = 'none';
                taggedProducts = [];
                storyImageFile = null;
                previewTags.innerHTML = '';
                storySourceOptions.style.display = 'flex';
                storyPreviewContainer.style.display = 'none';
            }
        });

        // Manejar selección de imagen
        function handleImageSelect(e) {
            storyImageFile = e.target.files[0];
            if (storyImageFile) {
                console.log('Imagen seleccionada:', storyImageFile.name);
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    storySourceOptions.style.display = 'none';
                    storyPreviewContainer.style.display = 'block';
                    storyProductSelect.style.display = 'none';
                    previewTags.innerHTML = '';
                };
                reader.readAsDataURL(storyImageFile);
            }
        }

        // Rellenar el select de productos
        async function populateStoryProductSelect() {
            const productsSnapshot = await getDocs(collection(db, 'stores', slug, 'products'));
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
}