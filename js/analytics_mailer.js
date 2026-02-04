// analytics_mailer.js

const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'axelcerecedo117@gmail.com',
    pass: 'chmd dxpn plnt bxzk' 
  }
});

const enviarReporteGemini = async (destinatarioEmail, repoName, analysisHtml) => {
  try {
    const fechaEnvio = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

    const mailOptions = {
      from: `"Gestión de Acervos SC" <axelcerecedo117@gmail.com>`,
      to: destinatarioEmail,
      subject: `📊 Informe de Tráfico Web – ${repoName} (${fechaEnvio})`,

      attachments: [
        {
          filename: 'LC_P.png',
          path: path.join(__dirname, '../Imagenes/Logos/LC_P.png'),
          cid: 'logo_sc'
        }
      ],

      html: `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f8f8; padding: 25px;">
    <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      
      <!-- Encabezado -->
      <tr>
        <td style="background-color: #7c1225; color: #ffffff; text-align: center; padding: 25px;">
          <h1 style="margin: 0; font-size: 20px;">Informe de Análisis de Tráfico Web</h1>
          <p style="margin: 5px 0 0; font-size: 14px;">Generado por IA – ${fechaEnvio}</p>
        </td>
      </tr>

      <!-- Cuerpo -->
      <tr>
        <td style="padding: 30px;">
          <p>Estimado/a responsable del repositorio,</p>

          <p>Le compartimos el <strong>informe de análisis de tráfico web</strong> generado con apoyo de inteligencia artificial para el siguiente repositorio:</p>

          <div style="background-color: #f5f5f5; padding: 10px 15px; border-left: 5px solid #7c1225; margin: 15px 0;">
            <h2 style="margin: 0; color: #7c1225; font-size: 18px;">${repoName}</h2>
          </div>

          <p>El análisis incluye un resumen general, hallazgos clave y recomendaciones para la mejora continua del sitio web.</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">

          <h3 style="color: #7c1225; margin-bottom: 10px;">📋 Análisis Completo:</h3>

          <div style="border: 1px solid #e5e5e5; padding: 20px; background-color: #fffdfd; border-radius: 6px;">
            ${analysisHtml}
          </div>

          <p style="margin-top: 25px;">
            Le recomendamos revisar las conclusiones y acciones sugeridas en este informe para potenciar la visibilidad y desempeño digital del repositorio.
          </p>

          <p style="margin-top: 25px;">Atentamente,</p>

          <p style="font-weight: bold; color: #333; margin-bottom: 0;">Sistema de Análisis con IA</p>
          <p style="margin-top: 2px; color: #7c1225;">Gestión de Acervos – Secretaría de Cultura</p>
        </td>
       
      </tr>

      <!-- Footer -->
      <tr>
            <td style="background-color: #7c1225; color: #ffffffff; text-align: center; padding: 20px; font-size: 12px;">
                <p style="font-weight: bold; color: #ffffffff; margin: 0 0 10px; text-align: center;">
                Este mensaje se generó automáticamente. No es necesario responder a este correo.
                </p>
                <img src="cid:logo_sc" alt="Secretaría de Cultura" width="380" style="display:block; margin: 0 auto;">
            </td>
    </tr>
    </table>
  </div>
`

    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reporte Gemini enviado a ${destinatarioEmail}: ${info.messageId}`);
    return true;

  } catch (error) {
    console.error("❌ Error al enviar el correo del Reporte Gemini:", error);
    return false;
  }
};

module.exports = { enviarReporteGemini };
