// ==========================================================
// PERFIL.JS
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
  inicializarPerfil();
});

let usuarioPerfil = null;
let usuariosWP = [];
let registros = [];

// ========================
// INICIALIZACIÓN
// ========================
async function inicializarPerfil() {
  try {
    await cargarUsuarioPerfil(); // 🔴 OBLIGATORIO

    // ⬇️ Opcionales (no rompen el perfil)
    await Promise.allSettled([
      cargarUsuariosWordPress(),
      cargarRegistros()
    ]);

    usuarioPerfil = combinarUsuarioPerfil(
      usuarioPerfil,
      usuariosWP,
      registros
    );

    renderPerfil();
    configurarFormularioPerfil();

  } catch (error) {
    console.error('Error inicializando perfil:', error);
    mostrarAlerta('No se pudo cargar el perfil del usuario.', 'danger');
  }
}


// ========================
// CARGA DE DATOS
// ========================
async function cargarUsuarioPerfil() {
  const usuarioId = sessionStorage.getItem('usuarioId');
  if (!usuarioId) throw new Error('Sesión no válida');

  const res = await fetch(`http://172.17.175.137:3000/api/usuarios/${usuarioId}`);
  if (!res.ok) throw new Error('Error cargando perfil');

  usuarioPerfil = await res.json();
}

async function cargarUsuariosWordPress() {
  const res = await fetch('http://172.17.175.137:3000/api/wordpress/users');
  if (!res.ok) throw new Error('Error cargando usuarios WordPress');
  usuariosWP = await res.json();
}

async function cargarRegistros() {
  const res = await fetch('http://172.17.175.137:3000/api/registros');
  if (!res.ok) throw new Error('Error cargando registros');
  registros = await res.json();
}

// ========================
// COMBINAR PERFIL
// ========================

function combinarUsuarioPerfil(usuarioLocal, usuariosWP, registros) {
  const usuario = { ...usuarioLocal };
  usuario.repositorios = [];

  usuariosWP.forEach(wp => {
    if (wp.correo_electronico !== usuario.correo_electronico) return;

    const registro = registros.find(r =>
      wp.user_url && wp.user_url.startsWith(r.direccion)
    );

    usuario.repositorios.push({
      nombre: registro ? registro.nombre : 'WordPress',
      rol_en_repositorio: wp.rol
    });
  });

  return usuario;
}

// ========================
// RENDER
// ========================
function renderPerfil() {
  document.getElementById('inputNombre').value = usuarioPerfil.nombre;
  document.getElementById('inputCorreo').value = usuarioPerfil.correo_electronico;
}

// ========================
// FORMULARIO PERFIL
// ========================
function configurarFormularioPerfil() {
  const form = document.getElementById('formPerfil');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('inputNombre').value.trim();
    // Capturamos los 3 campos de contraseña
    const actual = document.getElementById('passwordActual').value;
    const nueva = document.getElementById('inputPassword').value;
    const confirm = document.getElementById('inputPasswordConfirm').value;

    try {
      // 1️⃣ Actualizar datos básicos (Nombre)
      const resPerfil = await fetch(
        `http://172.17.175.137:3000/api/usuarios/${usuarioPerfil.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            correo_electronico: usuarioPerfil.correo_electronico,
            rol: usuarioPerfil.rol
          })
        }
      );

      const dataPerfil = await resPerfil.json();
      if (!resPerfil.ok) throw new Error(dataPerfil.error);

      // 2️⃣ Cambiar contraseña SOLO si el usuario intentó escribir algo en esos campos
      if (actual || nueva || confirm) {
        
        if (!actual) {
          mostrarAlerta('Debes ingresar tu contraseña actual para hacer el cambio', 'warning');
          return;
        }
        if (nueva.length < 8) {
          mostrarAlerta('La nueva contraseña debe tener al menos 8 caracteres', 'warning');
          return;
        }
        if (nueva !== confirm) {
          mostrarAlerta('Las contraseñas no coinciden', 'warning');
          return;
        }

        // Enviamos la petición con la contraseña actual y la nueva
        const resPass = await fetch(
          `http://172.17.175.137:3000/api/usuarios/${usuarioPerfil.id}/cambiar-password`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              passwordActual: actual, 
              nuevaPassword: nueva 
            })
          }
        );

        const dataPass = await resPass.json();
        
        // Si el backend rechaza la contraseña actual, aquí cae al catch
        if (!resPass.ok) throw new Error(dataPass.error);
      }

      mostrarAlerta('Perfil actualizado correctamente', 'success');

      // Limpiamos los campos
      if (document.getElementById('passwordActual')) document.getElementById('passwordActual').value = '';
      document.getElementById('inputPassword').value = '';
      document.getElementById('inputPasswordConfirm').value = '';

      await cargarUsuarioPerfil();
      renderPerfil();

    } catch (error) {
      mostrarAlerta(error.message || 'Error al actualizar perfil', 'danger');
    }
  });
}


// ========================
// ALERTAS
// ========================
function mostrarAlerta(mensaje, tipo) {
  alert(mensaje); // Puedes cambiarlo por Bootstrap si quieres
}
