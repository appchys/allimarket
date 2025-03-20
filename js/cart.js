// cart.js
import { addToCart } from './nav.js';

export function initializeCart(db) {
    // Esperar a que los botones de "Añadir al carrito" estén disponibles en el DOM
    const waitForButtons = setInterval(() => {
        const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        if (addToCartButtons.length > 0) {
            clearInterval(waitForButtons); // Detener el intervalo una vez que los botones estén disponibles

            addToCartButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    // Obtener los datos del producto
                    const productElement = button.closest('.store-product');
                    if (!productElement) {
                        console.error('No se encontró el elemento del producto');
                        return;
                    }

                    const productId = productElement.dataset.productId || 'unknown';
                    const productName = productElement.querySelector('.product-details h3')?.textContent || 'Producto desconocido';
                    const productPrice = parseFloat(productElement.querySelector('.price')?.textContent.replace('$', '')) || 0;

                    // Obtener el slug de la tienda desde la ruta de la URL
                    let storeId = window.location.pathname.replace('/', ''); // Elimina la barra inicial
                    if (!storeId) {
                        console.error('No se encontró el slug en la ruta de la URL.');
                        return;
                    }

                    const product = {
                        id: productId,
                        name: productName,
                        price: productPrice
                    };

                    console.log('Añadiendo al carrito:', product, 'para la tienda:', storeId);
                    await addToCart(storeId, product);
                });
            });

            // Manejar el botón de Checkout
            const checkoutButton = document.getElementById('checkout-btn');
            if (checkoutButton) {
                checkoutButton.addEventListener('click', () => {
                    // Redirigir a la página de Checkout
                    window.location.href = '/checkout.html';
                });
            }
        }
    }, 100); // Revisar cada 100ms hasta que los botones estén disponibles
}

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('checkout-store-btn')) {
        const storeId = event.target.dataset.storeId;
        if (storeId) {
            // Redirigir al checkout de la tienda específica
            window.location.href = `/checkout.html?store=${storeId}`;
        }
    }
});