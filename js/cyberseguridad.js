document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // SISTEMA DE ALERTAS ELEGANTES (TOAST)
    // ==========================================
    function mostrarNotificacion(mensaje, tipo = 'success') {
        const toastElement = document.getElementById('liveToast');
        const toastBody = document.getElementById('toastBody');

        toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-primary');

        if (tipo === 'success') toastElement.classList.add('bg-success');
        else if (tipo === 'error') toastElement.classList.add('bg-danger');
        else if (tipo === 'warning') toastElement.classList.add('bg-warning', 'text-dark');
        else toastElement.classList.add('bg-primary');

        toastBody.innerHTML = mensaje.replace(/\n/g, '<br>');
        const toast = new bootstrap.Toast(toastElement, { delay: 4500 });
        toast.show();
    }

    // --- MOTOR DEL MULTI-SELECT ---
    function inicializarMultiSelect(claseCheckboxes, idBoton, idHiddenInput) {
        const checkboxes = document.querySelectorAll(`.${claseCheckboxes}`);
        const btnTexto = document.getElementById(idBoton);
        const hiddenInput = document.getElementById(idHiddenInput);

        checkboxes.forEach(chk => {
            chk.addEventListener('change', (e) => {
                // Lógica inteligente: Si tocas "Todas las áreas", se limpian las demás
                if (e.target.value === 'Todas las Áreas' && e.target.checked) {
                    checkboxes.forEach(c => { if (c !== e.target) c.checked = false; });
                } else if (e.target.checked) {
                    const chkTodas = Array.from(checkboxes).find(c => c.value === 'Todas las Áreas');
                    if(chkTodas) chkTodas.checked = false;
                }

                // Generar el texto separado por comas
                const seleccionados = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
                if (seleccionados.length === 0) {
                    btnTexto.innerText = "Seleccione las áreas...";
                    hiddenInput.value = "";
                } else {
                    btnTexto.innerText = seleccionados.join(', ');
                    hiddenInput.value = seleccionados.join(', ');
                }
            });
        });
    }

    // Arrancamos los dos menús
    inicializarMultiSelect('chk-area-registro', 'btnAlertaArea', 'alertaAreaVal');
    inicializarMultiSelect('chk-area-edit', 'btnEditArea', 'editAreaVal');

    // Función global para el botón "Listo"
    window.cerrarDropdown = function(dropdownBtnId) {
        const dropEl = document.getElementById(dropdownBtnId);
        const dropdown = bootstrap.Dropdown.getInstance(dropEl) || new bootstrap.Dropdown(dropEl);
        dropdown.hide();
    };

    // --- FUNCIÓN NUEVA: CALCULAR HORAS Y MINUTOS EXACTOS ---
    function obtenerTextoTiempo(ms) {
        const esVencido = ms < 0;
        const totalMinutos = Math.floor(Math.abs(ms) / (1000 * 60));
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        
        let texto = "";
        if (horas > 0) texto += `${horas}h `;
        texto += `${minutos}m`;
        
        return { vencido: esVencido, texto: texto };
    }

    // ==========================================
    // 1. INICIALIZACIÓN DE GRÁFICOS
    // ==========================================
    const ctxThreat = document.getElementById('threatTypeChart').getContext('2d');
    const threatChart = new Chart(ctxThreat, {
        type: 'doughnut',
        data: {
            labels: ['Malware', 'Phishing', 'Intrusión', 'Fuga de información', 'Vulnerabilidad'],
            datasets: [{ data: [0, 0, 0, 0, 0], backgroundColor: ['#dc3545', '#fd7e14', '#0d6efd', '#6f42c1', '#6c757d'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });

    const ctxAssets = document.getElementById('assetsChart').getContext('2d');
    const assetsChart = new Chart(ctxAssets, {
        type: 'bar',
        data: {
            labels: ['Servidor', 'Endpoint', 'Aplicación', 'Red', 'Librerías', 'Módulos', 'Servicios'],
            datasets: [{ label: 'Número de Alertas', data: [0, 0, 0, 0, 0, 0, 0], backgroundColor: '#7c1225' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    function actualizarDashboard(data) {
        const criticas = data.filter(a => a.severidad === 'Crítica' && a.estado !== 'Cierre').length;
        const altas = data.filter(a => a.severidad === 'Alta' && a.estado !== 'Cierre').length;
        const enProceso = data.filter(a => a.estado !== 'Cierre' && a.estado !== 'Análisis').length;

        document.getElementById("kpi-criticas").innerText = criticas;
        document.getElementById("kpi-altas").innerText = altas;
        document.getElementById("kpi-proceso").innerText = enProceso;

        const alertasCerradas = data.filter(a => a.estado === 'Cierre' && a.fecha_cierre);
        
        let textoMTTR = "0m";
        if (alertasCerradas.length > 0) {
            let totalMilisegundos = 0;
            
            alertasCerradas.forEach(a => {
                const inicio = new Date(a.fecha_registro);
                const fin = new Date(a.fecha_cierre);
                totalMilisegundos += (fin - inicio);
            });
            
            const promedioMs = totalMilisegundos / alertasCerradas.length;
            const totalMinutos = Math.floor(promedioMs / (1000 * 60));
            const horas = Math.floor(totalMinutos / 60);
            const minutos = totalMinutos % 60;
            
            if (horas > 0) {
                textoMTTR = `${horas}h ${minutos}m`;
            } else {
                textoMTTR = `${minutos}m`;
            }
        } else {
            textoMTTR = "N/A"; 
        }
        
        document.getElementById("kpi-mttr").innerText = textoMTTR;
     

        const threatCounts = { 'Malware': 0, 'Phishing': 0, 'Intrusión': 0, 'Fuga de información': 0, 'Vulnerabilidad': 0 };
        data.forEach(a => { if (threatCounts[a.tipo] !== undefined) threatCounts[a.tipo]++; });
        threatChart.data.datasets[0].data = Object.values(threatCounts);
        threatChart.update();

        const assetCounts = { 'Servidor': 0, 'Endpoint': 0, 'Aplicación': 0, 'Red': 0, 'Librerías': 0, 'Módulos': 0, 'Servicios': 0 };
        data.forEach(a => { if (assetCounts[a.activo] !== undefined) assetCounts[a.activo]++; });
        assetsChart.data.datasets[0].data = Object.values(assetCounts);
        assetsChart.update();
    }

    // ==========================================
    // 2. CARGAR ALERTAS DESDE LA BASE DE DATOS
    // ==========================================
    const tbody = document.getElementById("alertsTableBody");
    window.alertasData = []; 
    
    function cargarAlertas() {
        fetch('http://172.17.175.137:3000/api/alertas')
            .then(res => res.json())
            .then(data => {
                window.alertasData = data; 
                
                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No hay alertas registradas en el sistema.</td></tr>`;
                    const badgeNotif = document.querySelector('.bi-bell-fill')?.nextElementSibling;
                    if(badgeNotif) badgeNotif.style.display = 'none';
                    const listaNotif = document.getElementById('listaNotificaciones');
                    if(listaNotif) listaNotif.innerHTML = '<p class="text-center text-muted my-4">No hay recordatorios pendientes de SLA.</p>';
                } else {
                    // 👇 EN LUGAR DE DIBUJAR TODO, LLAMAMOS A LOS FILTROS
                    aplicarFiltros();
                    
                    // Nota: La campanita recibe TODAS las alertas. ¡Las urgencias no se filtran!
                    window.actualizarCampanita(data);
                }
            })
            .catch(err => {
                console.error("Error cargando alertas:", err);
                mostrarNotificacion("Error al conectar con el servidor.", "error");
            });
    }

    function agregarFilaTabla(alerta) {
        // 👇 1. LÓGICA DE FECHA (Nueva)
        let fechaFormateada = "Sin fecha";
        if (alerta.fecha_registro) {
            fechaFormateada = new Date(alerta.fecha_registro).toLocaleString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        let sevClass = alerta.severidad === "Crítica" ? "badge-critica" : 
                       alerta.severidad === "Alta" ? "badge-alta" : 
                       alerta.severidad === "Media" ? "badge-media" : "badge-baja";
                       
        let statClass = alerta.estado === "Contención" ? "status-contencion" : 
                        alerta.estado === "Cierre" ? "bg-secondary text-white" : "status-analisis";

        let btnClass = alerta.estado === "Cierre" ? "btn-outline-secondary btn-gestionar" : "btn-outline-primary btn-gestionar";
        let btnText = alerta.estado === "Cierre" ? "Ver Detalles" : "Gestionar";

        let tr = document.createElement("tr");
        
        // 👇 2. CAMBIO DE DISEÑO EN LA COLUMNA DE ACTIVO 👇
        // Reemplazamos la variable alerta.activo y alerta.especifique por alerta.sistema_afectado
        tr.innerHTML = `
            <td class="fw-bold">${alerta.id}</td>
            <td>${fechaFormateada}</td> 
            <td>${alerta.tipo}</td>
            <td><strong>${alerta.sistema_afectado || alerta.activo}</strong></td>
            <td><span class="badge bg-light text-dark border">${alerta.area || 'Sin Área'}</span></td>
            <td><span class="badge ${sevClass}">${alerta.severidad}</span></td>
            <td><span class="badge rounded-pill ${statClass}">${alerta.estado}</span></td>
            <td><button class="btn btn-sm ${btnClass}">${btnText}</button></td>
        `;
        tbody.appendChild(tr); 
    }

   // ==========================================
    // 2.5 LÓGICA DE FILTROS Y PAGINACIÓN
    // ==========================================
    const selectTime = document.getElementById('time-range');
    const selectSeverity = document.getElementById('severity-filter');
    const selectLimit = document.getElementById('limit-filter');
    const selectArea = document.getElementById('filtroAreaTabla'); // 👇 1. Capturamos el nuevo filtro
    
    let alertasFiltradasActivas = [];
    let paginaActual = 1;

    function aplicarFiltros() {
        if (!window.alertasData) return;

        const timeValue = selectTime ? selectTime.value : 'today';
        const severityValue = selectSeverity ? selectSeverity.value : 'all';
        const areaValue = selectArea ? selectArea.value : 'Todas'; // 👇 2. Leemos su valor actual

        const ahora = new Date();

        // 1. Filtramos TODA la memoria primero
        alertasFiltradasActivas = window.alertasData.filter(alerta => {
            
            // Filtro de Severidad
            let pasaSeveridad = true;
            if (severityValue === 'critica') pasaSeveridad = alerta.severidad === 'Crítica';
            if (severityValue === 'alta') pasaSeveridad = alerta.severidad === 'Alta';
            if (severityValue === 'media') pasaSeveridad = alerta.severidad === 'Media';
            if (severityValue === 'baja') pasaSeveridad = alerta.severidad === 'Baja';

            // 👇 3. NUEVO: Filtro de Área Inteligente (Busca si el texto incluye el área seleccionada)
            let pasaArea = true;
            if (areaValue !== 'Todas') {
                // String() actúa como escudo protector por si alguna alerta vieja tiene área nula
                pasaArea = String(alerta.area).includes(areaValue); 
            }

            // Filtro de Tiempo
            let pasaTiempo = true;
            const fechaAlerta = new Date(alerta.fecha_registro);
            const diffHoras = (ahora - fechaAlerta) / (1000 * 60 * 60);
            
            if (timeValue === 'today') pasaTiempo = diffHoras <= 24;
            if (timeValue === 'last7') pasaTiempo = diffHoras <= (24 * 7);
            if (timeValue === 'last30') pasaTiempo = diffHoras <= (24 * 30);
            if (timeValue === 'all') pasaTiempo = true;

            // 👇 4. Exigimos que pase los 3 filtros para poder mostrarse en la tabla
            return pasaSeveridad && pasaTiempo && pasaArea;
        });

        // 2. Al cambiar un filtro, siempre regresamos a la página 1
        paginaActual = 1;
        dibujarTablaPaginada();

        // 3. Los KPIs de arriba muestran los números TOTALES, no solo los de la página actual
        actualizarDashboard(alertasFiltradasActivas);
    }

    // 👇 5. IMPORTANTE: Activamos el "gatillo" para que la tabla se actualice en cuanto elijas un área
    if (selectArea) {
        selectArea.addEventListener('change', aplicarFiltros);
    }

    function dibujarTablaPaginada() {
        const tbody = document.getElementById("alertsTableBody");
        if (!tbody) return;

        const limitValue = selectLimit ? parseInt(selectLimit.value) : 10;
        const totalItems = alertasFiltradasActivas.length;
        const totalPages = Math.ceil(totalItems / limitValue) || 1;

        if (paginaActual > totalPages) paginaActual = totalPages;
        if (paginaActual < 1) paginaActual = 1;

        // Extraemos solo el "pedazo" del arreglo que toca mostrar
        const startIndex = (paginaActual - 1) * limitValue;
        const endIndex = startIndex + limitValue;
        const alertasPagina = alertasFiltradasActivas.slice(startIndex, endIndex);

        tbody.innerHTML = '';
        if (alertasPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay alertas que coincidan con los filtros.</td></tr>`;
        } else {
            alertasPagina.forEach(alerta => agregarFilaTabla(alerta));
        }

        // Actualizar el letrero ("Mostrando 1 a 10 de 50")
        const info = document.getElementById('pagination-info');
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');

        if (info) {
            const mostrandoHasta = Math.min(endIndex, totalItems);
            const iniciandoEn = totalItems > 0 ? startIndex + 1 : 0;
            info.innerText = `Mostrando ${iniciandoEn} a ${mostrandoHasta} de ${totalItems} incidentes`;
        }

        // Apagar botones si estamos en la primera o última página
        if (btnPrev) btnPrev.disabled = (paginaActual === 1);
        if (btnNext) btnNext.disabled = (paginaActual === totalPages || totalItems === 0);
    }

    // Escuchar cuando el usuario cambie cualquier menú
    if (selectTime) selectTime.addEventListener('change', aplicarFiltros);
    if (selectSeverity) selectSeverity.addEventListener('change', aplicarFiltros);
    if (selectLimit) selectLimit.addEventListener('change', () => { 
        paginaActual = 1; 
        dibujarTablaPaginada(); 
    });

    // Escuchar botones de paginación
    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        if (paginaActual > 1) { 
            paginaActual--; 
            dibujarTablaPaginada(); 
        }
    });
    
    document.getElementById('btn-next-page')?.addEventListener('click', () => {
        const limitValue = selectLimit ? parseInt(selectLimit.value) : 10;
        const totalPages = Math.ceil(alertasFiltradasActivas.length / limitValue);
        if (paginaActual < totalPages) { 
            paginaActual++; 
            dibujarTablaPaginada(); 
        }
    });

    cargarAlertas();

    // ==========================================
    // 3. REGISTRO DE NUEVA ALERTA MANUAL
    // ==========================================
    const selectSeveridad = document.getElementById('alertaSeveridad');
    const textSLA = document.getElementById('resultadoSLA');
    const btnGuardarAlerta = document.getElementById('btnGuardarAlerta');

    if (selectSeveridad) {
        selectSeveridad.addEventListener('change', (e) => {
            const severidad = e.target.value;
            let sla = "Pendiente", colorClase = "text-muted";
            if (severidad === "Crítica") { sla = "< 1 hora"; colorClase = "text-danger"; } 
            else if (severidad === "Alta") { sla = "< 4 horas"; colorClase = "text-warning"; } 
            else if (severidad === "Media") { sla = "< 24 horas"; colorClase = "text-primary"; } 
            else if (severidad === "Baja") { sla = "< 72 horas"; colorClase = "text-secondary"; }
            textSLA.innerText = sla; textSLA.className = `${colorClase} fw-bold`;
        });
    }

    if (btnGuardarAlerta) {
        btnGuardarAlerta.addEventListener('click', async () => {
            const idVal = document.getElementById('alertaId').value;
            const tipoVal = document.getElementById('alertaTipo').value;
            const activoVal = document.getElementById('alertaActivo').value;
            const especifiqueVal = document.getElementById('alertaActivoEspecifique').value;
            const areaVal = document.getElementById('alertaAreaVal').value;
            const severidadVal = document.getElementById('alertaSeveridad').value;

            if (!idVal || !tipoVal || !activoVal || !especifiqueVal || !areaVal || !severidadVal) {
                mostrarNotificacion("Por favor, llene todos los campos del formulario.", "warning");
                return;
            }
            
            try {
                const response = await fetch('http://172.17.175.137:3000/api/alertas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folio: idVal, tipo: tipoVal, activo: activoVal, especifique: especifiqueVal, area: areaVal, severidad: severidadVal })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Error al registrar la alerta.");

                mostrarNotificacion(`¡Alerta ${idVal} asignada a ${areaVal}!`, "success");
                
                bootstrap.Modal.getInstance(document.getElementById('modalRegistroAlerta')).hide();
                document.getElementById('formNuevaAlerta').reset();
                document.querySelectorAll('.chk-area-registro').forEach(chk => chk.checked = false);
                document.getElementById('btnAlertaArea').innerText = "Seleccione las áreas...";
                document.getElementById('alertaAreaVal').value = "";
                textSLA.innerText = "Pendiente"; textSLA.className = "text-danger fw-bold";
                
                cargarAlertas(); 
                
            } catch (error) {
                mostrarNotificacion(error.message, "error");
            }
        });
    }

    // ==========================================
    // 3.5 LÓGICA VISUAL DE EVIDENCIAS (MEMORIA + RECUPERACIÓN)
    // ==========================================
    const inputEvidencias = document.getElementById('gestionarEvidencias');
    const listaVisual = document.getElementById('listaEvidenciasVisual');
    
    window.archivosAcumulados = []; // Memoria para archivos NUEVOS
    window.evidenciasExistentes = []; // Memoria para archivos QUE YA ESTÁN EN BD

    if (inputEvidencias && listaVisual) {
        inputEvidencias.addEventListener('change', () => {
            const archivosNuevos = Array.from(inputEvidencias.files);
            
            archivosNuevos.forEach(nuevoArchivo => {
                const existeNuevo = window.archivosAcumulados.find(a => a.name === nuevoArchivo.name);
                const existeBD = window.evidenciasExistentes.find(a => a.nombre_archivo === nuevoArchivo.name);
                if (!existeNuevo && !existeBD) {
                    window.archivosAcumulados.push(nuevoArchivo);
                }
            });

            inputEvidencias.value = ""; 
            dibujarTodasLasEvidencias();
        });
    }

    // --- FUNCIÓN MAESTRA QUE DIBUJA LA LISTA (EXISTENTES Y NUEVOS) ---
    function dibujarTodasLasEvidencias() {
        if (!listaVisual) return;
        listaVisual.innerHTML = ''; 

        // 1. Dibujar archivos que ya están en el servidor (Azules con descarga)
        window.evidenciasExistentes.forEach(archivo => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center py-1 bg-white border-info mb-1 rounded shadow-sm';
            
            li.innerHTML = `
                <span style="font-size: 0.85rem;" class="text-truncate">
                    <i class="bi bi-cloud-check-fill text-info me-2"></i>${archivo.nombre_archivo}
                </span>
                <a href="http://172.17.175.137:3000${archivo.ruta_archivo}" target="_blank" class="btn btn-sm text-primary p-0 ms-2" title="Descargar Evidencia">
                    <i class="bi bi-download fs-5"></i>
                </a>
            `;
            listaVisual.appendChild(li);
        });

        // 2. Dibujar archivos nuevos a punto de subirse (Grises con X)
        window.archivosAcumulados.forEach((archivo, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center py-1 bg-light border-secondary mb-1 rounded';
            
            li.innerHTML = `
                <span style="font-size: 0.85rem;" class="text-truncate">
                    <i class="bi bi-file-earmark-text-fill text-secondary me-2"></i>${archivo.name}
                </span>
                <button type="button" class="btn btn-sm text-danger p-0 ms-2 btn-quitar-archivo" data-index="${index}" title="Quitar archivo">
                    <i class="bi bi-x-circle-fill fs-5"></i>
                </button>
            `;
            listaVisual.appendChild(li);
        });

        // Darle vida a las X para borrar
        document.querySelectorAll('.btn-quitar-archivo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                window.archivosAcumulados.splice(idx, 1); 
                dibujarTodasLasEvidencias(); 
            });
        });
    }

    // --- FUNCIÓN PARA PEDIR EVIDENCIAS AL SERVIDOR ---
    function cargarEvidencias(folio) {
        // Asegúrate de que esta ruta existe en tu servidor.js como lo planeamos
        fetch(`http://172.17.175.137:3000/api/alertas/${folio}/evidencias`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                window.evidenciasExistentes = Array.isArray(data) ? data : [];
                dibujarTodasLasEvidencias();
            })
            .catch(err => console.error("Error al cargar evidencias:", err));
    }


    // ==========================================
    // 4. GESTIÓN DE ALERTA (GET & PUT) - INCLUYE MODO LECTURA Y EDICIÓN BÁSICA
    // ==========================================
    tbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-gestionar')) {
            const fila = e.target.closest('tr');
            
            const idAlerta = fila.cells[0].innerText;
            const estadoActual = fila.cells[6].innerText.trim(); 

            // 👇 LÓGICA DE FOLIO OCULTO PARA LA EDICIÓN BÁSICA
            const inputFolioOculto = document.getElementById('folioModalOculto');
            if (inputFolioOculto) inputFolioOculto.value = idAlerta;

            // 👇 LÓGICA DE AUDITORÍA: ¿El incidente ya está cerrado?
            const modoLectura = (estadoActual === "Cierre");

            // 1. Bloquear/Desbloquear todos los campos de texto del dictamen
            const inputsDictamen = document.querySelectorAll('#formDictamen input, #formDictamen textarea');
            inputsDictamen.forEach(input => input.disabled = modoLectura);

            // 2. Bloquear/Desbloquear el selector de estado
            const selectEstado = document.getElementById('gestionarEstado');
            if (selectEstado) selectEstado.disabled = modoLectura;

            // 3. Ocultar/Mostrar el botón de Guardar, Evidencias y el botón de Editar Clasificación
            const btnActualizar = document.getElementById('btnActualizarAlerta');
            if (btnActualizar) btnActualizar.style.display = modoLectura ? 'none' : 'block';

            const btnDescartar = document.getElementById('btnDescartarAlerta');
            if (btnDescartar) btnDescartar.style.display = modoLectura ? 'none' : 'inline-block';
            
            const inputEvidencias = document.getElementById('gestionarEvidencias');
            if (inputEvidencias) inputEvidencias.style.display = modoLectura ? 'none' : 'block';
            
            const labelEvidencias = document.querySelector('label[for="gestionarEvidencias"]');
            if (labelEvidencias) labelEvidencias.style.display = modoLectura ? 'none' : 'block';

            const btnActivarEdicion = document.querySelector('[onclick="toggleEdicionBasica()"]');
            if (btnActivarEdicion) btnActivarEdicion.style.display = modoLectura ? 'none' : 'inline-block';

            // 4. Cambiar el título del modal visualmente
            const tituloModal = document.querySelector('#modalGestionarAlerta .modal-title');
            if (tituloModal) {
                if (modoLectura) {
                    tituloModal.innerHTML = `Incidente Finalizado: <span id="gestionarIdAlerta" class="text-warning">${idAlerta}</span> <span class="badge bg-secondary ms-2 fs-6 border border-light">Solo Lectura</span>`;
                } else {
                    tituloModal.innerHTML = `Gestionar Incidente: <span id="gestionarIdAlerta" class="text-warning">${idAlerta}</span>`;
                }
            }

            const spanIdAlerta = document.getElementById('gestionarIdAlerta');
            if (spanIdAlerta) spanIdAlerta.innerText = idAlerta;

           // --- LÓGICA EXACTA DEL TIEMPO RESTANTE Y CARGA DE DATOS BÁSICOS ---
            const timerSpan = document.getElementById('gestionarSLA');
            if (window.alertasData) {
                const alertaInfo = window.alertasData.find(a => String(a.id) === String(idAlerta));
                if (alertaInfo) {
                    
                    // 👇 CARGA SEGURA DE DATOS BÁSICOS (Evita el cruce de variables)
                    // Nota: Soporta si tus IDs se llaman "modalTipo" o "gestionarTipo"
                    const elFecha = document.getElementById('modalFecha') || document.getElementById('gestionarFecha');
                    if (elFecha) elFecha.innerText = new Date(alertaInfo.fecha_registro).toLocaleString();

                    const elTipo = document.getElementById('modalTipo') || document.getElementById('gestionarTipo');
                    if (elTipo) elTipo.innerText = alertaInfo.tipo;

                    const elActivo = document.getElementById('modalActivo') || document.getElementById('gestionarActivo');
                    if (elActivo) elActivo.innerText = alertaInfo.activo;

                    const elArea = document.getElementById('modalArea') || document.getElementById('gestionarArea');
                    if (elArea) elArea.innerText = alertaInfo.area || "Sin Asignar";

                    const elSeveridad = document.getElementById('modalSeveridad') || document.getElementById('gestionarSeveridad');
                    if (elSeveridad) {
                        elSeveridad.innerText = alertaInfo.severidad;
                        // Intentamos copiar el color del badge de la tabla
                        const badgeSeveridad = fila.querySelector('.badge');
                        if (badgeSeveridad) elSeveridad.className = badgeSeveridad.className;
                    }

                    // 👇 LÓGICA DEL SLA
                    if (timerSpan) {
                        const fechaReg = new Date(alertaInfo.fecha_registro);
                        const msSLA = alertaInfo.sla_horas * 60 * 60 * 1000;
                        const vencimiento = new Date(fechaReg.getTime() + msSLA);

                        if (alertaInfo.estado === 'Cierre') {
                            if (alertaInfo.fecha_cierre) {
                                const fechaCierre = new Date(alertaInfo.fecha_cierre);
                                const msRestantesAlCierre = vencimiento - fechaCierre;
                                const tiempo = obtenerTextoTiempo(msRestantesAlCierre);

                                if (tiempo.vencido) {
                                    timerSpan.innerHTML = `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle fs-7"><i class="bi bi-exclamation-octagon-fill"></i> Cerrado con ${tiempo.texto} de retraso</span>`;
                                } else {
                                    timerSpan.innerHTML = '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle fs-7"><i class="bi bi-check-circle-fill"></i> Resuelto a tiempo</span>';
                                }
                            } else {
                                timerSpan.innerHTML = '<span class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle fs-7"><i class="bi bi-info-circle-fill"></i> Incidente Cerrado</span>';
                            }
                        } else {
                            const msRestantes = vencimiento - new Date();
                            const tiempo = obtenerTextoTiempo(msRestantes);

                            if (tiempo.vencido) {
                                timerSpan.innerHTML = `<span class="badge bg-danger fs-7 shadow-sm"><i class="bi bi-exclamation-triangle-fill"></i> Vencida por ${tiempo.texto}</span>`;
                            } else {
                                timerSpan.innerHTML = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fs-7"><i class="bi bi-clock-history"></i> Quedan ${tiempo.texto}</span>`;
                            }
                        }
                    }
                }
            }

            // ----------------------------------------------

            // Pre-seleccionar el estado en el dropdown (solo se verá si no está bloqueado)
            if (selectEstado) {
                for (let option of selectEstado.options) {
                    if (option.innerText.includes(estadoActual) || option.value === estadoActual) {
                        option.selected = true; break;
                    }
                }
            }

            document.getElementById('formDictamen').reset();
            
            // LIMPAMOS MEMORIAS Y CARGAMOS LAS EVIDENCIAS EXISTENTES DE LA BD
            window.archivosAcumulados = [];
            window.evidenciasExistentes = [];
            dibujarTodasLasEvidencias();
            cargarEvidencias(idAlerta);
            
            fetch(`http://172.17.175.137:3000/api/alertas/${idAlerta}`)
                .then(res => res.json())
                .then(data => {
                    if (data.sistema_afectado) document.getElementById('dic_sistema').value = data.sistema_afectado;
                   
                    const contenedorCves = document.getElementById('dic_cves');
                    if (!data.cves_relacionados || data.cves_relacionados === "Ninguno") {
                        contenedorCves.innerHTML = "<span class='text-muted fw-bold'>Ninguno</span>";
                    } else {
                        const listaCves = data.cves_relacionados.split(/[\n,]+/).map(cve => cve.trim()).filter(cve => cve.length > 0);
                        contenedorCves.innerHTML = listaCves.map(cve => `<a href="https://nvd.nist.gov/vuln/detail/${cve}" target="_blank" class="text-danger fw-bold text-decoration-none d-block mb-1"><i class="bi bi-box-arrow-up-right small"></i> ${cve}</a>`).join('');
                    } 

                    if (data.descripcion_tecnica) document.getElementById('dic_desc').value = data.descripcion_tecnica;
                    if (data.causa_raiz) document.getElementById('dic_causa').value = data.causa_raiz;
                    if (data.impacto_generado) document.getElementById('dic_impacto').value = data.impacto_generado;
                    if (data.acciones_realizadas) document.getElementById('dic_acciones').value = data.acciones_realizadas;
                    if (data.conclusion_tecnica) document.getElementById('dic_conclusion').value = data.conclusion_tecnica;
                    if (data.recomendaciones) document.getElementById('dic_recom').value = data.recomendaciones;
                    if (data.responsable) document.getElementById('dic_resp').value = data.responsable;
                    if (data.vobo) document.getElementById('dic_vobo').value = data.vobo;
                })
                .catch(err => console.error("Error al recuperar datos:", err));

            new bootstrap.Modal(document.getElementById('modalGestionarAlerta')).show();
        }
    });

    // ==========================================
    // 4.5 EDICIÓN BÁSICA DE CLASIFICACIÓN (NUEVO)
    // ==========================================
    
    // Alternar la visibilidad entre el texto fijo y los menús desplegables
    window.toggleEdicionBasica = function() {
        const vista = document.getElementById('vistaDatosBasicos');
        const form = document.getElementById('formularioEdicionBasica');
        
        if (!vista || !form) return; // Seguridad extra
        
        if (vista.style.display === 'none') {
            vista.style.display = 'block';
            form.style.display = 'none';
        } else {
            vista.style.display = 'none';
            form.style.display = 'block';
            
            // Pre-cargar valores actuales en los Selects
            document.getElementById('editTipo').value = document.getElementById('gestionarTipo').innerText;
            document.getElementById('editActivo').value = document.getElementById('gestionarActivo').innerText;

            const areaActual = document.getElementById('gestionarArea').innerText;
            const arrayAreas = areaActual.split(',').map(a => a.trim());
            
            document.querySelectorAll('.chk-area-edit').forEach(chk => {
                chk.checked = arrayAreas.includes(chk.value);
            });
            document.getElementById('btnEditArea').innerText = areaActual || "Seleccione áreas...";
            document.getElementById('editAreaVal').value = areaActual || "";
            
            const sevActual = document.getElementById('gestionarSeveridad').innerText;
            const selectSev = document.getElementById('editSeveridad');
            for (let i = 0; i < selectSev.options.length; i++) {
                // Buscamos coincidencia parcial porque el catálogo dice "Crítica (Impacto grave...)"
                if (selectSev.options[i].value.includes(sevActual) || sevActual.includes(selectSev.options[i].value)) {
                    selectSev.selectedIndex = i;
                    break;
                }
            }
        }
    };

    // Enviar los cambios al servidor
    window.guardarEdicionBasica = async function() {
        const folio = document.getElementById('folioModalOculto').value;
        const tipo = document.getElementById('editTipo').value;
        const activo = document.getElementById('editActivo').value;
        const area = document.getElementById('editAreaVal').value; 
        const severidad = document.getElementById('editSeveridad').value;

        try {
            const response = await fetch(`http://172.17.175.137:3000/api/alertas/${folio}/basicos`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, activo, area, severidad })
            });

            if (response.ok) {
                // 1. Mostrar notificación elegante
                mostrarNotificacion("Clasificación actualizada correctamente.", "success");
                
                // 2. Actualizar los textos visuales del modal sin tener que recargarlo todo
                document.getElementById('gestionarTipo').innerText = tipo;
                document.getElementById('gestionarActivo').innerText = activo;
                document.getElementById('gestionarArea').innerText = area;
                
                // Extraemos solo la primera palabra de la severidad (Ej. "Crítica" de "Crítica (Impacto...)")
                const textoSev = severidad.split(' ')[0];
                const elSeveridad = document.getElementById('gestionarSeveridad');
                elSeveridad.innerText = textoSev;
                
                // Actualizamos el color del badge según la nueva severidad
                let sevClass = textoSev === "Crítica" ? "bg-danger" : 
                               textoSev === "Alta" ? "bg-warning text-dark" : 
                               textoSev === "Media" ? "bg-primary" : "bg-secondary";
                elSeveridad.className = `badge ${sevClass}`;
                
                // 3. Cerrar el formulario y regresar a la vista de lectura
                window.toggleEdicionBasica(); 
                
                // 4. Recargar la tabla de fondo para que los cambios se reflejen al cerrar el modal
                cargarAlertas(); 
            } else {
                const data = await response.json();
                mostrarNotificacion(data.error || "Hubo un error al guardar los cambios.", "error");
            }
        } catch (error) {
            console.error("Error al actualizar clasificación:", error);
            mostrarNotificacion("Error de conexión al servidor.", "error");
        }
    };

    const btnActualizarAlerta = document.getElementById('btnActualizarAlerta');
    if (btnActualizarAlerta) {
        btnActualizarAlerta.addEventListener('click', async () => {
            const idAlerta = document.getElementById('gestionarIdAlerta').innerText;
            const nuevoEstado = document.getElementById('gestionarEstado').value;
            
            const formData = new FormData();
            formData.append('nuevoEstado', nuevoEstado);
            formData.append('sistema', document.getElementById('dic_sistema').value);
            formData.append('desc', document.getElementById('dic_desc').value);
            formData.append('causa', document.getElementById('dic_causa').value);
            formData.append('impacto', document.getElementById('dic_impacto').value);
            formData.append('acciones', document.getElementById('dic_acciones').value);
            formData.append('conclusion', document.getElementById('dic_conclusion').value);
            formData.append('recom', document.getElementById('dic_recom').value);
            formData.append('resp', document.getElementById('dic_resp').value);
            formData.append('vobo', document.getElementById('dic_vobo').value);

            // EMPAQUETAR LOS ARCHIVOS NUEVOS DE LA MEMORIA
            if (window.archivosAcumulados.length > 0) {
                window.archivosAcumulados.forEach(archivo => {
                    formData.append('evidencias', archivo);
                });
            }
            
            try {
                const response = await fetch(`http://172.17.175.137:3000/api/alertas/${idAlerta}/estado`, {
                    method: 'PUT',
                    body: formData 
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Error al actualizar.");

                let mensaje = `¡Cambios guardados en ${idAlerta}!`;
                if (nuevoEstado === "Cierre") {
                    mensaje += `\n✅ RELOJ DETENIDO: El incidente ha sido cerrado exitosamente.`;
                    mostrarNotificacion(mensaje, "success");
                } else {
                    mostrarNotificacion(mensaje, "primary");
                }
                
                // Limpiamos los archivos en espera y recargamos la BD para que ahora aparezcan como "subidos" (nubecita)
                window.archivosAcumulados = [];
                cargarEvidencias(idAlerta);
                cargarAlertas(); 
                
            } catch (error) {
                mostrarNotificacion("Error: " + error.message, "error");
            }
        });
    }

    // ===============================
    // 5. LÓGICA DE LA CAMPANITA (ACTUALIZADA)
    // ===============================
    window.actualizarCampanita = function(alertas) {
        const lista = document.getElementById('listaNotificaciones');
        if(!lista) return;
        lista.innerHTML = '';
        let alertasVencidasOPendientes = 0;
        const ahora = new Date();

        alertas.forEach(alerta => {
            if(alerta.estado === 'Cierre') return;

            const fechaReg = new Date(alerta.fecha_registro);
            const msSLA = alerta.sla_horas * 60 * 60 * 1000;
            const fechaVencimiento = new Date(fechaReg.getTime() + msSLA);
            const msRestantes = fechaVencimiento - ahora;
            const horasRestantesFraccion = msRestantes / (1000 * 60 * 60);

            const umbralAviso = alerta.sla_horas * 0.25;

            if (horasRestantesFraccion <= umbralAviso) {
                alertasVencidasOPendientes++;
                
                const tiempo = obtenerTextoTiempo(msRestantes);
                let tiempoTexto, colorClase, borderClase;

                if (tiempo.vencido) {
                    tiempoTexto = `¡Vencida por ${tiempo.texto}!`;
                    colorClase = 'text-danger'; borderClase = 'border-danger';
                } else {
                    tiempoTexto = `Vence en ${tiempo.texto}`;
                    colorClase = 'text-warning-emphasis'; borderClase = 'border-warning';
                }

                // 👇 CAMBIO DE DISEÑO EN EL TEXTO DE LA ALERTA 👇
                // Mostramos el sistema afectado para dar más contexto al analista
                lista.innerHTML += `
                    <div class="list-group-item list-group-item-action border-start ${borderClase} border-4 rounded mb-2 shadow-sm">
                      <div class="d-flex justify-content-between">
                          <h6 class="mb-1 fw-bold">${alerta.id}</h6>
                          <small class="${colorClase} fw-bold">${tiempoTexto}</small>
                      </div>
                      <p class="mb-1 text-muted small">${alerta.tipo} en <strong>${alerta.sistema_afectado || alerta.activo}</strong>.</p>
                      <p class="mb-2 text-muted small"><i class="bi bi-people-fill"></i> Área: <strong>${alerta.area || 'Sin Área'}</strong></p>
                      <button class="btn btn-sm btn-outline-danger btn-atender-ahora w-100" data-id="${alerta.id}">Abrir Incidente</button>
                    </div>
                `;
            }
        });

        const badgeNotif = document.querySelector('.bi-bell-fill')?.nextElementSibling;
        if (badgeNotif) {
            if (alertasVencidasOPendientes > 0) {
                badgeNotif.style.display = 'inline-block';
                badgeNotif.innerText = alertasVencidasOPendientes;
            } else {
                badgeNotif.style.display = 'none';
                lista.innerHTML = '<p class="text-center text-muted my-4">No hay recordatorios pendientes de SLA.</p>';
            }
        }
    }

    document.getElementById('modalRecordatorios')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-atender-ahora')) {
            const idAlerta = e.target.getAttribute('data-id');
            bootstrap.Modal.getInstance(document.getElementById('modalRecordatorios')).hide();

            document.getElementById('gestionarIdAlerta').innerText = idAlerta;
            document.getElementById('formDictamen').reset();
            
            // LIMPIAR Y CARGAR EVIDENCIAS AL ABRIR DESDE CAMPANITA
            window.archivosAcumulados = [];
            window.evidenciasExistentes = [];
            dibujarTodasLasEvidencias();
            cargarEvidencias(idAlerta);
            
            if (window.alertasData) {
                const alertaInfo = window.alertasData.find(a => String(a.id) === String(idAlerta));
                if (alertaInfo) {
                    document.getElementById('gestionarTipo').innerText = alertaInfo.tipo;
                    document.getElementById('gestionarActivo').innerText = alertaInfo.activo;

                    let sevClass = alertaInfo.severidad === "Crítica" ? "bg-danger" : 
                                   alertaInfo.severidad === "Alta" ? "bg-warning text-dark" : 
                                   alertaInfo.severidad === "Media" ? "bg-primary" : "bg-secondary";
                    const sevSpan = document.getElementById('gestionarSeveridad');
                    if (sevSpan) {
                        sevSpan.innerText = alertaInfo.severidad;
                        sevSpan.className = `badge ${sevClass}`;
                    }

                    const selectEstado = document.getElementById('gestionarEstado');
                    if (selectEstado) {
                        for (let option of selectEstado.options) {
                            if (option.innerText.includes(alertaInfo.estado) || option.value === alertaInfo.estado) {
                                option.selected = true; break;
                            }
                        }
                    }

                    const timerSpan = document.getElementById('gestionarSLA');
                    if (timerSpan) {
                        if(alertaInfo.estado === 'Cierre') {
                            timerSpan.innerHTML = '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle fs-7"><i class="bi bi-check-circle-fill"></i> Resuelto a tiempo</span>';
                        } else {
                            const fechaReg = new Date(alertaInfo.fecha_registro);
                            const msSLA = alertaInfo.sla_horas * 60 * 60 * 1000;
                            const msRestantes = (fechaReg.getTime() + msSLA) - new Date();
                            const tiempo = obtenerTextoTiempo(msRestantes);

                            if (tiempo.vencido) {
                                timerSpan.innerHTML = `<span class="badge bg-danger fs-7 shadow-sm"><i class="bi bi-exclamation-triangle-fill"></i> Vencida por ${tiempo.texto}</span>`;
                            } else {
                                timerSpan.innerHTML = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fs-7"><i class="bi bi-clock-history"></i> Quedan ${tiempo.texto}</span>`;
                            }
                        }
                    }
                }
            }

            fetch(`http://172.17.175.137:3000/api/alertas/${idAlerta}`)
                .then(res => res.json())
                .then(data => {
                    if (data.sistema_afectado) document.getElementById('dic_sistema').value = data.sistema_afectado;
                    
                    const contenedorCves = document.getElementById('dic_cves');
                    if (!data.cves_relacionados || data.cves_relacionados === "Ninguno") {
                        contenedorCves.innerHTML = "<span class='text-muted fw-bold'>Ninguno</span>";
                    } else {
                        const listaCves = data.cves_relacionados.split(/[\n,]+/).map(cve => cve.trim()).filter(cve => cve.length > 0);
                        contenedorCves.innerHTML = listaCves.map(cve => `<a href="https://nvd.nist.gov/vuln/detail/${cve}" target="_blank" class="text-danger fw-bold text-decoration-none d-block mb-1"><i class="bi bi-box-arrow-up-right small"></i> ${cve}</a>`).join('');
                    }
                    
                    if (data.descripcion_tecnica) document.getElementById('dic_desc').value = data.descripcion_tecnica;
                    if (data.causa_raiz) document.getElementById('dic_causa').value = data.causa_raiz;
                    if (data.impacto_generado) document.getElementById('dic_impacto').value = data.impacto_generado;
                    if (data.acciones_realizadas) document.getElementById('dic_acciones').value = data.acciones_realizadas;
                    if (data.conclusion_tecnica) document.getElementById('dic_conclusion').value = data.conclusion_tecnica;
                    if (data.recomendaciones) document.getElementById('dic_recom').value = data.recomendaciones;
                    if (data.responsable) document.getElementById('dic_resp').value = data.responsable;
                    if (data.vobo) document.getElementById('dic_vobo').value = data.vobo;
                }).catch(err => console.error(err));

            new bootstrap.Modal(document.getElementById('modalGestionarAlerta')).show();
        }
        
        if (e.target.classList.contains('btn-config-correos') || e.target.closest('.btn-config-correos')) {
            bootstrap.Modal.getInstance(document.getElementById('modalRecordatorios')).hide();
            cargarContactosSLA(); 
            new bootstrap.Modal(document.getElementById('modalConfigurarCorreos')).show();
        }
    });

    // ==========================================
    // 6. GESTIÓN DEL DIRECTORIO DE CONTACTOS SLA
    // ==========================================
    const tablaContactos = document.getElementById('tablaContactosSLA');

    function cargarContactosSLA() {
        fetch('http://172.17.175.137:3000/api/contactos-sla')
            .then(res => res.json())
            .then(data => {
                tablaContactos.innerHTML = '';
                if(data.length === 0) {
                    tablaContactos.innerHTML = `<tr><td colspan="3" class="text-muted small py-3">No hay correos registrados.</td></tr>`;
                    return;
                }
                data.forEach(c => {
                    tablaContactos.innerHTML += `
                        <tr>
                            <td class="text-start ps-3 align-middle">${c.correo}</td>
                            <td class="align-middle"><span class="badge bg-secondary">${c.area}</span></td>
                            <td class="align-middle"><button class="btn btn-sm btn-outline-danger border-0 btn-eliminar-correo" data-id="${c.id_contacto}"><i class="bi bi-trash3-fill"></i></button></td>
                        </tr>
                    `;
                });
            });
    }

    document.getElementById('btnAgregarCorreo')?.addEventListener('click', async () => {
        const inputCorreo = document.getElementById('nuevoCorreoSLA');
        const inputArea = document.getElementById('nuevoCorreoArea');
        const correo = inputCorreo.value.trim();
        const area = inputArea.value;

        if (!correo || !correo.includes('@') || !area) {
            mostrarNotificacion("Ingrese un correo válido y seleccione un Área.", "warning"); return;
        }

        try {
            const response = await fetch('http://172.17.175.137:3000/api/contactos-sla', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, area })
            });
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error);

            mostrarNotificacion("Contacto asignado exitosamente.", "success");
            inputCorreo.value = "";
            inputArea.value = "";
            cargarContactosSLA(); 
        } catch (error) {
            mostrarNotificacion(error.message, "error");
        }
    });

    tablaContactos?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-eliminar-correo');
        if (btn) {
            const idContacto = btn.getAttribute('data-id');
            if(confirm("¿Seguro que deseas eliminar este correo del directorio SLA?")) {
                try {
                    const response = await fetch(`http://172.17.175.137:3000/api/contactos-sla/${idContacto}`, { method: 'DELETE' });
                    if(!response.ok) throw new Error("Error al eliminar");
                    mostrarNotificacion("Contacto eliminado.", "success");
                    cargarContactosSLA();
                } catch (error) {
                    mostrarNotificacion(error.message, "error");
                }
            }
        }
    });

    // ==========================================
    // 7. GENERACIÓN DE DICTAMEN TÉCNICO EN PDF
    // ==========================================
    document.getElementById('btnGenerarDictamen')?.addEventListener('click', () => {
        const idAlerta = document.getElementById('gestionarIdAlerta').innerText;
        
        // 1. Llenado de textos
        document.getElementById('pdf_id').innerText = idAlerta;
        document.getElementById('pdf_fecha').innerText = new Date().toLocaleDateString('es-MX');
        
        document.getElementById('pdf_desc').innerText = document.getElementById('dic_desc').value || "No especificado";
        document.getElementById('pdf_causa').innerText = document.getElementById('dic_causa').value || "No especificado";
        document.getElementById('pdf_impacto').innerText = document.getElementById('dic_impacto').value || "No especificado";
        document.getElementById('pdf_acciones').innerText = document.getElementById('dic_acciones').value || "No especificado";
        document.getElementById('pdf_conclusion').innerText = document.getElementById('dic_conclusion').value || "No especificado";
        document.getElementById('pdf_recom').innerText = document.getElementById('dic_recom').value || "No especificado";
        document.getElementById('pdf_resp').innerText = document.getElementById('dic_resp').value || "No especificado";
        document.getElementById('pdf_vobo').innerText = document.getElementById('dic_vobo').value || "No especificado";
        document.getElementById('pdf_cves').innerText = document.getElementById('dic_cves').innerText || "Ninguno reportado";
        
        // 2. Llenado de evidencias
        const celdaEvidenciasPDF = document.getElementById('pdf_evidencias');
        const totalEvidencias = window.evidenciasExistentes.length + window.archivosAcumulados.length;
        
        if (totalEvidencias > 0) {
            let textoEvidencias = '<ul style="margin: 0; padding-left: 20px;">';
            window.evidenciasExistentes.forEach(e => { textoEvidencias += `<li>${e.nombre_archivo}</li>`; });
            window.archivosAcumulados.forEach(a => { textoEvidencias += `<li>${a.name}</li>`; });
            textoEvidencias += '</ul><br><small style="color:#555;"><i>* Archivos resguardados en el repositorio digital SGA.</i></small>';
            celdaEvidenciasPDF.innerHTML = textoEvidencias;
        } else {
            celdaEvidenciasPDF.innerHTML = "No se adjuntaron evidencias digitales para este incidente.";
        }

        const contenedor = document.getElementById('contenedorPlantillaPDF');
        const elemento = document.getElementById('plantillaDictamen');
        
        contenedor.style.visibility = 'visible'; // Lo asomamos sin mover la pantalla

        // 3. Configuración estricta para evitar desfases
       const opciones = {
            // [Arriba, Izquierda, Abajo, Derecha]
            // Le damos 15mm a la izquierda (lo empuja a la derecha) y dejamos 5mm de tolerancia a la derecha
            margin:       [8, 0, 15, 0], 
            filename:     `Dictamen_Tecnico_${idAlerta}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                scrollY: 0,
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 4. Generación
        html2pdf().set(opciones).from(elemento).save().then(() => {
            contenedor.style.visibility = 'hidden';
            mostrarNotificacion("📄 Dictamen Técnico generado con formato perfecto.", "success");
        }).catch(err => {
            console.error("Error al generar PDF:", err);
            mostrarNotificacion("Error al generar el documento PDF.", "error");
            contenedor.style.visibility = 'hidden';
        });
    });


    // ==========================================
    // 8. DESCARTAR ALERTA (FALSO POSITIVO) - CON SWEETALERT
    // ==========================================
    document.getElementById('btnDescartarAlerta')?.addEventListener('click', () => {
        const idAlerta = document.getElementById('gestionarIdAlerta').innerText;
        
        // 1. Alerta Elegante con SweetAlert2
        Swal.fire({
            title: '¿Descartar incidente?',
            html: `Estás a punto de descartar la alerta <b>${idAlerta}</b>.<br><br> No podrás deshacer esta acción.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#7c1225', // Rojo institucional
            cancelButtonColor: '#6c757d',  // Gris secundario
            confirmButtonText: '<i class="bi bi-trash3-fill"></i> Sí, descartar alerta',
            cancelButtonText: 'Cancelar',
            reverseButtons: true // Pone el botón de cancelar a la izquierda
        }).then(async (result) => {
            
            // 2. Si el usuario hace clic en "Sí, descartar"
            if (result.isConfirmed) {
                
                // Preparamos los datos con el auto-llenado de descarte
                const formData = new FormData();
                formData.append('nuevoEstado', 'Cierre'); 
                formData.append('sistema', document.getElementById('dic_sistema').value || 'Múltiples / No aplica');
                formData.append('desc', 'ALERTA DESCARTADA. Se identificó como falso positivo, ruido de red o notificación no procesable.');
                formData.append('causa', 'No aplica. Falso positivo o evento esperado.');
                formData.append('impacto', 'Ninguno.');
                formData.append('acciones', 'Se descarta la alerta tras el Triage inicial.');
                formData.append('conclusion', 'Alerta descartada. No representa un riesgo para la infraestructura de la Secretaría.');
                formData.append('recom', 'Afinar reglas de detección en el origen (opcional).');
                formData.append('resp', document.getElementById('dic_resp').value || 'Analista SOC');
                formData.append('vobo', document.getElementById('dic_vobo').value || 'Coordinador SOC');

                try {
                    // Enviamos la petición
                    const response = await fetch(`http://172.17.175.137:3000/api/alertas/${idAlerta}/estado`, {
                        method: 'PUT',
                        body: formData 
                    });

                    const dataResult = await response.json();
                    if (!response.ok) throw new Error(dataResult.error || "Error al descartar.");

                    // Cerramos modal principal y mostramos éxito
                    bootstrap.Modal.getInstance(document.getElementById('modalGestionarAlerta')).hide();
                    cargarAlertas(); 
                    
                    Swal.fire({
                        title: '¡Descartada!',
                        text: `La alerta ${idAlerta} fue finalizada correctamente.`,
                        icon: 'success',
                        confirmButtonColor: '#7c1225'
                    });
                    
                } catch (error) {
                    Swal.fire({
                        title: 'Error',
                        text: error.message,
                        icon: 'error',
                        confirmButtonColor: '#7c1225'
                    });
                }
            }
        });
    });

});
