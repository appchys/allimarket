import { getDocs, collection, getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

let taggedProducts = [];

export function setupUI(db, storage, auth, loadStoreProfile) {
    const newBtn = document.getElementById('new-btn');
    const profileBtn = document.getElementById('profile-btn');
    const addProductBtn = document.getElementById('add-product');
    const addProductModal = document.getElementById('add-product-modal');
    const closeProductModalBtn = document.getElementById('close-product-modal');
    const postStoryBtn = document.getElementById('post-story');
    const postStoryModal = document.getElementById('post-story-modal');
    const postStoryForm = document.getElementById('post-story-form');
    const closeStoryModalBtn = document.getElementById('close-story-modal');
    const storyImageInput = document.getElementById('story-image');
    const previewImage = document.getElementById('preview-image');
    const previewTags = document.getElementById('preview-tags');
    const storyProductSelect = document.getElementById('story-product');
    const closeStoryViewBtn = document.getElementById('close-story-view');
    const storyViewModal = document.getElementById('story-view-modal');

    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                alert('Inicia sesión para crear contenido');
                return;
            }
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const slug = new URLSearchParams(window.location.search).get('slug');
            const storeDoc = slug ? await getDoc(doc(db, 'stores', slug)) : null;

            if (userDoc.exists() && userDoc.data().role === 'store' && storeDoc && storeDoc.data().owner === user.uid) {
                if (addProductModal) addProductModal.style.display = 'flex';
            } else {
                alert('Solo el propietario de la tienda puede crear contenido');
            }
        });
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                alert('Inicia sesión para ver tu perfil');
                return;
            }
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().storeId) {
                const storeDoc = await getDoc(doc(db, 'stores', userDoc.data().storeId));
                if (storeDoc.exists()) {
                    window.location.href = `store.html?slug=${storeDoc.data().slug}`;
                } else {
                    alert('Error: No se encontró la tienda asociada');
                }
            } else {
                alert('Crea una tienda o selecciona un rol para ver tu perfil');
            }
        });
    }

    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            addProductModal.style.display = 'flex';
        });
    }

    if (closeProductModalBtn) {
        closeProductModalBtn.addEventListener('click', () => {
            addProductModal.style.display = 'none';
        });
    }

    if (postStoryBtn) {
        postStoryBtn.addEventListener('click', async () => {
            const slug = new URLSearchParams(window.location.search).get('slug');
            if (!slug) return;

            const productSelect = document.getElementById('story-product');
            productSelect.innerHTML = '<option value="">Selecciona un producto</option>';
            const productsSnapshot = await getDocs(collection(db, 'stores', slug, 'products'));
            productsSnapshot.forEach((productDoc) => {
                const product = productDoc.data();
                const option = document.createElement('option');
                option.value = productDoc.id;
                option.textContent = product.name;
                productSelect.appendChild(option);
            });

            taggedProducts = [];
            previewTags.innerHTML = '';
            previewImage.style.display = 'none';
            postStoryModal.style.display = 'flex';
        });
    }

    if (storyImageInput) {
        storyImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    previewImage.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (previewImage) {
        previewImage.addEventListener('click', (e) => {
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
    }

    if (closeStoryModalBtn) {
        closeStoryModalBtn.addEventListener('click', () => {
            postStoryModal.style.display = 'none';
        });
    }

    if (postStoryForm) {
        postStoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            const slug = new URLSearchParams(window.location.search).get('slug');
            const imageFile = document.getElementById('story-image').files[0];

            if (!user || !slug || !imageFile) {
                alert('Error: Debes estar autenticado, en un perfil de tienda y subir una imagen');
                return;
            }

            const storageRef = ref(storage, `stores/${slug}/stories/${Date.now()}_${imageFile.name}`);
            await uploadBytes(storageRef, imageFile);
            const imageUrl = await getDownloadURL(storageRef);

            const storyData = {
                imageUrl,
                createdAt: new Date().toISOString(),
                taggedProducts: taggedProducts.length > 0 ? taggedProducts : []
            };

            await addDoc(collection(db, 'stores', slug, 'stories'), storyData);

            postStoryModal.style.display = 'none';
            postStoryForm.reset();
            previewImage.style.display = 'none';
            previewTags.innerHTML = '';
            taggedProducts = [];
            loadStoreProfile(db, storage);
        });
    }

    if (closeStoryViewBtn) {
        closeStoryViewBtn.addEventListener('click', () => {
            storyViewModal.style.display = 'none';
        });
    }
}