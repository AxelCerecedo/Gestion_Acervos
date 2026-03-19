// ==========================================================
// SECCIÓN 1: INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarApp();
});

let usuarios = [];
let repositorios = [];
let usuariosWP = []; 
let vistaTarjetas = false;
let usuarioActual = { rol: 'admin', id: 1 }; 
let registros = [];

async function inicializarApp() {
  await cargarRepositorios();
  await cargarUsuarios();
  await cargarRegistros();
  await cargarUsuariosWordPress();

  // Ahora que todos los datos asíncronos están cargados,
  // es seguro llenar los selectores y configurar la aplicación.
  llenarSelectRepositorios('filterRepositorios', repositorios);
  llenarCheckboxesRepositorios('editarRepositorios', repositorios);

  // Llenar el select de roles después de que todos los usuarios (locales y de WP) estén cargados.
  llenarSelectRoles();

  // Inicializar filtros al valor vacío
  document.getElementById('filterRol').value = '';
  document.getElementById('filterRepositorios').value = '';
  document.getElementById('searchInput').value = '';

  configurarFiltros();
  configurarBusqueda();
  configurarBotonesPrincipales();
  configurarFormularios();

  renderUsuarios();
  actualizarDashboard();
}

async function cargarRegistros() {
  try {
    const res = await fetch('http://172.17.175.137:3000/api/registros');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    registros = await res.json();
  } catch (error) {
    console.error('Error cargando registros:', error);
  }
}

async function cargarUsuarios() {
  try {
    const res = await fetch('http://172.17.175.137:3000/api/usuarios');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    usuarios = await res.json();
    llenarSelectRoles(); // <--- Aquí llenamos el select de roles dinámicamente
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

async function cargarUsuariosWordPress() {
  try {
    const res = await fetch('http://172.17.175.137:3000/api/wordpress/users');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    usuariosWP = await res.json();
    console.log('✅ Usuarios recibidos de la API de WordPress:', usuariosWP); // <-- Agrega esta línea
  } catch (error) {
    console.error('Error cargando usuarios de WordPress:', error);
  }
}

async function cargarRepositorios() {
  try {
    const res = await fetch('http://172.17.175.137:3000/api/repositorios');
    repositorios = await res.json();
  } catch (error) {
    console.error('Error cargando repositorios:', error);
  }
}

// ==========================================================
// SECCIÓN 2: LÓGICA DE FILTROS Y BÚSQUEDA
// ==========================================================
function configurarFiltros() {
  document.getElementById('filterRol').addEventListener('change', filtrarYMostrar);
  document.getElementById('filterRepositorios').addEventListener('change', filtrarYMostrar);

  document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
    document.getElementById('filterRol').value = '';
    document.getElementById('filterRepositorios').value = '';
    document.getElementById('searchInput').value = '';
    filtrarYMostrar();
  });
}

function filtrarYMostrar() {
  renderUsuarios();
}

function configurarBusqueda() {
  document.getElementById('searchInput').addEventListener('input', filtrarYMostrar);
}

function aplicarFiltros(data) {
  let filtered = data;

  const rolFilter = document.getElementById('filterRol').value;
  if (rolFilter) {
    filtered = filtered.filter(u => {
      
      // === Lógica de unificación para la comprobación del filtro ===
      if (rolFilter === 'Administrador') {
          return u.rol === 'admin' || u.rol === 'administrator';
      }
      
      // Si el rol filtrado es 'Lector' u otro rol normalizado:
      // u.rol (original) debe coincidir con la versión en minúsculas del rolFilter
      return u.rol && u.rol.toLowerCase() === rolFilter.toLowerCase();
    });

  }

  const selectRepo = document.getElementById('filterRepositorios');
  const repoSeleccionado = selectRepo.value;
  const textoRepoSeleccionado = selectRepo.options[selectRepo.selectedIndex].text;

  if (repoSeleccionado) {
    filtered = filtered.filter(u => 
      u.repositorios?.some(r => {
        if (r.id === 'wordpress' && repoSeleccionado === 'wordpress') {
          return true;
        }
        return String(r.id) === repoSeleccionado || r.nombre === textoRepoSeleccionado;
      })
    );
  }

  const textoBusqueda = document.getElementById('searchInput').value.toLowerCase().trim();
  if (textoBusqueda) {
    filtered = filtered.filter(u =>
      (u.nombre?.toLowerCase().includes(textoBusqueda)) ||
      (u.correo_electronico?.toLowerCase().includes(textoBusqueda))
    );
  }

  return filtered;
}

// ==========================================================
// SECCIÓN 3: RENDERIZADO Y VISUALIZACIÓN
// ==========================================================

function renderUsuarios() {
  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = '';
  
  const usuariosCombinados = JSON.parse(JSON.stringify(usuarios)); 

  usuariosWP.forEach(usuarioWP => {
    const usuarioLocalExistente = usuariosCombinados.find(
      u => u.correo_electronico === usuarioWP.correo_electronico
    );
    
    const registroCoincidente = registros.find(r => usuarioWP.user_url && usuarioWP.user_url.startsWith(r.direccion));
    
    const nombreRepositorio = registroCoincidente ? registroCoincidente.nombre : 'WordPress';

    if (usuarioLocalExistente) {
      if (!Array.isArray(usuarioLocalExistente.repositorios)) {
          usuarioLocalExistente.repositorios = [];
      }
      usuarioLocalExistente.repositorios.push({ 
        nombre: nombreRepositorio, 
        rol_en_repositorio: usuarioWP.rol,
        id: 'wordpress'
      });
    } else {
      usuariosCombinados.push({
        id: `wp-${usuarioWP.id}`, 
        nombre: usuarioWP.nombre,
        correo_electronico: usuarioWP.correo_electronico,
        rol: usuarioWP.rol,
        repositorios: [{
          nombre: nombreRepositorio, 
          rol_en_repositorio: usuarioWP.rol,
          id: 'wordpress'
        }],
        activo: true, 
        esWordPress: true, 
        foto_perfil: usuarioWP.foto_perfil
      });
    }
  });

  const filtered = aplicarFiltros(usuariosCombinados);
  
  // === LÓGICA PARA EL CONTADOR ===
  const contador = document.getElementById('contadorUsuarios');
  if (contador) {
    contador.textContent = `Total: ${filtered.length} usuarios`;
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron usuarios que coincidan con los filtros.</td></tr>';
    return;
  }

  filtered.forEach(usuario => {
    const esWordPress = usuario.esWordPress;
    const foto = usuario.foto_perfil || 'Imagenes/Logos/placeholder-profile.png';
    
    // =========================================================
    // MODIFICACIÓN: ROL UNIFICADO
    // =========================================================
    let rolDisplay = usuario.rol;
    if (rolDisplay === 'admin' || rolDisplay === 'administrator') {
      rolDisplay = 'Administrador';
    } else if (rolDisplay) {
      // Capitalizar otros roles (lector -> Lector)
      rolDisplay = rolDisplay.charAt(0).toUpperCase() + rolDisplay.slice(1);
    }
    // =========================================================
    
    // =========================================================
    // REPOSITORIOS EN FORMATO DE LISTA (UL/LI)
    // =========================================================
    let reposHtml = 'No asignado';
    if (usuario.repositorios && usuario.repositorios.length > 0) {
        const listaItems = usuario.repositorios.map(r => 
            `<li>${r.nombre} (${r.rol_en_repositorio})</li>`
        ).join(''); 

        // Se usa 'list-unstyled' para eliminar viñetas y 'mb-0' para el margen
        reposHtml = `<ul class="list-unstyled mb-0" style="font-size: 0.85rem;">${listaItems}</ul>`;
    }
    // =========================================================

    const accionesHtml = esWordPress 
      ? '<p>Solo lectura</p>' 
      : botonesUsuarioHTML(usuario);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${foto}" alt="Foto perfil" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border: 2px solid #7c1225;" /></td>
      <td>${usuario.nombre}</td>
      <td>${usuario.correo_electronico}</td>
      <td class="text-capitalize">${rolDisplay}</td>
      <td>${reposHtml}</td>
      <td>${usuario.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
      <td>${accionesHtml}</td>
    `;
    tableBody.appendChild(tr);
  });

  asociarEventosBotones();
  actualizarDashboard(usuariosCombinados);
}


// Se modificó para generar un solo botón que abre el modal
function botonesUsuarioHTML(usuario) {
  return `
    <button class="btn btn-outline-primary btn-sm acciones-btn" type="button" data-id="${usuario.id}" title="Acciones">
      <i class="bi bi-gear"></i> Acciones
    </button>
  `;
}

// Se modificó para asociar los eventos a los nuevos botones
function asociarEventosBotones() {
  document.querySelectorAll('.acciones-btn').forEach(btn => btn.addEventListener('click', abrirModalAcciones));
}

// Función para abrir el nuevo modal de acciones
function abrirModalAcciones(event) {
  const usuarioId = event.currentTarget.getAttribute('data-id');
  const usuario = usuarios.find(u => u.id == usuarioId) || usuariosWP.find(u => `wp-${u.id}` == usuarioId);

  if (!usuario) {
    mostrarAlerta('Usuario no encontrado', 'danger');
    return;
  }

  const modalBody = document.getElementById('accionesModalBody');
  modalBody.innerHTML = '';

  // SOLO LECTURA para usuarios de WordPress
  if (usuario.esWordPress) {
    modalBody.innerHTML = '<p class="text-muted">Solo lectura: las acciones para este usuario se gestionan en WordPress.</p>';
  } 
  else 
  {
    modalBody.innerHTML = `
      <ul class="nav nav-tabs" id="accionesTabs" role="tablist">
        <li class="nav-item">
          <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#panel-editar">Editar</button>
        </li>

        <li class="nav-item">
          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#panel-historial">Historial</button>
        </li>
      </ul>

      <div class="tab-content p-3 border border-top-0 rounded-bottom">

        <!-- ============================ -->
        <!--            EDITAR            -->
        <!-- ============================ -->
        <div class="tab-pane fade show active" id="panel-editar">
          <form id="formEditarInline">

            <input type="hidden" id="inlineEditarId" value="${usuario.id}">

            <div class="mb-3">
              <label class="form-label text-start w-100">Nombre: </label>
              <input type="text" class="form-control" id="inlineEditarNombre" value="${usuario.nombre}">
            </div>

            <div class="mb-3">
              <label class="form-label text-start w-100">Correo electrónico: </label>
              <input type="email" class="form-control" id="inlineEditarCorreo" value="${usuario.correo_electronico}">
            </div>

            <div class="mb-3">
              <label class="form-label text-start w-100">Rol global: </label>
              <select class="form-select" id="inlineEditarRol">
                <option value="lector" ${usuario.rol === 'lector' ? 'selected':''}>Lector</option>
                <option value="admin" ${usuario.rol === 'admin' ? 'selected':''}>Administrador</option>
              </select>
            </div>

           <div class="mb-3">
            <label class="form-label d-block text-start">Estado del usuario:</label>

            <div class="form-check form-switch d-flex align-items-center gap-2">
              <input
                class="form-check-input"
                type="checkbox"
                id="inlineEditarActivo"
                ${usuario.activo ? 'checked' : ''}
              />
              <label class="form-check-label mb-0" for="inlineEditarActivo">
                Usuario activo
              </label>
            </div>
          </div>


            <!-- ========================================= -->
            <!-- BOTONES A LA IZQUIERDA + GUARDAR DERECHA -->
            <!-- ========================================= -->
            <div class="d-flex justify-content-between align-items-center mt-4 w-100">


              <!-- BOTONES IZQUIERDA -->
              <div class="d-flex gap-2">
                <button type="button" 
                        class="btn btn-warning btn-sm reset-pass-btn"
                        data-id="${usuario.id}">
                  <i class="bi bi-key"></i> Restablecer contraseña
                </button>

                ${usuarioActual.rol === 'admin' && usuarioActual.id !== usuario.id ? `
                <button type="button"
                        class="btn btn-danger btn-sm eliminar-btn"
                        data-id="${usuario.id}">
                  <i class="bi bi-trash"></i> Eliminar
                </button>
                ` : ''}

              </div>

              <!-- BOTÓN GUARDAR A LA DERECHA -->
              <button type="submit" class="btn btn-primary btn-sm">
                <i class="bi bi-save"></i> Guardar
              </button>

            </div>

          </form>
        </div>

        <!-- ============================ -->
        <!--           HISTORIAL          -->
        <!-- ============================ -->
        <div class="tab-pane fade" id="panel-historial">
          <div id="contenedorHistorial">
            <p class="text-muted">Cargando historial...</p>
          </div>
        </div>
    `;
  }

  // EVENTOS
  document.querySelectorAll('.reset-pass-btn').forEach(btn => 
    btn.addEventListener('click', resetearContrasena)
  );

  document.querySelectorAll('.toggle-activo-btn').forEach(btn =>
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const nuevoEstado = e.currentTarget.textContent.toLowerCase().includes('activar');
      toggleActivoUsuario(id, nuevoEstado);
    })
  );

  document.querySelectorAll('.eliminar-btn').forEach(btn => 
    btn.addEventListener('click', eliminarUsuario)
  );

  // FORMULARIO EDITAR
  const formEditar = document.getElementById('formEditarInline');
  if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('inlineEditarId').value;

      const datos = {
        nombre: document.getElementById('inlineEditarNombre').value,
        correo_electronico: document.getElementById('inlineEditarCorreo').value,
        rol: document.getElementById('inlineEditarRol').value,
        activo: document.getElementById('inlineEditarActivo').checked
      };

      try {
        const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(datos),
        });

        if (!res.ok) throw new Error('Error al actualizar usuario');

        mostrarAlerta('Cambios guardados correctamente', 'success');
        await cargarUsuarios();
        renderUsuarios();

      } catch (error) {
        mostrarAlerta(error.message, 'danger');
      }
    });
  }

  cargarHistorialEnPestaña(usuario.id);

  new bootstrap.Modal(document.getElementById('modalAcciones')).show();
}


async function cargarHistorialEnPestaña(usuarioId) {

  const contenedor = document.getElementById('contenedorHistorial');
  contenedor.innerHTML = `<p class="text-muted">Cargando historial...</p>`;

  try {
    const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${usuarioId}/historial`);
    if (!res.ok) throw new Error("No se pudo cargar el historial");

    const historial = await res.json();

    if (!historial.length) {
      contenedor.innerHTML = `<p class="text-muted">Sin registros de historial.</p>`;
      return;
    }

    // Construir tabla
    let html = `
      <table class="table table-striped table-bordered">
        <thead class="table-light">
          <tr>
            <th style="width: 220px;">Fecha</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
    `;

    historial.forEach(entry => {
      const fecha = new Date(entry.fecha).toLocaleString("es-MX", {
        hour12: true
      });

      html += `
        <tr>
          <td>${fecha}</td>
          <td>${entry.accion}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;

    contenedor.innerHTML = html;

  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">Error al cargar el historial.</p>`;
  }
}

function actualizarDashboard(usuariosCombinados) {
  const resumen = document.getElementById('dashboardResumen');
  if (!resumen || !usuariosCombinados) return;

  const total = usuariosCombinados.length;
  const activos = usuariosCombinados.filter(u => u.activo).length;
  const inactivos = total - activos;
  const admins = usuariosCombinados.filter(u => u.rol && u.rol.includes('admin')).length;

  resumen.innerHTML = `
    <div class="resumen-grid">
      <div class="resumen-card bg-light border">
        👥 <strong>Total de usuarios:</strong> ${total}
      </div>
      <div class="resumen-card bg-success text-white">
        ✅ Activos: ${activos}
      </div>
      <div class="resumen-card bg-warning text-white">
        ❌ Inactivos: ${inactivos}
      </div>
      <div class="resumen-card bg-primary text-white">
        🛡️ Administradores: ${admins}
      </div>
    </div>
  `;
}

// ==========================================================
// SECCIÓN 4: MANEJO DE MODALES Y FORMULARIOS
// ==========================================================

function configurarFormularios() {
    const formEditar = document.getElementById('formEditarUsuario');
    formEditar.addEventListener('submit', guardarEdicionUsuario);

  const formNuevo = document.getElementById('formNuevoUsuario');
  formNuevo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formNuevo);
    formData.set('activo', formNuevo.querySelector('#nuevoActivo').checked ? 'true' : 'false');
    try {
      const res = await fetch('http://172.17.175.137:3000/api/usuarios', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Error al crear usuario');
      mostrarAlerta('Usuario creado correctamente', 'success');
      await cargarUsuarios();
      renderUsuarios();
      bootstrap.Modal.getInstance(document.getElementById('modalNuevoUsuario')).hide();
      formNuevo.reset();
    } catch (error) {
      mostrarAlerta(error.message, 'danger');
    }
  });
}

function abrirModalEditar(event) {
  const modalAcciones = bootstrap.Modal.getInstance(document.getElementById('modalAcciones'));
  if (modalAcciones) modalAcciones.hide();

  const usuarioId = event.currentTarget.getAttribute('data-id');
  
  const usuariosCombinados = JSON.parse(JSON.stringify(usuarios));
  usuariosWP.forEach(usuarioWP => {
    const usuarioLocalExistente = usuariosCombinados.find(u => u.correo_electronico === usuarioWP.correo_electronico);
    if (!usuarioLocalExistente) {
      usuariosCombinados.push({
        id: `wp-${usuarioWP.id}`,
        nombre: usuarioWP.nombre,
        correo_electronico: usuarioWP.correo_electronico,
        rol: usuarioWP.rol,
        repositorios: [{ nombre: 'WordPress', rol_en_repositorio: usuarioWP.rol, id: 'wordpress' }],
        activo: true,
        esWordPress: true,
        foto_perfil: usuarioWP.foto_perfil,
        user_url: usuarioWP.user_url
      });
    }
  });

  const usuario = usuariosCombinados.find(u => u.id == usuarioId);
  if (!usuario) return alert('Usuario no encontrado');

  if (usuario.esWordPress) {
    mostrarAlerta('No se puede editar directamente a un usuario de WordPress. Los cambios deben realizarse en el sitio de Tainacan.', 'info');
    return;
  }

  document.getElementById('editarId').value = usuario.id;
  document.getElementById('editarNombre').value = usuario.nombre;
  document.getElementById('editarCorreo').value = usuario.correo_electronico;
  document.getElementById('editarRol').value = usuario.rol;
  document.getElementById('editarActivo').checked = usuario.activo;

  const repositoriosContainer = document.getElementById('editarRepositorios');
  if (repositoriosContainer) {
    repositoriosContainer.innerHTML = '';
    if (usuario.repositorios && usuario.repositorios.length > 0) {
      const ul = document.createElement('ul');
      ul.classList.add('list-group', 'list-group-flush');
      usuario.repositorios.forEach(r => {
        const li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = `${r.nombre} (${r.rol_en_repositorio})`;
        ul.appendChild(li);
      });
      repositoriosContainer.appendChild(ul);
    } else {
      repositoriosContainer.innerHTML = '<p class="text-muted">No tiene repositorios asignados.</p>';
    }
  }

  const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  modal.show();
}

function obtenerRepositoriosSeleccionados(form, containerId) {
  const repositoriosSeleccionados = [];
  form.querySelectorAll(`#${containerId} input[name="repositorios[]"]:checked`).forEach(checkbox => {
    const repoId = checkbox.value;
    const rolSelect = form.querySelector(`#${containerId}_rol_repo_${repoId}`);
    const rol = rolSelect ? rolSelect.value : 'lector';
    repositoriosSeleccionados.push({
      repositorio_id: parseInt(repoId),
      rol_en_repositorio: rol
    });
  });
  return repositoriosSeleccionados;
}

// ==========================================================
// SECCIÓN 5: FUNCIONES DE INTERACCIÓN CON LA API (EDITAR, ELIMINAR, ETC.)
// ==========================================================

async function resetearContrasena(event) {
  const id = event.currentTarget.getAttribute('data-id');
  if (!confirm('¿Seguro que deseas resetear la contraseña de este usuario? Se enviará una contraseña temporal por correo.')) return;
  try {
    const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${id}/reset-password`, { method: 'POST' });
    if (!res.ok) throw new Error('Error al resetear contraseña');
    mostrarAlerta('Contraseña reseteada y enviada por correo.', 'success');
  } catch (error) {
    mostrarAlerta(error.message, 'danger');
  }
}

async function mostrarHistorial(event) {
  const id = event.currentTarget.getAttribute('data-id');
  try {
    const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${id}/historial`);
    if (!res.ok) throw new Error('No se pudo cargar historial');
    const historial = await res.json();
    const list = document.getElementById('historialList');
    list.innerHTML = '';
    if (historial.length === 0) {
      list.innerHTML = '<li class="list-group-item">No hay historial para este usuario.</li>';
    } else {
      historial.forEach(h => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `[${new Date(h.fecha).toLocaleString()}] ${h.accion}`;
        list.appendChild(li);
      });
    }
    const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
    modal.show();
  } catch (error) {
    mostrarAlerta(error.message, 'danger');
  }
}

async function toggleActivoUsuario(id, nuevoEstado) {
  try {
    const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${id}/toggle-activo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: nuevoEstado })
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    await res.json();
    mostrarAlerta(`✅ Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`, 'success');
    await cargarUsuarios();
  } catch (error) {
    console.error('❌ Error al cambiar estado del usuario:', error);
    mostrarAlerta('❌ No se pudo cambiar el estado del usuario', 'danger');
  }
}

async function eliminarUsuario(event) {
  const id = event.currentTarget.getAttribute('data-id');
  const usuario = usuarios.find(u => u.id == id);
  if (!usuario) return;

  if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${usuario.nombre}"? Esta acción es irreversible.`)) {
    return;
  }

  try {
    const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al eliminar el usuario');
    }
    mostrarAlerta(`✅ Usuario "${usuario.nombre}" eliminado correctamente`, 'success');
    await cargarUsuarios();
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
    mostrarAlerta(`❌ No se pudo eliminar el usuario: ${error.message}`, 'danger');
  }
}

async function guardarEdicionUsuario(event) {
  event.preventDefault();
  const formEditar = document.getElementById('formEditarUsuario');
  const id = document.getElementById('editarId').value;
  
  const datosActualizados = {
    nombre: document.getElementById('editarNombre').value,
    correo_electronico: document.getElementById('editarCorreo').value,
    rol: document.getElementById('editarRol').value,
    activo: document.getElementById('editarActivo').checked,
    repositorios: obtenerRepositoriosSeleccionados(formEditar, 'editarRepositorios')
  };

  try {
    const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datosActualizados),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al actualizar usuario');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario')).hide();

    await cargarUsuarios();
    renderUsuarios();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarAlerta('✅ ¡Cambios guardados exitosamente!', 'success');
    
  } catch (error) {
    mostrarAlerta(error.message, 'danger');
  }
}

// ==========================================================
// SECCIÓN 6: MANEJO DE BOTONES GLOBALES Y EXPORTACIÓN
// ==========================================================

function configurarBotonesPrincipales() {
  // 1. Botón de Actualizar Usuarios (ID: exportExcelBtn)
  const btnActualizar = document.getElementById('exportExcelBtn');
  if (btnActualizar) {
    btnActualizar.addEventListener('click', () => {
      // ⚠️ NUEVO: Mostrar alerta de inicio de actualización
      mostrarAlerta('🔄 Iniciando actualización de usuarios...', 'info'); 
      
      // Acción deseada: Recargar la página (esto recarga todo el JS)
      // Usamos un pequeño retraso para que la alerta sea visible antes de la recarga
      setTimeout(() => {
          location.reload();
      }, 500); 
    });
  }
  
  // 2. Botón de Exportar CSV (ID: exportCsvBtn)
  const btnExportarCsv = document.getElementById('exportCsvBtn');
  if (btnExportarCsv) {
    // La función exportarCSV() ya tiene su propia alerta de éxito
    btnExportarCsv.addEventListener('click', exportarCSV);
  }

  // Otros botones (Toggle View, etc.)
  const toggleViewBtn = document.getElementById('toggleViewBtn');
  if (toggleViewBtn) {
    toggleViewBtn.addEventListener('click', toggleVista);
  }
}


function exportarCSV() {
  
  // 1. Obtener los usuarios combinados (locales + WP) - (Lógica de combinación)
  const usuariosCombinados = JSON.parse(JSON.stringify(usuarios)); 
  usuariosWP.forEach(usuarioWP => {
    const usuarioLocalExistente = usuariosCombinados.find(u => u.correo_electronico === usuarioWP.correo_electronico);
    const registroCoincidente = registros.find(r => usuarioWP.user_url && usuarioWP.user_url.startsWith(r.direccion));
    const nombreRepositorio = registroCoincidente ? registroCoincidente.nombre : 'WordPress';

    if (usuarioLocalExistente) {
      if (!Array.isArray(usuarioLocalExistente.repositorios)) {
          usuarioLocalExistente.repositorios = [];
      }
      usuarioLocalExistente.repositorios.push({ 
        nombre: nombreRepositorio, 
        rol_en_repositorio: usuarioWP.rol,
        id: 'wordpress'
      });
    } else {
      usuariosCombinados.push({
        id: `wp-${usuarioWP.id}`, 
        nombre: usuarioWP.nombre,
        correo_electronico: usuarioWP.correo_electronico,
        rol: usuarioWP.rol,
        repositorios: [{
          nombre: nombreRepositorio, 
          rol_en_repositorio: usuarioWP.rol,
          id: 'wordpress'
        }],
        activo: true, 
        esWordPress: true, 
        foto_perfil: usuarioWP.foto_perfil
      });
    }
  });

  // 2. Aplicar los filtros actuales de la UI
  const filteredUsers = aplicarFiltros(usuariosCombinados);

  if (filteredUsers.length === 0) {
    mostrarAlerta('No hay usuarios para exportar con los filtros aplicados.', 'warning');
    return;
  }
  
  // 3. OBTENER EL FILTRO DE REPOSITORIO ACTIVO
  const selectRepo = document.getElementById('filterRepositorios');
  const repoSeleccionado = selectRepo.value;
  const textoRepoSeleccionado = selectRepo.options[selectRepo.selectedIndex].text;
  
  // 4. Definir las cabeceras (headers) y mapear los datos
  const headers = ['ID', 'Nombre', 'Correo Electrónico', 'Rol', 'Repositorios Asignados', 'Estado Activo', 'Fuente'];
  
  const csvData = filteredUsers.map(u => {
    const sanitize = (str) => {
      if (!str) return '""';
      const safeStr = String(str).replace(/"/g, '""'); 
      return safeStr.includes(',') || safeStr.includes('\n') ? `"${safeStr}"` : safeStr;
    };
    
    // 5. LÓGICA DE FILTRADO PARA LA COLUMNA DE REPOSITORIOS
    let repositoriosParaCSV = u.repositorios || [];
    
    // Si hay un filtro de repositorio aplicado, solo mostramos ESE repositorio en la columna.
    if (repoSeleccionado) {
        repositoriosParaCSV = u.repositorios.filter(r => {
             if (r.id === 'wordpress' && repoSeleccionado === 'wordpress') {
                 return true;
             }
             return String(r.id) === repoSeleccionado || r.nombre === textoRepoSeleccionado;
        });
    }
  
    let repositoriosStr = repositoriosParaCSV.length > 0 
      ? repositoriosParaCSV.map(r => `${r.nombre} (${r.rol_en_repositorio})`).join('; ')
      : 'No asignado';
      
    // Lógica para mejorar el display si se aplica un filtro a un usuario con múltiples repositorios
    if (repoSeleccionado && repositoriosParaCSV.length === 1 && u.repositorios.length > 1) {
         const totalRepos = u.repositorios.length;
         const repoBase = repositoriosParaCSV[0];
         
         // ✅ Esta reasignación ahora es válida porque repositoriosStr es 'let'
         repositoriosStr = `${repoBase.nombre} (${repoBase.rol_en_repositorio})`; 
    }
    
    // 6. Lógica de Traducción/Unificación del Rol para CSV
    let rolCSV = u.rol;
    if (rolCSV === 'admin' || rolCSV === 'administrator') {
        rolCSV = 'Administrador';
    } else if (rolCSV) {
        rolCSV = rolCSV.charAt(0).toUpperCase() + rolCSV.slice(1);
    }
      
    // Construir la fila de datos
    return [
      sanitize(u.id),
      sanitize(u.nombre),
      sanitize(u.correo_electronico),
      sanitize(rolCSV), // <-- ROL UNIFICADO
      sanitize(repositoriosStr), // <-- REPOSITORIOS FILTRADOS
      sanitize(u.activo ? 'Sí' : 'No'),
      sanitize(u.esWordPress ? 'WordPress' : 'Local')
    ].join(','); 
  });

  // 7. Crear el contenido final del CSV
  const csvContent = headers.join(',') + '\n' + csvData.join('\n');

  // 8. Descargar el archivo
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'usuarios_filtrados.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  mostrarAlerta(`Exportación exitosa. Se descargaron ${filteredUsers.length} usuarios.`, 'success');
}

// ==========================================================
// SECCIÓN 7: FUNCIONES AUXILIARES (UI, UTILIDADES)
// ==========================================================

function llenarSelectRepositorios(selectId, lista) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '';
  if (!select.multiple) {
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Seleccionar...';
    select.appendChild(defaultOpt);
  }

  lista.forEach(r => {
    const option = document.createElement('option');
    option.value = r.id;
    option.textContent = r.nombre;
    select.appendChild(option);
  });
  select.value = '';
}

function llenarSelectRoles() {
  const selectRol = document.getElementById('filterRol');
  if (!selectRol) return;

  const valorActual = selectRol.value;
  selectRol.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Seleccionar rol...';
  selectRol.appendChild(defaultOption);

  // 1. Crear una lista de usuarios combinada
  const usuariosCombinados = JSON.parse(JSON.stringify(usuarios)); 
  
  usuariosWP.forEach(usuarioWP => {
    // Busca si el usuario de WordPress ya existe en la lista local
    const usuarioLocalExistente = usuariosCombinados.find(
      u => u.correo_electronico === usuarioWP.correo_electronico
    );
    
    // Si no existe, agrégalo a la lista combinada
    if (!usuarioLocalExistente) {
      usuariosCombinados.push({
        id: `wp-${usuarioWP.id}`, 
        nombre: usuarioWP.nombre,
        correo_electronico: usuarioWP.correo_electronico,
        rol: usuarioWP.rol,
        repositorios: [{ nombre: 'WordPress', rol_en_repositorio: usuarioWP.rol, id: 'wordpress' }],
        activo: true, 
        esWordPress: true, 
        foto_perfil: usuarioWP.foto_perfil
      });
    }
  });

  // 2. Extraer todos los roles y UNIFICARLOS/NORMALIZARLOS
  const rolesNormalizados = usuariosCombinados.map(u => {
      let rolDisplay = u.rol;
      if (rolDisplay === 'admin' || rolDisplay === 'administrator') {
          return 'Administrador'; // Unificar a este valor
      }
      // Capitalizar otros roles (lector -> Lector)
      return rolDisplay.charAt(0).toUpperCase() + rolDisplay.slice(1);
  });

  // 3. Obtener solo los roles únicos
  const rolesUnicos = [...new Set(rolesNormalizados.filter(Boolean))];

  // 4. Llenar el select con los roles únicos
  rolesUnicos.forEach(rol => {
    const option = document.createElement('option');
    
    // El valor (value) de la opción DEBE ser el rol normalizado
    option.value = rol; 
    option.textContent = rol;
    selectRol.appendChild(option);
  });

  selectRol.value = valorActual || '';
}

function mostrarAlerta(mensaje, tipo = 'info') {
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
  alerta.role = 'alert';
  alerta.innerHTML = `${mensaje}`;
  
  const btnCerrar = document.createElement('button');
  btnCerrar.type = 'button';
  btnCerrar.className = 'btn-close';
  btnCerrar.setAttribute('data-bs-dismiss', 'alert');
  btnCerrar.setAttribute('aria-label', 'Cerrar');
  alerta.appendChild(btnCerrar);
  
  const contenedor = document.getElementById('alertContainer');
  if (contenedor) {
    while (contenedor.firstChild) {
      contenedor.removeChild(contenedor.firstChild);
    }
    contenedor.appendChild(alerta);
  }

  setTimeout(() => {
    const alertInstance = bootstrap.Alert.getOrCreateInstance(alerta);
    if (alertInstance) alertInstance.close();
  }, 4000);
}

function llenarCheckboxesRepositorios(containerId, lista) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  lista.forEach(r => {
    const idCheckbox = `${containerId}_repo_${r.id}`;
    const idSelectRol = `${containerId}_rol_repo_${r.id}`;
    const div = document.createElement('div');
    div.classList.add('d-flex', 'align-items-center', 'mb-2', 'gap-2');

    div.innerHTML = `
      <input class="form-check-input" type="checkbox" value="${r.id}" id="${idCheckbox}" name="repositorios[]" />
      <label class="form-check-label" for="${idCheckbox}" style="min-width: 200px;">${r.nombre}</label>
      <select class="form-select form-select-sm" id="${idSelectRol}" name="rol_repositorio_${r.id}" style="width: 120px;">
        <option value="lector">Lector</option>
        <option value="admin">Admin</option>
      </select>
    `;
    container.appendChild(div);
  });
}
