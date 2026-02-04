
// ========================== Configuración e inicialización del servidor. ==========================

// ==========================
// 1. Dependencias
// ==========================
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');
const session = require('express-session');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { enviarRecordatorio } = require('./js/vulnerabilidades_mailer');
const { enviarReporteGemini } = require('./js/analytics_mailer'); 

// ==========================
// 2. Configuración general
// ==========================
const app = express();
const HOST = '0.0.0.0';
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'mi-clave-secreta-muy-segura',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true si usas HTTPS
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
  host: '127.0.0.1',
  user: 'axel',
  password: 'Firus021628',
  database: 'Gestion_Acervos',
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
    user: 'axelcerecedo117@gmail.com',
    pass: 'chmd dxpn plnt bxzk' // ⚠️ mejor usar variables de entorno
  }
});

// ==========================
// 7. Repositorios Wordpress
// ==========================
const repositoriosWordpress = [
  {
    url: 'http://172.17.175.137/cultura',
    user: 'AxelCere',
    password: 'qnjr CZsm hd2W aDdn PTvQ 4J5F',
    tainacanApiUrl: "http://172.17.175.137/cultura/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositorio.ci.cultura.gob.mx/',
    user: 'git-mexicana',
    password: 'nmeV lFh4 0d6B Jw9E 7rQ9 1EkC',
    tainacanApiUrl: "https://repositorio.ci.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://cid-albertobeltran.cultura.gob.mx/',
    user: 'git-mexicana',
    password: 'VNHn ryuk eLq0 G4L1 CDg9 oGO1',
    tainacanApiUrl: "https://cid-albertobeltran.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositoriofic.festivalcervantino.gob.mx/',
    user: 'git-mexicana',
    password: 'b5sh xWO3 XnLO ZvjW J9fw Qt8C',
    tainacanApiUrl: "https://repositoriofic.festivalcervantino.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://sitiosymonumentos.cultura.gob.mx/',
    user: 'git-mexicana',
    password: 'D9Cp Gd05 PLGK 34yB aEfQ 9rG5',
    tainacanApiUrl: "https://sitiosymonumentos.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositoriomultimedia.cultura.gob.mx/',
    user: 'axel-jcf',
    password: 'ldDs j8js 8RZX wagF RoDx fPb6',
    tainacanApiUrl: "https://repositoriomultimedia.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://patrimonioferrocarrilero.cultura.gob.mx/',
    user: 'git-mexicana',
    password: 'Rcj9 QVrp bD2A jnch NbkH 2YM0',
    tainacanApiUrl: "https://patrimonioferrocarrilero.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://original.cultura.gob.mx/',
    user: 'Axel',
    password: 'ucjS iFHH YmG7 fjm8 96tq riYt',
    tainacanApiUrl: "https://original.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://repositorio-inehrm.cultura.gob.mx/',
    user: 'axel-ss',
    password: 'qIvP hiip djYe R03d yyX5 qX66',
    tainacanApiUrl: "https://repositorio-inehrm.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://mncp.cultura.gob.mx/',
    user: 'git-mexicana',
    password: '7qEM jba4 OqZs boOi 0Sqb R6OP',
    tainacanApiUrl: "https://mncp.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://bibliotecamexico-monsiteca.cultura.gob.mx/',
    user: 'git-mexicana',
    password: 'VSQ4 QmfJ JqZF XYzA IOAP avC3',
    tainacanApiUrl: "https://bibliotecamexico-monsiteca.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://catalogoradioeducacion.cultura.gob.mx/',
    user: 'axel-ss',
    password: 'r4c8 5HoS ETma 5lns caiW SjtG',
    tainacanApiUrl: "https://catalogoradioeducacion.cultura.gob.mx/wp-json/tainacan/v2",
  },
  {
    url: 'https://bibliotecamexico-fondoreservado.cultura.gob.mx/',
    user: 'git-mexicana',
    password: 'B9K3 sPlO Mwv8 Zebk e0Ck yaNa',
    tainacanApiUrl: "https://bibliotecamexico-fondoreservado.cultura.gob.mx/wp-json/tainacan/v2",
  },
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

// ------------------------------------------------------ RUTAS --------------------------------------------------- //


// LOGIN básico (texto plano)
app.post('/api/login', (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) return res.status(400).json({ error: "Correo y contraseña son requeridos" });

  db.query(
    `SELECT id, nombre, correo_electronico, rol, activo, password FROM usuarios WHERE correo_electronico = ?`,
    [correo],
    (err, results) => {
      if (err) {
        console.error("❌ Error en login:", err);
        return res.status(500).json({ error: "Error en el servidor" });
      }
      if (results.length === 0) return res.status(401).json({ error: "Correo no encontrado" });

      const usuario = results[0];
      if (usuario.password !== password) return res.status(401).json({ error: "Contraseña incorrecta" });
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
app.post('/confirmar-reset', (req, res) => {
  const { token, nuevaContrasena } = req.body;

  db.query('SELECT * FROM usuarios WHERE token_reset = ?', [token], (err, results) => {
    if (err) {
      console.error("❌ Error en confirmar reset:", err);
      return res.status(500).json({ message: 'Error al actualizar contraseña' });
    }
    if (results.length === 0) return res.status(400).json({ message: 'Token inválido o expirado' });

    db.query('UPDATE usuarios SET password = ?, token_reset = NULL WHERE token_reset = ?', [nuevaContrasena, token], (errUpdate) => {
      if (errUpdate) {
        console.error("❌ Error actualizando contraseña:", errUpdate);
        return res.status(500).json({ message: 'Error al actualizar contraseña' });
      }
      res.json({ message: 'Contraseña actualizada correctamente' });
    });
  });
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
    // Se ha añadido 'full_path_disclosure' para que coincida con la lógica del frontend.
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
                    severity: 'medium' // o ajustar según el tipo
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

    // Se retorna también el resultadoWPScan para que la lógica de la API pueda extraer la versión de WordPress.
    return {
        resumen: resumenGeneral,
        vulnerabilidades: vulnerabilidadesEncontradas,
        raw_json: resultadoWPScan // Se devuelve el objeto completo para poder acceder a la versión
    };
}


/**
 * 🚀 Ejecuta WPScan usando la ruta absoluta de Docker para compatibilidad con PM2.
 */
function analizarSitioConWPScan(url, callback) {
    // Token por defecto o variable de entorno
    const wpscanApiToken = process.env.WPSCAN_API_TOKEN || 'OTcA2GYXlNNLDgPb7bWaLC60isowA38y6InAVLZTc1Q';

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
            // A veces WPScan devuelve algo de texto antes del JSON, intentamos limpiarlo si falla
            // (Opcional: lógica de limpieza si sigue fallando)
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
            const rawJsonString = JSON.stringify(resultadoWPScan); // El JSON completo

            // AHORA SÍ DECLARAMOS 'insertQuery', 'detallesJson' AQUÍ, DENTRO DEL CALLBACK
            const insertQuery = 'INSERT INTO escaneos_vulnerabilidad (repositorio_id, nivel, fecha_escaneo, detalles, resumen, raw_json) VALUES (?, ?, NOW(), ?, ?, ?)';
            const detallesJson = JSON.stringify(vulnerabilidades);

            db.query(insertQuery, [id, nivel, detallesJson, resumen, rawJsonString], (errInsert) => {
                if (errInsert) {
                    console.error('Error al guardar escaneo en BD:', errInsert);
                    return res.status(500).json({ success: false, msg: 'Error guardando el resultado.' });
                }

                // Actualizar el nivel y resumen en la tabla principal `registros`
                const updateQuery = 'UPDATE registros SET nivel_vulnerabilidad = ?, resumen_vulnerabilidades = ? WHERE id = ?';
                // Añadimos la versión de WordPress al resumen principal para que la tarjeta del frontend pueda mostrarla.
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

    // 1. Busca el repositorio en la base de datos para obtener su URL
    db.query('SELECT id, direccion FROM registros WHERE id = ?', [id], async (err, repos) => {
        if (err || repos.length === 0) {
            return res.status(err ? 500 : 404).json({ success: false, msg: err ? 'Error de base de datos.' : 'Repositorio no encontrado.' });
        }

        const url_base = repos[0].direccion;

        // 2. Busca las credenciales de aplicación en el array
        const normalize = s => s.replace(/\/$/, '');
        const credenciales = repositoriosWordpress.find(r => normalize(r.url) === normalize(url_base));


        if (!credenciales) {
            return res.status(404).json({ success: false, msg: 'No se encontraron credenciales de aplicación para este repositorio.' });
        }
        
        const authHeader = `Basic ${Buffer.from(`${credenciales.user}:${credenciales.password}`).toString('base64')}`;
        const apiURL = `${url_base}/wp-json/wp/v2/plugins?per_page=100`;

        try {
            // 3. Consulta la API REST de WordPress para obtener la lista de plugins
            const response = await axios.get(apiURL, {
                headers: { 'Authorization': authHeader }
            });

            // 4. Procesa y formatea la respuesta
            const pluginsList = response.data.map(plugin => {
                return {
                    id: plugin.id,
                    nombre: plugin.name,
                    status: plugin.status,
                    version: plugin.version,
                    autor: plugin.author_name,
                    url: plugin.plugin_uri,
                    // La API de WP no tiene "vencimiento", así que usamos la fecha de última modificación
                    ultima_actualizacion: plugin.modified_gmt ? new Date(plugin.modified_gmt).toLocaleDateString() : 'N/A'
                };
            });

            res.json(pluginsList);
        } catch (error) {
            console.error(`❌ Error al obtener plugins de ${url_base}:`, error.message);
            res.status(500).json({ success: false, msg: 'Error al conectar con la API de WordPress.' });
        }
    });
});


// --- USUARIOS --- //

// Nueva ruta que procesa todos los repositorios
app.get('/api/wordpress/users', async (req, res) => {
  try {
    const promises = repositoriosWordpress.map(repo => {
      // Por cada repositorio, construimos la URL y el header de autenticación
      const authHeader = `Basic ${Buffer.from(`${repo.user}:${repo.password}`).toString('base64')}`;
      const apiURL = `${repo.url}/wp-json/wp/v2/users?per_page=100&context=edit`;
      
      return axios.get(apiURL, {
        headers: {
          'Authorization': authHeader,
        }
      })
      .then(response => {
        return response.data.map(user => ({
          id: user.id,
          nombre: user.name,
          correo_electronico: user.email,
          rol: user.roles && Array.isArray(user.roles) ? user.roles.join(', ') : 'No especificado',
          foto_perfil: user.avatar_urls['96'],
          activo: true,
          repositorios: [{ nombre: repo.url, rol_en_repositorio: user.roles[0] }], // Mapea los repositorios directamente aquí
          user_url: user.link 
        }));
      })
      .catch(error => {
        console.error(`❌ Error al obtener usuarios de ${repo.url}:`, error.message);
        return []; // Retorna un array vacío para no detener el proceso
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

// Crear usuario
app.post('/api/usuarios', upload.single('foto_perfil'), (req, res) => {
  const { nombre, correo, password, rol, activo } = req.body;
  const foto_perfil = req.file ? `Imagenes/Perfiles/${req.file.filename}` : null;

  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ error: 'Faltan datos para crear usuario' });
  }

  const activoBool = activo === 'true' || activo === true ? 1 : 0;

  db.query(
    'INSERT INTO usuarios (nombre, correo_electronico, password, rol, activo, foto_perfil) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, correo, password, rol, activoBool, foto_perfil],
    (err, result) => {
      if (err) {
        console.error('❌ Error creando usuario:', err);
        return res.status(500).json({ error: 'Error al crear usuario' });
      }
      res.json({ message: 'Usuario creado correctamente', id: result.insertId });
    }
  );
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

// Resetear contraseña usuario (genera temporal y manda correo)
app.post('/api/usuarios/:id/reset-password', (req, res) => {
  const id = req.params.id;
  const tempPass = uuidv4().slice(0, 8);

  db.query('SELECT correo_electronico FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const email = results[0].correo_electronico;

    db.query('UPDATE usuarios SET password = ? WHERE id = ?', [tempPass, id], (errUpdate) => {
      if (errUpdate) {
        return res.status(500).json({ error: 'Error actualizando contraseña' });
      }

      const mailOptions = {
        from: 'axelcerecedo117@gmail.com',
        to: email,
        subject: 'Contraseña temporal',
        html: `<p>Tu nueva contraseña temporal es: <strong>${tempPass}</strong></p><p>Por favor cámbiala al ingresar.</p>`
      };

      transporter.sendMail(mailOptions, (errMail) => {
        if (errMail) {
          console.error('❌ Error enviando correo reset:', errMail);
          return res.status(500).json({ error: 'Error enviando correo' });
        }
        res.json({ message: 'Contraseña reseteada y enviada por correo' });
      });
    });
  });
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
// Cambiar contraseña desde Mi Perfil
app.put('/api/usuarios/:id/cambiar-password', (req, res) => {
  const usuarioId = req.params.id;
  const { nuevaPassword } = req.body;

  if (!nuevaPassword) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  if (nuevaPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  db.query(
    'UPDATE usuarios SET password = ? WHERE id = ?',
    [nuevaPassword, usuarioId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error actualizando contraseña' });
      }
      res.json({ message: 'Contraseña actualizada correctamente' });
    }
  );
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
            // ... (consulta SQL para asociar usuarios al recordatorio) ...

            // 💡 CAMBIO CLAVE AQUÍ: Obtenemos el nombre Y el correo de los usuarios
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
                            
                            // 💡 CAMBIO CLAVE AQUÍ: Iteramos sobre cada usuario y enviamos un correo individual
                            users.forEach(user => {
                                enviarRecordatorio(user, { // Pasamos el objeto de usuario completo
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

    // Validación simple para asegurar que el valor `completado` es booleano
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
            // 🔥 CORRECCIÓN: Usando los parámetros de fecha
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
            // 🔥 CORRECCIÓN: Usando los parámetros de fecha
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
            // 🔥 CORRECCIÓN: Usando los parámetros de fecha
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
            // 🔥 CORRECCIÓN: Usando los parámetros de fecha
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
            // 🔥 CORRECCIÓN: Usando los parámetros de fecha
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
            // 🔥 CORRECCIÓN: Usando los parámetros de fecha
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
            // 🔥 CORRECCIÓN: Usando los parámetros de fecha
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
                // JSON.parse es crucial para pasar el string de la DB a objeto
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
            // Reutilizamos la lógica del endpoint principal para obtener todos los datos
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
    const { startDate = '30daysAgo', endDate = 'today', rangeOption } = req.query; // Añadido rangeOption
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
        // Continuamos si el caché de DB falla
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
        const MAX_EMPTY = 10;   // parar después de 10 IDs seguidos inexistentes
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
        // status=trash: Filtra por ítems borrados.
        // perpage=1: Solo necesitamos 1 para forzar la respuesta del X-WP-Total.
        const tainacanUrl = `${safeRepoUrl}items?perpage=1&status=trash`;

        console.log(`Fetching Tainacan URL (Deleted Items Count con auth): ${tainacanUrl}`);

        // 3. 🚀 Realizar fetch con los headers de autenticación
        const response = await fetch(tainacanUrl, {
            headers: {
                ...authHeaders,
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);

        // 4. 🔢 Extraer el conteo total del header X-WP-Total (propio de WordPress REST API)
        const totalItems = parseInt(response.headers.get('X-WP-Total')) || 0;

        console.log(`🗑️ Total items eliminados (con auth): ${totalItems}`);

        res.json({ count: totalItems });
    } catch (error) {
        console.error('❌ Error fetching deleted items count con auth:', error);
        res.status(500).json({ error: error.message });
    }
});


// --- FIN SERVIDOR ---

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor disponible en http://${HOST}:${PORT}`);
});
