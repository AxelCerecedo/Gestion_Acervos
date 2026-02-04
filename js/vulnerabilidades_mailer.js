// mailer.js

const nodemailer = require('nodemailer');

// 1. Configuración del transportador
// Usa las credenciales de tu cuenta de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'axelcerecedo117@gmail.com',
    pass: 'chmd dxpn plnt bxzk' // ⚠️ La contraseña de aplicación
  }
});

// 2. Función para enviar el correo con la plantilla mejorada
const enviarRecordatorio = async (destinatario, recordatorio) => {
    try {
        const mailOptions = {
            from: '"Secretaría de Cultura" <axelcerecedo117@gmail.com>', // Nombre y correo del remitente
            to: destinatario.correo_electronico, // Usamos solo el correo del destinatario
            subject: `Recordatorio de Tarea Pendiente: ${recordatorio.repositorio}`,
            
            // 💡 Se agrega la imagen como un adjunto para incrustarla en el correo
            attachments: [
                {
                    filename: 'LC_P.png',
                    path: 'Imagenes/Logos/LC_P.png', // ⚠️ Asegúrate que esta ruta sea correcta desde donde ejecutas el servidor
                    cid: 'logo_sc' // El ID de referencia para usar en el HTML
                }
            ],
            
            html: `
                <div style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8f8f8">
                        <tr>
                            <td style="padding: 20px;">
                                <table align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="border-collapse: collapse; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
                                    <tr>
                                        <td bgcolor="#5e0e1d" style="padding: 35px; border-radius: 8px 8px 0 0; color: #fff; text-align: center;">
                                            <h1 style="margin-top: 0;">Recordatorio</h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 30px;">
                                            <p>Estimado/a <strong>${destinatario.nombre}</strong>,</p>
                                            <p>Este es un recordatorio sobre una tarea pendiente relacionada con el repositorio: <strong>${recordatorio.repositorio}</strong>.</p>
                                            <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
                                            <div style="margin-bottom: 20px;">
                                                <strong style="color: #5e0e1d;">Tipo de Recordatorio:</strong> ${recordatorio.tipo}<br>
                                                <strong style="color: #5e0e1d;">Mensaje:</strong> ${recordatorio.mensaje}<br>
                                                <strong style="color: #5e0e1d;">Fecha Límite:</strong> ${new Date(recordatorio.fecha_programada).toLocaleDateString()}
                                            </div>
                                            <p>Por favor, accede a la plataforma a la brevedad para revisar los detalles y tomar las acciones necesarias. Una vez completada la tarea, recuerda marcarla como finalizada en el sistema.</p>
                                            <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
                                            <p style="text-align: center; color: #777; font-size: 0.9em;">Este es un mensaje automático del sistema de gestión de acervos de la Secretaría de Cultura.</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px; background-color: #5e0e1d; border-radius: 0 0 8px 8px; text-align: center; font-size: 0.8em; color: #555;">
                                           <img src="cid:logo_sc" alt="Logo Secretaría de Cultura" width="400" style="max-width: 450px; height: auto; margin-bottom: 10px;">
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
            `
        };

        let info = await transporter.sendMail(mailOptions);
        console.log("✅ Mensaje de recordatorio enviado a %s: %s", destinatario.correo_electronico, info.messageId);
        
    } catch (error) {
        console.error("❌ Error al enviar el correo del recordatorio:", error);
    }
};

module.exports = { enviarRecordatorio };