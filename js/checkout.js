document.addEventListener('DOMContentLoaded', () => {
    const cartDetails = document.getElementById('cart-details');
    const shippingCostElement = document.getElementById('shipping-cost');
    const totalCostElement = document.getElementById('total-cost');
    const proceedToPaymentButton = document.getElementById('proceed-to-payment');

    // Simulación de datos del carrito
    const cart = [
        { name: 'Producto 1', price: 10.00, quantity: 2 },
        { name: 'Producto 2', price: 15.00, quantity: 1 },
    ];

    const shippingCost = 5.00; // Valor de envío fijo
    let totalCost = shippingCost;

    // Renderizar los productos del carrito
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('cart-item');
        itemElement.innerHTML = `
            <p>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</p>
        `;
        cartDetails.appendChild(itemElement);
        totalCost += item.price * item.quantity;
    });

    // Actualizar costos
    shippingCostElement.textContent = `$${shippingCost.toFixed(2)}`;
    totalCostElement.textContent = `$${totalCost.toFixed(2)}`;

    // Manejar el botón de proceder al pago
    proceedToPaymentButton.addEventListener('click', () => {
        alert('Procesando el pago...');
        // Aquí puedes redirigir a una pasarela de pago o procesar el pedido
    });
});