// main.js
import { initializeNavEvents } from './nav.js';
import { loadStoreProfile } from './store-profile.js';
import { loadHomeContent } from './home-content.js';
import { db, storage, auth, provider } from './firebase.js';
import { initializeStoryModalEvents } from './story-modal.js';

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
    const isStorePage = window.location.pathname !== '/' && !window.location.pathname.includes('index.html');
    
    if (isIndexPage) {
        console.log('Cargando contenido de Inicio en DOMContentLoaded...');
        loadHomeContent(db);
    }
    
    if (isStorePage && !window.isProfileLoaded) {
        console.log('Cargando perfil de tienda desde DOMContentLoaded...');
        loadStoreProfile(db, storage, auth);
        window.isProfileLoaded = true;
    }

    // Cargar el modal de historias
    const storyModalContainer = document.getElementById('story-modal-container');
    if (storyModalContainer) {
        fetch('story-view-modal.html')
            .then(response => response.text())
            .then(html => {
                storyModalContainer.innerHTML = html;
                // Esperar a que el modal esté listo antes de inicializar eventos
                document.addEventListener('storyModalReady', () => {
                    initializeStoryModalEvents(db);
                });
            })
            .catch(error => console.error('Error al cargar story-view-modal.html:', error));
    }
});