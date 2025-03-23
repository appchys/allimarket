const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const nodemailer = require("nodemailer");

// Inicializar Firebase Admin
initializeApp();

// Depurar las variables de entorno
console.log("EMAIL_GMAIL:", process.env.email_gmail);
console.log("PASSWORD_GMAIL:", process.env.password_gmail);

// Configurar el transporte de Nodemailer con Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.email_gmail || "default@example.com", // Valor por defecto si no se carga
    pass: process.env.password_gmail || "defaultpassword",
  },
});

// Función que se ejecuta al crear una nueva orden
exports.sendOrderNotification = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data.data();
  const orderId = event.params.orderId;

  try {
    const storeEmail = "appchys.ec@gmail.com"; // Correo real para probar

    const itemsList = Object.entries(order.cartItems)
      .map(([itemId, item]) => {
        const total = (item.price * item.quantity).toFixed(2);
        return `<li>${item.name} (x${item.quantity}) - $${total}</li>`;
      })
      .join("");

    const mailOptions = {
      from: process.env.email_gmail,
      to: storeEmail,
      subject: `Nueva Orden Recibida #${orderId}`,
      html: `
        <h3>Nueva Orden #${orderId}</h3>
        <p><strong>Cliente:</strong> ${order.customerInfo.fullName}</p>
        <p><strong>Email:</strong> ${order.customerInfo.email}</p>
        <p><strong>Teléfono:</strong> ${order.customerInfo.phone}</p>
        <p><strong>Dirección:</strong> ${order.customerInfo.address}</p>
        <p><strong>Total:</strong> $${order.totalCost.toFixed(2)}</p>
        <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <h4>Productos:</h4>
        <ul>${itemsList}</ul>
        <p><strong>Comprobante:</strong> <a href="${order.transferProofUrl}">Ver comprobante</a></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${storeEmail} para la orden ${orderId}`);
  } catch (error) {
    console.error("Error al enviar el correo:", error);
  }
});