import { getDoc, doc, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

console.log("add-menu.js cargado correctamente");

// add-menu.js
export function initializeAddMenu(auth, db, storage) {
    const newBtn = document.getElementById('new-btn');
    const addMenu = document.getElementById('add-menu');

    if (!newBtn || !addMenu) {
        console.error('Elementos necesarios para add-menu no encontrados en el DOM');
        return;
    }

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

        if (userData.role === 'client') {
            addMenu.style.display = 'none';
            return;
        }

        if (userData.role === 'store') {
            addMenu.innerHTML = `
                <button id="add-product-option"><i class="bi bi-box"></i> Producto</button>
                <button id="add-story-option"><i class="bi bi-image"></i> Historia</button>
            `;
        } else if (userData.role === 'creator') {
            addMenu.innerHTML = `
                <button id="add-story-option"><i class="bi bi-image"></i> Historia</button>
            `;
        }

        const addStoryOption = document.getElementById('add-story-option');
        const addProductOption = document.getElementById('add-product-option');

        if (addStoryOption) {
            addStoryOption.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Opción Añadir Historia clicada');
                addMenu.style.display = 'none';
                const uploadStoryModal = document.getElementById('upload-story-modal');
                if (uploadStoryModal) {
                    uploadStoryModal.style.display = 'flex';
                    setTimeout(() => initializeStoryModal(auth, db, storage, userData), 0);
                } else {
                    console.error('Modal #upload-story-modal no encontrado en el DOM');
                }
            });
        }

        if (addProductOption) {
            addProductOption.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Opción Añadir Producto clicada');
                addMenu.style.display = 'none';
                const addProductModal = document.getElementById('add-product-modal');
                if (addProductModal) {
                    addProductModal.style.display = 'flex'; // Abrir el modal
                    const feedContainer = document.querySelector('.feed-container') || document.createElement('div');
                    initializeAddProduct(db, storage, userData.storeId || 'unknown', feedContainer); // Inicializar con el slug correcto
                } else {
                    console.error('Modal #add-product-modal no encontrado en el DOM');
                }
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!addMenu.contains(e.target) && e.target !== newBtn) {
            addMenu.style.display = 'none';
        }
    });

    // ... (resto del código) ...
}

function addStoryOption(option) {
    // Lógica para manejar la opción de historia
    console.log("Opción seleccionada:", option);
}

function initializeStoryModal() {
    const storyModal = document.getElementById('upload-story-modal');
    const closeStoryModal = document.getElementById('close-story-modal');

    if (storyModal && closeStoryModal) {
        closeStoryModal.addEventListener('click', () => {
            storyModal.style.display = 'none'; // Oculta el modal
        });
    } else {
        console.error('No se encontró el modal o el botón de cerrar.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const closeStoryModal = document.getElementById('close-story-modal');
    const storyModal = document.getElementById('upload-story-modal');

    if (closeStoryModal && storyModal) {
        closeStoryModal.addEventListener('click', () => {
            storyModal.style.display = 'none'; // Oculta el modal
            // Opcional: Limpia los campos del modal si es necesario
            const previewImage = document.getElementById('preview-image');
            const previewTags = document.getElementById('preview-tags');
            const storyProductSelect = document.getElementById('story-product');

            if (previewImage) previewImage.src = '';
            if (previewTags) previewTags.innerHTML = '';
            if (storyProductSelect) storyProductSelect.style.display = 'none';
        });
    } else {
        console.error('No se encontró el botón o el modal para cerrar la historia.');
    }
});