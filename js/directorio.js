const cardsContainer = document.getElementById("directorioCards");
const tableContainer = document.getElementById("directorioTableContainer");
const searchInput = document.getElementById("searchInput");
const addForm = document.getElementById("addForm");
const submitBtn = document.getElementById("submitBtn");
const mensaje = document.getElementById("mensaje");
const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
const cardViewBtn = document.getElementById("cardViewBtn");
const tableViewBtn = document.getElementById("tableViewBtn");

let directorio = [];
let currentView = 'cards'; // Variable para guardar la vista actual

// Función para detectar duplicados según servidor + dirección + aplicación
function esDuplicado(nuevo, lista) {
  return lista.some(reg =>
    reg.servidor === nuevo.servidor &&
    reg.direccion === nuevo.direccion &&
    reg.aplicacion === nuevo.aplicacion
  );
}

// Cargar datos desde MySQL
function cargarRegistros(highlightId = null) {
  fetch("http://172.17.175.137:3000/api/registros")
    .then(res => res.json())
    .then(data => {
      directorio = data;
      toggleView(currentView, highlightId); // Llama a toggleView para inicializar
    })
    .catch(err => console.error("Error al cargar registros:", err));
}

cargarRegistros();

/*
// --- Mapeo de nombres de repositorios a rutas de imágenes ---
const repositorioLogos = {
  "Entorno de desarrollo": "Imagenes/logo.png",
  "Centro de la Imagen": "Imagenes/C.png",
  "Festival Internacional Cervantino": "Imagenes/FIC.png",
  "Sitios y Monumentos": "Imagenes/BM.png",
  "Multimedia": "Imagenes/RM.png",
  "Patrimonio Ferrocarrilero": "Imagenes/PCF.png",
  "CID “Alberto Beltrán”": "Imagenes/CID.png",
  "Original": "Imagenes/logo.png",
  "INEHRM": "Imagenes/INEHRM.png",
  "Mexicana": "Imagenes/mexicana.png",
  "INAH": "Imagenes/INAH.png",
  "Culturas Populares": "Imagenes/MNCP.png"
};
*/

// --- FUNCIÓN PARA RENDERIZAR TARJETAS ---

function renderCards(data, highlightId = null) {
  cardsContainer.innerHTML = "";
  if (data.length === 0) {
    cardsContainer.innerHTML = `
      <div class="col-12 text-center">
        <p class="fs-4 text-muted">No hay registros disponibles</p>
      </div>`;
    return;
  }
  
  const query = searchInput.value.toLowerCase();
  const filteredData = query ? data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(query))) : data;

  filteredData.forEach((item) => {
    const card = document.createElement("div");
    card.className = "col";

    if (item.id === highlightId) {
      card.classList.add("highlight-new");
    }

    // **MODIFICA ESTA LÍNEA**
    const logoSrc = item.imagen_url || "Imagenes/Logos/logo.png"; // Usa la URL de la base de datos, o una por defecto

    card.innerHTML = `
      <div class="card h-100 shadow-sm text-center">
        <img src="${logoSrc}" class="card-img-top mx-auto mt-3" alt="Logo de ${item.nombre}">
        <div class="card-body">
          <h5 class="card-title">${item.nombre}</h5>
          <p class="card-text">
           <a href="${item.direccion}" target="_blank" class="text-decoration-none">${item.direccion}</a>
          </p>
        </div>
        <div class="card-footer bg-transparent border-0">
          <button class="btn btn-primary w-100" onclick="showDetailsModal(${item.id})">Ver detalles</button>
        </div>
      </div>
    `;
    cardsContainer.appendChild(card);
  });
}



// FUNCION EXTRA:

// --- FUNCIÓN PANTALLA DE BIENVENIDA ---

document.addEventListener("DOMContentLoaded", function() {
    const welcomeScreen = document.getElementById("welcomeScreen");
    const usernamePlaceholder = document.getElementById("usernamePlaceholder");

    // Si no existen, NO ejecutar nada.
    if (!welcomeScreen || !usernamePlaceholder) return;

    const nombreUsuario = localStorage.getItem('Axel Cerecedo') || 'Axel Cerecedo'; 
    usernamePlaceholder.textContent = nombreUsuario;

    setTimeout(() => {
        welcomeScreen.classList.add("fade-out");

        setTimeout(() => {
            welcomeScreen.style.display = 'none';
        }, 1500);
    }, 2000);
});




// --- FUNCIÓN PARA RENDERIZAR TABLA ---
function renderTable(data, highlightId = null) {
    tableContainer.innerHTML = "";
    if (data.length === 0) {
        tableContainer.innerHTML = `<div class="col-12 text-center"><p class="fs-4 text-muted">No hay registros disponibles</p></div>`;
        return;
    }
    
    // Revisa si hay una búsqueda activa y filtra los datos
    const query = searchInput.value.toLowerCase();
    const filteredData = query ? data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(query))) : data;

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered";
    table.innerHTML = `
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Dominio</th>
                <th>Aplicación</th>
                <th>Estado</th>
                <th>Versión App</th>
                <th>Nivel Vul.</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector("tbody");

    filteredData.forEach(item => {
        const row = document.createElement("tr");
        if (item.id === highlightId) {
            row.classList.add("highlight-new");
        }
        row.innerHTML = `
            <td>${item.nombre || 'N/A'}</td>
            <td><a href="${item.direccion}" target="_blank">${item.direccion || 'N/A'}</a></td>
            <td>${item.aplicacion || 'N/A'}</td>
            <td>${item.estado || 'N/A'}</td>
            <td>${item.version_app || 'N/A'}</td>
            <td>${item.nivel_vulnerabilidad || 'N/A'}</td>
            <td>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-info text-white" onclick="showDetailsModal(${item.id})">Ver</button>
                  <button class="btn btn-sm btn-warning" onclick="editRecord(${item.id})">Editar</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteRecord(${item.id})">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    tableContainer.appendChild(table);
}

// --- FUNCIÓN PARA CAMBIAR LA VISTA ---
function toggleView(viewType, highlightId = null) {
  currentView = viewType;

  // Actualiza los botones de vista
  cardViewBtn.classList.remove('active');
  tableViewBtn.classList.remove('active');
  if (viewType === 'cards') {
    cardViewBtn.classList.add('active');
    cardsContainer.style.display = 'flex';
    tableContainer.style.display = 'none';
    renderCards(directorio, highlightId);
  } else {
    tableViewBtn.classList.add('active');
    cardsContainer.style.display = 'none';
    tableContainer.style.display = 'block';
    renderTable(directorio, highlightId);
  }
}

// --- FUNCIÓN PARA MOSTRAR EL MODAL DE DETALLES ---

async function showDetailsModal(id) {
  const item = directorio.find(r => r.id === id);
  if (!item) return;

  // --- Elementos del modal ---
  const modalTitle = document.getElementById("detailsModalLabel");
  const modalEditBtn = document.getElementById("modalEditBtn");
  const modalDeleteBtn = document.getElementById("modalDeleteBtn");

  // --- Contenedores de contenido para las pestañas ---
  const generalContent = document.getElementById("generalInfoContent");
const serverContent = document.getElementById("serverDetailsContent");
const securityContent = document.getElementById("securityCertificatesContent");
const metricsContent = document.getElementById("metricsContent");
const pluginsListContainer = document.getElementById("pluginsListContent"); // coincide con el HTML


  // Verificar que los contenedores existan
  if (!generalContent || !serverContent || !securityContent || !metricsContent || !pluginsListContainer) {
    console.error("❌ Uno o varios contenedores del modal no existen en el DOM");
    return;
  }

  modalTitle.textContent = `Detalles de ${item.nombre}`;

  // --- Pestaña 1: Información General ---
  generalContent.innerHTML = `
    <h5 class="mb-3">Información del Repositorio</h5>
    <dl class="row">
      <dt class="col-sm-4">🖥️ Aplicación:</dt>
      <dd class="col-sm-8">${item.aplicacion || 'N/A'}</dd>
      <dt class="col-sm-4">🔗 Dominio:</dt>
      <dd class="col-sm-8">
        <a href="${item.direccion || '#'}" target="_blank">${item.direccion || 'N/A'}</a>
      </dd>
      <dt class="col-sm-4">📦 Versión de app:</dt>
      <dd class="col-sm-8">${item.version_app || 'N/A'}</dd>
    </dl>
  `;

  // --- Pestaña 2: Detalles del Servidor ---
  serverContent.innerHTML = `
    <h5 class="mb-3">Detalles del Servidor</h5>
    <dl class="row">
      <dt class="col-sm-4">🏠 Dirección IP:</dt>
      <dd class="col-sm-8">${item.servidor || 'N/A'}</dd>
      <dt class="col-sm-4">🐧 Sistema Operativo:</dt>
      <dd class="col-sm-8">${item.sistema_operativo || 'N/A'}</dd>
      <dt class="col-sm-4">🟢 Estado:</dt>
      <dd class="col-sm-8">${item.estado || 'N/A'}</dd>
      <dt class="col-sm-4">🐘 Versión PHP:</dt>
      <dd class="col-sm-8">${item.version_php || 'N/A'}</dd>
      <dt class="col-sm-4">🐬 Versión MariaDB:</dt>
      <dd class="col-sm-8">${item.version_mdb || 'N/A'}</dd>
    </dl>
  `;

  // --- Pestaña 3: Seguridad y Certificados ---
  securityContent.innerHTML = `
    <h5 class="mb-3">Seguridad y Certificado</h5>
    <dl class="row">
      <dt class="col-sm-4">🔐 Certificado:</dt>
      <dd class="col-sm-8">${item.certificado || 'N/A'}</dd>
      <dt class="col-sm-4">📅 Emitido:</dt>
      <dd class="col-sm-8">${item.emitido ? item.emitido.split("T")[0] : 'N/A'}</dd>
      <dt class="col-sm-4">🗓️ Vencimiento:</dt>
      <dd class="col-sm-8">${item.vencimiento ? item.vencimiento.split("T")[0] : 'N/A'}</dd>
      <dt class="col-sm-4">⚠️ Nivel de Vulnerabilidad:</dt>
      <dd class="col-sm-8">${item.nivel_vulnerabilidad || 'N/A'}</dd>
    </dl>
  `;

  // --- Pestaña 4: Métricas ---
  metricsContent.innerHTML = `
    <h5 class="mb-3">Almacenamiento del Servidor</h5>
    <dl class="row">
      <dt class="col-sm-4">💾 Almacenamiento:</dt>
      <dd class="col-sm-8">${item.almacenamiento_utilizado || '0'} de ${item.almacenamiento_asignado || '0'}</dd>
      <dt class="col-sm-4">🧠 Memoria:</dt>
      <dd class="col-sm-8">${item.memoria || 'N/A'}</dd>
      <dt class="col-sm-4">⚙️ Procesadores:</dt>
      <dd class="col-sm-8">${item.procesadores || 'N/A'}</dd>
    </dl>
  `;

  // --- Pestaña 5: Plugins WordPress ---
pluginsListContainer.innerHTML = `<p class="text-muted">Cargando plugins...</p>`;

try {
  const pluginsRes = await fetch(`http://172.17.175.137:3000/api/plugins-live/${item.id}`);
  if (!pluginsRes.ok) throw new Error("No se pudo obtener la lista de plugins.");
  const plugins = await pluginsRes.json();

  if (plugins.length > 0) {
    const pluginsHTML = await Promise.all(plugins.map(async plugin => {
      const estado = plugin.status || 'Desconocido';
      let tipoPlugin = 'Gratis'; // Por defecto

      
      // --- Determinar tipo ---
      if ((plugin.nombre && plugin.nombre.toLowerCase().includes('premium')) || plugin.personalizado) {
        tipoPlugin = 'Premium';
      }

      // --- Determinar clase de color según estado ---
      let estadoClass;
      switch (estado.toLowerCase()) {
        case 'active':
          estadoClass = 'text-success'; // verde
          break;
        case 'inactive':
          estadoClass = 'text-secondary'; // gris
          break;
        default:
          estadoClass = 'text-danger'; // rojo
      }

      return `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <span>
            ${plugin.nombre} 
            <small class="${estadoClass}">(${estado})</small> 
            <small class="text-danger">[${tipoPlugin}]</small>
          </span>
          <small class="text-muted">Versión: ${plugin.version} </small>
        </div>
      `;
    }));

    pluginsListContainer.innerHTML = pluginsHTML.join('');
  } else {
    pluginsListContainer.innerHTML = `<p class="text-muted">No se encontraron plugins.</p>`;
  }

} catch (error) {
  console.error("Error al cargar plugins:", error);
  pluginsListContainer.innerHTML = `<p class="text-danger">Error al cargar la información de los plugins.</p>`;
}


  // --- Botones de acción ---
  modalEditBtn.onclick = () => {
    editRecord(id);
    detailsModal.hide();
  };
  modalDeleteBtn.onclick = () => {
    deleteRecord(id);
    detailsModal.hide();
  };

  // --- Mostrar el modal ---
  detailsModal.show();
}

searchInput.addEventListener("input", () => {
  toggleView(currentView); // Llama a la vista actual para filtrar
});

function getFormData() {
  return {
    servidor: document.getElementById("inputServidor").value.trim(),
    direccion: document.getElementById("inputDireccion").value.trim(),
    nombre: document.getElementById("inputNombre").value.trim(),
    aplicacion: document.getElementById("inputAplicacion").value.trim(),
    version_app: document.getElementById("inputVersionApp").value.trim(),
    estado: document.getElementById("inputEstado").value.trim(),
    version_php: document.getElementById("inputVersionPHP").value.trim(),
    version_mdb: document.getElementById("inputVersionMDB").value.trim(),
    certificado: document.getElementById("inputCertificado").value.trim(),
    emitido: document.getElementById("inputEmitido").value,
    vencimiento: document.getElementById("inputVencimiento").value,
    nivel_vulnerabilidad: document.getElementById("inputNivelVul").value.trim(),
    almacenamiento_asignado: document.getElementById("inputAlmacenamiento").value.trim(),
    almacenamiento_utilizado: document.getElementById("inputAlmacenamientoUtilizado")?.value.trim() || "",
    memoria: document.getElementById("inputMemoria")?.value.trim() || "",
    procesadores: document.getElementById("inputProcesadores")?.value.trim() || "",
    sistema_operativo: document.getElementById("inputSO")?.value.trim() || "",
    imagen_url: document.getElementById("inputImagenUrl").value.trim()
  };
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isEditing = addForm.hasAttribute("data-id");
  const formData = getFormData();

  if (!isEditing && esDuplicado(formData, directorio)) {
    alert("⚠️ Este registro ya existe en el directorio.");
    return;
  }

  const confirmar = confirm(isEditing ? "¿Quieres actualizar este registro?" : "¿Quieres agregar este registro?");
  if (!confirmar) return;

  const id = addForm.getAttribute("data-id");

  const url = id
    ? `http://172.17.175.137:3000/api/registros/${id}`
    : "http://172.17.175.137:3000/api/registros";

  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (!res.ok) throw new Error(isEditing ? "Error al actualizar el registro" : "Error al crear el registro");

    const result = await res.json();

    addForm.reset();
    addForm.removeAttribute("data-id");

    submitBtn.textContent = "Agregar Registro";

    cargarRegistros(result.id);

    mensaje.textContent = isEditing ? "Registro actualizado correctamente ✔️" : "Registro agregado correctamente ✔️";
    mensaje.style.backgroundColor = "#4caf50";
    mensaje.style.color = "white";
    mensaje.style.display = "block";

    setTimeout(() => {
      mensaje.style.display = "none";
    }, 3000);

  } catch (err) {
    console.error(err);
    alert(isEditing ? "Ocurrió un error al actualizar el registro." : "Ocurrió un error al guardar el registro.");
  }
});

function editRecord(id) {
  const item = directorio.find(r => r.id === id);

  if (!item) {
    console.warn("⚠️ No se encontró ningún registro con ese ID.");
    return;
  }

  document.getElementById("inputServidor").value = item.servidor || "";
  document.getElementById("inputDireccion").value = item.direccion || "";
  document.getElementById("inputNombre").value = item.nombre || "";
  document.getElementById("inputAplicacion").value = item.aplicacion || "";
  document.getElementById("inputVersionApp").value = item.version_app || "";
  document.getElementById("inputEstado").value = item.estado || "";
  document.getElementById("inputVersionPHP").value = item.version_php || "";
  document.getElementById("inputVersionMDB").value = item.version_mdb || "";
  document.getElementById("inputCertificado").value = item.certificado || "";
  document.getElementById("inputEmitido").value = item.emitido?.split("T")[0] || "";
  document.getElementById("inputVencimiento").value = item.vencimiento?.split("T")[0] || "";
  document.getElementById("inputNivelVul").value = item.nivel_vulnerabilidad || "";
  document.getElementById("inputAlmacenamiento").value = item.almacenamiento_asignado || "";
  document.getElementById("inputAlmacenamientoUtilizado").value = item.almacenamiento_utilizado || "";
  document.getElementById("inputMemoria").value = item.memoria || "";
  document.getElementById("inputProcesadores").value = item.procesadores || "";
  document.getElementById("inputSO").value = item.sistema_operativo || "";
  document.getElementById("inputImagenUrl").value = item.imagen_url || "";

  addForm.setAttribute("data-id", item.id);
  submitBtn.textContent = "Actualizar Registro";

  window.scrollTo({ top: 0, behavior: 'smooth' });
  mensaje.textContent = "Editando registro... ✏️";
  mensaje.style.backgroundColor = "#ffc107";
  mensaje.style.color = "#212529";
  mensaje.style.display = "block";

  setTimeout(() => {
    mensaje.style.display = "none";
    mensaje.textContent = "Registro agregado correctamente ✔️";
    mensaje.style.backgroundColor = "#4caf50";
    mensaje.style.color = "white";
  }, 3000);
}

function deleteRecord(id) {
  if (!confirm("¿Seguro que quieres eliminar este registro?")) return;

  fetch(`http://172.17.175.137:3000/api/registros/${id}`, {
    method: "DELETE"
  })
  .then(res => {
    if (!res.ok) throw new Error("Error al eliminar registro");
    return res.json();
  })
  .then(() => {
    cargarRegistros();

    mensaje.textContent = "Registro eliminado correctamente ✔️";
    mensaje.style.backgroundColor = "#dc3545";
    mensaje.style.color = "white";
    mensaje.style.display = "block";

    setTimeout(() => {
      mensaje.style.display = "none";
      mensaje.textContent = "Registro agregado correctamente ✔️";
      mensaje.style.backgroundColor = "#4caf50";
      mensaje.style.color = "white";
    }, 3000);
  })
  .catch(err => {
    console.error("Error al eliminar:", err);
    alert("Ocurrió un error al eliminar el registro.");
  });
}

// === EXPORTAR CSV ===
document.getElementById("exportCsvBtn").addEventListener("click", () => {
  if (directorio.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const csvHeader = [
  "servidor", "direccion", "nombre", "aplicacion", "version_app",
  "estado", "version_php", "version_mdb", "certificado",
  "emitido", "vencimiento", "nivel_vulnerabilidad",
  "almacenamiento_asignado", "almacenamiento_utilizado", "memoria", "procesadores", "sistema_operativo"
];


  const csvRows = directorio.map(item =>
    csvHeader.map(header => `"${item[header] ?? ''}"`).join(",")
  );
  const csvContent = [csvHeader.join(","), ...csvRows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "directorio.csv";
  a.click();

  URL.revokeObjectURL(url);
});

/*
// === IMPORTAR CSV ===
document.getElementById("importCsvBtn").addEventListener("click", () => {
  document.getElementById("csvFileInput").click();
});

document.getElementById("csvFileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

    const newRecords = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const record = {};
      headers.forEach((h, i) => record[h] = values[i] ?? "");
      return record;
    });

    const filteredNewRecords = newRecords.filter(nuevo => !esDuplicado(nuevo, directorio));

    if (filteredNewRecords.length === 0) {
      alert("⚠️ Todos los registros ya existen. No se agregó ninguno.");
      return;
    }

    Promise.all(filteredNewRecords.map(registro =>
      fetch("http://172.17.175.137:3000/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registro)
      })
    ))
    .then(() => {
      cargarRegistros();
      alert(`Se importaron ${filteredNewRecords.length} nuevos registros correctamente.`);
    })
    .catch(err => {
      console.error("Error al importar CSV:", err);
      alert("Ocurrió un error al importar.");
    });
  };

  reader.readAsText(file);
});
*/