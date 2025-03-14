document.addEventListener('DOMContentLoaded', () => {
    const storyCameraBtn = document.getElementById('story-camera');
    const storyGalleryBtn = document.getElementById('story-gallery');
    const storyPreviewContainer = document.getElementById('story-preview-container');
    const previewImage = document.getElementById('preview-image');
    const publishStoryBtn = document.getElementById('publish-story-btn');
    const closeStoryModal = document.getElementById('close-story-modal');

    // Abrir cámara
    storyCameraBtn.addEventListener('click', () => {
        alert('Funcionalidad de cámara no implementada aún.');
    });

    // Seleccionar imagen desde galería
    storyGalleryBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    storyPreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });

    // Publicar historia
    publishStoryBtn.addEventListener('click', () => {
        if (!previewImage.src) {
            alert('Por favor, selecciona una imagen antes de publicar.');
            return;
        }
        alert('Historia publicada con éxito.');
        // Aquí puedes agregar la lógica para subir la historia a Firebase
    });

    // Cerrar modal
    closeStoryModal.addEventListener('click', () => {
        window.location.href = '/store.html'; // Redirige de vuelta al perfil de la tienda
    });
});