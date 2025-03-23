// story-modal.js
import { db } from './firebase.js';
import { deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Variable para almacenar el ID de la historia actual
let currentStoryId = null;

// Función para cerrar el modal
export function closeStoryModal() {
    console.log('Cerrando modal...');
    window.storyModal.hide();
    currentStoryId = null;
}

// Función para eliminar una historia
export async function deleteStory() {
    console.log('Intentando eliminar historia con ID:', currentStoryId);
    if (!currentStoryId) {
        console.error('No hay ID de historia definido para eliminar');
        return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar esta historia?')) {
        try {
            await deleteDoc(doc(db, 'stories', currentStoryId));
            console.log('Historia eliminada de Firestore');
            window.storyModal.hide();
            currentStoryId = null;
        } catch (error) {
            console.error('Error al eliminar historia:', error);
        }
    }
}

// Función para mostrar el modal con el ID de la historia
export function showStoryModal(imageSrc, tags = '', storyId) {
    console.log('Mostrando modal con ID:', storyId);
    currentStoryId = storyId;
    window.storyModal.show(imageSrc, tags);
}

// Inicializar eventos del modal
export function initializeStoryModalEvents(firestoreDb) {
    const storyModal = window.storyModal;
    if (storyModal) {
        const closeBtn = storyModal.getCloseButton();
        const deleteBtn = storyModal.getDeleteButton();

        if (closeBtn && deleteBtn) {
            console.log('Vinculando eventos a los botones...');
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
    } else {
        console.error('No se encontró window.storyModal');
    }
}