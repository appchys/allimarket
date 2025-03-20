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

                    // Obtener el slug de la tienda desde la URL
                    const storeId = new URLSearchParams(window.location.search).get('slug');
                    if (!storeId) {
                        console.error('No se encontró el parámetro "slug" en la URL.');
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
        }
    }, 100); // Revisar cada 100ms hasta que los botones estén disponibles
}