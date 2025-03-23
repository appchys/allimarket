const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const nodemailer = require("nodemailer");

// Inicializar Firebase Admin
initializeApp();

// Obtener las variables de entorno (manejar ambas formas: .env y config)
const emailGmail = process.env.EMAIL_GMAIL || process.env.email_gmail;
const passwordGmail = process.env.PASSWORD_GMAIL || process.env.password_gmail;

// Depurar las variables de entorno
console.log("EMAIL_GMAIL (from .env):", process.env.EMAIL_GMAIL);
console.log("email_gmail (from config):", process.env.email_gmail);
console.log("PASSWORD_GMAIL (from .env):", process.env.PASSWORD_GMAIL);
console.log("password_gmail (from config):", process.env.password_gmail);
console.log("Using EMAIL_GMAIL:", emailGmail);
console.log("Using PASSWORD_GMAIL:", passwordGmail);

// Configurar el transporte de Nodemailer con Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailGmail,
    pass: passwordGmail,
  },
});

// Función que se ejecuta al crear una nueva orden
exports.sendOrderNotification = onDocumentCreated("orders/{orderId}", async (event) => {
  // Validar las variables de entorno en tiempo de ejecución (en la nube)
  if (!emailGmail || !passwordGmail) {
    console.error("Error: Las variables de entorno EMAIL_GMAIL y/o PASSWORD_GMAIL no están definidas.");
    return; // Salir de la función sin lanzar un error
  }

  const order = event.data.data();
  const orderId = event.params.orderId;

  // Validar que los datos existan
  if (!order || !order.cartItems || !order.customerInfo || !order.totalCost || !order.createdAt || !order.transferProofUrl) {
    console.error("Datos incompletos en la orden:", order);
    return;
  }

  try {
    const storeEmail = "appchys.ec@gmail.com"; // Correo real para probar

    const itemsList = Object.entries(order.cartItems)
      .map(([itemId, item]) => {
        const total = (item.price * item.quantity).toFixed(2);
        return `<li>${item.name} (x${item.quantity}) - $${total}</li>`;
      })
      .join("");

    const mailOptions = {
      from: emailGmail,
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