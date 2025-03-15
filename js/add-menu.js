import { getDoc, doc, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

console.log("add-menu.js cargado correctamente");

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
                    // Asegurarse de que el DOM esté listo antes de inicializar
                    setTimeout(() => initializeStoryModal(auth, db, storage, userData), 0);
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
        console.log('Inicializando modal de historias...');
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

        // Verificar que todos los elementos existan
        const elements = {
            storyCameraBtn,
            storyGalleryBtn,
            closeStoryModal,
            previewImage,
            previewTags,
            tagProductsBtn,
            storyProductSelect,
            publishStoryBtn
        };
        const missingElements = Object.entries(elements).filter(([key, value]) => !value);
        if (missingElements.length > 0) {
            console.error('Faltan elementos en el modal de historias:', elements);
            return;
        }

        let taggedProducts = [];
        let storyImageFile = null;
        const slug = userData.storeId;

        if (!slug) {
            alert('No se pudo determinar la tienda. Configura tu perfil con un storeId.');
            uploadStoryModal.style.display = 'none';
            return;
        }

        function updateButtonState() {
            if (storyImageFile) {
                storyCameraBtn.disabled = true;
                storyGalleryBtn.disabled = true;
            } else {
                storyCameraBtn.disabled = false;
                storyGalleryBtn.disabled = false;
            }
        }

        storyCameraBtn.addEventListener('click', () => {
            console.log('Botón Cámara clicado');
            if (storyImageFile) {
                console.log('Ya hay una imagen seleccionada, no se permite otra');
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'camera';
            input.onchange = (e) => {
                console.log('Evento onchange disparado para Cámara');
                console.log('Archivos disponibles:', e.target.files);
                handleImageSelect(e);
            };
            input.click();
        });

        storyGalleryBtn.addEventListener('click', () => {
            console.log('Botón Galería clicado');
            if (storyImageFile) {
                console.log('Ya hay una imagen seleccionada, no se permite otra');
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                console.log('Evento onchange disparado para Galería');
                console.log('Archivos disponibles:', e.target.files);
                handleImageSelect(e);
            };
            input.click();
        });

        tagProductsBtn.addEventListener('click', () => {
            console.log('Botón Etiquetar Productos clicado');
            storyProductSelect.style.display = 'block';
            previewImage.style.cursor = 'crosshair';
            populateStoryProductSelect();
        });

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

        let isPublishing = false;
        publishStoryBtn.addEventListener('click', async () => {
            if (isPublishing) return;
            isPublishing = true;

            console.log('Botón Publicar clicado, estado de storyImageFile:', storyImageFile);
            if (!storyImageFile || !(storyImageFile instanceof File)) {
                alert('Por favor selecciona una imagen primero');
                isPublishing = false;
                return;
            }

            try {
                const storyPath = `stores/${slug}/stories/${Date.now()}_${storyImageFile.name}`;
                const storageRef = ref(storage, storyPath);
                console.log('Subiendo imagen a:', storyPath);
                await uploadBytes(storageRef, storyImageFile);
                const imageUrl = await getDownloadURL(storageRef);
                console.log('URL de la imagen subida:', imageUrl);

                const storyData = {
                    imageUrl,
                    createdAt: new Date().toISOString(),
                    taggedProducts: taggedProducts.length > 0 ? taggedProducts : []
                };

                await addDoc(collection(db, 'stores', slug, 'stories'), storyData);
                console.log('Historia publicada con éxito');
                alert('Historia publicada con éxito');
                uploadStoryModal.style.display = 'none';
                resetModal();
            } catch (error) {
                console.error('Error al publicar la historia:', error);
                alert('Error al publicar la historia: ' + error.message);
            } finally {
                isPublishing = false;
            }
        });

        closeStoryModal.addEventListener('click', () => {
            console.log('Botón Cerrar clicado');
            uploadStoryModal.style.display = 'none';
            resetModal();
        });

        uploadStoryModal.addEventListener('click', (e) => {
            if (e.target === uploadStoryModal) {
                uploadStoryModal.style.display = 'none';
                resetModal();
            }
        });

        function handleImageSelect(e) {
            const file = e.target.files[0];
            if (file) {
                storyImageFile = file;
                console.log('Imagen seleccionada:', storyImageFile.name, 'Tamaño:', storyImageFile.size);
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    storySourceOptions.style.display = 'none';
                    storyPreviewContainer.style.display = 'block';
                    storyProductSelect.style.display = 'none';
                    previewTags.innerHTML = '';
                    updateButtonState();
                };
                reader.readAsDataURL(storyImageFile);
            } else {
                console.log('No se seleccionó ninguna imagen en esta captura');
            }
        }

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

        function resetModal() {
            taggedProducts = [];
            storyImageFile = null;
            previewTags.innerHTML = '';
            storySourceOptions.style.display = 'flex';
            storyPreviewContainer.style.display = 'none';
            storyProductSelect.style.display = 'none';
            previewImage.src = '';
            updateButtonState();
        }

        updateButtonState();
    }
}

function addStoryOption(option) {
    // Lógica para manejar la opción de historia
    console.log("Opción seleccionada:", option);
}