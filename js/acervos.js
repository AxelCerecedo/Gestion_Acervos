// ====================
// acervos.js con 
// ====================

let repositorios = [];
let currentRepoUrl = '';
let currentCollectionId = '';
let currentPage = 1;
let pageSize = 25;

let itemsTypeChartInstance = null;
let itemsYearChartInstance = null;
let repoComparisonChartInstance = null; 

window.allGlobalItems = [];

// ============================
// Cargar repositorios
// ============================

async function loadRepositorios() {
  try {
    const response = await fetch('http://172.17.175.137:3000/api/acervos/repositorios');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const repos = await response.json();
    repositorios = repos; 

    const selector = document.getElementById('repo-selector');
    selector.innerHTML = ''; 
    
    // Opción por defecto (disabled)
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "--- Selecciona un Repositorio ---";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selector.appendChild(defaultOption);
    
    // Nueva Opción para el Análisis Global (MODIFICACIÓN CLAVE)
    const globalOption = document.createElement('option');
    globalOption.value = "ALL_REPOS";
    globalOption.textContent = "📊 Análisis Global (Todos)";
    selector.appendChild(globalOption);

    if (repos.length === 0) {
        return;
    }

    // AÑADIR REPOSITORIOS INDIVIDUALES
    repos.forEach(repo => {
      const option = document.createElement('option');
      option.value = repo.tainacanApiUrl;
      option.textContent = repo.name;
      selector.appendChild(option);
    });

  } catch (error) {
    console.error('Error cargando repositorios:', error);
    const selector = document.getElementById('repo-selector');
    selector.innerHTML = `<option value="" disabled selected>Error al cargar repositorios</option>`;
  }
}

// ============================
// Mostrar/ocultar secciones
// ============================
function showCollectionsOnly() {
  document.getElementById('items-section')?.classList.add('d-none');
  document.getElementById('collections-section')?.classList.remove('d-none');
  document.getElementById('summary-section')?.classList.remove('d-none');
  document.getElementById('last-added-section')?.classList.remove('d-none');
}

function showItemsOnly() {
  document.getElementById('collections-section')?.classList.add('d-none');
  document.getElementById('summary-section')?.classList.add('d-none');
  document.getElementById('last-added-section')?.classList.add('d-none');

  // Mostrar sección de items y controles
  document.getElementById('items-section')?.classList.remove('d-none');
  document.getElementById('back-to-collections')?.classList.remove('d-none');
  document.getElementById('page-size')?.classList.remove('d-none');
}


function showLoadingState(show) {

  document.getElementById('loading-indicator')?.classList.toggle('d-none', !show);
  ['summary-section', 'individual-charts-wrapper', 'items-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('d-none', show);
  });

  // Por seguridad mantenemos oculto el contenedor de gráficas individuales siempre en loading
  document.getElementById('individual-charts-container')?.classList.add('d-none'); 
}


function hideIndividualAnalysisSections() {
    //console.log('👁️ Ocultando secciones de análisis individual (flujo global/limpieza).');
    document.getElementById('collections-section')?.classList.add('d-none');
    document.getElementById('last-added-section')?.classList.add('d-none');
    document.getElementById('items-section')?.classList.add('d-none'); 
    
    // 🚩 MODIFICACIÓN CLAVE B1: Ocultar el nuevo contenedor de la gráfica de comparación
    document.getElementById('comparison-chart-container')?.classList.add('d-none'); 
    
    // 🚩 MODIFICACIÓN CLAVE B2: Ocultar el nuevo contenedor de gráficas individuales
    document.getElementById('individual-charts-wrapper')?.classList.add('d-none'); 
    document.getElementById('individual-charts-container')?.classList.add('d-none'); // Por seguridad
} 

// ===================================
// Limpiar datos previos (ACTUALIZADA)
// ===================================
function clearAllData(keepComparisonChart = false) {
  //console.log('🧹 Limpiando datos de detalle e instancias de gráficas individuales.');
  document.getElementById('collections-list').innerHTML = '';
  document.getElementById('items-list').innerHTML = '';
  document.getElementById('last-added-items').innerHTML = '';
  document.getElementById('total-collections').textContent = '0';
  document.getElementById('total-items').textContent = '0';

  // Destruir instancias de las gráficas de distribución individual
  if (itemsTypeChartInstance) { itemsTypeChartInstance.destroy(); itemsTypeChartInstance = null; }
  if (itemsYearChartInstance) { itemsYearChartInstance.destroy(); itemsYearChartInstance = null; }
  
  // Destruir la gráfica de comparación de repositorios solo si no la vamos a mantener
  if (!keepComparisonChart && repoComparisonChartInstance) { 
      repoComparisonChartInstance.destroy(); 
      repoComparisonChartInstance = null; 
  }
  
  // Ocultar el contenedor de gráficas individuales
  document.getElementById('individual-charts-container')?.classList.add('d-none');
}

// ============================
// Colecciones (MODIFICADA)
// ============================

async function fetchCollections(repoUrl) {
  try {
    const safeRepoUrl = repoUrl.endsWith('/') ? repoUrl : `${repoUrl}/`;
    const apiUrl = `${safeRepoUrl}collections/?perpage=20`; 
    
    //console.log('🔗 Intentando cargar colecciones de URL:', apiUrl);
    
    const response = await fetch(apiUrl);

    if (!response.ok) {
        console.error('❌ Error HTTP al cargar colecciones. Estado:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const collections = await response.json();

    
    console.log(`✅ Colecciones recibidas: ${collections.length}.`);
    
    displayCollections(collections, repoUrl);

    return collections.length; 

  } catch (error) {
    
    console.error('🚨 Error en fetchCollections:', error);
    document.getElementById('collections-list').innerHTML =
      `<p class="text-danger">Error al cargar las colecciones. Revisa la consola para más detalles.</p>`;
    // Asegurar que el error no detenga Promise.all completamente si se puede manejar
    return 0; 
  }
}

// ============================
// Elementos con paginación
// ============================
async function fetchItems(repoUrl, collectionId, page = 1, perPage = 25) {
  try {
    showLoadingState(true);
    currentRepoUrl = repoUrl;
    currentCollectionId = collectionId;
    currentPage = page;

    const safeRepoUrl = repoUrl.endsWith('/') ? repoUrl : `${repoUrl}/`;
    const apiUrl = `${safeRepoUrl}collection/${collectionId}/items/?perpage=${perPage}&paged=${page}`;
    console.log('🔗 Intentando cargar ítems de URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const items = Array.isArray(data) ? data : data.items || [];
    const totalItems = parseInt(response.headers.get("X-WP-Total"), 10) || items.length;

    console.log(`✅ Ítems recibidos: ${items.length}. Total: ${totalItems}`);

    displayItems(items, true);
    setupPagination(repoUrl, collectionId, totalItems, page, perPage);
    showItemsOnly(); // Mostrar la sección de items solo si hay clic en colección

    const itemsSection = document.getElementById('items-section');
    if (itemsSection) requestAnimationFrame(() => {
      window.scrollTo({ top: itemsSection.offsetTop, behavior: 'smooth' });
      document.getElementById('items-list').scrollTop = 0;
    });

  } catch (error) {
    console.error('🚨 Error fetching items:', error);
    document.getElementById('items-list').innerHTML =
      `<p class="text-danger">No se pudieron cargar los elementos.</p>`;
  } finally {
    showLoadingState(false);
  }
}

// ============================
// Paginación
// ============================
function setupPagination(repoUrl, collectionId, totalItems, currentPage, perPage) {
  const container = document.getElementById('pagination-container');
  container.innerHTML = '';
  const totalPages = Math.ceil(totalItems / perPage);
  if (totalPages <= 1) return;
  console.log(`📄 Configurando paginación. Total Páginas: ${totalPages}, Página Actual: ${currentPage}`);

  const maxPages = 7;
  let start = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let end = Math.min(totalPages, start + maxPages - 1);
  if (end - start + 1 < maxPages) start = Math.max(1, end - maxPages + 1);

  const createBtn = (text, page, active = false, disabled = false) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `btn btn-sm mx-1 ${active ? 'btn-primary' : 'btn-outline-primary'}`;
    btn.disabled = disabled;
    if (!disabled && !active) btn.addEventListener('click', () => fetchItems(repoUrl, collectionId, page, perPage));
    return btn;
  };

  if (currentPage > 1) container.appendChild(createBtn('«', currentPage - 1));
  if (start > 1) { container.appendChild(createBtn('1', 1)); if (start > 2) container.appendChild(Object.assign(document.createElement('span'), { textContent: '...', className: 'mx-1' })); }
  for (let i = start; i <= end; i++) container.appendChild(createBtn(i, i, i === currentPage));
  if (end < totalPages) { if (end < totalPages - 1) container.appendChild(Object.assign(document.createElement('span'), { textContent: '...', className: 'mx-1' })); container.appendChild(createBtn(totalPages, totalPages)); }
  if (currentPage < totalPages) container.appendChild(createBtn('»', currentPage + 1));
}

// ============================
// Resumen
// ============================
async function fetchSummary(repoUrl) {
  //console.log('📊 Iniciando fetchSummary para resumen del repositorio.');
  const safeUrl = repoUrl.endsWith('/') ? repoUrl : repoUrl + '/';
  
  const res = await fetch(`${safeUrl}collections?perpage=500`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const collections = await res.json();
  
  document.getElementById('total-collections').textContent = collections.length;
  console.log(`✅ Total Colecciones: ${collections.length}`);

  let totalItems = 0;
  for (const col of collections) {
    const r = await fetch(`${safeUrl}collection/${col.id}/items?perpage=1`);
    if (r.ok) totalItems += parseInt(r.headers.get("X-WP-Total"), 10) || 0;
  }

  document.getElementById('total-items').textContent = totalItems;

  // 🔥 NUEVO: contar elementos eliminados
  const deletedItems = await fetchDeletedItemsCount(repoUrl);
  document.getElementById('total-deleted-items').textContent = deletedItems;

  console.log(`🗑️ Total Eliminados: ${deletedItems}`);

  document.getElementById('summary-section').classList.remove('d-none');
  
  return { 
    collections: collections.length, 
    items: totalItems,
    deleted: deletedItems
  };
}


// ============================
// Últimos elementos
// ============================
async function fetchLatestItems(repoUrl, limit = 4) {
  const safeUrl = repoUrl.endsWith('/') ? repoUrl : repoUrl + '/';
  const res = await fetch(`${safeUrl}items?perpage=100`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const items = await res.json();
  const container = document.getElementById('last-added-items');
  container.innerHTML = '';
  const latestItems = (Array.isArray(items) ? items : items.items || []).slice(0, limit);
  console.log(`✅ Mostrando ${latestItems.length} últimos elementos.`);


  latestItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'col';
    card.innerHTML = `
      <a href="${item.url}" target="_blank" class="card h-100 shadow-sm item-card text-decoration-none">
        <div class="item-card-image" style="background-image: url('${getItemThumbnail(item)}');"></div>
        <div class="card-body text-center">
          <h6 class="card-title fw-bold text-dark">${item.title}</h6>
        </div>
      </a>`;
    container.appendChild(card);
  });
  document.getElementById('last-added-section')?.classList.remove('d-none');
}


async function fetchAndRenderGeneralCharts(repoUrl) {

    console.log(`📈 Iniciando fetchAndRenderGeneralCharts (${repoUrl})`);

    // 🟡 MODO GLOBAL → NO HACER FETCH
    if (repoUrl === "ALL_REPOS") {
        console.log("🌎 Modo global detectado: usando allGlobalItems");
        return renderChartsFromItems(window.allGlobalItems);
    }

    // -------------------------
    // 🟩 MODO INDIVIDUAL NORMAL
    // -------------------------

    const safeUrl = repoUrl.endsWith('/') ? repoUrl : repoUrl + '/';

    try {
        const collectionsRes = await fetch(`http://172.17.175.137:3000/api/acervos/collections?repoUrl=${encodeURIComponent(url)}`)

        if (!collectionsRes.ok) throw new Error(`Error obteniendo colecciones: ${collectionsRes.status}`);

        const { collections } = await collectionsRes.json();
        let allItems = [];
        const perPage = 250;

        for (const col of collections) {
            let page = 1;

            while (true) {
                const apiUrl = `${safeUrl}collection/${col.id}/items/?perpage=${perPage}&paged=${page}`;
                const itemsRes = await fetch(apiUrl);
                if (!itemsRes.ok) break;

                const data = await itemsRes.json();
                const items = Array.isArray(data) ? data : data.items || [];

                allItems = allItems.concat(items);

                const totalItems = data.totalItems;
                const totalPages = Math.ceil(totalItems / perPage);

                if (page >= totalPages) break;

                page++;
            }
        }

        return renderChartsFromItems(allItems);

    } catch (error) {
        console.error("🚨 Error en fetchAndRenderGeneralCharts:", error);
    }
}

// ===================================
// normalizarItem  
// ===================================
function normalizarItem(item) {

    if (!item || typeof item !== "object") return { tipo: "desconocido", fecha: null };

    // Extraer tipo desde attachments
    let tipo = "desconocido";

    if (Array.isArray(item.attachments) && item.attachments.length > 0) {
        const doc = item.attachments[0];
        tipo = doc.mime_type || doc.type || "desconocido";
    } 
    else if (item.document && item.document.mime_type) {
        tipo = item.document.mime_type;
    }

    // Extraer fecha
    let fecha = null;

    // Tainacan suele usar: item.metadata["dc:date"] o item.metadata["data"]
    if (item.metadata) {
        for (const key in item.metadata) {
            const meta = item.metadata[key];

            if (meta && typeof meta === "object" && meta.value) {
                // Buscar algo que parezca una fecha
                const candidate = meta.value;
                if (/^[0-9]{4}/.test(candidate)) { 
                    fecha = candidate;
                    break;
                }
            }
        }
    }

    // A veces viene como item.modified_date o item.creation_date
    if (!fecha) fecha = item.modified_date || item.creation_date || null;

    return {
        tipo,
        fecha
    };
}


function renderChartsFromItems(allItems) {
   // console.log(`📊 Renderizando gráficas con ${allItems.length} ítems…`);

    const typeCounts = {};
    const yearCounts = {};

    allItems.map(normalizarItem).forEach(d => {
        const t = d.tipo?.toLowerCase() || "desconocido";
        let cat = "Otro";

        if (t.includes("jpg") || t.includes("jpeg") || t.includes("image")) cat = "Imagen";
        else if (t.includes("png")) cat = "Imagen (PNG)";
        else if (t.includes("pdf")) cat = "PDF";
        else if (t.includes("mp4") || t.includes("video")) cat = "Video";
        else if (t.includes("mp3") || t.includes("audio")) cat = "Audio";
        else if (t === "desconocido") cat = "Sin Archivo";

        typeCounts[cat] = (typeCounts[cat] || 0) + 1;

        if (d.fecha) {
            const year = new Date(d.fecha).getFullYear();
            if (!isNaN(year)) yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
    });


    // Destruir gráficas previas
    if (itemsTypeChartInstance) itemsTypeChartInstance.destroy();
    if (itemsYearChartInstance) itemsYearChartInstance.destroy();

    // Render tipo de archivo
    const ctxType = document.getElementById("items-type-chart")?.getContext("2d");
    if (ctxType) {
        itemsTypeChartInstance = new Chart(ctxType, {
            type: "doughnut",
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{ data: Object.values(typeCounts) }]
            }
        });
    }

    // Render por año
    const ctxYear = document.getElementById("items-year-chart")?.getContext("2d");
    if (ctxYear) {
        const sortedYears = Object.keys(yearCounts).sort();

        itemsYearChartInstance = new Chart(ctxYear, {
            type: "bar",
            data: {
                labels: sortedYears,
                datasets: [{
                    label: "Elementos por Año",
                    data: sortedYears.map(year => yearCounts[year])
                }]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });
    }

    document.getElementById("individual-charts-wrapper")?.classList.remove("d-none");
    document.getElementById("individual-charts-container")?.classList.remove("d-none");

    console.log("✅ Gráficas generadas correctamente.");
}

//=============================
//  Elementos Eliminados - Conteo
// ============================ 
async function fetchDeletedItemsCount(repoUrl) {
  const safeUrl = repoUrl.endsWith('/') ? repoUrl : repoUrl + '/';

  try {
    // 📢 Log de diagnóstico de la llamada de conteo
    console.log(`➡️ Llamando a API para conteo (X-WP-Total): ${safeUrl}items?perpage=1&status=trash`);
    
    const res = await fetch(`${safeUrl}items?perpage=1&status=trash`);
    if (!res.ok) {
      console.error("❌ Error al obtener eliminados (conteo):", res.status, res.statusText);
      return 0;
    }

    const totalCount = parseInt(res.headers.get("X-WP-Total"), 10) || 0;
    return totalCount;

  } catch (err) {
    console.error("❌ Error en fetchDeletedItemsCount (Red/Timeout):", err);
    return 0;
  }
}

// ============================================
// Elementos Eliminados - Lista Completa
// ============================================
async function fetchDeletedItemsList(repoUrl) {
    const safeUrl = repoUrl.endsWith('/') ? repoUrl : repoUrl + '/';

    try {
        let allDeleted = [];
        let offset = 0;
        const perPage = 50;
        let totalItems = -1; // Usamos -1 para entrar al menos una vez al bucle

        while (totalItems === -1 || offset < totalItems) {
            
            // 1. Construcción de la URL con offset
            const apiUrl = `${safeUrl}items?status=trash&perpage=${perPage}&offset=${offset}`;

            console.log(`🔍 Fetch Eliminados: offset=${offset} (${apiUrl})`);

            const res = await fetch(apiUrl);
            
            // 2. Manejo de errores
            if (!res.ok) {
                console.error(`❌ Error HTTP offset ${offset}:`, res.status, res.statusText);
                break;
            }

            // 3. 🔑 Leer X-WP-Total en el primer ciclo
            if (totalItems === -1) {
                totalItems = parseInt(res.headers.get("X-WP-Total"), 10) || 0;
                if (totalItems === 0) {
                    console.log('✅ Conteo Total (X-WP-Total) es 0.');
                    break;
                }
            }

            // 4. Procesar la respuesta
            const data = await res.json();
            const items = Array.isArray(data) ? data : data.items || [];

            // 5. Condición de salida si la lista está vacía (aunque totalItems > 0)
            if (!items.length && totalItems > 0) {
                console.warn(`⚠️ La API regresó una lista vacía antes de alcanzar el total esperado (${totalItems}). Deteniendo paginación.`);
                break;
            }
            
            allDeleted.push(...items);

            // 6. Incrementar el offset para la siguiente página
            offset += perPage;
        }

        console.log(`✅ Total recuperados (de ${totalItems} esperados): ${allDeleted.length}`);
        
        // Si el conteo en la tarjeta es correcto (usando fetchDeletedItemsCount), 
        // pero la lista está vacía, es probable que se necesiten credenciales
        if (allDeleted.length === 0 && totalItems > 0) {
             console.warn("🚨 Advertencia: El conteo total es > 0, pero la lista está vacía. Esto suele indicar que se requiere AUTENTICACIÓN (credenciales de usuario) para ver los elementos en la Papelera. Si el repositorio tiene credenciales, el fetch debe ir a tu servidor proxy.");
        }
        
        return allDeleted;

    } catch (err) {
        console.error("❌ Error al obtener eliminados:", err);
        return [];
    }
}

// ================================
// Mostrar eliminados en un modal 
// ================================

async function openDeletedItemsModal() {
    const selector = document.getElementById('repo-selector');
    const selectedValue = selector.value;
    const listContainer = document.getElementById("deleted-items-list");
    
    // Obtener el botón de descarga del modal
    const exportBtn = document.getElementById('export-deleted-csv-btn');
    if (exportBtn) exportBtn.style.display = 'none'; // Ocultar el botón al inicio

    // 1. Validaciones de Flujo
    if (!selectedValue || selectedValue === "--- Selecciona un Repositorio ---") {
        alert("Por favor, selecciona un repositorio individual o elije 'Análisis Global' para ver el resumen en la gráfica.");
        return;
    }

    if (selectedValue === "ALL_REPOS") {
        alert("📊 Estás en modo 'Análisis Global'. Para ver la lista detallada de elementos eliminados, selecciona un repositorio individual en el menú.");
        return; 
    }
    
    let repoToAnalyze = selectedValue; 
    
    // 📢 Log de inicio para diagnóstico
    console.log(`➡️ Intentando cargar elementos eliminados de: ${repoToAnalyze}`);

    // 2. Mostrar Spinner de Carga
    listContainer.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-danger" role="status">
                <span class="visually-hidden">Cargando eliminados...</span>
            </div>
            <p class="mt-2 text-muted">Cargando elementos de la papelera...</p>
        </div>
    `;
    
    // Abrir el Modal inmediatamente para mostrar el spinner
    const modal = new bootstrap.Modal(document.getElementById("deletedItemsModal"));
    modal.show();

    // 3. Obtener Datos
    // Espera la lista de ítems de la papelera. Aquí puede fallar por timeout/CORS.
    const deletedItems = await fetchDeletedItemsList(repoToAnalyze);
    
    // 📢 Log de finalización
    const actualCount = deletedItems.length;
    console.log(`✅ Fetch de elementos eliminados finalizado. Ítems recuperados: ${actualCount}`);

    // 4. Renderizado Condicional: Sustituye el Spinner
    listContainer.innerHTML = ""; // Limpia el spinner

    // **CORRECCIÓN DE CONTEO**: Usamos actualCount (la lista real)
    if (actualCount === 0) {
        listContainer.innerHTML = "<p class='text-muted'>No hay elementos eliminados en la papelera.</p>";
        return;
    } 
    
    // 5. Activación del Botón de Descarga
    if (exportBtn) {
        exportBtn.style.display = 'inline-block'; 
        
        // Clonar el nodo para asegurar que el listener sea único en cada apertura
        const oldBtn = exportBtn;
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        // Adjuntar la lógica de exportación con los datos recién obtenidos
        newBtn.addEventListener('click', () => {
            exportDeletedToCSV(deletedItems); 
        }, { once: true }); 
    }
    
    // 6. Creación y Llenado de la Tabla
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover table-sm';

    const thead = table.createTHead();
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Eliminado Por</th>
            <th>Fecha de Eliminación</th>
        </tr>
    `;

    const tbody = table.createTBody();

    deletedItems.forEach(item => {
        const row = tbody.insertRow();
        
        // Procesamiento de Fecha (usando modification_date)
        const rawDate = item.modification_date || 'Desconocida'; 
        let formattedDate = rawDate;
        
        try {
            if (rawDate !== 'Desconocida' && rawDate.length > 5) {
                // Si ya viene con formato ISO completo
                formattedDate = rawDate; 
            } else if (rawDate !== 'Desconocida') {
                const dateObj = new Date(rawDate);
                // Si viene como timestamp o formato corto, la formateamos
                formattedDate = dateObj.toLocaleDateString('es-MX', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                });
            }
        } catch (e) {
            console.error('Error al formatear la fecha:', e);
            formattedDate = 'Inválida';
        }

        // Celdas
        const idCell = row.insertCell();
        idCell.innerHTML = `<a href="${item.url || '#'}" target="_blank">${item.id}</a>`;

        row.insertCell().textContent = item.title || 'Sin título';
        row.insertCell().textContent = item.author_name || 'Desconocido';
        row.insertCell().textContent = formattedDate;
    });

    // 7. Mostrar Resultados
    listContainer.appendChild(table);
}

// =====================================================
// Función para exportar la lista de eliminados a CSV
// =====================================================
function exportDeletedToCSV(items) {
    if (!items || items.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // 1. Definir encabezados y mapear los campos del JSON
    const headers = ["ID", "Título", "Eliminado Por", "Fecha de Eliminación", "URL"];
    const csvRows = [];

    // 2. Añadir la fila de encabezados
    csvRows.push(headers.join(';'));

    // 3. Mapear los datos de cada ítem
    items.forEach(item => {
        // Obtenemos los valores. Usamos replace(/"/g, '""') para escapar comillas dentro de los campos
        const id = item.id;
        const title = (item.title || "Sin título").replace(/"/g, '""');
        const author = (item.author_name || "Desconocido").replace(/"/g, '""');
        const url = item.url || '';
        
        // Obtener la fecha de modificación (fecha de eliminación)
        const rawDate = item.modification_date || 'Desconocida';

        // Mantenemos el formato legible
        let formattedDate = rawDate;
        if (rawDate !== 'Desconocida' && rawDate.length > 5) {
            formattedDate = rawDate.replace(/"/g, '""'); // Aseguramos que el formato también se escape
        }

        // Crear la fila CSV
        csvRows.push([id, `"${title}"`, `"${author}"`, `"${formattedDate}"`, url].join(';'));
    });

    // 4. Crear el Blob (objeto binario) y el enlace de descarga
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // 5. Disparar la descarga
    link.setAttribute("href", url);
    link.setAttribute("download", `eliminados_repo_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// =====================================================
// Listener para abrir modal de eliminados y efectos del botón
// =====================================================
document.getElementById("deleted-items-card")
    .addEventListener("click", openDeletedItemsModal);

 // Inicializa todos los tooltips de Bootstrap
document.addEventListener('DOMContentLoaded', function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
});


// ===================================
// Gráfica de Comparación de Repositorios (Barras Horizontales)
// ===================================
function fetchAndRenderRepoComparisonChart(data) {
    console.log('📈 Generando gráfica de comparación de repositorios.');
    const ctx = document.getElementById('repo-comparison-chart').getContext('2d');

    if (repoComparisonChartInstance) { 
        repoComparisonChartInstance.destroy(); 
    }
    
    const validData = data.filter(d => d !== null);

    const labels = validData.map(repo => repo.name);
    const itemData = validData.map(repo => repo.items);
    const collectionData = validData.map(repo => repo.collections);
    const deletedItemsData = validData.map(repo => repo.deleted || 0); // 👈 FALTA ESTO

    repoComparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Elementos Totales',
                    data: itemData,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Colecciones Totales',
                    data: collectionData,
                    backgroundColor: 'rgba(40, 167, 80, 0.6)',
                    borderColor: 'rgba(40, 167, 80, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Elementos Eliminados',
                    data: deletedItemsData,
                    backgroundColor: 'rgba(255, 86, 86, 0.6)',
                    borderColor: 'rgba(255, 86, 86, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cantidad' }
                },
                y: {
                    title: { display: true, text: 'Repositorios' }
                }
            },
            plugins: {
                legend: { position: 'top' },
                title: {
                    display: true,
                    text: 'Comparativa de Elementos, Colecciones y Eliminados por Repositorio'
                }
            }
        }
    });
    
    document.getElementById('comparison-chart-container')?.classList.remove('d-none');
    console.log('✅ Gráfica de comparación generada.');
}


// ============================
// Helpers UI
// ============================
function getCollectionImage(col) {
  return col.thumbnail?.medium?.[0] || col.thumbnail?.full?.[0] || col.thumbnail?.thumbnail?.[0] || 'Imagenes/Logos/image.png';
}

function getItemThumbnail(item) {
  if (item.attachments?.length) {
    const img = item.attachments.find(a => a.mime_type?.startsWith('image'));
    if (img) return img.url || img;
  }
  const m = item.document_as_html?.match(/href=['"]([^'"]+)['"]/);
  return m?.[1] || 'Imagenes/Logos/image.png';
}

async function displayCollections(collections, repoUrl) {
  const list = document.getElementById('collections-list');
  list.innerHTML = '';
  if (!collections.length) {
    console.log('👀 No se encontraron colecciones para renderizar.');
    return list.innerHTML = '<p class="text-muted">No se encontraron colecciones.</p>';
  }
  
  console.log(`🎨 Iniciando la renderización de ${collections.length} colecciones.`);

  for (const col of collections) {
    let itemsCount = 0;
    try {
      const r = await fetch(`${repoUrl}/collection/${col.id}/items?perpage=1`);
      if (r.ok) itemsCount = parseInt(r.headers.get("X-WP-Total"), 10) || 0;
    } catch (e) {
      console.error(`   - Error contando elementos para colección ID ${col.id}:`, e);
    }
    const card = document.createElement('div');
    card.className = 'col';
    card.innerHTML = `
      <div class="card h-100 shadow-sm collection-card" data-id="${col.id}" data-url="${repoUrl}">
        <img src="${getCollectionImage(col)}" alt="${col.name}" class="collection-card-img card-img-top">
        <div class="card-body text-center">
          <h5 class="collection-card-title fw-bold">${col.name}</h5>
          <p class="card-text text-muted">${col.description || ''}</p>
          <p class="card-text"><small>${itemsCount} elementos</small></p>
        </div>
      </div>`;
    list.appendChild(card);
  }
}

function displayItems(items, clear = true) {
  const list = document.getElementById('items-list');
  if (clear) list.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) return clear && (list.innerHTML = '<p class="text-muted">No se encontraron elementos en esta colección.</p>');

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <a href="${item.url}" target="_blank" class="card h-100 shadow-sm text-decoration-none">
        <div class="item-card-image" style="background-image: url('${getItemThumbnail(item)}');"></div>
        <div class="card-body">
          <h6 class="card-title fw-bold text-dark">${item.title}</h6>
        </div>
      </a>`;
    list.appendChild(card);
  });
}

// ============================
// LÓGICA DE INICIALIZACIÓN Y EVENTOS DOM (ACTUALIZADO)
// ============================

// Función principal para iniciar el dashboard y la carga global inicial
async function initializeDashboard() {

  // 🔹 Función para limpiar sección de elementos y gráficos individuales
  function resetItemsSection() {
    const itemsSection = document.getElementById('items-section');
    const itemsList = document.getElementById('items-list');
    const collectionName = document.getElementById('collection-name');
    const pagination = document.getElementById('pagination-container');
    const backBtn = document.getElementById('back-to-collections');
    const pageSizeSelect = document.getElementById('page-size');
    const individualChartsWrapper = document.getElementById('individual-charts-wrapper');
    const individualChartsContainer = document.getElementById('individual-charts-container');

    if (itemsSection) itemsSection.classList.add('d-none');
    if (itemsList) itemsList.innerHTML = '';
    if (collectionName) collectionName.textContent = '';
    if (pagination) pagination.innerHTML = '';
    if (backBtn) backBtn.classList.add('d-none');
    if (pageSizeSelect) pageSizeSelect.value = '25';
    if (pageSizeSelect) pageSizeSelect.classList.add('d-none');
    if (individualChartsWrapper) individualChartsWrapper.classList.add('d-none');
    if (individualChartsContainer) individualChartsContainer.classList.add('d-none');
  }

  // 🔹 Limpiar todas las secciones al inicio
  resetItemsSection();

  // 1. Mostrar estado de carga mientras se cargan los repositorios
  showLoadingState(true); 
  
  // 2. Cargar la lista de repositorios disponibles
  await loadRepositorios(); 
  
  // 3. Ocultar el indicador de carga al terminar
  showLoadingState(false);

  // ====================================================
  // Establecer listeners de eventos
  // ====================================================

  const collectionsList = document.getElementById('collections-list');
  const pageSizeSelector = document.getElementById('page-size');
  const analizarBtn = document.getElementById('analizar-repos'); 

  // --- Listener: Botón "Analizar repositorio" ---
  analizarBtn.addEventListener('click', handleAnalysisRequest);

  // --- Listener: Cambio de tamaño de página ---
  pageSizeSelector.addEventListener('change', e => {
    const newSize = parseInt(e.target.value, 10);
    if (!isNaN(newSize) && currentRepoUrl && currentCollectionId) {
      pageSize = newSize;
      currentPage = 1;
      fetchItems(currentRepoUrl, currentCollectionId, currentPage, pageSize);
    }
  });

  // --- Listener: Click en una colección ---
  collectionsList.addEventListener('click', e => {
    const card = e.target.closest('.collection-card');
    if (!card) return;

    const collectionName = card.querySelector('.collection-card-title').textContent;
    const repoUrl = card.dataset.url;
    const collectionId = card.dataset.id;

    console.log(`👆 Colección clickeada: ID=${collectionId}, Nombre="${collectionName}" en URL: ${repoUrl}`);

    document.getElementById('collection-name').textContent = collectionName;
    currentRepoUrl = repoUrl;
    currentCollectionId = collectionId;
    currentPage = 1;

    showItemsOnly();
    fetchItems(currentRepoUrl, currentCollectionId, currentPage, pageSize);
  });

  // --- Listener: Botón "Volver a Colecciones" ---
  const backBtn = document.getElementById('back-to-collections');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showCollectionsOnly();
      resetItemsSection(); // Limpiar todo al volver
    });
  }
}

// =========================================================
// Reset de sección de elementos al cambiar de repositorio
// =========================================================
function resetItemsSection() {
  const itemsSection = document.getElementById('items-section');
  const itemsList = document.getElementById('items-list');
  const collectionName = document.getElementById('collection-name');
  const pagination = document.getElementById('pagination-container');
  const backBtn = document.getElementById('back-to-collections');
  const pageSizeSelect = document.getElementById('page-size');

  if (itemsSection) itemsSection.classList.add('d-none');       // Ocultar sección
  if (itemsList) itemsList.innerHTML = '';                      // Limpiar elementos
  if (collectionName) collectionName.textContent = '';          // Limpiar nombre de colección
  if (pagination) pagination.innerHTML = '';                    // Limpiar paginación
  if (backBtn) backBtn.classList.add('d-none');                 // Ocultar botón volver
  if (pageSizeSelect) pageSizeSelect.value = '25';              // Reset selector
}

// ============================
// Manejo del clic en "Analizar repositorio"
// ============================
async function handleAnalysisRequest() {
    const repoSelector = document.getElementById('repo-selector');
    const selectedUrl = repoSelector.value;
    const comparisonChartContainer = document.getElementById("comparison-chart-container");
    const exportBtn = document.getElementById('export-csv-btn');
    
    // Validar selección
    if (!selectedUrl || selectedUrl === "") {
        alert('Por favor, selecciona un repositorio de la lista para iniciar el análisis.');
        return;
    }

    // Actualiza la variable global que utiliza el modal de eliminados
    currentRepoUrl = selectedUrl; 

    // Ocultar todas las secciones de detalle individual al inicio
    hideIndividualAnalysisSections();

    // Mostrar u ocultar botón exportar y contenedor de gráfica de comparación
    if (selectedUrl === "ALL_REPOS") {
        exportBtn.classList.remove('d-none');
        comparisonChartContainer.classList.remove("d-none");
    } else {
        exportBtn.classList.add('d-none');
        comparisonChartContainer.classList.add("d-none");
    }

    // 🔹 Flujo GLOBAL (todos los repositorios)
    if (selectedUrl === "ALL_REPOS") {
        resetItemsSection(); 
        await runGlobalAnalysis(); // <-- Llamada a la nueva función global
        return;
    }

    // 🔹 Flujo INDIVIDUAL (repositorio único)
    resetItemsSection();
    showLoadingState(true);
    clearAllData(false); // Limpiar datos previos y gráficas individuales

    //console.log(`🔄 Iniciando análisis individual para: ${selectedUrl}`);

    try {
        await Promise.all([
            fetchCollections(selectedUrl),
            fetchSummary(selectedUrl),
            fetchLatestItems(selectedUrl),
            // La generación de gráficas individuales se realiza después del Summary
            // para asegurar que los datos del resumen se carguen primero
        ]);

        // Ya que el fetchAndRenderGeneralCharts necesita tiempo y recursos, 
        // lo llamamos aquí si no se usó en el Promise.all
        await fetchAndRenderGeneralCharts(selectedUrl);

        // Mostrar secciones individuales
        document.getElementById('last-added-section')?.classList.remove('d-none');
        document.getElementById('collections-section')?.classList.remove('d-none');
        document.getElementById('summary-section')?.classList.remove('d-none');

    } catch (err) {
        console.error('🚨 Error general al cargar repositorio individual:', err);
    } finally {
        showLoadingState(false);
    }
}

// ============================
// CONTEO RÁPIDO DE ELEMENTOS (Usando X-WP-Total)
// ============================
async function fetchCollectionItemsCount(repoUrl, collectionId) {
    const safeUrl = repoUrl.endsWith('/') ? repoUrl : repoUrl + '/';
    
    try {
        // La solicitud más eficiente: perpage=1 para forzar la cabecera X-WP-Total sin descargar data
        const apiUrl = `${safeUrl}collection/${collectionId}/items?perpage=1`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`❌ Error HTTP al contar ítems de colección ${collectionId}: ${response.status}`);
            return 0;
        }

        // Leer solo la cabecera X-WP-Total
        const totalItems = parseInt(response.headers.get("X-WP-Total"), 10) || 0;
        return totalItems;

    } catch (error) {
        console.error(`🚨 Error en fetchCollectionItemsCount para colección ${collectionId}:`, error);
        return 0;
    }
}

// ============================================
// 🔹 Función: Análisis Global (VERSIÓN OPTIMIZADA SOLO PARA CONTEO)
//    (Requiere que 'fetchCollectionItemsCount' esté definida)
// ============================================
async function runGlobalAnalysis() {
    console.log("🌎 Ejecutando análisis global (MODO RÁPIDO: SOLO CONTEO)...");

    let totalCollections = 0;
    let totalItems = 0;
    let totalDeleted = 0;
    
    // 🚩 Estructura para almacenar los datos de comparación por repositorio
    let repoComparisonData = []; 

    // ⛔ Se vacía (no se generan gráficas de tipo/año en este modo)
    window.allGlobalItems = []; 

    showLoadingState(true);

    // 🚀 Utilizamos Promise.all para procesar cada repositorio en PARALELO
    const repoPromises = repositorios.map(async (repo) => {
        const repoUrl = repo.tainacanApiUrl;
        const repoName = repo.name;
        const safeUrl = repoUrl.endsWith("/") ? repoUrl : repoUrl + "/";
        
        console.log(`📁 Procesando repositorio: ${repoName}`);

        let repoTotalItems = 0; 
        let repoTotalCollections = 0;
        let repoDeletedItems = 0;
        
        let repoResult = { name: repoName, items: 0, collections: 0, deleted: 0 };

        try {
            // --- 1️⃣ Obtener Colecciones (para el conteo y la lista de IDs) ---
            const collectionsRes = await fetch(`${safeUrl}collections?perpage=500`);
            const collections = collectionsRes.ok ? await collectionsRes.json() : [];
            const collectionsArray = Array.isArray(collections) ? collections : (collections.collections || []);
            
            repoTotalCollections = collectionsArray.length;
            
            // --- 2️⃣ Items de cada colección (SOLO CONTEO RÁPIDO PARALELO) ---
            
            // Array de promesas para contar los ítems de cada colección
            const itemCounts = collectionsArray.map(col => 
                // 📞 Llama a la función auxiliar que usa perpage=1 y X-WP-Total
                fetchCollectionItemsCount(repoUrl, col.id)
            );
            
            // Esperamos a que TODOS los conteos de colección terminen
            const itemsPerCollection = await Promise.all(itemCounts);
            
            repoTotalItems = itemsPerCollection.reduce((sum, count) => sum + count, 0);

            // --- 3️⃣ Items eliminados (SOLO CONTEO RÁPIDO) ---
            repoDeletedItems = await fetchDeletedItemsCount(repoUrl);

            // 4️⃣ Almacenar resultados en el objeto que se retornará (CLAVE para la gráfica)
            repoResult.collections = repoTotalCollections; 
            repoResult.items = repoTotalItems;
            repoResult.deleted = repoDeletedItems;

        } catch (e) {
            console.warn(`⚠ Error crítico al procesar repositorio ${repoName}:`, e);
            // Manejo de error para no detener Promise.all
            repoResult = { name: repoName + ' (Error)', items: 0, collections: 0, deleted: 0 };
        }
        
        return repoResult;
    });

    // Esperar a que terminen todas las promesas de los repositorios
    const results = await Promise.all(repoPromises);

    // Acumular los totales globales y preparar la data de la gráfica
    results.forEach(res => {
        totalCollections += res.collections;
        totalItems += res.items;
        totalDeleted += res.deleted;
        repoComparisonData.push(res);
    });

    // Mostrar totales globales
    document.getElementById('total-collections').textContent = totalCollections;
    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('total-deleted-items').textContent = totalDeleted;

    console.log("🌎 Análisis global completado (SOLO CONTEO):", {
        totalCollections,
        totalItems,
        totalDeleted
    });

    // 5️⃣ Generar gráfica de comparación de repositorios
    // Filtramos para evitar mostrar barras de repos con 0 datos (solo errores)
    fetchAndRenderRepoComparisonChart(repoComparisonData.filter(d => d.collections > 0 || d.items > 0));
    
    // Ocultar gráficas individuales y mostrar la sección de comparación
    document.getElementById('individual-charts-wrapper')?.classList.add('d-none');
    document.getElementById('individual-charts-container')?.classList.add('d-none');
    document.getElementById('comparison-chart-container')?.classList.remove('d-none');
    
    document.getElementById('summary-section')?.classList.remove('d-none');
    
    showLoadingState(false);
}


function exportRepoDataToCSV(data) {
    if (!data || !data.length) return alert('No hay datos para exportar.');

    // 🔹 Agregar la nueva columna "Eliminados Totales"
    const headers = ['Repositorio', 'Colecciones Totales', 'Elementos Totales', 'Eliminados Totales'];

    // 🔹 Agregar d.deleted a cada fila
    const rows = data
        .filter(d => d !== null)
        .map(d => [
            d.name,
            d.collections,
            d.items,
            d.deleted || 0   // ← Esto es lo nuevo
        ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'repositorios_global.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.getElementById('export-csv-btn').addEventListener('click', () => {
    exportRepoDataToCSV(window.globalRepoData || []);
});




document.addEventListener('DOMContentLoaded', initializeDashboard);