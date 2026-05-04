
// ========================== Configuración e inicialización del servidor. ==========================

// ==========================
// 1. Dependencias
// ==========================

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { exec } = require('child_process');
const axios = require('axios');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); 
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { enviarRecordatorio } = require('./js/vulnerabilidades_mailer');
const { enviarReporteGemini } = require('./js/analytics_mailer'); 
const rateLimit = require('express-rate-limit');


// ==========================
// 2. Configuración general
// ==========================
const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); 

const dominiosPermitidos = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || dominiosPermitidos.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por política CORS: Origen no autorizado'));
    }
  },
  credentials: true 
};
app.use(cors(corsOptions));
app.use(express.json());

// --- CONFIGURACIÓN DEL STORE DE SESIONES EN MYSQL ---
const optionsDB = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'Gestion_Acervos',
  clearExpired: true, // Borra automáticamente las sesiones caducadas
  checkExpirationInterval: 900000 // Revisa cada 15 minutos
};

const sessionStore = new MySQLStore(optionsDB);

// Aplicamos el store a la configuración
app.use(session({
  key: 'acervos_session', // Nombre de la cookie
  secret: process.env.SESSION_SECRET,
  store: sessionStore, 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true, 
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // La sesión dura 24 horas
  }
}));

// ==========================
// 3. Archivos estáticos
// ==========================
const UPLOAD_DIR = path.join(__dirname, 'Imagenes', 'Perfiles');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/Imagenes/Perfiles', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================
// 4. Multer (subida de imágenes)
// ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ==========================
// 5. Conexión a MySQL
// ==========================
const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', 
  user: process.env.DB_USER,                
  password: process.env.DB_PASS,            
  database: process.env.DB_NAME || 'Gestion_Acervos', 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar conexión
db.getConnection((err, conn) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err);
    process.exit(1);
  }
  console.log('✅ Conexión exitosa a MySQL');
  conn.release();
});

// ==========================
// 6. Configuración de Nodemailer
// ==========================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

// ==========================
// 7. Repositorios Wordpress
// ==========================
const repositoriosWordpress = [
  {
    url: 'http://172.17.175.137/cultura',
    user: process.env.WP_CULTURA_USER,
    password: process.env.WP_CULTURA_PASS,
    tainacanApiUrl: "http://172.17.175.137/cultura/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositorio.ci.cultura.gob.mx/',
    user: process.env.WP_MEXICANA_USER,
    password: process.env.WP_MEXICANA_PASS,
    tainacanApiUrl: "https://repositorio.ci.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://cid-albertobeltran.cultura.gob.mx/',
    user: process.env.WP_ALBERTO_BELTRAN_USER,
    password: process.env.WP_ALBERTO_BELTRAN_PASS,
    tainacanApiUrl: "https://cid-albertobeltran.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositoriofic.festivalcervantino.gob.mx/',
    user: process.env.WP_FIC_USER,
    password: process.env.WP_FIC_PASS,
    tainacanApiUrl: "https://repositoriofic.festivalcervantino.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://sitiosymonumentos.cultura.gob.mx/',
    user: process.env.WP_SITIOS_MONUMENTOS_USER,
    password: process.env.WP_SITIOS_MONUMENTOS_PASS,
    tainacanApiUrl: "https://sitiosymonumentos.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositoriomultimedia.cultura.gob.mx/',
    user: process.env.WP_MULTIMEDIA_USER,
    password: process.env.WP_MULTIMEDIA_PASS,
    tainacanApiUrl: "https://repositoriomultimedia.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://patrimonioferrocarrilero.cultura.gob.mx/',
    user: process.env.WP_FERROCARRIL_USER,
    password: process.env.WP_FERROCARRIL_PASS,
    tainacanApiUrl: "https://patrimonioferrocarrilero.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://original.cultura.gob.mx/',
    user: process.env.WP_ORIGINAL_USER,
    password: process.env.WP_ORIGINAL_PASS,
    tainacanApiUrl: "https://original.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositorio-inehrm.cultura.gob.mx/',
    user: process.env.WP_INEHRM_USER,
    password: process.env.WP_INEHRM_PASS,
    tainacanApiUrl: "https://repositorio-inehrm.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://mncp.cultura.gob.mx/',
    user: process.env.WP_MNCP_USER,
    password: process.env.WP_MNCP_PASS,
    tainacanApiUrl: "https://mncp.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://bibliotecamexico-monsiteca.cultura.gob.mx/',
    user: process.env.WP_MONSITECA_USER,
    password: process.env.WP_MONSITECA_PASS,
    tainacanApiUrl: "https://bibliotecamexico-monsiteca.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://catalogoradioeducacion.cultura.gob.mx/',
    user: process.env.WP_RADIO_EDUCACION_USER,
    password: process.env.WP_RADIO_EDUCACION_PASS,
    tainacanApiUrl: "https://catalogoradioeducacion.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://bibliotecamexico-fondoreservado.cultura.gob.mx/',
    user: process.env.WP_FONDO_RESERVADO_USER,
    password: process.env.WP_FONDO_RESERVADO_PASS,
    tainacanApiUrl: "https://bibliotecamexico-fondoreservado.cultura.gob.mx/wp-json/tainacan/v2",
  }
];

// ==========================
// 8. Google Analytics
// ==========================
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'gestionacervos-f30e63c7e8a6.json');
const analyticsDataClient = new BetaAnalyticsDataClient();

//Estos son los repositorios que cuentan con google analytics, su ID se encuentra en: 
// Google Analytics → Admin → Property → Property settings

const repositorios = [
  { id: '460868569', name: 'Radio Educación', email: 'axelcerecedo117@gmail.com' },
  { id: '487317374', name: 'Monsiteca', email: 'axelcerecedo117@gmail.com'},
  { id: '487284214', name: 'Fondo Reservado', email: 'axelcerecedo117@gmail.com'},
  { id: '419632086', name: 'CID "Alberto Beltrán"', email: 'axelcerecedo117@gmail.com'},
  { id: '437732488', name: 'Festival Internacional Cervantino', email: 'axelcerecedo117@gmail.com'},
  { id: '454799035', name: 'INEHRM', email: 'axelcerecedo117@gmail.com'},
  { id: '367272329', name: 'MNCP', email: 'axelcerecedo117@gmail.com'},
  { id: '465932685', name: 'Original', email: 'axelcerecedo117@gmail.com'},
  { id: '465867307', name: 'Sitios y Monumentos', email: 'axelcerecedo117@gmail.com'},
  { id: '420609387', name: 'Patrimonio Ferrocarilero', email: 'axelcerecedo117@gmail.com'},
  { id: '319591268', name: 'Centro de la Imagen', email: 'axelcerecedo117@gmail.com'}
];

// ** FUNCIÓN HELPER para obtener nombre y email **
const getRepoDataById = (repoId) => {
    return repositorios.find(r => r.id === repoId) || { name: 'Repositorio Desconocido', email: 'contacto@cultura.gob.mx' };
};


// ==========================
// LIMITADORES DE SEGURIDAD
// ==========================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de tiempo: 15 minutos
  max: 5, // Limita a cada IP a un máximo de 5 intentos por ventana
  message: { error: "Demasiados intentos desde esta IP, por favor intenta de nuevo en 15 minutos." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Lo aplicamos SOLO a las rutas sensibles (no a todo el sitio)
app.use('/api/login', loginLimiter);
app.use('/solicitar-reset', loginLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ------------------------------------------------------ RUTAS --------------------------------------------------- //


// LOGIN seguro (Texto plano rechazado, solo acepta bcrypt)
app.post('/api/login', async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) return res.status(400).json({ error: "Correo y contraseña son requeridos" });

  db.query(
    `SELECT id, nombre, correo_electronico, rol, activo, password FROM usuarios WHERE correo_electronico = ?`,
    [correo],
    async (err, results) => {
      if (err) {
        console.error("❌ Error en login:", err);
        return res.status(500).json({ error: "Error en el servidor" });
      }
      
      // Si no existe el correo, es más seguro dar un mensaje genérico
      if (results.length === 0) return res.status(401).json({ error: "Credenciales incorrectas" });

      const usuario = results[0];

      try {
        // 🔒 Comparamos el password que tecleó con el hash de la BD
        const coinciden = await bcrypt.compare(password, usuario.password);

        if (!coinciden) return res.status(401).json({ error: "Credenciales incorrectas" });
        if (!usuario.activo) return res.status(403).json({ error: "Usuario inactivo" });

        res.status(200).json({
          mensaje: "Login exitoso",
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo_electronico,
            rol: usuario.rol
          }
        });
      } catch (compareError) {
        console.error("❌ Error al comparar contraseñas:", compareError);
        res.status(500).json({ error: "Error interno al verificar credenciales" });
      }
    }
  );
});


// RESET de contraseña (envía link con token)
app.post('/solicitar-reset', (req, res) => {
  const { email } = req.body;
  const token = uuidv4();

  db.query('SELECT * FROM usuarios WHERE correo_electronico = ?', [email], (err, results) => {
    if (err) {
      console.error("❌ Error en reset:", err);
      return res.status(500).json({ message: 'Error al procesar la solicitud' });
    }
    if (results.length === 0) return res.status(404).json({ message: 'Correo no registrado' });

    db.query('UPDATE usuarios SET token_reset = ? WHERE correo_electronico = ?', [token, email], (errUpdate) => {
      if (errUpdate) {
        console.error("❌ Error actualizando token:", errUpdate);
        return res.status(500).json({ message: 'Error al procesar la solicitud' });
      }

      const link = `http://172.17.175.137/GA/Programa/nueva_contrasena.html?token=${token}`;

      const mailOptions = {
        from: 'axelcerecedo117@gmail.com',
        to: email,
        subject: 'Restablece tu contraseña',
        html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><a href="${link}">${link}</a>`
      };

      transporter.sendMail(mailOptions, (errMail) => {
        if (errMail) {
          console.error("❌ Error enviando correo:", errMail);
          return res.status(500).json({ message: 'Error al enviar correo' });
        }
        res.json({ message: 'Correo enviado. Revisa tu bandeja de entrada.' });
      });
    });
  });
});

// CONFIRMAR reset password
app.post('/confirmar-reset', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10); 

    db.query('SELECT * FROM usuarios WHERE token_reset = ?', [token], (err, results) => {
      if (err) return res.status(500).json({ message: 'Error al actualizar contraseña' });
      if (results.length === 0) return res.status(400).json({ message: 'Token inválido o expirado' });

      db.query('UPDATE usuarios SET password = ?, token_reset = NULL WHERE token_reset = ?', [hashedPassword, token], (errUpdate) => {
        if (errUpdate) return res.status(500).json({ message: 'Error al actualizar contraseña' });
        res.json({ message: 'Contraseña actualizada correctamente' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno al procesar la nueva contraseña' });
  }
});

//---------------------------------------------------------------------------------------------------
//WPSCAN
//---------------------------------------------------------------------------------------------------

/**
 * @param {object} resultadoWPScan - El objeto JSON completo del resultado de WPScan.
 * @returns {string} - El nivel de riesgo: 'Alto', 'Medio' o 'Bajo'.
 */

function clasificarRiesgo(resultadoWPScan) {
    if (!resultadoWPScan || typeof resultadoWPScan !== 'object') {
        return 'Error'; // No hay resultado para analizar
    }

    const { version, main_theme, plugins, interesting_findings, scan_aborted } = resultadoWPScan;

    // --- 🔴 REGLA NIVEL ALTO ---
    // 1. Vulnerabilidades críticas encontradas
    const tieneVulns = (version?.vulnerabilities?.length > 0) ||
                       (main_theme?.vulnerabilities?.length > 0) ||
                       (plugins && Object.values(plugins).some(p => p.vulnerabilities?.length > 0));
    if (tieneVulns) return 'Alto';
    
    // 2. Hallazgos críticos (ej. backup expuesto)
    const criticalFindings = ['backup_db', 'config_backup', 'db_export', 'full_path_disclosure'];
    if (interesting_findings?.some(f => criticalFindings.includes(f.type))) {
        return 'Alto';
    }

    // --- 🟡 REGLA NIVEL MEDIO ---
    // 1. Componentes desactualizados
    const estaDesactualizado = (version?.status === 'out-of-date') ||
                               (main_theme?.outdated === true) ||
                               (plugins && Object.values(plugins).some(p => p.outdated === true));
    if (estaDesactualizado) return 'Medio';

    // 2. Análisis abortado (no se pudo completar)
    if (scan_aborted) {
        return 'Medio';
    }

    // --- 🟢 REGLA NIVEL BAJO ---
    // Si no se cumplió ninguna regla de Alto o Medio, es Bajo.
    return 'Bajo';
}


// **MEJORA: Generar un resumen más estructurado y útil**
function generarResumenVulnerabilidades(resultadoWPScan) {
    const vulnerabilidadesEncontradas = [];
    let resumenGeneral = "No se encontraron vulnerabilidades significativas.";

    // Extraer de versión
    if (resultadoWPScan.version?.vulnerabilities) {
        vulnerabilidadesEncontradas.push(...resultadoWPScan.version.vulnerabilities.map(v => ({
            type: 'WordPress Core',
            title: v.title,
            fixed_in: v.fixed_in,
            references: v.references,
            severity: v.severity || 'high'
        })));
    }

    // Plugins
    if (resultadoWPScan.plugins) {
        Object.values(resultadoWPScan.plugins).forEach(plugin => {
            if (plugin.vulnerabilities) {
                vulnerabilidadesEncontradas.push(...plugin.vulnerabilities.map(v => ({
                    type: `Plugin: ${plugin.slug}`,
                    title: v.title,
                    fixed_in: v.fixed_in,
                    references: v.references,
                    severity: v.severity || 'high'
                })));
            }
        });
    }

    // Themes
    if (resultadoWPScan.main_theme?.vulnerabilities) {
        vulnerabilidadesEncontradas.push(...resultadoWPScan.main_theme.vulnerabilities.map(v => ({
            type: `Tema: ${resultadoWPScan.main_theme.slug}`,
            title: v.title,
            fixed_in: v.fixed_in,
            references: v.references,
            severity: v.severity || 'high'
        })));
    }

    // 🔍 Nuevo: Añadir hallazgos críticos o relevantes
    if (Array.isArray(resultadoWPScan.interesting_findings)) {
        resultadoWPScan.interesting_findings.forEach(finding => {
            if (['backup_db', 'config_backup', 'db_export', 'mu_plugins', 'wp_cron'].includes(finding.type)) {
                vulnerabilidadesEncontradas.push({
                    type: `Hallazgo: ${finding.type}`,
                    title: finding.to_s || `Detección de tipo ${finding.type}`,
                    fixed_in: null,
                    references: finding.references,
                    severity: 'medium' 
                });
            }
        });
    }

    // Resumen
    if (vulnerabilidadesEncontradas.length > 0) {
        resumenGeneral = `Se encontraron **${vulnerabilidadesEncontradas.length}** vulnerabilidades o hallazgos, de las cuales:
- **Críticas:** ${vulnerabilidadesEncontradas.filter(v => v.severity?.toLowerCase() === 'critical').length}
- **Altas:** ${vulnerabilidadesEncontradas.filter(v => v.severity?.toLowerCase() === 'high').length}
- **Medias:** ${vulnerabilidadesEncontradas.filter(v => v.severity?.toLowerCase() === 'medium').length}
- **Bajas:** ${vulnerabilidadesEncontradas.filter(v => v.severity?.toLowerCase() === 'low').length}`;
    }

    return {
        resumen: resumenGeneral,
        vulnerabilidades: vulnerabilidadesEncontradas,
        raw_json: resultadoWPScan 
    };
}


/**
 * 🚀 Ejecuta WPScan usando la ruta absoluta de Docker para compatibilidad con PM2.
 */
function analizarSitioConWPScan(url, callback) {
    // Token por defecto o variable de entorno
    const wpscanApiToken = process.env.WPSCAN_API_TOKEN;

    // ✅ RUTA ABSOLUTA CONFIRMADA (Solución para PM2)
    const dockerPath = '/usr/bin/docker'; 

    // Construimos el comando usando la ruta completa
    const comando = `${dockerPath} run --rm -e WPSCAN_API_TOKEN=${wpscanApiToken} wpscanteam/wpscan --url ${url} --enumerate vp,vt --random-user-agent --update --format json`;

    console.log(`🐳 Ejecutando comando: ${comando}`);

    exec(comando, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error && (!stdout || stdout.trim() === "")) {
            console.error("❌ Error Docker Stderr:", stderr);
            return callback(new Error(`WPScan falló. Error: ${stderr}`), null);
        }

        try {
            const resultado = JSON.parse(stdout);
            console.log(`✅ WPScan finalizado correctamente para ${url}`);
            callback(null, resultado);
        } catch (parseError) {
            console.error("❌ Error parseando JSON de salida.");
            callback(new Error('Formato de salida de WPScan inválido.'), null);
        }
    });
}

app.post('/api/analizar/:id', (req, res) => {
    const id = req.params.id;

    db.query('SELECT id, nombre, direccion FROM registros WHERE id = ?', [id], (errRepo, repos) => {
        if (errRepo || repos.length === 0) {
            return res.status(errRepo ? 500 : 404).json({ success: false, msg: errRepo ? 'Error de base de datos.' : 'Repositorio no encontrado.' });
        }
        
        const url = repos[0].direccion;

        analizarSitioConWPScan(url, (errScan, resultadoWPScan) => {
            if (errScan) {
                const errorMsg = `Error en el análisis: ${errScan.message}`;
                db.query('UPDATE registros SET nivel_vulnerabilidad = ?, resumen_vulnerabilidades = ? WHERE id = ?', ['Error', JSON.stringify({ error: errorMsg }), id], (errUpdate) => {
                    if (errUpdate) console.error('Error al actualizar registro a "Error":', errUpdate);
                    return res.status(500).json({ success: false, msg: errorMsg });
                });
                return;
            }

            // --- LÓGICA DE CLASIFICACIÓN APLICADA ---
            const { resumen, vulnerabilidades, raw_json } = generarResumenVulnerabilidades(resultadoWPScan);
            const nivel = clasificarRiesgo(resultadoWPScan);
            const rawJsonString = JSON.stringify(resultadoWPScan); 
            const insertQuery = 'INSERT INTO escaneos_vulnerabilidad (repositorio_id, nivel, fecha_escaneo, detalles, resumen, raw_json) VALUES (?, ?, NOW(), ?, ?, ?)';
            const detallesJson = JSON.stringify(vulnerabilidades);

            db.query(insertQuery, [id, nivel, detallesJson, resumen, rawJsonString], (errInsert) => {
                if (errInsert) {
                    console.error('Error al guardar escaneo en BD:', errInsert);
                    return res.status(500).json({ success: false, msg: 'Error guardando el resultado.' });
                }

                // Actualizar el nivel y resumen en la tabla principal `registros`
                const updateQuery = 'UPDATE registros SET nivel_vulnerabilidad = ?, resumen_vulnerabilidades = ? WHERE id = ?';
                const resumenPrincipal = JSON.stringify({
                    resumenGeneral: resumen,
                    vulnerabilidadesEncontradas: vulnerabilidades.length,
                    version_cms: raw_json.version?.number
                });

                db.query(updateQuery, [nivel, resumenPrincipal, id], (errUpdate) => {
                    if (errUpdate) {
                        console.error('Error al actualizar nivel en registro principal:', errUpdate);
                        return res.status(500).json({ success: false, msg: 'Error actualizando el estado.' });
                    }
                    
                    console.log(`✅ Análisis completado para ${url}. Nivel: ${nivel}`);
                    res.json({ success: true, msg: `Análisis completado para ${id}.`, nivel });
                });
            });
        });
    });
});


// --- OBTENER HISTORIAL DE UN REPOSITORIO ---
app.get('/api/escaneos/:id', (req, res) => {
    const query = 'SELECT id, nivel, fecha_escaneo AS fecha, detalles, resumen AS resumen_texto, raw_json FROM escaneos_vulnerabilidad WHERE repositorio_id = ? ORDER BY fecha_escaneo DESC';
    db.query(query, [req.params.id], (error, rows) => {
        if (error) {
            console.error('Error al obtener historial:', error);
            return res.status(500).json({ error: 'Error al obtener historial' });
        }
        res.json(rows);
    });
});

// --- OBTENER PLUGINS DE WORDPRESS ---
app.get('/api/plugins-live/:id', async (req, res) => {
    const id = req.params.id;

    db.query('SELECT id, direccion FROM registros WHERE id = ?', [id], async (err, repos) => {
        if (err || repos.length === 0) {
            return res.status(err ? 500 : 404).json({ success: false, msg: err ? 'Error de base de datos.' : 'Repositorio no encontrado.' });
        }

        const url_base = repos[0].direccion;
        const normalize = s => s.replace(/\/$/, '');
        const credenciales = repositoriosWordpress.find(r => normalize(r.url) === normalize(url_base));

        if (!credenciales) {
            return res.status(404).json({ success: false, msg: 'No se encontraron credenciales de aplicación.' });
        }
        
        const authHeader = `Basic ${Buffer.from(`${credenciales.user}:${credenciales.password}`).toString('base64')}`;
        const cleanUrlBase = url_base.replace(/\/$/, '');
        const apiURL = `${cleanUrlBase}/wp-json/wp/v2/plugins?per_page=100`;

        try {
            // 3. Consulta la API REST con límite de tiempo
            const response = await axios.get(apiURL, {
                headers: { 'Authorization': authHeader },
                timeout: 5000 
            });

            const pluginsList = response.data.map(plugin => {
                return {
                    id: plugin.id,
                    nombre: plugin.name,
                    status: plugin.status,
                    version: plugin.version,
                    autor: plugin.author_name,
                    url: plugin.plugin_uri,
                    ultima_actualizacion: plugin.modified_gmt ? new Date(plugin.modified_gmt).toLocaleDateString() : 'N/A'
                };
            });

            res.json(pluginsList);
        } catch (error) {
            const wpError = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`❌ Error al obtener plugins de ${cleanUrlBase}:`, wpError);
            
            const statusCode = error.code === 'ECONNABORTED' ? 504 : 500;
            res.status(statusCode).json({ 
                success: false, 
                msg: 'El repositorio no respondió a tiempo o rechazó la conexión.' 
            });
        }
    });
});


// --- USUARIOS --- //

// Nueva ruta que procesa todos los repositorios
app.get('/api/wordpress/users', async (req, res) => {
  try {
    const promises = repositoriosWordpress.map(repo => {
      const authHeader = `Basic ${Buffer.from(`${repo.user}:${repo.password}`).toString('base64')}`;
      
      // 🛠️ SOLUCIÓN: Limpiamos la URL base antes de concatenar
      const cleanUrl = repo.url.replace(/\/$/, '');
      const apiURL = `${cleanUrl}/wp-json/wp/v2/users?per_page=100&context=edit`;
      
      return axios.get(apiURL, {
        headers: {
          'Authorization': authHeader,
        },
        timeout: 3000 
      })
      .then(response => {
        return response.data.map(user => ({
          id: user.id,
          nombre: user.name,
          correo_electronico: user.email,
          rol: user.roles && Array.isArray(user.roles) ? user.roles.join(', ') : 'No especificado',
          foto_perfil: user.avatar_urls['96'],
          activo: true,
          repositorios: [{ nombre: repo.url, rol_en_repositorio: user.roles[0] }], 
          user_url: user.link 
        }));
      })
      .catch(error => {
        console.error(`❌ Error al obtener usuarios de ${repo.url}:`, error.message);
        return []; 
      });
    });

    const results = await Promise.all(promises);
    const unifiedUsers = results.flat();

    res.json(unifiedUsers);
    
  } catch (error) {
    console.error('❌ Error al obtener usuarios de WordPress:', error.message);
    res.status(500).json({ error: 'Error al obtener usuarios de WordPress' });
  }
});

// Listar usuarios con repositorios y roles
app.get('/api/usuarios', (req, res) => {
  const sql = `
    SELECT u.id AS usuario_id, u.nombre, u.correo_electronico, u.rol AS rol_general, u.foto_perfil,
           ur.rol_en_repositorio, r.id AS repositorio_id, r.nombre AS repositorio_nombre,
           u.activo
    FROM usuarios u
    LEFT JOIN usuarios_repositorios ur ON u.id = ur.usuario_id
    LEFT JOIN registros r ON ur.repositorio_id = r.id
    ORDER BY u.id;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }

    const usuariosMap = new Map();

    results.forEach(row => {
      if (!usuariosMap.has(row.usuario_id)) {
        usuariosMap.set(row.usuario_id, {
          id: row.usuario_id,
          nombre: row.nombre,
          correo_electronico: row.correo_electronico,
          rol: row.rol_general,
          foto_perfil: row.foto_perfil,
          activo: !!row.activo,
          repositorios: []
        });
      }

      if (row.repositorio_id) {
        usuariosMap.get(row.usuario_id).repositorios.push({
          id: row.repositorio_id,
          nombre: row.repositorio_nombre,
          rol_en_repositorio: row.rol_en_repositorio
        });
      }
    });

    res.json(Array.from(usuariosMap.values()));
  });
});

// Obtener usuario por ID con repositorios
app.get('/api/usuarios/:id', (req, res) => {
  const usuarioId = req.params.id;
  const sql = `
    SELECT u.id AS usuario_id, u.nombre, u.correo_electronico, u.rol AS rol_general, u.foto_perfil,
           ur.rol_en_repositorio, r.id AS repositorio_id, r.nombre AS repositorio_nombre,
           u.activo
    FROM usuarios u
    LEFT JOIN usuarios_repositorios ur ON u.id = ur.usuario_id
    LEFT JOIN registros r ON ur.repositorio_id = r.id
    WHERE u.id = ?
  `;

  db.query(sql, [usuarioId], (err, results) => {
    if (err) {
      console.error(`❌ Error al obtener usuario ID ${usuarioId}:`, err);
      return res.status(500).json({ error: 'Error al obtener usuario' });
    }
    if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const usuario = {
      id: results[0].usuario_id,
      nombre: results[0].nombre,
      correo_electronico: results[0].correo_electronico,
      rol: results[0].rol_general,
      foto_perfil: results[0].foto_perfil,
      activo: !!results[0].activo,
      repositorios: []
    };

    results.forEach(row => {
      if (row.repositorio_id) {
        usuario.repositorios.push({
          id: row.repositorio_id,
          nombre: row.repositorio_nombre,
          rol_en_repositorio: row.rol_en_repositorio
        });
      }
    });

    res.json(usuario);
  });
});

// Crear usuario (Con contraseña encriptada)
app.post('/api/usuarios', upload.single('foto_perfil'), async (req, res) => {
  const { nombre, correo, password, rol, activo } = req.body;
  const foto_perfil = req.file ? `Imagenes/Perfiles/${req.file.filename}` : null;

  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ error: 'Faltan datos para crear usuario' });
  }

  const activoBool = activo === 'true' || activo === true ? 1 : 0;

  try {
    // 🔒 Encriptamos el password antes de hacer el INSERT
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO usuarios (nombre, correo_electronico, password, rol, activo, foto_perfil) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, correo, hashedPassword, rol, activoBool, foto_perfil], 
      (err, result) => {
        if (err) {
          console.error('❌ Error creando usuario:', err);
          return res.status(500).json({ error: 'Error al crear usuario' });
        }
        res.json({ message: 'Usuario creado correctamente', id: result.insertId });
      }
    );
  } catch (hashError) {
    console.error('❌ Error al encriptar contraseña:', hashError);
    res.status(500).json({ error: 'Error interno al procesar la contraseña' });
  }
});

// Actualizar usuario (nombre, correo, rol general, foto)
app.put('/api/usuarios/:id', upload.single('foto_perfil'), (req, res) => {
  const usuarioId = req.params.id;
  const {
    nombre,
    correo_electronico,
    rol,
    activo,
    repositorios // Se espera un array o JSON string: [{ repositorio_id, rol_en_repositorio }]
  } = req.body;

  if (!nombre || !correo_electronico || !rol) {
    return res.status(400).json({ error: 'Faltan datos para actualizar usuario' });
  }

  // Parsear repositorios si viene como string JSON
  let repositoriosArray = [];
  if (repositorios) {
    try {
      repositoriosArray = typeof repositorios === 'string' ? JSON.parse(repositorios) : repositorios;
      if (!Array.isArray(repositoriosArray)) throw new Error('No es un array');
    } catch (e) {
      return res.status(400).json({ error: 'Formato de repositorios inválido' });
    }
  }

  const nuevaFoto = req.file ? `Imagenes/Perfiles/${req.file.filename}` : null;

  // Validar que correo no esté en uso por otro usuario
  db.query(
    'SELECT id FROM usuarios WHERE correo_electronico = ? AND id != ?',
    [correo_electronico, usuarioId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error en validación de correo' });
      if (results.length > 0) return res.status(400).json({ error: 'Correo electrónico ya en uso' });

      // Obtener foto anterior para borrar si se sube nueva
      db.query('SELECT foto_perfil FROM usuarios WHERE id = ?', [usuarioId], (err2, results2) => {
        if (err2) return res.status(500).json({ error: 'Error al obtener usuario' });
        if (results2.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const fotoAnterior = results2[0].foto_perfil;

        if (
          nuevaFoto &&
          fotoAnterior &&
          fotoAnterior !== '' &&
          !fotoAnterior.includes('placeholder-profile.png')
        ) {
          const rutaCompleta = path.join(__dirname, fotoAnterior);
          fs.unlink(rutaCompleta, (err) => {
            if (err) console.warn('No se pudo eliminar imagen anterior:', err.message);
          });
        }

        // Preparar campos y consulta UPDATE (incluyendo campo activo)
        const campos = [nombre, correo_electronico, rol];

        let query = `UPDATE usuarios SET nombre = ?, correo_electronico = ?, rol = ?`;

        if (activo !== undefined) {
          query += `, activo = ?`;
          campos.push(activo === 'true' || activo === true ? 1 : 0);
        }

        if (nuevaFoto) {
          query += `, foto_perfil = ?`;
          campos.push(nuevaFoto);
        }

        query += ` WHERE id = ?`;
        campos.push(usuarioId);

        db.query(query, campos, (errUpdate) => {
          if (errUpdate) return res.status(500).json({ error: 'Error al actualizar usuario' });

          // Actualizar usuarios_repositorios
          db.query('DELETE FROM usuarios_repositorios WHERE usuario_id = ?', [usuarioId], (errDel) => {
            if (errDel) return res.status(500).json({ error: 'Error al actualizar repositorios' });

            if (repositoriosArray.length === 0) {
              return res.json({ message: 'Usuario actualizado correctamente' });
            }

            // Insertar repositorios con rol_en_repositorio
            const valores = repositoriosArray.map(repo => [
              usuarioId,
              repo.repositorio_id,
              repo.rol_en_repositorio || 'lector'
            ]);

            db.query(
              'INSERT INTO usuarios_repositorios (usuario_id, repositorio_id, rol_en_repositorio) VALUES ?',
              [valores],
              (errInsert) => {
                if (errInsert) return res.status(500).json({ error: 'Error al insertar repositorios' });

                res.json({ message: 'Usuario actualizado correctamente' });
              }
            );
          });
        });
      });
    }
  );
});

// Activar / desactivar usuario
app.post('/api/usuarios/:id/toggle-activo', (req, res) => {
  const id = req.params.id;
  const { activo } = req.body || {};

  if (activo === undefined) {
    return res.status(400).json({ error: 'Falta estado activo' });
  }

  db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id], (err, result) => {
    if (err) {
      console.error('❌ Error cambiando estado activo:', err);
      return res.status(500).json({ error: 'Error actualizando estado' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente` });
  });
});

// Resetear contraseña usuario (genera temporal, la encripta en BD y manda texto plano por correo)
app.post('/api/usuarios/:id/reset-password', async (req, res) => {
  const id = req.params.id;
  const tempPass = uuidv4().slice(0, 8); // Contraseña en texto plano para el correo

  try {
    const hashedTempPass = await bcrypt.hash(tempPass, 10); 

    db.query('SELECT correo_electronico FROM usuarios WHERE id = ?', [id], (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

      const email = results[0].correo_electronico;

      db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedTempPass, id], (errUpdate) => {
        if (errUpdate) return res.status(500).json({ error: 'Error actualizando contraseña' });

        const mailOptions = {
          from: process.env.EMAIL_USER, 
          to: email,
          subject: 'Contraseña temporal',
          html: `<p>Tu nueva contraseña temporal es: <strong>${tempPass}</strong></p><p>Por favor cámbiala al ingresar.</p>`
        };

        transporter.sendMail(mailOptions, (errMail) => {
          if (errMail) return res.status(500).json({ error: 'Error enviando correo' });
          res.json({ message: 'Contraseña reseteada y enviada por correo' });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error procesando la contraseña temporal' });
  }
});

app.get('/api/usuarios/:id/historial', (req, res) => {
  const usuarioId = req.params.id;

  const sql = `
    SELECT l.id, l.accion, l.fecha, r.nombre AS nombre_repositorio
    FROM logs l
    LEFT JOIN registros r ON l.registro_id = r.id
    WHERE l.usuario_id = ?
    ORDER BY l.fecha DESC
  `;

  db.query(sql, [usuarioId], (err, results) => {
    if (err) {
      console.error(`❌ Error al obtener historial del usuario ${usuarioId}:`, err);
      return res.status(500).json({ error: 'Error al obtener historial del usuario' });
    }

    res.json(results);
  });
});

// Eliminar usuario
app.delete('/api/usuarios/:id', (req, res) => {
  const usuarioId = req.params.id;

  // Primero, eliminar las relaciones del usuario en usuarios_repositorios
  const sqlDeleteRelations = 'DELETE FROM usuarios_repositorios WHERE usuario_id = ?';
  db.query(sqlDeleteRelations, [usuarioId], (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar relaciones del usuario:', err);
      return res.status(500).json({ error: 'Error al eliminar las relaciones del usuario' });
    }

    // Luego, eliminar el usuario de la tabla usuarios
    const sqlDeleteUser = 'DELETE FROM usuarios WHERE id = ?';
    db.query(sqlDeleteUser, [usuarioId], (err, result) => {
      if (err) {
        console.error('❌ Error al eliminar el usuario:', err);
        return res.status(500).json({ error: 'Error al eliminar el usuario' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json({ message: 'Usuario eliminado correctamente' });
    });
  });
});


// Cambiar contraseña desde Mi Perfil
app.put('/api/usuarios/:id/cambiar-password', async (req, res) => {
  const usuarioId = req.params.id;
  const { passwordActual, nuevaPassword } = req.body;

  if (!passwordActual || !nuevaPassword) {
    return res.status(400).json({ error: 'Faltan datos. Se requiere la contraseña actual y la nueva.' });
  }

  if (nuevaPassword.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  try {
    // 1. Buscamos al usuario en la base de datos para obtener su hash actual
    db.query('SELECT password FROM usuarios WHERE id = ?', [usuarioId], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Error en la base de datos al buscar usuario' });
      if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

      const usuario = results[0];

      // 2. 🔒 Comparamos la contraseña actual que escribió con el hash guardado
      const coinciden = await bcrypt.compare(passwordActual, usuario.password);
      
      if (!coinciden) {
        return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
      }

      // 3. Si todo está bien, encriptamos la nueva y la guardamos
      const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

      db.query(
        'UPDATE usuarios SET password = ? WHERE id = ?',
        [hashedPassword, usuarioId],
        (errUpdate) => {
          if (errUpdate) return res.status(500).json({ error: 'Error actualizando contraseña' });
          res.json({ message: 'Contraseña actualizada correctamente' });
        }
      );
    });
  } catch (error) {
    console.error('❌ Error interno al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno al procesar la contraseña' });
  }
});


// --- REGISTROS --- //

// Obtener todos los registros
app.get('/api/registros', (req, res) => {
  db.query('SELECT * FROM registros', (err, results) => {
    if (err) {
      console.error("❌ Error al obtener registros:", err);
      return res.status(500).json({ error: 'Error al obtener registros' });
    }
    res.json(results);
  });
});

// Crear nuevo registro con validación de duplicados
app.post('/api/registros', (req, res) => {
  const {
    servidor, direccion, nombre, aplicacion, version_app,
    estado, version_php, version_mdb, certificado, emitido, vencimiento,
    almacenamiento_asignado, almacenamiento_utilizado, memoria, procesadores, sistema_operativo
  } = req.body;

  if (!servidor || !direccion || !aplicacion) {
    return res.status(400).json({ error: 'Campos servidor, direccion y aplicacion son obligatorios' });
  }

  const emitidoVal = emitido && emitido.trim() !== '' ? emitido : null;
  const vencimientoVal = vencimiento && vencimiento.trim() !== '' ? vencimiento : null;

  const sqlCheck = `
    SELECT id FROM registros
    WHERE servidor = ? AND direccion = ? AND aplicacion = ?
  `;
  db.query(sqlCheck, [servidor, direccion, aplicacion], (err, results) => {
    if (err) {
      console.error('❌ Error verificando duplicados:', err);
      return res.status(500).json({ error: 'Error interno al verificar duplicados' });
    }
    if (results.length > 0) {
      return res.status(409).json({ error: 'Registro duplicado: ya existe un registro con ese servidor, dirección y aplicación' });
    }

    const sqlInsert = `
      INSERT INTO registros (
        servidor, direccion, nombre, aplicacion, version_app,
        estado, version_php, version_mdb, certificado, emitido, vencimiento,
        almacenamiento_asignado, almacenamiento_utilizado, memoria, procesadores, sistema_operativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valores = [
      servidor, direccion, nombre || '', aplicacion, version_app || '',
      estado || '', version_php || '', version_mdb || '', certificado || null,
      emitidoVal, vencimientoVal,
      almacenamiento_asignado || '', almacenamiento_utilizado || '', memoria || '', procesadores || '', sistema_operativo || ''
    ];

    db.query(sqlInsert, valores, (errInsert, result) => {
      if (errInsert) {
        console.error('❌ Error insertando registro:', errInsert);
        return res.status(500).json({ error: 'Error al insertar registro' });
      }
      res.status(201).json({ message: 'Registro creado correctamente', id: result.insertId });
    });
  });
});

// Actualizar un registro existente
app.put('/api/registros/:id', (req, res) => {
  const id = req.params.id;
  const {
    servidor, direccion, nombre, aplicacion, version_app,
    estado, version_php, version_mdb, certificado, emitido, vencimiento,
    almacenamiento_asignado, almacenamiento_utilizado, memoria, procesadores, sistema_operativo,
    imagen_url 
  } = req.body;

  const emitidoVal = emitido && emitido.trim() !== '' ? emitido : null;
  const vencimientoVal = vencimiento && vencimiento.trim() !== '' ? vencimiento : null;

  const sqlUpdate = `
    UPDATE registros SET
      servidor = ?, direccion = ?, nombre = ?, aplicacion = ?, version_app = ?,
      estado = ?, version_php = ?, version_mdb = ?, certificado = ?, emitido = ?, vencimiento = ?,
      almacenamiento_asignado = ?, almacenamiento_utilizado = ?, memoria = ?, procesadores = ?, sistema_operativo = ?,
      imagen_url = ?
    WHERE id = ?
  `;

  const valores = [
    servidor, direccion, nombre, aplicacion, version_app,
    estado, version_php, version_mdb, certificado, emitidoVal, vencimientoVal,
    almacenamiento_asignado, almacenamiento_utilizado, memoria, procesadores, sistema_operativo,
    imagen_url,
    id
  ];

  db.query(sqlUpdate, valores, (err, result) => {
    if (err) {
      console.error("❌ Error al actualizar registro:", err);
      return res.status(500).json({ error: 'Error al actualizar el registro' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json({ message: 'Registro actualizado correctamente', id });
  });
});

// Eliminar registro por ID
app.delete('/api/registros/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM registros WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error("❌ Error al eliminar registro:", err);
      return res.status(500).json({ error: 'Error al eliminar el registro' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json({ message: 'Registro eliminado correctamente' });
  });
});

// Ruta para obtener todos los repositorios
app.get('/api/repositorios', async (req, res) => {
  try {
    const sql = `
      SELECT r.*, ev.nivel AS nivel_vulnerabilidad, ev.fecha_escaneo AS fecha_ultimo_escaneo,
            /* ✅ SOLUCIÓN: Cambiamos el alias a 'detalles' para que coincida con el frontend */
            COALESCE(ev.resumen, ev.detalles) AS detalles
      FROM registros r
      LEFT JOIN (
        SELECT e1.*
        FROM escaneos_vulnerabilidad e1
        INNER JOIN (
          SELECT repositorio_id, MAX(fecha_escaneo) AS max_fecha
          FROM escaneos_vulnerabilidad
          GROUP BY repositorio_id
        ) e2 ON e1.repositorio_id = e2.repositorio_id AND e1.fecha_escaneo = e2.max_fecha
      ) ev ON r.id = ev.repositorio_id
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error('❌ Error al obtener repositorios con escaneo:', err);
        return res.status(500).json({ error: 'Error al obtener los datos' });
      }

      res.json(results);
    });
  } catch (error) {
    console.error('❌ Error en ruta /api/repositorios:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.put('/api/registros-metricas', (req, res) => {
  const {
    servidor,
    almacenamiento_asignado,
    almacenamiento_utilizado,
    memoria,
    procesadores,
    sistema_operativo,
    version_php,
    version_mdb,
    estado
  } = req.body;

  const sql = `
    UPDATE registros SET
      almacenamiento_asignado = ?,
      almacenamiento_utilizado = ?,
      memoria = ?,
      procesadores = ?,
      sistema_operativo = ?,
      version_php = ?,
      version_mdb = ?,
      estado = ?,
      ultima_actualizacion = NOW()
    WHERE servidor = ?
  `;

  db.query(sql, [
    almacenamiento_asignado,
    almacenamiento_utilizado,
    memoria,
    procesadores,
    sistema_operativo,
    version_php,
    version_mdb,
    estado,
    servidor
  ], (err, result) => {
    if (err) {
      console.error("❌ Error actualizando métricas:", err);
      return res.status(500).json({ error: "Error al actualizar métricas" });
    }

    res.json({
      message: "Métricas actualizadas",
      actualizados: result.affectedRows
    });
  });
});

//==============================================================
//                       RUTAS PARA RECORDATORIOS
//==============================================================

// Crear nuevo recordatorio
app.post('/api/recordatorios', (req, res) => {
  const { repositorio_id, tipo, mensaje, fecha_programada, enviar_correo, usuarios_a_notificar, creado_por } = req.body;
  
  if (!repositorio_id || !tipo || !mensaje || !fecha_programada || !creado_por) {
    return res.status(400).json({ error: 'Faltan datos para crear el recordatorio' });
  }

  const sqlRecordatorio = `
    INSERT INTO recordatorios (repositorio_id, tipo, mensaje, fecha_programada, creado_por, completado, enviar_correo)
    VALUES (?, ?, ?, ?, ?, false, ?)
  `;

 db.query(sqlRecordatorio, [repositorio_id, tipo, mensaje, fecha_programada, creado_por, enviar_correo], (err, result) => {
        if (err) {
            console.error('❌ Error al registrar recordatorio:', err);
            return res.status(500).json({ error: 'Error al registrar recordatorio' });
        }

        const recordatorioId = result.insertId;

        if (enviar_correo && usuarios_a_notificar && usuarios_a_notificar.length > 0) {

            const sqlGetUsers = `SELECT nombre, correo_electronico FROM usuarios WHERE id IN (?)`;
            db.query(sqlGetUsers, [usuarios_a_notificar], (err, users) => {
                if (err) {
                    console.error('❌ Error al obtener los datos de los usuarios:', err);
                } else {
                    const sqlGetRepoName = `SELECT nombre FROM registros WHERE id = ?`;
                    db.query(sqlGetRepoName, [repositorio_id], (err, repoResult) => {
                        if (err) {
                            console.error('❌ Error al obtener el nombre del repositorio:', err);
                        } else {
                            const nombreRepositorio = repoResult.length > 0 ? repoResult[0].nombre : 'Desconocido';
                            
                            users.forEach(user => {
                                enviarRecordatorio(user, { 
                                    repositorio: nombreRepositorio,
                                    tipo,
                                    mensaje,
                                    fecha_programada
                                });
                            });
                        }
                    });
                }
            });
        }

        res.status(201).json({ message: 'Recordatorio creado correctamente', id: recordatorioId });
    });
});

// Obtener historial completo de recordatorios por repositorio
app.get('/api/recordatorios/historial/:repositorioId', (req, res) => {
  const { repositorioId } = req.params;

  const sql = `
    SELECT 
      r.id, 
      r.tipo, 
      r.mensaje, 
      r.fecha_programada, 
      r.completado,
      r.creado_por,
      u.nombre AS nombre_creador,
      GROUP_CONCAT(ru.usuario_id) AS participantes_ids,
      GROUP_CONCAT(u2.nombre) AS participantes_nombres
    FROM recordatorios r
    LEFT JOIN usuarios u ON r.creado_por = u.id
    LEFT JOIN recordatorios_usuarios ru ON r.id = ru.recordatorio_id
    LEFT JOIN usuarios u2 ON ru.usuario_id = u2.id
    WHERE r.repositorio_id = ?
    GROUP BY r.id
    ORDER BY r.fecha_programada DESC
  `;

  db.query(sql, [repositorioId], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener el historial de recordatorios:', err);
      return res.status(500).json({ error: 'Error al obtener el historial' });
    }
    res.json(results);
  });
});

// ✅ NUEVO ENDPOINT PARA ACTUALIZAR UN RECORDATORIO COMO COMPLETADO
app.put('/api/recordatorios/:id', (req, res) => {
    const { id } = req.params;
    const { completado } = req.body;

    if (typeof completado !== 'boolean') {
        return res.status(400).json({ error: 'El campo "completado" es requerido y debe ser booleano' });
    }

    const sql = `UPDATE recordatorios SET completado = ? WHERE id = ?`;

    db.query(sql, [completado, id], (err, result) => {
        if (err) {
            console.error('❌ Error al actualizar el recordatorio:', err);
            return res.status(500).json({ error: 'Error al actualizar el recordatorio' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Recordatorio no encontrado' });
        }

        res.status(200).json({ message: 'Recordatorio actualizado correctamente' });
    });
});

// Endpoint para obtener la lista de usuarios (necesario para el modal)
app.get('/api/usuarios', (req, res) => {
  const sql = 'SELECT id, nombre, correo_electronico FROM usuarios';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }
    res.json(results);
  });
});


// --- VERIFICACION DE SESION --- 


// Middleware para verificar la sesión (el 'portero')
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        // Si no hay sesión, redirigir al login y detener la ejecución
        return res.redirect('/login.html'); 
    }
    // Si la sesión existe, continuar con la siguiente función (enviar el archivo)
    next();
}

// ---- RUTAS ----

// 2. Ruta de inicio de sesión (ejemplo)
app.post('/login', (req, res) => {
    // Aquí iría tu lógica de validación de credenciales
    if (req.body.username === 'admin' && req.body.password === '123') {
        req.session.userId = 'admin'; // Crear la sesión con un ID
        res.redirect('/directorio.html'); // Redirigir a la página protegida
    } else {
        res.redirect('/login.html');
    }
});

// 3. Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/directorio.html');
        }
        res.clearCookie('connect.sid'); // Limpiar la cookie de la sesión
        res.redirect('/login.html');
    });
});

// 4. La ruta del directorio, ahora protegida
app.get('/directorio.html', requireLogin, (req, res) => {
    // Si esta línea se ejecuta, es porque el middleware requireLogin
    // ya verificó que el usuario tiene una sesión válida.
    res.sendFile(path.join(__dirname, 'public', 'directorio.html'));
});


// --- GOOGLE ANALYTICS --- 

// --- Funciones de GA4 (CORREGIDAS) ---

async function fetchSummaryMetrics(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'bounceRate' }
            ],
        });
        return {
            totalUsers: parseInt(response.rows[0]?.metricValues[0]?.value || 0),
            totalSessions: parseInt(response.rows[0]?.metricValues[1]?.value || 0),
            bounceRate: parseFloat(response.rows[0]?.metricValues[2]?.value || 0) * 100
        };
    } catch (error) {
        console.error(`Error summary metrics:`, error.message);
        return null;
    }
}

async function fetchTopPages(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [{ name: 'screenPageViews' }],
            dimensions: [{ name: 'pageTitle' }],
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
            limit: 5
        });
        return response.rows.map(r => ({
            page: r.dimensionValues[0].value,
            visits: parseInt(r.metricValues[0].value)
        }));
    } catch (e) {
        console.error(`Error top pages:`, e.message);
        return null;
    }
}

async function fetchUsersByDevice(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [{ name: 'activeUsers' }],
            dimensions: [{ name: 'deviceCategory' }],
        });
        return response.rows.map(r => ({
            device: r.dimensionValues[0].value,
            users: parseInt(r.metricValues[0].value)
        }));
    } catch (e) {
        console.error(`Error users by device:`, e.message);
        return null;
    }
}

async function fetchSessionsOverTime(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'date' }],
        });
        return response.rows.map(r => ({
            date: r.dimensionValues[0].value,
            sessions: parseInt(r.metricValues[0].value)
        }));
    } catch (e) {
        console.error(`Error sessions over time:`, e.message);
        return null;
    }
}

async function fetchNewVsReturning(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [{ name: 'activeUsers' }],
            dimensions: [{ name: 'newVsReturning' }]
        });
        return response.rows.map(r => ({
            type: r.dimensionValues[0].value,
            users: parseInt(r.metricValues[0].value)
        }));
    } catch (e) {
        console.error(`Error new vs returning:`, e.message);
        return null;
    }
}

async function fetchTrafficSources(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 5
        });
        return response.rows.map(r => ({
            source: r.dimensionValues[0].value,
            sessions: parseInt(r.metricValues[0].value)
        }));
    } catch (e) {
        console.error(`Error traffic sources:`, e.message);
        return null;
    }
}

async function fetchAvgSessionDuration(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [{ name: 'averageSessionDuration' }]
        });
        
        if (response.rows && response.rows.length > 0) {
            return parseFloat(response.rows[0]?.metricValues[0]?.value || 0);
        } else {
            return 0;
        }
    } catch (e) {
        console.error(`Error avg session duration:`, e.message);
        return 0;
    }
}

async function fetchUsersByCountry(propertyId, startDate, endDate) {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: startDate, endDate: endDate }],
            metrics: [{ name: 'activeUsers' }],
            dimensions: [{ name: 'country' }],
            orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
            limit: 10
        });
        return response.rows.map(r => ({
            country: r.dimensionValues[0].value,
            users: parseInt(r.metricValues[0].value)
        }));
    } catch (e) {
        console.error(`Error users by country:`, e.message);
        return null;
    }
}


// ENDPOINT: OBTENER TODOS LOS DATOS DE CACHÉ /api/cache/all
app.get('/api/cache/all', async (req, res) => {
    db.query('SELECT range_name, range_key, data, updated_at FROM analytics_cache', (error, rows) => {
        if (error) {
            console.error("❌ Error al obtener caché DB:", error);
            return res.status(500).json({ success: false, error: 'Error al recuperar datos de caché' });
        }

        try {
            const cachedData = rows.map(row => ({
                range_name: row.range_name,
                range_key: row.range_key,
                data: JSON.parse(row.data), 
                updated_at: row.updated_at
            }));

            return res.status(200).json(cachedData);

        } catch (parseError) {
            console.error("❌ Error al parsear datos de caché:", parseError);
            return res.status(500).json({ success: false, error: 'Error al procesar datos de caché' });
        }
    });
});

// NUEVO ENDPOINT: /api/cache/preload-all (Fuerza la generación de caché de todos los rangos)
app.get('/api/cache/preload-all', async (req, res) => {
    const rangesToPreload = ["today", "last7", "last28", "last30", "last90", "last365"];
    const results = [];
    
    console.log("➡️ Iniciando proceso de precarga de rangos en la DB...");
    
    for (const key of rangesToPreload) {
        const range = getDateRangeBackend(key);
        if (!range) continue;
        
        try {
            const allAnalyticsData = {};

            for (const repo of repositorios) {
                const summary = await fetchSummaryMetrics(repo.id, range.startDate, range.endDate);
                const topPages = await fetchTopPages(repo.id, range.startDate, range.endDate);
                const usersByDevice = await fetchUsersByDevice(repo.id, range.startDate, range.endDate);
                const sessionsOverTime = await fetchSessionsOverTime(repo.id, range.startDate, range.endDate);
                const newVsReturning = await fetchNewVsReturning(repo.id, range.startDate, range.endDate);
                const trafficSources = await fetchTrafficSources(repo.id, range.startDate, range.endDate);
                const usersByCountry = await fetchUsersByCountry(repo.id, range.startDate, range.endDate);
                const avgSessionDuration = await fetchAvgSessionDuration(repo.id, range.startDate, range.endDate);

                if (summary) summary.avgSessionDuration = avgSessionDuration;

                allAnalyticsData[repo.id] = { 
                    name: repo.name, 
                    data: { summary, topPages, usersByDevice, sessionsOverTime, newVsReturning, trafficSources, usersByCountry } 
                };
            }
            
            // Guardar el rango en la DB
            saveRangeToCache(key, range.startDate, range.endDate, allAnalyticsData);
            
            results.push({ range: key, status: 'Saved' });

        } catch (err) {
            console.error(`❌ Error al precargar y guardar ${key}:`, err.message);
            results.push({ range: key, status: 'Failed' });
        }
    }
    
    console.log("✅ Proceso de precarga de rangos finalizado.");
    return res.status(200).json({ success: true, results });
});


// ENDPOINT PRINCIPAL: /analytics/data (Genera o usa el caché)
app.get('/analytics/data', async (req, res) => {
    const { startDate = '30daysAgo', endDate = 'today', rangeOption } = req.query; 
    const allAnalyticsData = {};

    if (!startDate || !endDate) {
        return res.status(400).json({ success: false, error: "Faltan parámetros startDate o endDate" });
    }
    
    // 1. Intentar obtener de la caché de DB (para evitar llamadas a GA)
    try {
        const cacheKey = `analytics_${startDate}_${endDate}`;
        const cachedResult = await new Promise((resolve, reject) => {
            db.query('SELECT data FROM analytics_cache WHERE range_key = ?', [cacheKey], (err, rows) => {
                if (err) return reject(err);
                if (rows.length > 0) {
                    try {
                        resolve(JSON.parse(rows[0].data));
                    } catch (e) {
                        reject(new Error("Error al parsear caché de DB"));
                    }
                } else {
                    resolve(null);
                }
            });
        });

        if (cachedResult) {
            console.log(`⚡ **ÉXITO**: Usando datos en caché DB para rango ${startDate} - ${endDate}`);
            return res.status(200).json(cachedResult);
        }

    } catch (err) {
        console.warn(`⚠️ Error al buscar en caché DB, procediendo con GA:`, err.message);
        
    }


    // 2. Si no hay caché en DB: Llamar a la API de Google Analytics (lenta)
    console.log(`➡️ Solicitando datos de Analytics a GA para rango: ${startDate} - ${endDate} (LENTO)`);

    try {
        for (const repo of repositorios) {
            // Simulación de las llamadas a la API de Analytics para cada métrica
            const summary = await fetchSummaryMetrics(repo.id, startDate, endDate);
            const topPages = await fetchTopPages(repo.id, startDate, endDate);
            const usersByDevice = await fetchUsersByDevice(repo.id, startDate, endDate);
            const sessionsOverTime = await fetchSessionsOverTime(repo.id, startDate, endDate);
            const newVsReturning = await fetchNewVsReturning(repo.id, startDate, endDate);
            const trafficSources = await fetchTrafficSources(repo.id, startDate, endDate);
            const usersByCountry = await fetchUsersByCountry(repo.id, startDate, endDate);
            const avgSessionDuration = await fetchAvgSessionDuration(repo.id, startDate, endDate);

            if (summary) summary.avgSessionDuration = avgSessionDuration;

            allAnalyticsData[repo.id] = { 
                name: repo.name, 
                data: { summary, topPages, usersByDevice, sessionsOverTime, newVsReturning, trafficSources, usersByCountry } 
            };
        }

        // 3. Guardar el nuevo resultado de GA en el caché de la DB
        const nameForCache = rangeOption || `${startDate} a ${endDate}`;
        saveRangeToCache(nameForCache, startDate, endDate, allAnalyticsData);

        return res.status(200).json(allAnalyticsData);

    } catch (err) {
        console.error("❌ Error generando datos Analytics:", err.message);
        return res.status(500).json({ success: false, error: 'Error al generar datos de Analytics' });
    }
});



// ==========================
// REPORTES GEMINI
// ==========================

// ==========================================
// ENDPOINT: Guardar y Enviar Reporte Gemini
// ==========================================

app.post('/api/reports/send-and-save', async (req, res) => {

    // 1. Recibir datos completos
    const { 
        repoId, 
        analysisContentHtml,
        analyticsData,
        wordpressData,
        dateRange
    } = req.body;

    if (!repoId || !analysisContentHtml) {
        return res.status(400).json({
            success: false,
            message: "Faltan datos requeridos (repoId o analysisContentHtml)."
        });
    }

    const repoData = getRepoDataById(repoId);
    const { name: repoName, email: repoEmail } = repoData;

    if (!repoEmail || repoEmail === 'contacto@cultura.gob.mx') {
        return res.status(400).json({
            success: false,
            message: `No se pudo obtener correo válido para ${repoName}.`
        });
    }

    let status = 'PENDIENTE';
    let insertId = null;

    const insertQuery = `
        INSERT INTO reportes_gemini 
        (repo_id, repo_name, recipient_email, analysis_content_html, analytics_json, wordpress_json, date_range_json, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    try {
        // 2. Guardar todo en la base de datos
        const [result] = await db.promise().execute(insertQuery, [
            repoId,
            repoName,
            repoEmail,
            analysisContentHtml,
            JSON.stringify(analyticsData || null),
            JSON.stringify(wordpressData || null),
            JSON.stringify(dateRange || null),
            status
        ]);

        insertId = result.insertId;
        console.log(`✅ Reporte ID ${insertId} guardado con datos completos.`);

        // 3. Enviar correo
        const emailSuccess = await enviarReporteGemini(repoEmail, repoName, analysisContentHtml);

        // 4. Actualizar estado
        status = emailSuccess ? 'ENVIADO' : 'FALLIDO';
        await db.promise().execute(
            `UPDATE reportes_gemini SET status = ? WHERE id = ?`,
            [status, insertId]
        );

        // 5. Respuesta
        return res.json({
            success: true,
            message: "Reporte guardado, datos completos almacenados y correo enviado.",
            reportId: insertId,
            recipient: repoEmail
        });

    } catch (error) {

        console.error(`❌ Error procesando reporte ${insertId}:`, error);

        if (insertId) {
            await db.promise().execute(
                `UPDATE reportes_gemini SET status = 'FALLIDO' WHERE id = ?`,
                [insertId]
            );
        }

        return res.status(500).json({
            success: false,
            message: "Error interno al guardar el reporte.",
            error: error.message
        });
    }
});


// ====================================================
// ENDPOINT: Obtener Historial de Reportes por Repo ID
// ====================================================
app.get('/api/reports/repository/:repoId', async (req, res) => {
  const { repoId } = req.params;

  if (!repoId) {
    return res.status(400).json({ success: false, message: "Falta el ID del repositorio (repoId) en la URL." });
  }

  try {
    // ✅ Incluimos tanto 'timestamp' como 'created_at' para compatibilidad
    const [rows] = await db.promise().execute(
      `SELECT 
         id, 
         repo_name, 
         recipient_email, 
         timestamp, 
         created_at, 
         sent_at, 
         status 
       FROM reportes_gemini 
       WHERE repo_id = ? 
       ORDER BY sent_at DESC`,
      [repoId]
    );

    // ✅ Mapeamos los datos correctamente, usando timestamp si no hay created_at
    const reports = rows.map(row => ({
      id: row.id,
      repositoryName: row.repo_name,
      recipientEmail: row.recipient_email,
      createdAt: row.created_at || row.timestamp, // 👈 cambio clave
      sentAt: row.sent_at,
      status: row.status
    }));

    
    // ✅ Devolvemos el historial (puede estar vacío sin error)
    return res.json({ success: true, reports });

  } catch (error) {
    console.error(`❌ Error al obtener el historial de reportes para el repo ID ${repoId}:`, error);
    return res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor al obtener el historial de reportes.", 
      error: error.message 
    });
  }
});


// ==========================================
// ENDPOINT: Obtener contenido completo de un reporte por ID
// ==========================================
app.get('/api/reports/view/:reportId', async (req, res) => {
  const { reportId } = req.params;

  if (!reportId) {
    return res.status(400).json({
      success: false,
      message: "Falta el ID del reporte (reportId)."
    });
  }

  try {
    const [rows] = await db.promise().execute(
      `SELECT 
         id,
         repo_id,
         repo_name,
         recipient_email,
         analysis_content_html,
         analytics_json,
         wordpress_json,
         date_range_json,
         timestamp,
         created_at,
         sent_at,
         status
       FROM reportes_gemini
       WHERE id = ?`,
      [reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reporte no encontrado."
      });
    }

    const report = rows[0];

    return res.json({
      success: true,
      report: {
        id: report.id,
        repositoryId: report.repo_id,
        repositoryName: report.repo_name,
        recipientEmail: report.recipient_email,
        analysisHtml: report.analysis_content_html,

        // 👇 **AQUÍ ESTÁ LO QUE FALTABA**
        analyticsData: JSON.parse(report.analytics_json || "null"),
        wordpressData: JSON.parse(report.wordpress_json || "null"),
        dateRange: JSON.parse(report.date_range_json || "null"),

        createdAt: report.created_at || report.timestamp,
        sentAt: report.sent_at,
        status: report.status
      }
    });

  } catch (error) {
    console.error(`❌ Error obteniendo reporte ${reportId}:`, error);

    return res.status(500).json({
      success: false,
      message: "Error interno al obtener el reporte.",
      error: error.message
    });
  }
});


// =====================================================
// 📤 ENDPOINT: Reenviar un reporte guardado (sin crear otro)
// =====================================================
app.post("/api/reports/resend/:reportId", async (req, res) => {
  const { reportId } = req.params;
  if (!reportId) return res.status(400).json({ success: false, message: "Falta el ID del reporte." });

  try {
    console.log(`📨 Reenviando reporte ID ${reportId}...`);

    // 1️⃣ Obtener datos del reporte original
    const [rows] = await db.promise().execute(
      `SELECT id, repo_id, repo_name, recipient_email, analysis_content_html, created_at, sent_at, status 
       FROM reportes_gemini WHERE id = ?`,
      [reportId]
    );

    if (rows.length === 0) {
      console.warn("⚠️ Reporte no encontrado en DB.");
      return res.status(404).json({ success: false, message: "Reporte no encontrado." });
    }

    const report = rows[0];
    console.log("🧩 Reporte encontrado para reenvío:", report);

    // 2️⃣ Enviar el correo usando tu función existente
    const emailSuccess = await enviarReporteGemini(
      report.recipient_email,
      report.repo_name,
      report.analysis_content_html
    );

    // 3️⃣ Actualizar fecha de envío (sent_at) y estado
    const status = emailSuccess ? "ENVIADO" : "FALLIDO";
    await db.promise().execute(
      `UPDATE reportes_gemini SET sent_at = NOW(), status = ? WHERE id = ?`,
      [status, reportId]
    );

    console.log(
      emailSuccess
        ? `✅ Reporte reenviado correctamente a ${report.recipient_email}`
        : `❌ Falló el reenvío a ${report.recipient_email}`
    );

    return res.json({
      success: emailSuccess,
      message: emailSuccess
        ? "Reporte reenviado correctamente."
        : "Fallo al enviar el reporte.",
      reportId: reportId,
      recipient: report.recipient_email,
      created_at: report.created_at,
      sent_at: new Date(),
      status,
    });
  } catch (error) {
    console.error("💥 Error al reenviar reporte:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al reenviar el reporte.",
      error: error.message,
    });
  }
});


// ==========================================
// INTEGRACIÓN SEGURA CON GEMINI (IA)
// ==========================================
app.post('/api/ia/generar-reporte', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Se requiere enviar el texto (prompt) para la IA.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'La llave de la API de IA no está configurada en el servidor.' });
  }

  const MODEL = "models/gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${apiKey}`;

  try {
    // Hacemos la petición a Google desde el servidor de Cultura, no desde el navegador del usuario
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Devolvemos la respuesta de Gemini limpia al frontend
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error al conectar con Gemini:', error.response ? JSON.stringify(error.response.data) : error.message);
    res.status(500).json({ error: 'Error interno al generar el análisis con IA.' });
  }
});


// =======================================================
// --- FUNCIONES Y ENDPOINTS DE ACERVOS (Tainacan) ---
// =======================================================

// Ruta para obtener la lista de repositorios
app.get('/api/acervos/repositorios', (req, res) => {

    const sql = `
        SELECT nombre, direccion
        FROM registros
        WHERE aplicacion = 'Wordpress'
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error al obtener repositorios de la base de datos:', err);
            return res.status(500).json({ error: 'Error al obtener los repositorios' });
        }

        const repositoriosFrontend = results.map(repo => {
            const safeDir = repo.direccion.endsWith('/') ? repo.direccion : `${repo.direccion}/`;
            return {
                name: repo.nombre,
                tainacanApiUrl: `${safeDir}wp-json/tainacan/v2`,
            };
        });

        res.json(repositoriosFrontend);
    });
});

// --- NUEVA FUNCIÓN AUXILIAR EN EL SERVIDOR ---
function getBasicAuthHeader(user, password) {
    if (!user || !password) return {};
    
    // Crear la cadena "user:password"
    const credentials = `${user}:${password}`;
    
    // Codificar en Base64
    const base64Credentials = Buffer.from(credentials).toString('base64');
    
    // Retornar el header
    return { 'Authorization': `Basic ${base64Credentials}` };
}

// Endpoint para obtener items paginados de Tainacan respetando pageSize del frontend

app.get('/api/acervos/:collectionId/items', async (req, res) => {
    try {
        const { collectionId } = req.params;
        const { repoUrl, page = 1, pageSize = 8 } = req.query;

        if (!repoUrl) {
            console.warn("⚠️ FALTA repoUrl en request");
            return res.status(400).json({ error: 'repoUrl es obligatorio' });
        }

        // ------------------------------------------------------
        // 1. Buscar credenciales del repositorio
        // ------------------------------------------------------
        const normalize = u => u.replace(/\/+$/, "");
        const repoConfig = repositoriosWordpress.find(
            repo => normalize(repo.tainacanApiUrl) === normalize(repoUrl)
        );

        if (!repoConfig) {
            console.warn("⚠️ No se encontraron credenciales para:", repoUrl);
        } else {
            console.log("🔐 Se encontraron credenciales:", repoConfig.user);
        }

        const authHeaders = repoConfig
            ? getBasicAuthHeader(repoConfig.user, repoConfig.password)
            : {};

        console.log("🔐 Headers enviados:", authHeaders);

        const safeRepoUrl = repoUrl.endsWith('/') ? repoUrl : `${repoUrl}/`;

        // ------------------------------------------------------
        // 2. Construcción de URL FINAL
        // ------------------------------------------------------
        const tainacanUrl = `${safeRepoUrl}collection/${collectionId}/items?per_page=${pageSize}&page=${page}&status=any`;

        // ------------------------------------------------------
        // 3. Fetch a Tainacan
        // ------------------------------------------------------
        const response = await fetch(tainacanUrl, { headers: { ...authHeaders } });

        if (!response.ok) {
            console.error("❌ Error HTTP al consultar Tainacan");
            throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
        }

        const data = await response.json();

        // ------------------------------------------------------
        // 4. Procesar items
        // ------------------------------------------------------
        const itemsArray = Array.isArray(data) ? data : (data.items || []);
        console.log(`📦 Items devueltos en esta página: ${itemsArray.length}`);

        // Asegurar conteo
        const totalItems = parseInt(response.headers.get('X-WP-Total')) || itemsArray.length;

        console.log(`📊 Total items reales reportados por Tainacan: ${totalItems}`);

        // ------------------------------------------------------
        // 5. Señales de problemas
        // ------------------------------------------------------

        if (itemsArray.length === 0) {
            console.warn("⚠️ Esta página regresó 0 items.");
        }

        if (response.headers.get('X-WP-Total') === null) {
            console.warn("⚠️ El servidor NO está enviando X-WP-Total.");
        }

        if (itemsArray.length < pageSize) {
            console.warn("⚠️ El repositorio IGNORÓ per_page. Sólo devolvió:", itemsArray.length);
        }

        // ------------------------------------------------------
        // 6. Respuesta final
        // ------------------------------------------------------
        res.json({
            items: itemsArray,
            totalItems
        });

        console.log("✅ Respuesta enviada al frontend correctamente.\n");

    } catch (error) {
        console.error("❌ EXCEPCIÓN en el endpoint de items:", error);
        res.status(500).json({ error: error.message });
    }
});


// 1️⃣ RANGOS DE FECHAS (BACKEND)
function getDateRangeBackend(option) {
    const today = new Date();
    let start, end = new Date(today);

    switch (option) {
        case "today": start = new Date(end); break;
        case "last7": start = new Date(end); start.setDate(end.getDate() - 6); break;
        case "last28": start = new Date(end); start.setDate(end.getDate() - 27); break;
        case "last30": start = new Date(end); start.setDate(end.getDate() - 29); break;
        case "last90": start = new Date(end); start.setDate(end.getDate() - 89); break;
        case "last365": start = new Date(end); start.setDate(end.getDate() - 364); break;
        default: return null;
    }

    return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0]
    };
}

// NUEVA FUNCIÓN: Guardar un rango de datos en la tabla analytics_cache
function saveRangeToCache(rangeName, startDate, endDate, data) {
    const cacheKey = `analytics_${startDate}_${endDate}`;
    
    // El objeto 'data' ya debe contener todos los datos de analytics
    const dataToStore = JSON.stringify(data);

    const sql = `
        INSERT INTO analytics_cache (range_name, range_key, data) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()
    `;
    const values = [rangeName, cacheKey, dataToStore];

    db.query(sql, values, (err, result) => {
        if (err) console.error(`❌ Error guardando caché para ${cacheKey}:`, err.message);
        else console.log(`💾 Caché actualizado/guardado para rango "${rangeName}" (${cacheKey})`);
    });
}

app.get('/api/acervos/collections', async (req, res) => {
    try {
        const { repoUrl } = req.query;
        if (!repoUrl) return res.status(400).json({ error: "repoUrl obligatorio" });

        let base = decodeURIComponent(repoUrl).trim().replace(/\/+$/, "");
        const safeRepoUrl = base + "/";

        // Buscar credenciales
        const normalize = u => u.replace(/\/+$/, "");
        const repoConfig = repositoriosWordpress.find(
            repo => normalize(repo.tainacanApiUrl) === normalize(base)
        );
        const authHeaders = repoConfig
            ? getBasicAuthHeader(repoConfig.user, repoConfig.password)
            : {};

        let collections = [];

        // --------------------------------------------
        // 1) PROBAR /repository/collections
        // --------------------------------------------
        const urlRepo = safeRepoUrl + "repository/collections?status=any&per_page=100";
        let response = await fetch(urlRepo, { headers: { ...authHeaders } });

        if (response.ok) {
            console.log("✅ Usando /repository/collections");
            collections = await response.json();
            if (Array.isArray(collections)) {
                return res.json({ collections, totalCollections: collections.length });
            } else if (collections.collections) {
                return res.json({ 
                    collections: collections.collections, 
                    totalCollections: collections.collections.length 
                });
            }
        }

        console.log("⚠️ /repository/collections no existe. Usando /collections…");

        // --------------------------------------------
        // 2) PROBAR /collections
        // --------------------------------------------
        const urlCol = safeRepoUrl + "collections?status=any&per_page=100";
        response = await fetch(urlCol, { headers: { ...authHeaders } });

        let partialList = [];
        if (response.ok) {
            partialList = await response.json();
            partialList = Array.isArray(partialList) ? partialList : (partialList.collections || []);
        }

        console.log(`📌 Colecciones visibles: ${partialList.length}`);

        // --------------------------------------------
        // 3) DESCUBRIMIENTO DE COLECCIONES OCULTAS
        // --------------------------------------------
        const discovered = [];
        let lastId = 0;

        // Encontrar el ID mayor conocido
        for (const col of partialList) {
            if (col.id && col.id > lastId) lastId = col.id;
        }

        console.log(`🔍 Último ID encontrado: ${lastId}`);

        // Buscar manualmente nuevas colecciones
        let emptyCount = 0;
        const MAX_EMPTY = 10;  
        let id = lastId + 1;

        while (emptyCount < MAX_EMPTY && id < lastId + 200) {
            const testUrl = `${safeRepoUrl}collection/${id}`;
            const test = await fetch(testUrl, { headers: { ...authHeaders } });

            if (test.ok) {
                const colData = await test.json();
                console.log("🆕 Colección descubierta:", id);
                discovered.push(colData);
                emptyCount = 0;
            } else {
                emptyCount++;
            }

            id++;
        }

        console.log(`🧩 Colecciones adicionales descubiertas: ${discovered.length}`);

        const allCollections = [...partialList, ...discovered];

        return res.json({
            collections: allCollections,
            totalCollections: allCollections.length
        });

    } catch (err) {
        console.error("❌ Error en /api/acervos/collections:", err);
        res.status(500).json({ error: err.message });
    }
});


// =======================================================
// --- NUEVOS ENDPOINTS DE ACERVOS (Tainacan) ---
// =======================================================


app.get('/api/acervos/deleted-items-count', async (req, res) => {
    try {
        const { repoUrl } = req.query;

        if (!repoUrl) {
            return res.status(400).json({ error: 'repoUrl es obligatorio' });
        }

        // 1. 🔍 Buscar credenciales
        const normalize = (u) => u.replace(/\/+$/, "");
        const repoConfig = repositoriosWordpress.find(
            repo => normalize(repo.tainacanApiUrl) === normalize(repoUrl)
        );

        const authHeaders = repoConfig ? getBasicAuthHeader(repoConfig.user, repoConfig.password) : {};

        const safeRepoUrl = repoUrl.endsWith('/') ? repoUrl : `${repoUrl}/`;

        // 2. 🎯 Construir la URL de Tainacan

        const tainacanUrl = `${safeRepoUrl}items?perpage=1&status=trash`;

        console.log(`Fetching Tainacan URL (Deleted Items Count con auth): ${tainacanUrl}`);

        // 3. 🚀 Realizar fetch con los headers de autenticación
        const response = await fetch(tainacanUrl, {
            headers: {
                ...authHeaders,
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);

        const totalItems = parseInt(response.headers.get('X-WP-Total')) || 0;

        console.log(`🗑️ Total items eliminados (con auth): ${totalItems}`);

        res.json({ count: totalItems });
    } catch (error) {
        console.error('❌ Error fetching deleted items count con auth:', error);
        res.status(500).json({ error: error.message });
    }
});


// ==============================================================================
//                       MÓDULO DE CIBERSEGURIDAD (PGAC)
// ==============================================================================


// 1. Configuración de Multer para Evidencias de Incidentes
const EVIDENCIAS_DIR = path.join(__dirname, 'uploads', 'evidencias_pgac');
if (!fs.existsSync(EVIDENCIAS_DIR)) {
  fs.mkdirSync(EVIDENCIAS_DIR, { recursive: true });
}

const storageEvidencias = multer.diskStorage({
  destination: (req, file, cb) => cb(null, EVIDENCIAS_DIR),
  filename: (req, file, cb) => {
    // Guarda el archivo con el folio de la alerta y la fecha para evitar colisiones
    const uniqueName = `EV-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  }
});
const uploadEvidencia = multer({ storage: storageEvidencias });

// --------------------------------
// RUTA 1: Obtener alertas
// --------------------------------
app.get('/api/alertas', (req, res) => {
  const query = `
    SELECT 
      i.folio_interno AS id,
      t.nombre AS tipo,
      a.nombre AS activo,
      i.activo_especifico AS especifique,
      i.areas_asignadas AS area, 
      s.nivel AS severidad,
      s.sla_horas, 
      i.fecha_registro,
      i.fecha_cierre,  -- <--- ¡SOLO TIENES QUE AGREGAR ESTA LÍNEA!
      e.nombre AS estado
    FROM incidentes_ciberseguridad i
    LEFT JOIN cat_tipo_alerta t ON i.id_tipo = t.id_tipo
    LEFT JOIN cat_activo a ON i.id_activo = a.id_activo
    LEFT JOIN cat_severidad s ON i.id_severidad = s.id_severidad
    LEFT JOIN cat_estado e ON i.id_estado = e.id_estado
    ORDER BY i.fecha_registro DESC;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error en GET /api/alertas:", err);
      return res.status(500).json({ error: "Error al consultar la base de datos" });
    }
    res.status(200).json(results);
  });
});

// ------------------------------------------------------------------------------
// RUTAS: DIRECTORIO DE CONTACTOS SLA
// ------------------------------------------------------------------------------
// Traer todos los contactos con su área correspondiente
app.get('/api/contactos-sla', (req, res) => {
  const query = `
    SELECT c.id_contacto, c.correo, a.nombre AS area 
    FROM contactos_sla c
    JOIN cat_areas a ON c.id_area = a.id_area
    ORDER BY c.id_contacto DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener contactos" });
    res.status(200).json(results);
  });
});

// Agregar un nuevo contacto
app.post('/api/contactos-sla', (req, res) => {
  const { correo, area } = req.body;
  if (!correo || !area) return res.status(400).json({ error: "El correo y el área son requeridos" });

  const query = `
    INSERT INTO contactos_sla (correo, id_area) 
    VALUES (?, (SELECT id_area FROM cat_areas WHERE nombre = ? LIMIT 1))
  `;

  db.query(query, [correo, area], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "Este correo ya está registrado." });
      return res.status(500).json({ error: "Error al guardar el contacto" });
    }
    res.status(201).json({ mensaje: "Contacto agregado", id: results.insertId });
  });
});

// Eliminar un contacto
app.delete('/api/contactos-sla/:id', (req, res) => {
  const id = req.params.id;
  db.query(`DELETE FROM contactos_sla WHERE id_contacto = ?`, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error al eliminar" });
    res.status(200).json({ mensaje: "Contacto eliminado" });
  });
});

// ------------------------------------------------------------------------------
// RUTA 2: Registrar una NUEVA alerta manualmente Y ENVIAR CORREO (BROADCAST)
// ------------------------------------------------------------------------------
app.post('/api/alertas', (req, res) => {
  // Ahora "area" será un string como "Desarrollo Web, SOC"
  const { folio, tipo, activo, especifique, area, severidad } = req.body;

  if (!folio || !tipo || !activo || !especifique || !area || !severidad) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  // 1. Guardar la alerta en MySQL (Directo como VARCHAR)
  const insertQuery = `
    INSERT INTO incidentes_ciberseguridad 
    (folio_interno, id_tipo, id_activo, activo_especifico, areas_asignadas, id_severidad, id_estado)
    VALUES (
      ?,
      (SELECT id_tipo FROM cat_tipo_alerta WHERE nombre = ? LIMIT 1),
      (SELECT id_activo FROM cat_activo WHERE nombre = ? LIMIT 1),
      ?,
      ?,
      (SELECT id_severidad FROM cat_severidad WHERE nivel = ? LIMIT 1),
      (SELECT id_estado FROM cat_estado WHERE nombre = 'Análisis' LIMIT 1)
    )
  `;

  db.query(insertQuery, [folio, tipo, activo, especifique, area, severidad], (err, results) => {
    if (err) {
      console.error("❌ Error al insertar alerta:", err);
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "El ID/Folio ya existe." });
      return res.status(500).json({ error: "Error al registrar la alerta." });
    }

    res.status(201).json({ mensaje: "Alerta registrada correctamente", id: results.insertId });

    // 2. BROADCAST: Enviar correo a TODOS los registrados en el SLA
    const queryCorreos = `SELECT correo FROM contactos_sla`;

    db.query(queryCorreos, (errCorreos, resCorreos) => {
      if (!errCorreos && resCorreos.length > 0) {
        
        const listaDestinatarios = resCorreos.map(c => c.correo).join(',');
        const colorSeveridad = severidad === 'Crítica' ? '#dc3545' : severidad === 'Alta' ? '#fd7e14' : '#ffc107';

        const htmlCorreo = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #7c1225; padding: 20px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 22px;">NUEVA ALERTA DE CIBERSEGURIDAD</h2>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Sistema de Gestión de Acervos (SGA)</p>
            </div>
            
            <div style="padding: 30px 20px; background-color: #f9f9f9;">
              <p style="font-size: 16px; color: #333;">Se ha registrado un nuevo incidente que requiere atención por parte de: <strong>${area}</strong>.</p>
              
              <div style="background-color: white; padding: 20px; border-left: 5px solid ${colorSeveridad}; border-radius: 4px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <p style="margin: 0 0 10px 0;"><strong>Folio:</strong> ${folio}</p>
                <p style="margin: 0 0 10px 0;"><strong>Tipo de Amenaza:</strong> ${tipo}</p>
                <p style="margin: 0 0 10px 0;"><strong>Activo Afectado:</strong> ${activo} (${especifique})</p>
                <p style="margin: 0;"><strong>Nivel de Severidad:</strong> <span style="color: ${colorSeveridad}; font-weight: bold;">${severidad}</span></p>
              </div>

              <p style="font-size: 14px; color: #555;">El tiempo de resolución (SLA) ha comenzado a correr. Por favor, ingrese al panel de control para gestionar el incidente, documentar las evidencias y generar el Dictamen Técnico.</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://172.17.175.137/GA/Programa/cyberseguridad.html" style="background-color: #7c1225; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ir al Panel de Monitoreo</a>
              </div>
            </div>
            
            <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #777;">
              <p style="margin: 0;">Este es un mensaje automático generado por el Módulo de Ciberseguridad de la Secretaría de Cultura. No responda a este correo.</p>
            </div>
          </div>
        `;

        const mailOptions = {
          from: `"Cultura" <${process.env.EMAIL_USER}>`, 
          to: listaDestinatarios, 
          subject: `🚨 Alerta ${severidad}: Incidente de Ciberseguridad [${folio}]`,
          html: htmlCorreo
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("❌ Error al enviar correo de alerta:", error);
          } else {
            console.log(`✅ Notificación enviada a todos los miembros (${listaDestinatarios}): ${info.response}`);
          }
        });
      }
    });
  });
});

// ------------------------------------------------------------------------------
// RUTA 3: Obtener los detalles de UNA sola alerta (Para rellenar el modal)
// ------------------------------------------------------------------------------
app.get('/api/alertas/:folio', (req, res) => {
  const folio = req.params.folio;
  
  const query = `SELECT * FROM incidentes_ciberseguridad WHERE folio_interno = ?`;

  db.query(query, [folio], (err, results) => {
    if (err) {
      console.error("❌ Error al consultar la alerta:", err);
      return res.status(500).json({ error: "Error en la base de datos" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Alerta no encontrada" });
    }
    
    res.status(200).json(results[0]); 
  });
});

// ------------------------------------------------------------------------------
// RUTA 4: Actualizar Estado, Textos del Dictamen y Subir Evidencias
// ------------------------------------------------------------------------------

app.put('/api/alertas/:folio/estado', uploadEvidencia.array('evidencias', 5), (req, res) => {
  const folio = req.params.folio;
  
  const { 
    nuevoEstado, sistema, desc, causa, impacto, acciones, conclusion, recom, resp, vobo 
  } = req.body;
  
  const archivos = req.files;

  if (!nuevoEstado) return res.status(400).json({ error: "El nuevo estado es requerido" });

  // 1. Preparamos la consulta del Dictamen
  let updateQuery = `
    UPDATE incidentes_ciberseguridad 
    SET id_estado = (SELECT id_estado FROM cat_estado WHERE nombre = ? LIMIT 1),
        sistema_afectado = ?,
        descripcion_tecnica = ?,
        causa_raiz = ?,
        impacto_generado = ?,
        acciones_realizadas = ?,
        conclusion_tecnica = ?,
        recomendaciones = ?,
        responsable = ?,
        vobo = ?
  `;
  

  if (nuevoEstado === 'Cierre') {
    updateQuery += `, fecha_cierre = CURRENT_TIMESTAMP `;
  }
  
  updateQuery += ` WHERE folio_interno = ?`;

  const valores = [nuevoEstado, sistema, desc, causa, impacto, acciones, conclusion, recom, resp, vobo, folio];


  db.query(updateQuery, valores, (err, results) => {
    if (err) {
      console.error("❌ Error al guardar los cambios:", err);
      return res.status(500).json({ error: "Error interno al actualizar." });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "No se encontró el incidente." });
    }

    // 2. Verificamos si vienen archivos adjuntos
    if (archivos && archivos.length > 0) {
      
      // Armamos el bloque de datos usando las columnas correctas (folio_interno, ruta web)
      const values = archivos.map(file => [
        folio,                                        // folio_interno (Ej. SGA-SOC-2026-002)
        file.originalname,                            // nombre_archivo
        `/uploads/evidencias_pgac/${file.filename}`   // ruta_archivo (Ruta pública web)
      ]);
      
      const insertEvidencias = `INSERT INTO evidencias_incidente (folio_interno, nombre_archivo, ruta_archivo) VALUES ?`;
      
      db.query(insertEvidencias, [values], (errInsert) => {
        if (errInsert) {
            console.error("❌ Error al guardar metadatos de evidencia:", errInsert);
            return res.status(200).json({ mensaje: "Textos guardados, pero falló la vinculación de evidencia." });
        }
        
        return res.status(200).json({ 
          mensaje: "Cambios y evidencias guardados.",
          archivosSubidos: archivos.length
        });
      });

    } else {
      return res.status(200).json({ mensaje: "Cambios guardados correctamente." });
    }
  });
});

// ------------------------------------------------------------------------------
// RUTA 5: Actualizar datos básicos desde el botón "Modificar Clasificación"
// ------------------------------------------------------------------------------
app.put('/api/alertas/:folio/basicos', (req, res) => {
    const folio = req.params.folio;
    const { tipo, activo, area, severidad } = req.body;

    // Actualizamos usando el nuevo nombre de columna "areas_asignadas"
    // y guardamos el texto directamente en lugar de buscar un ID.
    const updateQuery = `
        UPDATE incidentes_ciberseguridad 
        SET 
            id_tipo = (SELECT id_tipo FROM cat_tipo_alerta WHERE nombre = ? LIMIT 1),
            id_activo = (SELECT id_activo FROM cat_activo WHERE nombre = ? LIMIT 1),
            areas_asignadas = ?, 
            id_severidad = (SELECT id_severidad FROM cat_severidad WHERE nivel LIKE ? LIMIT 1)
        WHERE folio_interno = ?
    `;

    // Extraemos las primeras 4 letras de la severidad (Ej. "Crít") para que haga match seguro en la BD
    const severidadBusqueda = severidad.substring(0, 4) + '%';

    db.query(updateQuery, [tipo, activo, area, severidadBusqueda, folio], (err, results) => {
        if (err) {
            console.error("❌ Error al actualizar datos básicos:", err);
            return res.status(500).json({ error: "Error interno al actualizar clasificación." });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "No se encontró el incidente." });
        }

        res.status(200).json({ mensaje: "Clasificación actualizada correctamente." });
    });
});

const cron = require('node-cron');

// Tarea programada: Se ejecuta CADA 5 MINUTOS

cron.schedule('*/5 * * * *', () => {
    console.log('--- [SGA Watchdog] Revisando estados de SLA ---');

    // Ahora leemos el texto "areas_asignadas"
    const query = `
        SELECT i.folio_interno, i.fecha_registro, s.nivel, s.sla_horas, i.areas_asignadas AS area,
               i.notif_proximo_vencer, i.notif_vencido
        FROM incidentes_ciberseguridad i
        JOIN cat_severidad s ON i.id_severidad = s.id_severidad
        WHERE i.id_estado != (SELECT id_estado FROM cat_estado WHERE nombre = 'Cierre' LIMIT 1)
    `;

    db.query(query, (err, alertas) => {
        if (err) return console.error("Error en Watchdog:", err);

        // Obtenemos todos los contactos una sola vez para armar un "Directorio" en memoria
        db.query("SELECT correo, a.nombre AS area_contacto FROM contactos_sla c JOIN cat_areas a ON c.id_area = a.id_area", (errContactos, contactosDb) => {
            if(errContactos) return console.error("Error leyendo directorio SLA");

            alertas.forEach(alerta => {
                const inicio = new Date(alerta.fecha_registro);
                const ahora = new Date();
                const diferenciaHoras = (ahora - inicio) / (1000 * 60 * 60);
                const tiempoRestante = alerta.sla_horas - diferenciaHoras;
                const umbralAviso = alerta.sla_horas * 0.25; 


                let correosDestino = [];
                if (alerta.area) {
                    // ESCUDO: Forzamos a que sea texto antes de aplicar el split
                    const areasLista = String(alerta.area).split(',').map(a => a.trim());
                    
                    // Buscamos a los contactos cuya área coincida con alguna de la lista
                    contactosDb.forEach(c => {
                        if(areasLista.includes(c.area_contacto)) correosDestino.push(c.correo);
                    });
                }
                
                // Unimos todos los correos sin duplicados
                alerta.correos = [...new Set(correosDestino)].join(',');

                if (tiempoRestante <= 0 && alerta.notif_vencido === 0) {
                    enviarCorreoContinuidad(alerta, "ALERTA VENCIDA");
                    db.query("UPDATE incidentes_ciberseguridad SET notif_vencido = 1 WHERE folio_interno = ?", [alerta.folio_interno]);
                }
                else if (tiempoRestante > 0 && tiempoRestante <= umbralAviso && alerta.notif_proximo_vencer === 0) {
                    enviarCorreoContinuidad(alerta, "PRÓXIMO A VENCER");
                    db.query("UPDATE incidentes_ciberseguridad SET notif_proximo_vencer = 1 WHERE folio_interno = ?", [alerta.folio_interno]);
                }
            });
        });
    });
});


function enviarCorreoContinuidad(alerta, motivo) {

    // 👇 1. EL ESCUDO ANTI-ERRORES DE NODEMAILER 👇
    // Si la base de datos dice que no hay correos para esta área, se cancela el envío silenciosamente
    if (!alerta.correos || alerta.correos.trim() === '') {
        console.log(`⚠️ Omitiendo notificación para ${alerta.folio_interno}: El área [${alerta.area}] no tiene correos registrados en el SLA.`);
        return; 
    }

    // 2. Determinar el color de la tarjeta según la severidad
    const colorSeveridad = alerta.nivel === 'Crítica' ? '#dc3545' : (alerta.nivel === 'Alta' ? '#fd7e14' : '#ffc107');
    
    // 3. Definir un color extra rojo intenso si la alerta ya venció
    const colorAlerta = motivo === 'ALERTA VENCIDA' ? '#dc3545' : '#fd7e14';

    // 4. Diseño del Correo HTML (Basado en tu plantilla oficial)
    const htmlCorreoContinuidad = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        
        <div style="background-color: #7c1225; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px;">⚠️ AVISO DE URGENCIA: SLA</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Sistema de Gestión de Acervos (SGA)</p>
        </div>
        
        <div style="padding: 30px 20px; background-color: #f9f9f9;">
          <p style="font-size: 16px; color: #333;">Este es un aviso automático indicando que el tiempo de resolución para un incidente del área de <strong>${alerta.area}</strong> ha alcanzado un estado crítico.</p>
          
          <div style="background-color: white; padding: 20px; border-left: 5px solid ${colorSeveridad}; border-radius: 4px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="margin: 0 0 10px 0;"><strong>Folio:</strong> ${alerta.folio_interno}</p>
            <p style="margin: 0 0 10px 0;"><strong>Nivel de Severidad:</strong> <span style="color: ${colorSeveridad}; font-weight: bold;">${alerta.nivel}</span></p>
            <p style="margin: 0;"><strong>Estado del SLA:</strong> <span style="color: ${colorAlerta}; font-weight: bold; text-decoration: underline;">${motivo}</span></p>
          </div>

          <p style="font-size: 14px; color: #555;">Es indispensable ingresar de inmediato al panel de control para gestionar el incidente, actualizar sus evidencias o proceder con el Cierre.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://172.17.175.137/GA/Programa/cyberseguridad.html" style="background-color: #7c1225; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ir al Panel de Monitoreo</a>
          </div>
        </div>
        
        <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #777;">
          <p style="margin: 0;">Este es un mensaje automático generado por el Módulo de Ciberseguridad de la Secretaría de Cultura. No responda a este correo.</p>
        </div>
      </div>
    `;

    // 5. Opciones de envío de Nodemailer
    const mailOptions = {
        from: `"SOC Cultura - Urgencias" <${process.env.EMAIL_USER}>`, 
        to: alerta.correos, // Aquí ya va seguro porque pasó el escudo
        subject: `⚠️ URGENTE [${alerta.folio_interno}]: ${motivo}`,
        html: htmlCorreoContinuidad
    };

    // 6. Ejecutar el envío
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(`❌ Error enviando correo de continuidad para ${alerta.folio_interno}:`, error.message);
        } else {
            console.log(`✅ Recordatorio (${motivo}) enviado para ${alerta.folio_interno}`);
        }
    });
}

// =======================================================
// GET: RECUPERAR EVIDENCIAS 
// =======================================================
app.get('/api/alertas/:folio/evidencias', (req, res) => {
    const { folio } = req.params;
    
    // 👇 SOLUCIÓN: Quitamos 'id,' de aquí. Solo pedimos nombre y ruta.
    const sql = "SELECT nombre_archivo, ruta_archivo FROM evidencias_incidente WHERE folio_interno = ?";
    
    db.query(sql, [folio], (err, results) => {
        if (err) {
            console.error("❌ Error BD recuperando evidencias:", err);
            return res.status(500).json({ error: "Error al recuperar evidencias" });
        }
        res.json(results);
    });
});

// =======================================================
//   INTELIGENCIA ARTIFICIAL OpenAI - CIBERSEGURIDAD
// =======================================================

const { OpenAI } = require('openai'); 

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1" 
});

async function analizarCorreoConChatGPT(cuerpoCorreo, modo = "detalle", listaSistemas = "") {
    const promptIndice = `Extrae ÚNICAMENTE la lista de las tecnologías o sistemas principales afectados mencionados en el índice de este boletín. 
    Responde con un JSON que tenga una llave "sistemas" (arreglo de strings).`;

    const promptDetalle = `Tienes esta lista ESTRICTA de categorías maestras: [${listaSistemas}].
    Analiza este fragmento y extrae vulnerabilidades.
    
    REGLA DE ORO 1: Agrupa los sistemas pequeños bajo la categoría maestra correcta.
    REGLA DE ORO 2 (VITAL): PROHIBIDO RESUMIR LOS CVEs. Debes extraer ABSOLUTAMENTE TODOS los identificadores CVE mencionados (ej. CVE-2026-7025). Si hay 30 en el texto, extrae los 30 textualmente.
    
    FORMATO JSON:
    {
      "alertas": [
        {
          "categoria_maestra": "DEBE SER EXACTAMENTE UNO DE LOS NOMBRES DE LA LISTA ESTRICTA",
          "tipo": "Vulnerabilidad",
          "activo": "Aplicación/Servidor/Endpoint",
          "area_asignada": "Asigna las áreas responsables de atender esto, separadas por comas (Ej. Desarrollo Web, SOC). Opciones estrictas: Desarrollo Web, Infraestructura, Soporte Técnico, Repositorios, SOC, Todas las Áreas.",
          "severidad": "Crítica/Alta/Media/Baja",
          "especifique": "Marca afectada",
          "sistema_afectado": "Nombre de la categoría maestra",
          "descripcion_tecnica": "Resumen técnico detallado de la falla",
          "causa_raiz": "Origen exacto del error",
          "impacto_generado": "Impacto si se explota",
          "cves": "Lista de TODOS los CVEs separados por comas. Si no hay pon 'Ninguno'."
        }
      ]
    }`;

    try {
        const response = await openai.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "Eres un Analista SOC experto. Eres extremadamente estricto, detallista y NUNCA resumes listas de CVEs." },
                { role: "user", content: (modo === "indice" ? promptIndice : promptDetalle) + "\n\nTEXTO:\n" + cuerpoCorreo }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("❌ Error en IA:", error.message);
        return null;
    }
}

// =======================================================
// RUTA DE PRUEBA (SIMULADOR MANUAL EN EL NAVEGADOR)
// =======================================================
app.post('/api/test-gemini', async (req, res) => {
    // Aquí puedes pegar el boletín de la ATDT para probar
    const correoSimulado = `
        Servicio de alerta temprana TLP:AMBER 
        Se han identificado múltiples vulnerabilidades (CVE-2024-7083) en distintos plugins utilizados en sitios web basados en WordPress. 
        Un atacante podría aprovechar estas debilidades para ejecutar código malicioso mediante XSS.
    `;

    try {
       const analisisIA = await analizarCorreoConChatGPT(correoSimulado) || {};
        const folioGenerado = 'SGA-IA-' + Date.now();

        const query = `
            INSERT INTO incidentes_ciberseguridad 
            (folio_interno, fuente_alerta, tlp_color, cves_relacionados, activo_especifico,
             id_tipo, id_activo, id_area, id_severidad, id_estado, 
             descripcion_tecnica, impacto_generado, causa_raiz, fuente_registro)
            VALUES (?, 'Agencia de Transformación Digital (ATDT)', ?, ?, ?,
                (SELECT id_tipo FROM cat_tipo_alerta WHERE nombre = ? LIMIT 1),
                (SELECT id_activo FROM cat_activo WHERE nombre = ? LIMIT 1),
                (SELECT id_area FROM cat_areas WHERE nombre = ? LIMIT 1),
                (SELECT id_severidad FROM cat_severidad WHERE nivel = ? LIMIT 1),
                1, ?, ?, ?, 'IA_DEEPSEEK'
            )
        `;

        db.query(query, [
            folioGenerado, analisisIA.tlp_color, analisisIA.cves, analisisIA.especifique,
            analisisIA.tipo, analisisIA.activo, analisisIA.area_asignada, analisisIA.severidad,
            analisisIA.descripcion, analisisIA.impacto, analisisIA.causa
        ], (err, result) => {
            if (err) return res.status(500).json({ error: "Error en BD", detalle: err.message });
            res.json({ mensaje: "Alerta registrada", id_alerta: result.insertId, datos: analisisIA });
        });

    } catch (error) {
        res.status(500).json({ error: "Fallo en simulación", detalle: error.message });
    }
});


// =======================================================
// MÓDULO DE INGESTA AUTOMÁTICA DE CORREOS (IMAP LISTENER)
// =======================================================
const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;

const imapConfig = {
    imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000, // 10 segundos de espera
        connTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
    }
};

async function iniciarEscuchaCorreos() {
    try {
        const connection = await imaps.connect(imapConfig);
        console.log("📧 [IMAP] Conectado al buzón exitosamente. Escuchando nuevos correos...");

        await connection.openBox('INBOX');

        connection.on('mail', async (numNuevos) => {
            console.log(`📥 [IMAP] ¡Alerta! Llegaron ${numNuevos} correos nuevos.`);

            const searchCriteria = ['UNSEEN']; 
            const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: true };

            const mensajes = await connection.search(searchCriteria, fetchOptions);

            for (let item of mensajes) {
                const all = item.parts.find(part => part.which === 'TEXT');
                const id = item.attributes.uid;
                const idHeader = "Imap-Id: " + id + "\r\n";

                // 👇 ENVOLVEMOS EL PARSER EN UNA PROMESA PARA QUE HAGA "FILA" 👇
                await new Promise((resolve) => {
                    simpleParser(idHeader + all.body, async (err, mail) => {
                        if (err) {
                            console.error("Error leyendo correo:", err);
                            return resolve(); // Si hay error, pasamos al siguiente correo
                        }

                        const asunto = mail.subject || "Sin Asunto";
                        const textoCorreo = mail.text || "";
                        
                        const palabrasClave = [
                            'vulnerabilidad', 'alerta', 'cve', 'tlp', 'error', 
                            'falla', 'incidente', 'brecha', 'ransomware', 
                            'malware', 'ataque', 'sospechoso'
                        ];
                        const esAlerta = palabrasClave.some(palabra => 
                            asunto.toLowerCase().includes(palabra) || 
                            textoCorreo.toLowerCase().includes(palabra)
                        );

                        if (esAlerta) {
                            console.log(`🚨 Incidente detectado en asunto: "${asunto}". Iniciando Análisis...`);

                            // FASE 1: ÍNDICE
                            const datosIndice = await analizarCorreoConChatGPT(textoCorreo.substring(0, 3000), "indice");
                            const sistemasMaestros = datosIndice?.sistemas || [];
                            
                            if (sistemasMaestros.length === 0) {
                                console.log("⏭️ Falsa alarma. Pasando al siguiente correo...");
                                return resolve(); // Pasamos al siguiente correo
                            }

                            // FASE 2: DETALLE
                            let mapaAlertasFinales = new Map(); 
                            const tamanoChunk = 3500;

                            for (let i = 0; i < textoCorreo.length; i += tamanoChunk) {
                                let fragmento = textoCorreo.substring(i, i + tamanoChunk);
                                let respuestaIA = await analizarCorreoConChatGPT(fragmento, "detalle", sistemasMaestros.join(" | "));
                                
                                if (respuestaIA && respuestaIA.alertas) {
                                    respuestaIA.alertas.forEach(alerta => {
                                        const categoria = alerta.categoria_maestra;
                                        if (categoria && sistemasMaestros.includes(categoria)) {
                                            if (mapaAlertasFinales.has(categoria)) {
                                                let existente = mapaAlertasFinales.get(categoria);
                                                if (alerta.cves && alerta.cves !== "Ninguno") {
                                                    existente.cves = (existente.cves === "Ninguno") ? alerta.cves : existente.cves + ", " + alerta.cves;
                                                }
                                                mapaAlertasFinales.set(categoria, existente);
                                            } else {
                                                mapaAlertasFinales.set(categoria, alerta);
                                            }
                                        }
                                    });
                                }
                                
                                // Pausa entre fragmentos del MISMO correo para cuidar la IA
                                if (i + tamanoChunk < textoCorreo.length) {
                                    await new Promise(r => setTimeout(r, 65000));
                                }
                            }

                            // FASE 3: REGISTRO EN BASE DE DATOS
                            const listaFinal = Array.from(mapaAlertasFinales.values());
                            
                            // Usamos un for...of aquí también para asegurar que se guarden uno por uno en la BD
                            for (let index = 0; index < listaFinal.length; index++) {
                                const datosIA = listaFinal[index];
                                const folioGenerado = 'SGA-ATDT-' + Date.now() + '-' + index;
                                
                                const especifique = (datosIA.especifique || "Múltiples").substring(0, 90);
                                const sistema = (datosIA.categoria_maestra || "Desconocido").substring(0, 150);
                                let cvesTexto = String(datosIA.cves || "Ninguno");
                                if(cvesTexto.length > 250) cvesTexto = cvesTexto.substring(0, 245) + "..."; 

                                const query = `
                                    INSERT INTO incidentes_ciberseguridad 
                                    (folio_interno, fuente_alerta, tlp_color, cves_relacionados, activo_especifico,
                                    id_tipo, id_activo, areas_asignadas, id_severidad, id_estado, 
                                    sistema_afectado, descripcion_tecnica, causa_raiz, impacto_generado, fuente_registro)
                                    VALUES (?, 'Buzón Automático', ?, ?, ?,
                                        COALESCE((SELECT id_tipo FROM cat_tipo_alerta WHERE nombre LIKE ? LIMIT 1), 1),
                                        COALESCE((SELECT id_activo FROM cat_activo WHERE nombre LIKE ? LIMIT 1), 1),
                                        ?, 
                                        COALESCE((SELECT id_severidad FROM cat_severidad WHERE nivel LIKE ? LIMIT 1), 1),
                                        1, ?, ?, ?, ?, 'IA_GROQ'
                                    )
                                `;

                                const sTipo = `${(datosIA.tipo || "Vuln").substring(0, 4)}%`;
                                const sActivo = `${(datosIA.activo || "App").substring(0, 4)}%`;
                                const areasAAsignar = datosIA.area_asignada || "SOC"; 
                                const sSev = `${(datosIA.severidad || "Med").substring(0, 4)}%`;

                                // Guardamos en BD y esperamos a que termine usando una promesa
                                await new Promise((resDb) => {
                                    db.query(query, [
                                        folioGenerado, datosIA.tlp_color, cvesTexto, especifique,
                                        sTipo, sActivo, areasAAsignar, sSev,
                                        sistema, datosIA.descripcion_tecnica, datosIA.causa_raiz, datosIA.impacto_generado
                                    ], (err) => {
                                        if (err) console.error(`❌ Error en BD:`, err.message);
                                        else console.log(`✅ Folio Creado: ${folioGenerado}`);
                                        resDb(); // Terminó de guardar, sigue con la otra alerta
                                    });
                                });
                            }
                            
                            // ¡Terminó con TODO el correo 1! Libera el ciclo para que siga con el correo 2
                            resolve(); 
                            
                        } else {
                            console.log("⏭️ Correo ignorado (No es incidente).");
                            resolve(); // Libera el ciclo para que siga con el correo 2
                        }
                    });
                });
            } 
        });
    } catch (error) {
        console.error("❌ Error de conexión al buzón IMAP:", error.message);
    }
}

/*
async function simularAlertaReal() {
    console.log("\n=======================================================");
    console.log("🚀 INICIANDO PRUEBA CON EL BOLETÍN GIGANTE ATDT (Dos Fases + Chunking)");
    console.log("=======================================================\n");

    const correoPrueba = `Servicio de alerta temprana
TLP:AMBER 
Estimada persona servidora pública RIC y UTIC,
 
Por este medio se informa sobre diversas vulnerabilidades de seguridad identificadas que afectan las siguientes tecnologías:
 
1. Aplicaciones web desarrolladas en PHP.
2. Plugins en WordPress.
3. Python – Gestor de paquetes pip.
4. Langflow, LangChain y LangGraph.
5. Microsoft Security Update Guide.
6. PackageKit en sistemas Linux.
 
En ese sentido y de acuerdo a la Política General de Ciberseguridad para la Administración Pública Federal, se insta a todas las dependencias y entidades que utilicen estas infraestructuras de TI a reducir su exposición a ciberataques priorizando las acciones inmediatas a aplicar.
Aplicaciones web desarrolladas en PHP.
 
Por este medio se informa sobre múltiples vulnerabilidades identificadas en diversas aplicaciones web desarrolladas en PHP, las cuales se originan principalmente por validaciones insuficientes de la información que ingresan los usuarios, controles de acceso inadecuados y un manejo inseguro de archivos o parámetros dentro de los sistemas afectados. Un atacante remoto podría aprovechar estas debilidades enviando solicitudes manipuladas a las aplicaciones para realizar acciones maliciosas como acceder o modificar información, ejecutar código en el servidor, cargar archivos maliciosos o manipular rutas de archivos, así como llevar a cabo ataques conocidos como inyección SQL, Cross-Site Scripting (XSS) o Server-Side Request Forgery (SSRF). La explotación de estas vulnerabilidades podría comprometer los sistemas donde se encuentren desplegadas estas aplicaciones web y afectar la confidencialidad, integridad y disponibilidad de la información. Los identificadores son:
CVE-2026-7025
CVE-2026-7028
CVE-2026-7043
CVE-2026-7044
CVE-2026-7063
CVE-2026-7072
CVE-2026-7073
CVE-2026-7074
CVE-2026-7075
CVE-2026-7076
CVE-2026-7077
CVE-2026-7083
CVE-2026-7087
CVE-2026-7088
CVE-2026-7089
CVE-2026-7090
CVE-2026-7103
CVE-2026-7114
CVE-2026-7115
CVE-2026-7116
CVE-2026-7117
CVE-2026-7118
CVE-2026-7126
CVE-2026-7127
CVE-2026-7128
CVE-2026-7129
CVE-2026-7130
CVE-2026-7131
CVE-2026-7132
CVE-2026-7133
La explotación de estas vulnerabilidades permitiría a un atacante remoto comprometer la confidencialidad de la información almacenada en las aplicaciones afectadas mediante la extracción de bases de datos, credenciales o información sensible. Asimismo, podría comprometer la integridad del sistema al modificar registros, alterar configuraciones o cargar archivos maliciosos en el servidor. En escenarios más críticos, un atacante podría lograr la ejecución de código remoto, lo que permitiría tomar control del servidor afectado, establecer persistencia o desplegar malware. Dependiendo del tipo de explotación, también podría impactarse la disponibilidad de los servicios, provocando interrupciones del sistema o manipulación del funcionamiento normal de la aplicación.
 
Versiones Afectadas:
Las vulnerabilidades se identificaron en distintas aplicaciones web desarrolladas en PHP, entre ellas:
Typecho hasta la versión 1.3.0. 
Online Job Portal versión 1.0. 
GreenCMS hasta la versión 2.3. 
Employee Management System versión 1.0. 
Canteen Management System versión 1.0. 
Construction Management System versión 1.0. 
Courier Management System versión 1.0. 
LikeAdmin PHP hasta la versión 1.9.6. 
Pharmacy Sales and Inventory System versión 1.0. 
Home Service System versión 1.0. 
Chat System versión 1.0. 
Online Lot Reservation System hasta la versión 1.0.

Remediación:
Se recomienda actualizar las aplicaciones afectadas a las versiones más recientes proporcionadas por los desarrolladores o aplicar los parches de seguridad publicados por los respectivos proyectos. En caso de que no existan versiones corregidas disponibles, se recomienda revisar los repositorios oficiales del software o aplicar correcciones de código que validen adecuadamente los parámetros de entrada, restrinjan la carga de archivos y fortalezcan los controles de acceso. Las actualizaciones normalmente se distribuyen a través de repositorios oficiales del proyecto, gestores de paquetes o actualizaciones manuales del código fuente.
 
Plugins en WordPress.
Por este medio se informa sobre múltiples vulnerabilidades identificadas en plugins utilizados en entornos WordPress, incluyendo componentes asociados con Elementor y herramientas de inteligencia artificial. Estas vulnerabilidades comprenden fallas de escalación de privilegios, ejecución de código JavaScript mediante Cross-Site Scripting (XSS), exposición y acceso no autorizado a claves API, carga de archivos maliciosos y validaciones insuficientes en el manejo de archivos dentro de plugins de generación de contenido y asistentes basados en inteligencia artificial. Un atacante podría explotar estas debilidades para obtener privilegios administrativos, ejecutar código en el navegador de usuarios o administradores, acceder a información sensible como claves API, o cargar archivos arbitrarios en el servidor. En particular, en el plugin S2B AI Assistant, una validación insuficiente del tipo de archivo dentro de la función encargada de almacenar archivos permitiría a un usuario autenticado con privilegios elevados cargar archivos maliciosos que podrían ejecutarse en el servidor comprometido. Los identificadores son:
CVE-2026-7106
CVE-2026-42410
CVE-2026-1336
CVE-2025-13381
CVE-2025-62039
CVE-2025-12973
La explotación de estas vulnerabilidades permitiría a un atacante comprometer distintos aspectos de seguridad del sistema. En términos de confidencialidad, un atacante podría obtener acceso a claves API utilizadas para integraciones con servicios externos, incluyendo servicios de inteligencia artificial, así como información sensible almacenada en el sitio web o en el servidor. En cuanto a la integridad, las fallas de escalación de privilegios, ejecución de scripts maliciosos y carga de archivos arbitrarios podrían permitir la modificación del contenido del sitio, la instalación de código malicioso o la alteración de configuraciones administrativas. Finalmente, respecto a la disponibilidad, un atacante con privilegios elevados o con capacidad de ejecución de código podría interrumpir servicios, eliminar información crítica o comprometer completamente el servidor web, afectando la continuidad operativa del portal institucional.
 
Versiones Afectadas:
Highland Software Custom Role Manager (WordPress)
Versiones afectadas: hasta la versión 1.0.0
TheGem Theme Elements for Elementor
Versiones afectadas: versiones anteriores a 5.12.1.1
AI ChatBot with ChatGPT and Content Generator by AYS
Vulnerabilidad de acceso no autorizado a API key: versiones hasta 2.7.5
Vulnerabilidad de subida de archivos maliciosos: versiones hasta 2.7.0
Vulnerabilidad de exposición de API key: versiones hasta 2.6.6
S2B AI Assistant – ChatBot, ChatGPT, OpenAI, Content & Image Generator
Versiones afectadas: 1.7.8 y anteriores

Python – Gestor de paquetes pip.
Por este medio se informa sobre una vulnerabilidad identificada en el gestor de paquetes pip del ecosistema Python, registrada como CVE-2026-6357. Esta vulnerabilidad se origina en el proceso de verificación de autoactualización que se ejecutaba después de la instalación de paquetes tipo wheel. Debido a que el proceso implicaba la importación de módulos con nombres conocidos, un atacante podría aprovechar la instalación de paquetes manipulados para sobrescribir módulos utilizados por pip. Bajo ciertas condiciones, la explotación de esta debilidad permitiría ejecutar código arbitrario durante la operación de instalación de paquetes, comprometiendo el entorno donde se ejecuta Python.
 Los identificadores son:
CVE-2026-6357

Versiones Afectadas:
pip versiones anteriores a 26.1.

Langflow, LangChain y LangGraph.
Por este medio se informa sobre múltiples vulnerabilidades identificadas en los frameworks Langflow, LangChain y LangGraph, ampliamente utilizados para el desarrollo de aplicaciones basadas en modelos de lenguaje y automatización de flujos de IA. Estas vulnerabilidades incluyen fallas de ejecución remota de código, bypass de autenticación, traversal de rutas, deserialización insegura e inyección SQL. Un atacante podría explotar estas debilidades mediante solicitudes HTTP manipuladas, cargas de datos especialmente diseñadas o configuraciones maliciosas dentro de flujos o agentes, lo que permitiría ejecutar código arbitrario en el servidor, acceder a archivos del sistema, manipular consultas a bases de datos o evadir controles de autenticación en los sistemas afectados. Los identificadores son:
CVE-2026-33017
CVE-2026-27966 
CVE-2026-21445 
CVE-2026-34070 
CVE-2025-68664 
CVE-2025-67644 

Versiones Afectadas:
Langflow: Versiones anteriores a 1.9.0 afectadas por CVE-2026-33017.
LangChain: Versiones anteriores a 1.2.22 afectadas por CVE-2026-34070.
LangGraph: Versiones 3.0.0 y anteriores de langgraph-checkpoint-sqlite afectadas por CVE-2025-67644.

Microsoft Windows.
Por este medio se informa sobre múltiples vulnerabilidades identificadas en diversos servicios y plataformas tecnológicas de Microsoft y en el navegador Google Chrome. Estas vulnerabilidades se originan principalmente por controles de acceso inadecuados, manejo inseguro de solicitudes del servidor, deserialización de datos no confiables, mecanismos de protección insuficientes y redirecciones no validadas. Un atacante podría aprovechar estas debilidades mediante el envío de solicitudes especialmente manipuladas o mediante la interacción con recursos maliciosos para ejecutar código arbitrario, elevar privilegios, realizar ataques de tipo Server-Side Request Forgery (SSRF), suplantar identidad (spoofing) o redirigir a usuarios hacia sitios no confiables, comprometiendo los sistemas o servicios donde se encuentren implementadas estas tecnologías. Los identificadores son:
CVE-2026-21515
CVE-2026-24303
CVE-2026-26150
CVE-2026-32172
CVE-2026-32202
CVE-2026-32210
CVE-2026-33102
CVE-2026-33819
CVE-2026-35431
CVE-2026-6919
CVE-2026-6921

Versiones Afectadas:
Azure IoT Central: versiones del servicio previas a la corrección.
Windows Shell: versiones de Windows que incluyen el componente vulnerable.
Google Chrome: versiones anteriores a 147.0.7727.117.

PackageKit en sistemas Linux.
Por este medio se informa sobre una vulnerabilidad identificada en PackageKit, registrada como CVE-2026-41651. Esta vulnerabilidad se origina debido a una condición de carrera del tipo Time-of-check Time-of-use (TOCTOU) en la gestión de banderas de transacción dentro del servicio. Un atacante con acceso local al sistema podría explotar esta debilidad para manipular el proceso de instalación de paquetes y lograr la ejecución de acciones con privilegios elevados, lo que permitiría instalar paquetes arbitrarios como usuario root sin autenticación adecuada. Los identificadores son:
CVE-2026-41651

Versiones Afectadas:
PackageKit versiones desde 1.0.2 hasta 1.3.4.

Para cualquier duda o información adicional, quedamos atentos a través de este mismo medio.
AGENCIA DE TRANSFORMACIÓN DIGITAL Y TELECOMUNICACIONES
Dirección General de Ciberseguridad`;

    // ---------------------------------------------------------
    // FASE 1: EXTRAER EL ÍNDICE (Solo leemos los primeros 3000 caracteres)
    // ---------------------------------------------------------
    console.log("📧 1. FASE 1: Extrayendo el índice de sistemas...");
    const datosIndice = await analizarCorreoConChatGPT(correoPrueba.substring(0, 3000), "indice");
    const sistemasMaestros = datosIndice?.sistemas || [];
    console.log(`📋 Sistemas identificados en el índice (${sistemasMaestros.length}):`, sistemasMaestros);

    if (sistemasMaestros.length === 0) {
        return console.log("❌ No se encontraron sistemas en el índice. Abortando.");
    }

    // ---------------------------------------------------------
    // FASE 2: CHUNKING Y APLICAR "CADENERO" ESTRICTO
    // ---------------------------------------------------------
    console.log("\n🤖 2. FASE 2: Extrayendo detalles técnicos por bloques...");
    let mapaAlertasFinales = new Map();
    const tamanoChunk = 10000; // Pedazos de 10k para no reventar a Groq

    for (let i = 0; i < correoPrueba.length; i += tamanoChunk) {
        let fragmento = correoPrueba.substring(i, i + tamanoChunk);
        console.log(`⏳ Procesando bloque ${Math.floor(i / tamanoChunk) + 1} de ${Math.ceil(correoPrueba.length / tamanoChunk)}...`);

        let respuestaIA = await analizarCorreoConChatGPT(fragmento, "detalle", sistemasMaestros.join(" | "));

        if (respuestaIA && respuestaIA.alertas) {
            respuestaIA.alertas.forEach(alerta => {
                const categoria = alerta.categoria_maestra;
                
                // 🛡️ EL CADENERO: Solo pasan los que están en la lista del índice
                if (categoria && sistemasMaestros.includes(categoria)) {
                    if (mapaAlertasFinales.has(categoria)) {
                        // 🔄 Fusión de CVEs si ya existía
                        let existente = mapaAlertasFinales.get(categoria);
                        if (alerta.cves && alerta.cves !== "Ninguno") {
                            existente.cves = (existente.cves === "Ninguno") ? alerta.cves : existente.cves + ", " + alerta.cves;
                        }
                        // Actualizamos las descripciones solo si el nuevo bloque trae más texto
                        if (alerta.descripcion_tecnica && alerta.descripcion_tecnica.length > 20) {
                            existente.descripcion_tecnica = alerta.descripcion_tecnica;
                            existente.causa_raiz = alerta.causa_raiz;
                            existente.impacto_generado = alerta.impacto_generado;
                        }
                        mapaAlertasFinales.set(categoria, existente);
                    } else {
                        // 🆕 Es la primera vez que vemos esta categoría maestra
                        mapaAlertasFinales.set(categoria, alerta);
                    }
                }
            });
        }

        // ⏱️ Enfriamiento (Excepto en el último bloque)
        if (i + tamanoChunk < correoPrueba.length) {
            console.log("⏱️ Reseteando tokens de Groq (65 segundos)...");
            await new Promise(r => setTimeout(r, 65000));
        }
    }

    const listaFinal = Array.from(mapaAlertasFinales.values());

    // ---------------------------------------------------------
    // IMPRESIÓN DE RESULTADOS FINALES
    // ---------------------------------------------------------
    console.log(`\n🛡️ 3. [DATOS FILTRADOS]: El sistema generará EXACTAMENTE ${listaFinal.length} folios.\n`);
    
    listaFinal.forEach((analisisIA, index) => {
        console.log(`--- ALERTA ${index + 1} ---`);
        const tipoFinal = analisisIA.tipo || "Vulnerabilidad";
        const activoFinal = analisisIA.activo || "Aplicación";
        const areaFinal = analisisIA.area_asignada || "SOC (Ciberseguridad)";
        const severidadFinal = analisisIA.severidad || "Media";

        const especifiqueFinal = analisisIA.especifique || "No especificado";
        const sistemaFinal = analisisIA.categoria_maestra || "Desconocido"; // Mandatorio
        const descFinal = analisisIA.descripcion_tecnica || "Sin descripción.";
        const causaFinal = analisisIA.causa_raiz || "Pendiente.";
        const impactoFinal = analisisIA.impacto_generado || "Requiere evaluación.";
        const cvesFinal = analisisIA.cves || "Ninguno";

        console.log(`   - Sistema Maestro:     ${sistemaFinal}`);
        console.log(`   - Marca/Especifique:   ${especifiqueFinal}`);
        console.log(`   - Lista de CVEs:       ${cvesFinal.substring(0, 80)}...`);
        console.log(`   - Área Asignada:       ${areaFinal}`);
        console.log(`   - Severidad:           ${severidadFinal}`);
        console.log(`   - Descripción:         ${descFinal.substring(0, 90)}...`);
        console.log(`   - Causa Raíz:          ${causaFinal.substring(0, 90)}...`);
        console.log(`   - Impacto:             ${impactoFinal.substring(0, 90)}...\n`);
    });

    console.log("=======================================================\n");
}

simularAlertaReal();

*/

// 6. Encendemos el motor de escucha en cuanto arranca el servidor Node
iniciarEscuchaCorreos();

// --- FIN SERVIDOR ---

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor disponible en http://${HOST}:${PORT}`);
});
