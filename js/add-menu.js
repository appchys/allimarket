// add-menu.js
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export function initializeAddMenu(auth, db, storage) {
    const newBtn = document.getElementById('new-btn');
    const addMenu = document.getElementById('add-menu');

    if (!newBtn || !addMenu) {
        console.error('Elementos necesarios para add-menu no encontrados en el DOM');
        return;
    }

    // Mostrar/Ocultar menú
    newBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Evita que el clic en el botón cierre el menú inmediatamente
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
                addMenu.style.display = 'none'; // Cierra el menú al seleccionar
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
                addMenu.style.display = 'none'; // Cierra el menú al seleccionar
                window.location.href = 'upload-story.html'; // Redirige a la página de subir historias
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
}