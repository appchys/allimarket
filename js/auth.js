import { signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getDoc, setDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export function setupAuth(auth, provider, db) {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const roleModal = document.getElementById('role-modal');
    const roleStoreBtn = document.getElementById('role-store');
    const roleClientBtn = document.getElementById('role-client');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            signInWithPopup(auth, provider)
                .then((result) => {
                    console.log('Usuario autenticado:', result.user);
                    roleModal.style.display = 'flex';
                })
                .catch((error) => {
                    console.error('Error en autenticación:', error.code, error.message);
                    alert('Error al iniciar sesión: ' + error.message);
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => window.location.reload());
        });
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    });

    if (roleStoreBtn) {
        roleStoreBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists() || !userDoc.data().storeId) {
                window.location.href = 'create-store.html';
            } else {
                const storeDoc = await getDoc(doc(db, 'stores', userDoc.data().storeId));
                window.location.href = `store.html?slug=${storeDoc.data().slug}`;
            }
        });
    }

    if (roleClientBtn) {
        roleClientBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            await setDoc(doc(db, 'users', user.uid), { role: 'client' }, { merge: true });
            roleModal.style.display = 'none';
        });
    }
}