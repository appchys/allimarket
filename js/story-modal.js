// story-modal.js
import { db } from './firebase.js';
import { deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Variable para almacenar el ID de la historia actual y el slug de la tienda
let currentStoryId = null;
let currentStoreSlug = null;

// Mostrar el modal
export function showStoryModal(imageSrc, tags = '', storyId, storeSlug) {
    console.log('showStoryModal llamado con:', { imageSrc, tags, storyId, storeSlug });
    const modal = document.getElementById('story-view-modal');
    const storyImage = document.getElementById('story-image');
    const productTags = document.getElementById('product-tags');

    if (!modal || !storyImage || !productTags) {
        console.error('Elementos del modal no encontrados:', { modal, storyImage, productTags });
        return;
    }

    storyImage.src = imageSrc;
    productTags.innerHTML = tags;
    modal.style.display = 'flex';
    currentStoryId = storyId;
    currentStoreSlug = storeSlug;
    console.log('currentStoryId asignado:', currentStoryId, 'currentStoreSlug asignado:', currentStoreSlug);
}

// Cerrar el modal
function closeStoryModal() {
    console.log('Cerrando modal...');
    const modal = document.getElementById('story-view-modal');
    const storyImage = document.getElementById('story-image');
    const productTags = document.getElementById('product-tags');

    if (!modal || !storyImage || !productTags) {
        console.error('Elementos del modal no encontrados al cerrar:', { modal, storyImage, productTags });
        return;
    }

    modal.style.display = 'none';
    storyImage.src = '';
    productTags.innerHTML = '';
    currentStoryId = null;
    currentStoreSlug = null;
    console.log('currentStoryId restablecido a:', currentStoryId, 'currentStoreSlug restablecido a:', currentStoreSlug);
}

// Eliminar una historia
async function deleteStory() {
    console.log('Intentando eliminar historia con ID:', currentStoryId, 'en tienda:', currentStoreSlug);
    if (!currentStoryId || !currentStoreSlug) {
        console.error('No hay ID de historia o slug de tienda definidos para eliminar');
        return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar esta historia?')) {
        try {
            const storyRef = doc(db, 'stores', currentStoreSlug, 'stories', currentStoryId);
            console.log('Eliminando documento:', storyRef.path);
            await deleteDoc(storyRef);
            console.log('Historia eliminada de Firestore');
            closeStoryModal();
        } catch (error) {
            console.error('Error al eliminar historia:', error);
        }
    }
}

// Inicializar los eventos del modal
export function initializeStoryModal(firestoreDb) {
    const closeBtn = document.getElementById('close-story-view');
    const deleteBtn = document.getElementById('delete-story');

    if (closeBtn && deleteBtn) {
        console.log('Botones encontrados, vinculando eventos...');
        closeBtn.addEventListener('click', () => {
            console.log('Botón cerrar presionado');
            closeStoryModal();
        });
        deleteBtn.addEventListener('click', () => {
            console.log('Botón eliminar presionado');
            deleteStory();
        });
    } else {
        console.error('No se encontraron los botones del modal:', { closeBtn, deleteBtn });
    }
}