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
                .then(async (result) => {
                    console.log('Usuario autenticado:', result.user);

                    const userDoc = await getDoc(doc(db, 'users', result.user.uid));

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.role === 'store' && userData.storeId) {
                            // Si el usuario tiene rol de tienda, redirigir a su perfil de tienda
                            window.location.href = `/${userData.storeId}`;
                            return;
                        }
                    }

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

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';

            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'store' && userData.storeId) {
                    // Si el usuario ya está logeado como tienda, redirigir a su perfil de tienda
                    window.location.href = `/${userData.storeId}`;
                }
            }
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
                const storeId = userDoc.data().storeId;
                window.location.href = `/${storeId}`;
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
