import { initializeNavEvents } from './nav.js';
import { loadStoreProfile } from './store-profile.js';
import { loadHomeContent } from './home-content.js';
import { db, storage, auth, provider } from './firebase.js';
import { initializeStoryModal } from './story-modal.js';

document.addEventListener('DOMContentLoaded', () => {
    // Cargar la barra de navegación dinámicamente
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
        fetch('nav.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                navContainer.innerHTML = html;
                // Inicializar eventos de la barra de navegación con parámetros requeridos
                initializeNavEvents(auth, db, storage, provider);
            })
            .catch(error => {
                console.error('Error al cargar nav.html:', error);
                // Inicializar eventos incluso si falla la carga del HTML, para mantener funcionalidad básica
                initializeNavEvents(auth, db, storage, provider);
            });
    } else {
        console.warn('No se encontró #nav-container en la página; inicializando eventos de navegación sin HTML.');
        initializeNavEvents(auth, db, storage, provider);
    }

    // Determinar el tipo de página actual
    const pathname = window.location.pathname;
    const isIndexPage = pathname === '/' || pathname.includes('index.html');
    const isStorePage = pathname !== '/' && !pathname.includes('index.html') && !pathname.includes('orders.html');
    const isOrdersPage = pathname.includes('orders.html');

    // Cargar contenido según la página
    if (isIndexPage) {
        console.log('Cargando contenido de Inicio en DOMContentLoaded...');
        loadHomeContent(db);
    } else if (isStorePage && !window.isProfileLoaded) {
        console.log('Cargando perfil de tienda desde DOMContentLoaded...');
        loadStoreProfile(db, storage, auth);
        window.isProfileLoaded = true;
    } else if (isOrdersPage) {
        console.log('Página de órdenes detectada; la lógica se maneja en orders.js');
        // No se carga contenido adicional aquí, ya que orders.js tiene su propia lógica
    }

    // Inicializar el modal de historias en todas las páginas
    initializeStoryModal(db);
});