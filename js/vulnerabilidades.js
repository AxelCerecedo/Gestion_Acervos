//==============================================================
//                       1. VARIABLES GLOBALES
//==============================================================

// Modales y Contenedores Principales
let cardsContainer;
let historialBody;
let historialModal;
let genericModal;

// Elementos del Filtro de Nivel
let menuFiltroNivel;
let filtroNivelActualSpan;
let historialActual = [];

// Elementos del Modal de Recordatorios (Unificado)
let recordatorioModal;
let formRecordatorio;
let inputRepositorioId;
let recordatorioRepoNombreSpan;
let historialRecordatoriosBody;
let recordatorioEnviarCorreo;
let usuariosContainer;
let listaUsuarios;

//==============================================================
//                 2. FUNCIONES DE LÓGICA Y VISTAS
//==============================================================

/**
 * Carga y muestra el historial de escaneos para un repositorio específico.
 * @param {number} id - El ID del repositorio.
 * @param {string} nombre - El nombre del repositorio.
 */
async function verHistorial(id, nombre) {
    historialBody.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div> Cargando historial...</td></tr>`;
    document.getElementById('historialModalLabel').textContent = `Historial de ${nombre}`;
    historialModal.show();

    try {
        const res = await fetch(`http://172.17.175.137:3000/api/escaneos/${id}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        historialBody.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            historialBody.innerHTML = `<tr><td colspan="5" class="text-center">Sin datos de escaneos para este repositorio.</td></tr>`;
        } else {
            historialActual = data;
            data.forEach((row, i) => {
                const tieneRawJson = row.raw_json && row.raw_json.trim() !== ''; 
                const analisisCompletoBtn = tieneRawJson ? `<button class="btn btn-dark btn-sm" onclick="mostrarAnalisisCompleto(${i})">Ver análisis completo</button>` : '';
                
                historialBody.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td><span class="badge ${obtenerColorClase(row.nivel)}">${row.nivel}</span></td>
                        <td>${new Date(row.fecha).toLocaleString()}</td>
                        <td>${analisisCompletoBtn || 'Sin acciones'}</td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error("Error al cargar historial:", err);
        historialBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error al cargar el historial: ${err.message}.</td></tr>`;
    }
}

/**
 * Abre el modal de recordatorios y carga el historial.
 * @param {number} repositorioId - El ID del repositorio.
 * @param {string} nombre - El nombre del repositorio.
 */
function abrirModalRecordatorio(repositorioId, nombre) {
    document.getElementById('recordatorioRepositorioId').value = repositorioId;
    recordatorioRepoNombreSpan.textContent = nombre;
    verHistorialRecordatorios(repositorioId, nombre);
    recordatorioModal.show();
}


/**
 * Carga el historial de recordatorios para un repositorio específico.
 * @param {number} id - El ID del repositorio.
 * @param {string} nombre - El nombre del repositorio.
 */
async function verHistorialRecordatorios(id, nombre) {
    historialRecordatoriosBody.innerHTML = `<tr><td colspan="4" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div> Cargando historial...</td></tr>`;

    try {
        const res = await fetch(`http://172.17.175.137:3000/api/recordatorios/historial/${id}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        historialRecordatoriosBody.innerHTML = '';
        
        if (!Array.isArray(data) || data.length === 0) {
            historialRecordatoriosBody.innerHTML = `<tr><td colspan="4" class="text-center">No hay recordatorios para este repositorio.</td></tr>`;
        } else {
            data.forEach(recordatorio => {
                const estado = recordatorio.completado ? 
                    '<span class="badge bg-success">Completado</span>' : 
                    '<span class="badge bg-warning">Pendiente</span>';
                const botonCompletar = recordatorio.completado ? 
                    '' : 
                    `<button class="btn btn-sm btn-success" onclick="completarRecordatorio(${recordatorio.id}, ${id}, '${nombre}')">Marcar como completado</button>`;
                
                // Procesar los participantes
                const participantes = recordatorio.participantes_nombres ? 
                    recordatorio.participantes_nombres.split(',').map(nombre => `<span class="badge bg-secondary me-1">${nombre}</span>`).join('') :
                    'N/A';

                historialRecordatoriosBody.innerHTML += `
                    <tr>
                        <td>
                            <strong>Tipo:</strong> ${recordatorio.tipo}<br>
                            <strong>Mensaje:</strong> ${recordatorio.mensaje}<br>
                            <strong>Creado por:</strong> ${recordatorio.nombre_creador || 'N/A'}<br>
                            <strong>Participantes:</strong> ${participantes}
                        </td>
                        <td>${new Date(recordatorio.fecha_programada).toLocaleDateString()}</td>
                        <td>${estado}</td>
                        <td>${botonCompletar}</td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error("Error al cargar historial de recordatorios:", err);
        historialRecordatoriosBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error al cargar el historial.</td></tr>`;
    }
}



/**
 * Muestra el análisis completo de un escaneo en el modal genérico.
 * @param {number} index - El índice del escaneo en el array 'historialActual'.
 */
function mostrarAnalisisCompleto(index) {
    const escaneo = historialActual[index];
    const contenido = generarExplicacionNivel(escaneo);
    
    document.getElementById('genericModalLabel').textContent = `Análisis Detallado - ${new Date(escaneo.fecha).toLocaleString()}`;
    document.getElementById('genericModalBody').innerHTML = contenido;
    
    genericModal.show();
}

/**
 * Filtra los repositorios mostrados por el nivel de vulnerabilidad seleccionado.
 * @param {string|null} nivelSeleccionado - El nivel por el cual filtrar.
 * @param {string} textoBoton - El texto a mostrar en el botón de filtro.
 */
function filtrarPorNivel(nivelSeleccionado, textoBoton) {
    fetch('http://172.17.175.137:3000/api/registros')
        .then(res => res.json())
        .then(data => {

            cardsContainer.innerHTML = '';
            
            const filtrados = nivelSeleccionado
                ? data.filter(repo => (repo.nivel_vulnerabilidad || 'Desconocido') === nivelSeleccionado)
                : data;

            if (filtrados.length === 0) {
                cardsContainer.innerHTML = '<p>No hay repositorios con ese nivel.</p>';
            } else {
                filtrados.forEach(repo => {
                    cardsContainer.innerHTML += crearTarjeta(repo);
                });
            }

            actualizarGraficaRepositorios(filtrados);

            filtroNivelActualSpan.textContent = textoBoton;
        });
}


/**
 * Marca un recordatorio como completado.
 * @param {number} recordatorioId - El ID del recordatorio.
 * @param {number} repositorioId - El ID del repositorio.
 * @param {string} nombreRepo - El nombre del repositorio para actualizar la vista.
 */
async function completarRecordatorio(recordatorioId, repositorioId, nombreRepo) {
    if (!confirm("¿Estás seguro de que deseas marcar este recordatorio como completado?")) return;
    try {
        const response = await fetch(`http://172.17.175.137:3000/api/recordatorios/${recordatorioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completado: true })
        });
        if (!response.ok) throw new Error('Error al actualizar el recordatorio');
        
        alert("✅ Recordatorio marcado como completado.");
        // Volver a cargar el historial de recordatorios para actualizar la vista
        verHistorialRecordatorios(repositorioId, nombreRepo); 
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Hubo un error al completar el recordatorio.');
    }
}


//==============================================================
//                 3. FUNCIONES INTERNAS (NO LLAMADAS DESDE HTML)
//==============================================================

/**
 * Carga todos los repositorios desde la API y los muestra en tarjetas.
 */
function cargarRepositorios() {
    fetch('http://172.17.175.137:3000/api/registros')
        .then(res => res.json())
        .then(data => {
            cardsContainer.innerHTML = '';
            let total = data.length;
            let contador = { Bajo: 0, Medio: 0, Alto: 0, Crítico: 0, Desconocido: 0, Error: 0 };
            
            data.forEach(repo => {
                const nivel = repo.nivel_vulnerabilidad || 'Desconocido';
                contador[nivel] = (contador[nivel] || 0) + 1;
                cardsContainer.innerHTML += crearTarjeta(repo);
            });

            // Generar las opciones del dropdown de filtro
            menuFiltroNivel.innerHTML = `
                <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); filtrarPorNivel(null, 'Todos')">Todos (${total})</a></li>
                <li><a class="dropdown-item text-success" href="#" onclick="event.preventDefault(); filtrarPorNivel('Bajo', 'Bajo')">Bajo (${contador.Bajo})</a></li>
                <li><a class="dropdown-item text-warning" href="#" onclick="event.preventDefault(); filtrarPorNivel('Medio', 'Medio')">Medio (${contador.Medio})</a></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="event.preventDefault(); filtrarPorNivel('Alto', 'Alto')">Alto (${contador.Alto})</a></li>
                <li><a class="dropdown-item text-dark" href="#" onclick="event.preventDefault(); filtrarPorNivel('Crítico', 'Crítico')">Crítico (${contador.Crítico})</a></li>
                <li><a class="dropdown-item text-info" href="#" onclick="event.preventDefault(); filtrarPorNivel('Error', 'Error')">Error (${contador.Error})</a></li>
                <li><a class="dropdown-item text-secondary" href="#" onclick="event.preventDefault(); filtrarPorNivel('Desconocido', 'Desconocido')">Desconocido (${contador.Desconocido})</a></li>
            `;
            filtroNivelActualSpan.textContent = 'Todos';
            actualizarGraficaRepositorios(data);
        })
        .catch(error => {
            console.error("Error cargando repositorios:", error);
            cardsContainer.innerHTML = '<p class="text-danger">Error al cargar los repositorios. Por favor, intente de nuevo más tarde.</p>';
        });
}

/**
 * Carga todos los usuarios del sistema para la notificación.
 */
async function cargarUsuarios() {
    listaUsuarios.innerHTML = `<div class="p-2">Cargando usuarios...</div>`;
    try {
        const res = await fetch('http://172.17.175.137:3000/api/usuarios'); 
        if (!res.ok) throw new Error('Error al cargar usuarios');
        
        const usuarios = await res.json();
        listaUsuarios.innerHTML = '';
        usuarios.forEach(user => {
            listaUsuarios.innerHTML += `
                <label class="list-group-item">
                    <input class="form-check-input me-1" type="checkbox" value="${user.id}">
                    ${user.nombre} (${user.correo_electronico})
                </label>
            `;
        });
    } catch (err) {
        console.error("Error al cargar usuarios:", err);
        listaUsuarios.innerHTML = `<div class="p-2 text-danger">Error al cargar la lista de usuarios.</div>`;
    }
}

/**
 * Crea el HTML para una tarjeta de repositorio con checkbox de selección.
 * @param {object} repo - El objeto de datos del repositorio.
 * @returns {string} El string HTML de la tarjeta.
 */
function crearTarjeta(repo) {
    const nivel = repo.nivel_vulnerabilidad || 'Desconocido';
    const colorClase = obtenerColorClase(nivel);
    
    let versionWP = 'N/A';
    let versionPHP = 'N/A';
    let versionMDB = 'N/A';

    try {
        const resumen = repo.resumen_vulnerabilidades ? JSON.parse(repo.resumen_vulnerabilidades) : {};
        versionWP = resumen.version_cms || 'N/A';
        versionPHP = resumen.version_php || repo.version_php || 'N/A';
        versionMDB = resumen.version_mdb || repo.version_mdb || 'N/A';
    } catch (e) {
        console.error(`Error al parsear el resumen para el repo ID ${repo.id}:`, e);
        versionPHP = repo.version_php || 'N/A';
        versionMDB = repo.version_mdb || 'N/A';
    }
    
    const estado = repo.estado || 'Desconocido';
    const vencimiento = repo.vencimiento ? new Date(repo.vencimiento).toLocaleDateString() : 'N/A';
    const resumenCompleto = repo.resumen_vulnerabilidades ? JSON.parse(repo.resumen_vulnerabilidades) : {};
    const analisisCompleto = resumenCompleto.raw_json ? JSON.parse(resumenCompleto.raw_json) : {};
    const pluginsDesactualizados = Object.values(analisisCompleto.plugins || {}).filter(p => p.outdated);
    const pluginsVulnerables = Object.values(analisisCompleto.plugins || {}).filter(p => p.vulnerabilities?.length > 0);
    const temaDesactualizado = analisisCompleto.main_theme?.outdated;
    const hallazgosInteresantes = analisisCompleto.interesting_findings || [];
    
    let problemasHTML = '';
    if (pluginsVulnerables.length > 0 || pluginsDesactualizados.length > 0 || temaDesactualizado) {
        problemasHTML += `<h6 class="mt-3">⚠️ Problemas Detectados:</h6><ul class="list-unstyled ps-3">`;
        if (temaDesactualizado) problemasHTML += `<li>- Tema: <strong>${analisisCompleto.main_theme.slug}</strong> desactualizado.</li>`;
        pluginsVulnerables.forEach(p => problemasHTML += `<li>- Plugin: <strong>${p.slug}</strong> tiene vulnerabilidades.</li>`);
        pluginsDesactualizados.forEach(p => {
            if (!pluginsVulnerables.some(pv => pv.slug === p.slug)) problemasHTML += `<li>- Plugin: <strong>${p.slug}</strong> desactualizado.</li>`;
        });
        problemasHTML += `</ul>`;
    }

    let hallazgosHTML = '';
    const hallazgosClave = ['xmlrpc', 'readme', 'wp_cron', 'directory_listing'];
    const hallazgosRelevantes = hallazgosInteresantes.filter(h => hallazgosClave.includes(h.type));
    if (hallazgosRelevantes.length > 0) {
        hallazgosHTML += `<h6 class="mt-3">🔎 Hallazgos de Configuración:</h6><ul class="list-unstyled ps-3">`;
        hallazgosRelevantes.forEach(h => {
            if (h.type === 'xmlrpc') hallazgosHTML += `<li>- XML-RPC habilitado.</li>`;
            else if (h.type === 'readme') hallazgosHTML += `<li>- Archivo <code>readme.html</code> expuesto.</li>`;
            else if (h.type === 'wp_cron') hallazgosHTML += `<li>- WP-Cron externo habilitado.</li>`;
            else if (h.type === 'directory_listing') hallazgosHTML += `<li>- Listado de directorios habilitado en <code>${h.url}</code>.</li>`;
        });
        hallazgosHTML += `</ul>`;
    }

    return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card border-0 shadow-sm tarjeta-vulnerabilidad position-relative">
        
        <div class="position-absolute top-0 end-0 m-2 bg-white rounded-circle shadow-sm d-flex justify-content-center align-items-center" 
             style="z-index: 10; width: 40px; height: 40px; border: 1px solid #ddd;">
            <input class="form-check-input repo-selector m-0" type="checkbox" value="${repo.id}" 
                   style="cursor: pointer; transform: scale(1.5);">
        </div>

        <span class="badge ${colorClase}">${nivel}</span>
        <div class="card-body">
          <h5 class="fw-semibold mb-2 me-4">${repo.nombre}</h5>
          <p><strong>🌐 URL:</strong><br><a href="${repo.direccion}" target="_blank" rel="noopener noreferrer">${repo.direccion}</a></p>
          <p class="mb-1"><strong>CMS:</strong> ${repo.aplicacion} v${versionWP}</p>
          <p class="mb-1"><strong>PHP:</strong> v${versionPHP}</p>
          <p class="mb-1"><strong>MariaDB:</strong> v${versionMDB}</p>
          <p class="mb-1"><strong>Estado:</strong> ${estado}</p>
          <p class="mb-1"><strong>Vencimiento SSL:</strong> ${vencimiento}</p>
          ${problemasHTML}
          ${hallazgosHTML}
          <div class="d-flex gap-2 mt-3">
              <button class="btn btn-outline-dark w-100" onclick="verHistorial(${repo.id}, '${repo.nombre}')">Ver detalles</button>
              <button class="btn btn-outline-primary w-100" onclick="abrirModalRecordatorio(${repo.id}, '${repo.nombre}')">Recordatorios</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Muestra un modal con el resumen de texto de un escaneo.
 * @param {number} index - El índice del escaneo en el array 'historialActual'.
 */
function mostrarResumenEscaneo(index) {
    const escaneo = historialActual[index];
    document.getElementById('genericModalLabel').textContent = `Resumen del Escaneo - ${new Date(escaneo.fecha).toLocaleString()}`;
    document.getElementById('genericModalBody').innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${escaneo.resumen_texto || 'No hay resumen disponible.'}</pre>`;
    genericModal.show();
}

/**
 * Muestra un modal con los detalles de vulnerabilidades de un escaneo.
 * @param {number} index - El índice del escaneo en el array 'historialActual'.
 */
function mostrarDetallesEscaneo(index) {
    const escaneo = historialActual[index];
    const detalles = JSON.parse(escaneo.detalles || '[]');
    let contenidoModal = '';

    if (detalles.length > 0) {
        contenidoModal = '<ul class="list-group">';
        detalles.forEach(vuln => {
            const references = vuln.references ? Object.entries(vuln.references).flat(2).filter(ref => typeof ref === 'string' && ref.startsWith('http')) : [];
            contenidoModal += `
                <li class="list-group-item">
                    <strong class="d-block">${vuln.title}</strong>
                    <span class="badge bg-secondary">${vuln.type}</span>
                    <p class="mb-1 mt-2"><strong>Solución:</strong> ${vuln.fixed_in ? `Actualizar a la versión ${vuln.fixed_in}` : 'Revisar manualmente o seguir referencias.'}</p>
                    ${references.length > 0 ? `
                        <p class="mb-0"><strong>Referencias:</strong></p>
                        <ul>${references.map(url => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></li>`).join('')}</ul>
                    ` : ''}
                </li>
            `;
        });
        contenidoModal += '</ul>';
    } else {
        contenidoModal = '<p>No se encontraron detalles de vulnerabilidades para este escaneo.</p>';
    }

    document.getElementById('genericModalLabel').textContent = `Detalles del Escaneo - ${new Date(escaneo.fecha).toLocaleString()}`;
    document.getElementById('genericModalBody').innerHTML = contenidoModal;
    genericModal.show();
}

/**
 * Devuelve la clase CSS correspondiente al nivel de vulnerabilidad.
 * @param {string} nivel - El nivel de riesgo ('Alto', 'Medio', 'Bajo', etc.).
 * @returns {string} La clase CSS para el color.
 */
function obtenerColorClase(nivel) {
    switch (nivel) {
        case 'Alto': return 'nivel-alto';
        case 'Medio': return 'nivel-medio';
        case 'Bajo': return 'nivel-bajo';
        case 'Crítico': return 'nivel-critico';
        case 'Error': return 'nivel-error';
        default: return 'nivel-desconocido';
    }
}


/**
 * Genera un resumen HTML explicando por qué se asignó un nivel de riesgo.
 * @param {object} scan - El objeto de escaneo completo de la base de datos.
 * @returns {string} - El contenido HTML con la explicación.
 */
function generarExplicacionNivel(scan) {
    if (!scan.raw_json) return '<p>No hay datos de análisis para generar una explicación.</p>';
    
    const resultado = JSON.parse(scan.raw_json);
    let explicacion = `<h4>Nivel Asignado: <span class="badge ${obtenerColorClase(scan.nivel)}">${scan.nivel}</span></h4><hr>`;
    
    const puntosPositivos = [];
    const puntosCriticos = [];
    const puntosMedios = [];
    const puntosInformativos = [];

    if (resultado.version?.status === 'latest') puntosPositivos.push(`✅ El núcleo de WordPress (v${resultado.version.number}) está actualizado.`);
    if (resultado.plugins && Object.values(resultado.plugins).filter(p => p.outdated === true).length === 0) puntosPositivos.push('✅ Todos los plugins están actualizados.');
    if (resultado.version?.vulnerabilities?.length === 0 && resultado.main_theme?.vulnerabilities?.length === 0) puntosPositivos.push('✅ No se encontraron vulnerabilidades conocidas en el núcleo o tema principal.');

    const criticalFindings = ['backup_db', 'config_backup', 'db_export'];
    if (resultado.interesting_findings?.some(f => criticalFindings.includes(f.type))) puntosCriticos.push(`🔴 **Riesgo Crítico:** Se encontraron hallazgos críticos: ${criticalFindings.filter(f => resultado.interesting_findings.some(i => i.type === f)).join(', ')}.`);
    if (resultado.version?.vulnerabilities?.length > 0) puntosCriticos.push(`🔴 **Riesgo Crítico:** El núcleo de WordPress tiene ${resultado.version.vulnerabilities.length} vulnerabilidad(es) conocida(s).`);
    if (resultado.main_theme?.vulnerabilities?.length > 0) puntosCriticos.push(`🔴 **Riesgo Crítico:** El tema principal tiene ${resultado.main_theme.vulnerabilities.length} vulnerabilidad(es) conocida(s).`);
    if (resultado.plugins && Object.values(resultado.plugins).some(p => p.vulnerabilities?.length > 0)) puntosCriticos.push(`🔴 **Riesgo Crítico:** Se encontraron vulnerabilidades en ${Object.values(resultado.plugins).filter(p => p.vulnerabilities?.length > 0).length} plugin(s).`);

    if (resultado.version?.status === 'out-of-date') puntosMedios.push(`🟡 **Advertencia:** El núcleo de WordPress está desactualizado.`);
    if (resultado.main_theme?.outdated) puntosMedios.push(`🟡 **Advertencia:** El tema principal '${resultado.main_theme.slug}' está desactualizado.`);
    if (resultado.plugins) {
        const outdatedPlugins = Object.values(resultado.plugins).filter(p => p.outdated === true);
        if (outdatedPlugins.length > 0) puntosMedios.push(`🟡 **Advertencia:** ${outdatedPlugins.length} plugin(s) están desactualizados.`);
    }
    if (resultado.scan_aborted) puntosMedios.push(`🟡 **Advertencia:** El escaneo no se completó, los resultados pueden ser parciales.`);

    const informativeFindings = ['xmlrpc', 'readme', 'debug_log', 'directory_listing', 'wp_config_backup', 'mu_plugins', 'wp_cron'];
    if (resultado.interesting_findings?.some(f => informativeFindings.includes(f.type))) puntosInformativos.push(`ℹ️ Se encontraron hallazgos informativos: ${informativeFindings.filter(f => resultado.interesting_findings.some(i => i.type === f)).join(', ')}. Revisar posibles configuraciones inseguras.`);
    if (resultado.users && resultado.users.length > 0) puntosInformativos.push(`ℹ️ Se encontraron ${resultado.users.length} usuarios enumerados. Considerar deshabilitar la enumeración de usuarios.`);

    if (puntosCriticos.length > 0) explicacion += '<h5>Factores de Riesgo Alto</h5><ul>' + puntosCriticos.map(p => `<li>${p}</li>`).join('') + '</ul>';
    if (puntosMedios.length > 0) explicacion += '<h5>Factores de Riesgo Medio</h5><ul>' + puntosMedios.map(p => `<li>${p}</li>`).join('') + '</ul>';
    if (puntosInformativos.length > 0) explicacion += '<h5>Hallazgos Informativos</h5><ul>' + puntosInformativos.map(p => `<li>${p}</li>`).join('') + '</ul>';
    if (puntosPositivos.length > 0) explicacion += '<h5>Puntos Positivos</h5><ul>' + puntosPositivos.map(p => `<li>${p}</li>`).join('') + '</ul>';
    if (puntosPositivos.length === 0 && puntosCriticos.length === 0 && puntosMedios.length === 0 && puntosInformativos.length === 0) explicacion += '<p>No se encontraron hallazgos específicos en el resultado del análisis.</p>';

    return explicacion;
}


//==============================================================
//                       4. EVENT LISTENERS
//==============================================================

// Event listener para el botón de análisis masivo
function addEventListeners() {
    const btnAnalizar = document.getElementById('btnAnalizar');
    
    // 🧹 Limpieza de listeners anteriores
    const newBtn = btnAnalizar.cloneNode(true);
    btnAnalizar.parentNode.replaceChild(newBtn, btnAnalizar);

    newBtn.addEventListener('click', async () => {
        // 1. Detectar selección
        const checkboxes = document.querySelectorAll('.repo-selector:checked');
        const idsSeleccionados = Array.from(checkboxes).map(cb => cb.value); 
        
        let modo = '';
        let confirmacion; // Variable para guardar la respuesta del usuario

        // 2. Lógica inteligente de confirmación CON SWEETALERT2 🎨
        if (idsSeleccionados.length > 0) {
            confirmacion = await Swal.fire({
                title: '¿Confirmar selección?',
                text: `Se analizarán únicamente los ${idsSeleccionados.length} repositorios seleccionados.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#7c1225', 
                cancelButtonColor: '#6c757d',  // Gris
                confirmButtonText: 'Sí, analizar',
                cancelButtonText: 'Cancelar'
            });
            modo = 'seleccion';
        } else {
            confirmacion = await Swal.fire({
                title: '¿Un análisis completo?',
                text: "⚠️ No has seleccionado nada. ¿Deseas escanear TODOS los repositorios? Esto puede tomar tiempo.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#7c1225', // Un color distinto para acciones masivas
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, analizar todo',
                cancelButtonText: 'Cancelar'
            });
            modo = 'todo';
        }

        // Si el usuario da click en "Cancelar" o cierra la modal, detenemos todo aquí
        if (!confirmacion.isConfirmed) return;

        // --- A PARTIR DE AQUÍ TODO SIGUE IGUAL ---
        
        const barra = document.getElementById('barraProgreso');
        const textoBarra = document.getElementById('textoBarra');
        
        newBtn.disabled = true;
        barra.style.width = '0%';
        textoBarra.textContent = 'Obteniendo lista...';

        try {
            const response = await fetch('http://172.17.175.137:3000/api/registros');
            if (!response.ok) throw new Error('Error al conectar con el servidor');
            const todosLosRegistros = await response.json();

            // 3. FILTRADO
            let registrosAProcesar = [];

            if (modo === 'seleccion') {
                registrosAProcesar = todosLosRegistros.filter(repo => idsSeleccionados.includes(repo.id.toString()));
            } else {
                registrosAProcesar = todosLosRegistros;
            }

            // 4. Configuración de paralelos
            const LIMITE_CONCURRENCIA = 3; 
            let completados = 0;
            let indiceActual = 0;
            const total = registrosAProcesar.length;

            textoBarra.textContent = `Iniciando análisis de ${total} sitios...`;

            // Función que procesa un solo repo
            const analizarRepo = async (repo) => {
                try {
                    textoBarra.textContent = `Analizando: ${repo.nombre}...`;
                    await fetch(`http://172.17.175.137:3000/api/analizar/${repo.id}`, { method: 'POST' });
                } catch (e) {
                    console.error(`Error en ${repo.nombre}`, e);
                } finally {
                    completados++;
                    const porcentaje = Math.round((completados / total) * 100);
                    barra.style.width = `${porcentaje}%`;
                    textoBarra.textContent = `${porcentaje}% - (${completados}/${total}) Completados`;
                }
            };

            const ejecutarLote = async () => {
                const promesas = [];
                while (indiceActual < total && promesas.length < LIMITE_CONCURRENCIA) {
                    promesas.push(analizarRepo(registrosAProcesar[indiceActual]));
                    indiceActual++;
                }
                
                if (promesas.length > 0) {
                    await Promise.all(promesas);
                    if (indiceActual < total) {
                        await ejecutarLote();
                    }
                }
            };

            await ejecutarLote();
            
            textoBarra.textContent = '¡Análisis Completado!';
            
            // ✅ ÉXITO CON SWEETALERT
            await Swal.fire({
                title: '¡Terminado!',
                text: 'El proceso de análisis ha finalizado correctamente.',
                icon: 'success',
                confirmButtonColor: '#198754'
            });

            cargarRepositorios(); 

        } catch (err) {
            console.error(err);
            textoBarra.textContent = 'Error de conexión.';
            
            // ❌ ERROR CON SWEETALERT
            Swal.fire({
                title: 'Error',
                text: 'Hubo un problema de conexión con el servidor.',
                icon: 'error'
            });

        } finally {
            newBtn.disabled = false;
            // Retrasamos un poco el borrado de la barra
            setTimeout(() => { textoBarra.textContent = ''; barra.style.width = '0%'; }, 5000);
        }
    });

    // --- LOGICA DE RECORDATORIOS (Se mantiene, pero podemos mejorar el alert final) ---
    const formRecordatorio = document.getElementById('formRecordatorio');
    if (formRecordatorio) {
        const newForm = formRecordatorio.cloneNode(true);
        formRecordatorio.parentNode.replaceChild(newForm, formRecordatorio);
        
        newForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            // Recolectar datos...
            const repositorio_id = document.getElementById('recordatorioRepositorioId').value;
            const tipo = document.getElementById('recordatorioTipo').value;
            const mensaje = document.getElementById('recordatorioMensaje').value;
            const fecha_programada = document.getElementById('recordatorioFecha').value;
            const enviar_correo = document.getElementById('recordatorioEnviarCorreo').checked;
            
            const usuariosContainer = document.getElementById('listaUsuarios');
            const usuarios_a_notificar = enviar_correo 
                ? Array.from(usuariosContainer.querySelectorAll('input:checked')).map(el => el.value)
                : [];

            const data = { 
                repositorio_id, tipo, mensaje, fecha_programada, enviar_correo, 
                usuarios_a_notificar, creado_por: 1 
            };
            
            try {
                const res = await fetch('http://172.17.175.137:3000/api/recordatorios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if(!res.ok) throw new Error("Error al guardar");
                const result = await res.json();
                
                // ✅ RECORDATORIO GUARDADO CON SA2
                Swal.fire({
                    position: 'top-end',
                    icon: 'success',
                    title: result.message,
                    showConfirmButton: false,
                    timer: 1500
                });

                const modalEl = document.getElementById('recordatorioModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        });

        const checkCorreo = document.getElementById('recordatorioEnviarCorreo');
        const divUsuarios = document.getElementById('usuariosContainer');
        if(checkCorreo && divUsuarios) {
            checkCorreo.addEventListener('change', () => {
                divUsuarios.style.display = checkCorreo.checked ? 'block' : 'none';
                if(checkCorreo.checked) cargarUsuarios();
            });
        }
    }
}


//==============================================================
//                       5. INICIALIZACIÓN
//==============================================================

/**
 * Función de inicialización que se ejecuta cuando el DOM está cargado.
 */
function init() {
    // Asignar variables a los elementos del DOM después de que estén cargados
    cardsContainer = document.getElementById('cardsContainer');
    historialBody = document.getElementById('historialBody');
    menuFiltroNivel = document.getElementById('menuFiltroNivel');
    filtroNivelActualSpan = document.getElementById('filtroNivelActual');
    formRecordatorio = document.getElementById('formRecordatorio');
    inputRepositorioId = document.getElementById('recordatorioRepositorioId');
    recordatorioRepoNombreSpan = document.getElementById('recordatorioRepoNombre');
    historialRecordatoriosBody = document.getElementById('historialRecordatoriosBody');
    recordatorioEnviarCorreo = document.getElementById('recordatorioEnviarCorreo');
    usuariosContainer = document.getElementById('usuariosContainer');
    listaUsuarios = document.getElementById('listaUsuarios');

    // Inicializar los modales de Bootstrap
    historialModal = new bootstrap.Modal(document.getElementById('historialModal'));
    genericModal = new bootstrap.Modal(document.getElementById('genericModal'));
    recordatorioModal = new bootstrap.Modal(document.getElementById('recordatorioModal'));

    // Carga inicial de datos y listeners
    cargarRepositorios();
    addEventListeners();
}

// Ejecutar la función de inicialización cuando el documento esté listo
document.addEventListener('DOMContentLoaded', init);

//==============================================================
//                       6. Grafica Vulnerabilidad
//==============================================================

let chartVulnerabilidad;
// Variable para almacenar la data más reciente para la exportación
let ultimaDataRepositorios = []; 

/**
 * Función principal para dibujar y actualizar la gráfica de vulnerabilidad.
 * @param {Array<Object>} data - Array de objetos de repositorio con 'nombre' y 'nivel_vulnerabilidad'.
 */
function actualizarGraficaRepositorios(data) {
    // 1. Almacenar la data para la función de exportación
    ultimaDataRepositorios = data; 
    
    const nombresRepos = data.map(repo => repo.nombre);
    const niveles = data.map(repo => repo.nivel_vulnerabilidad || 'Desconocido');

    // Mapear colores según nivel (escala de riesgo mejorada)
    const colorMap = {
        'Bajo': '#2ecc71',      // Verde brillante
        'Medio': '#f39c12',     // Naranja más oscuro
        'Alto': '#e74c3c',      // Rojo estándar
        'Crítico': '#9b0000',   // Rojo muy oscuro
        'Error': '#3498db',     // Azul para error
        'Desconocido': '#95a5a6'// Gris para desconocido
    };
    const colores = niveles.map(n => colorMap[n] || colorMap['Desconocido']);

    const ctx = document.getElementById('vulnerabilidadChart').getContext('2d');

    if(chartVulnerabilidad) chartVulnerabilidad.destroy();

    chartVulnerabilidad = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: nombresRepos,
        datasets: [{
            label: 'Nivel de Vulnerabilidad',
            data: niveles.map(n => {
                switch(n) {
                    case 'Bajo': return 1;
                    case 'Medio': return 2;
                    case 'Alto': return 3;
                    case 'Crítico': return 4;
                    case 'Error': return 0;
                    default: return 0;
                }
            }),
            backgroundColor: colores,
            borderColor: 'rgba(0,0,0,0.15)',
            borderWidth: 1.2,
            borderRadius: 10,
            hoverBackgroundColor: colores,
            hoverBorderColor: 'rgba(0,0,0,0.3)',

            // ⭐ Sombra suave
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowBlur: 6,
            shadowColor: 'rgba(0,0,0,0.2)',

            maxBarThickness: 22,
            barPercentage: 0.75,
            categoryPercentage: 0.65
        }]
    },
    options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,

        animation: {
            duration: 900,
            easing: 'easeOutQuart'
        },

        plugins: {
            legend: { display: false },

            tooltip: {
                backgroundColor: 'rgba(30,30,30,0.9)',
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                padding: 10,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (ctx) => ` Nivel: ${niveles[ctx.dataIndex]}`,
                    title:  (ctx) => ctx[0].label
                }
            },

            title: { display: false }
        },

        scales: {
            y: {
                title: { display: false },
                ticks: {
                    font: { size: 13, weight: '500' },
                    color: '#333'
                },
                grid: { display: false }
            },
            x: {
                beginAtZero: true,
                max: 4,
                ticks: {
                    stepSize: 1,
                    font: { size: 12 },
                    color: '#333',
                    padding: 8,
                    callback: (value) => {
                        switch(value) {
                            case 0: return 'Error/Desc.';
                            case 1: return 'Bajo';
                            case 2: return 'Medio';
                            case 3: return 'Alto';
                            case 4: return 'Crítico';
                            default: return '';
                        }
                    }
                },
                grid: {
                    color: 'rgba(0,0,0,0.06)',
                    lineWidth: 1.2,
                    drawBorder: false
                },
                title: {
                    display: true,
                    text: 'Nivel de Vulnerabilidad',
                    font: { size: 14, weight: '600' },
                    color: '#444',
                    padding: { top: 10 }
                }
            }
        }
    }
});

}

// ====================================================================
// FUNCIÓN AUXILIAR PARA EXTRAER FACTORES DE RIESGO
// ====================================================================

/**
 * Extrae y formatea los factores de riesgo Alto y Medio del raw_json de un escaneo.
 * Es una adaptación de la lógica de generarExplicacionNivel para la exportación.
 * @param {object} repo - El objeto de repositorio con el campo 'resumen_vulnerabilidades' que contiene el JSON.
 * @returns {object} - Un objeto con 'alto' y 'medio' (strings concatenados).
 */
function extraerFactoresRiesgo(repo) {
    let rawData;
    let factores = { alto: 'NINGUNO', medio: 'NINGUNO' };

    try {
        // Asumimos que resumen_vulnerabilidades es un string JSON que contiene raw_json
        const resumen = JSON.parse(repo.resumen_vulnerabilidades);
        rawData = resumen.raw_json ? JSON.parse(resumen.raw_json) : null;
    } catch (e) {
        // Si hay error al parsear o no existe el campo, se devuelve NINGUNO
        return factores;
    }

    if (!rawData) return factores;

    const puntosCriticos = [];
    const puntosMedios = [];

    // --- Lógica para Factores_Riesgo_Alto (Crítico) ---
    const criticalFindings = ['backup_db', 'config_backup', 'db_export'];
    if (rawData.interesting_findings?.some(f => criticalFindings.includes(f.type))) {
        puntosCriticos.push(`Hallazgos Críticos: ${criticalFindings.filter(f => rawData.interesting_findings.some(i => i.type === f)).join(', ')}`);
    }
    if (rawData.version?.vulnerabilities?.length > 0) {
        puntosCriticos.push(`Núcleo con ${rawData.version.vulnerabilities.length} vulnerabilidad(es).`);
    }
    if (rawData.main_theme?.vulnerabilities?.length > 0) {
        puntosCriticos.push(`Tema principal con ${rawData.main_theme.vulnerabilities.length} vulnerabilidad(es).`);
    }
    if (rawData.plugins && Object.values(rawData.plugins).some(p => p.vulnerabilities?.length > 0)) {
        puntosCriticos.push(`Vulnerabilidades en ${Object.values(rawData.plugins).filter(p => p.vulnerabilities?.length > 0).length} plugin(s).`);
    }

    // --- Lógica para Factores_Riesgo_Medio (Advertencia) ---
    if (rawData.version?.status === 'out-of-date') {
        puntosMedios.push(`Núcleo desactualizado.`);
    }
    if (rawData.main_theme?.outdated) {
        puntosMedios.push(`Tema principal '${rawData.main_theme.slug}' desactualizado.`);
    }
    if (rawData.plugins) {
        const outdatedPlugins = Object.values(rawData.plugins).filter(p => p.outdated === true);
        if (outdatedPlugins.length > 0) {
            puntosMedios.push(`${outdatedPlugins.length} plugin(s) desactualizados.`);
        }
    }
    if (rawData.scan_aborted) {
        puntosMedios.push(`Escaneo incompleto.`);
    }
    
    // Formateo de salida
    if (puntosCriticos.length > 0) factores.alto = puntosCriticos.join(' | ');
    if (puntosMedios.length > 0) factores.medio = puntosMedicos.join(' | ');

    return factores;
}


// ====================================================================
// FUNCIÓN PRINCIPAL DE EXPORTACIÓN (MODIFICADA)
// ====================================================================

function exportarACsv() {
    if (ultimaDataRepositorios.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // 1. Cabeceras del CSV
    const headers = [
        "Repositorio", 
        "Nivel_Vulnerabilidad"
    ];
    
    // Función de limpieza mejorada para CSV
    const cleanForCsv = (text) => {
        if (text === undefined || text === null) return "";
        const cleanedText = String(text).replace(/"/g, '""'); 
        return `"${cleanedText}"`;
    };

    // 2. Mapear los datos al formato CSV
    const csvContent = ultimaDataRepositorios.map(repo => {
        const nivel = repo.nivel_vulnerabilidad || 'Desconocido';
        const fecha = repo.fecha_analisis ? new Date(repo.fecha_analisis).toLocaleString() : 'N/A';
        
        // 🚨 CAMBIO CLAVE: Extraer factores de riesgo
        const factoresRiesgo = extraerFactoresRiesgo(repo);

        return [
            cleanForCsv(repo.nombre),
            cleanForCsv(nivel),
        ].join(',');
    }).join('\n');

    // 3. Combinar cabeceras y contenido
    const finalCsv = headers.join(',') + '\n' + csvContent;

    // 4. Crear el BLOB y forzar la descarga (código sin cambios)
    const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'analisis_vulnerabilidades.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 5. Asignar el evento click al botón una vez el DOM esté cargado (código sin cambios)
document.addEventListener('DOMContentLoaded', () => {
    const botonExportar = document.getElementById('exportCsvBtn');
    if (botonExportar) {
        botonExportar.addEventListener('click', exportarACsv);
    }
});