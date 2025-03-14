import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { loadStoreProfile } from './store-profile.js';
import { loadHomeContent } from './home-content.js';
import { initializeNavEvents } from './nav.js';

const firebaseConfig = {
    apiKey: "AIzaSyAAAFDJ_utlimCezUR-_i8Y2yUare9yZ1k",
    authDomain: "multitienda-69778.firebaseapp.com",
    projectId: "multitienda-69778",
    storageBucket: "multitienda-69778.firebasestorage.app",
    messagingSenderId: "939925630795",
    appId: "1:939925630795:web:713aca499392bfa36482ce"
};

export function initializeFirebase() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    return { db, storage, auth, provider };
}

document.addEventListener('DOMContentLoaded', () => {
    const { db, storage, auth, provider } = initializeFirebase();
    
    // Inicializar eventos de navegación
    initializeNavEvents(auth, db, storage, provider);

    // Cargar contenido de la página según la ruta
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
    const isStorePage = window.location.pathname !== '/' && !window.location.pathname.includes('index.html');
    
    if (isIndexPage) {
        console.log('Cargando contenido de Inicio en DOMContentLoaded...');
        loadHomeContent(db);
    }
    
    if (isStorePage && !window.isProfileLoaded) {
        console.log('Cargando perfil de tienda desde DOMContentLoaded...');
        loadStoreProfile(db, storage, auth);
        window.isProfileLoaded = true; // Prevenir recargas múltiples
    }
});