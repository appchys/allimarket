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

        // Ocultar el menú completo para clientes (esto ya está bien)
        if (userData.role === 'client') {
            addMenu.style.display = 'none';
            return;
        }

        // Personalizar opciones según el rol
        if (userData.role === 'store') {
            // Tiendas ven ambas opciones: Producto e Historia
            addMenu.innerHTML = `
                <button id="add-product-option"><i class="bi bi-box"></i> Producto</button>
                <button id="add-story-option"><i class="bi bi-image"></i> Historia</button>
            `;
        } else if (userData.role === 'creator') {
            // Creadores solo ven Historia
            addMenu.innerHTML = `
                <button id="add-story-option"><i class="bi bi-image"></i> Historia</button>
            `;
        }

        // Configurar eventos para las opciones
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
                // Aquí puedes agregar la lógica para abrir un modal o redirigir a una página para añadir productos
                if (userData.storeId) {
                    window.location.href = `/${userData.storeId}/add-product`; // Ejemplo de redirección
                } else {
                    alert('Necesitas configurar una tienda para añadir productos.');
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

    // Resto del código sigue igual...
}

function addStoryOption(option) {
    // Lógica para manejar la opción de historia
    console.log("Opción seleccionada:", option);
}