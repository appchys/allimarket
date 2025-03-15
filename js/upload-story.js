import { initializeFirebase } from './firebase-init.js'; // Asegúrate de que este archivo exporte la inicialización de Firebase
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';
import { addDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const { db, storage, auth } = initializeFirebase();
    let taggedProducts = [];
    let storyImageFile = null;
    let slug = null;

    // Obtener el slug de la tienda desde la URL o el perfil del usuario
    const urlParams = new URLSearchParams(window.location.search);
    slug = urlParams.get('slug');
    if (!slug && auth.currentUser) {
        getSlugFromUser(auth, db).then(userSlug => {
            slug = userSlug;
            if (!slug) {
                alert('No se pudo determinar la tienda. Por favor, especifica un slug en la URL o configura tu perfil.');
                window.location.href = '/';
            }
        });
    }

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

    storyCameraBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'camera';
        input.onchange = (e) => handleImageSelect(e);
        input.click();
    });

    storyGalleryBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => handleImageSelect(e);
        input.click();
    });

    tagProductsBtn.addEventListener('click', () => {
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

    publishStoryBtn.addEventListener('click', async () => {
        if (!storyImageFile) {
            alert('Por favor selecciona una imagen primero');
            return;
        }
        if (!slug) {
            alert('No se pudo determinar la tienda. Por favor, especifica un slug en la URL o configura tu perfil.');
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
            window.location.href = `/?slug=${slug}`; // Redirige a la página de la tienda
        } catch (error) {
            console.error('Error al publicar la historia:', error);
            alert('Error al publicar la historia: ' + error.message);
        }
    });

    closeStoryModal.addEventListener('click', () => {
        window.location.href = '/'; // O redirige a donde prefieras
    });

    function handleImageSelect(e) {
        storyImageFile = e.target.files[0];
        if (storyImageFile) {
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

    async function populateStoryProductSelect() {
        if (!slug) return;
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

    async function getSlugFromUser(auth, db) {
        if (!auth.currentUser) return null;
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().storeId) {
            return userDoc.data().storeId;
        }
        return null;
    }
});