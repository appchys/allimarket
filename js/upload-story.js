document.addEventListener('DOMContentLoaded', () => {
    const storyPreviewContainer = document.getElementById('story-preview-container');
    const previewImage = document.getElementById('preview-image');
    const publishStoryBtn = document.getElementById('publish-story-btn');
    const closeStoryModal = document.getElementById('close-story-modal');
    const postStoryModal = document.getElementById('post-story-modal'); // Modal principal

    // Mostrar el modal al cargar la página
    postStoryModal.classList.add('show');

    // Función para abrir la galería
    const openGallery = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    storyPreviewContainer.style.display = 'block'; // Mostrar la previsualización
                };
                reader.readAsDataURL(file);
            }
        };
        input.click(); // Abrir la galería automáticamente
    };

    // Llama a la función para abrir la galería al cargar la página
    openGallery();

    // Publicar historia
    publishStoryBtn.addEventListener('click', () => {
        if (!previewImage.src || previewImage.src === window.location.href) {
            alert('Por favor, selecciona una imagen antes de publicar.');
            return;
        }
        alert('Historia publicada con éxito.');
        // Aquí puedes agregar la lógica para subir la historia a Firebase
    });

    // Cerrar modal
    closeStoryModal.addEventListener('click', () => {
        postStoryModal.style.display = 'none'; // Ocultar el modal directamente
    });
});