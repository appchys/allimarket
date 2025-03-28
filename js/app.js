// main.js
import { initializeNavEvents } from './nav.js';
import { loadStoreProfile } from './store-profile.js';
import { loadHomeContent } from './home-content.js';
import { db, storage, auth, provider } from './firebase.js';
import { initializeStoryModal } from './story-modal.js';

document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
        fetch('nav.html')
            .then(response => response.text())
            .then(html => {
                navContainer.innerHTML = html;
                initializeNavEvents(auth, db, storage, provider);
            })
            .catch(error => console.error('Error al cargar nav.html:', error));
    } else {
        console.error('No se encontró #nav-container en la página');
        initializeNavEvents(auth, db, storage, provider);
    }

    const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
    const isStorePage = window.location.pathname.includes('store.html'); // Ajusta según la página de tienda real
    const isProfilePage = window.location.pathname.includes('profile.html');

    if (isIndexPage) {
        console.log('Cargando contenido de Inicio en DOMContentLoaded...');
        loadHomeContent(db);
        initializeStoryModal(db); // Solo en la página de inicio
    }
    
    if (isStorePage && !window.isProfileLoaded) {
        console.log('Cargando perfil de tienda desde DOMContentLoaded...');
        loadStoreProfile(db, storage, auth);
        window.isProfileLoaded = true;
        initializeStoryModal(db); // Solo en la página de tienda
    }

    if (isProfilePage) {
        console.log('Página de perfil detectada, usando lógica inline...');
        // No llamamos a loadStoreProfile ni initializeStoryModal aquí
    }
});