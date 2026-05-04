// ==========================================================
// SEGURIDAD.JS - Control de Accesos y UI
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

  const usuario = sessionStorage.getItem("usuarioActual");
  const rol = sessionStorage.getItem("rolUsuario");

  // 🚫 Sin sesión → fuera
  if (!usuario || !rol) {
    window.location.replace("login.html");
    return;
  }

  mostrarUsuario();
  controlarAccesoPorRol();

  // Opcional: Conectar botón de cerrar sesión por ID (si alguno lo usa)
  const btnCerrar = document.getElementById("btnCerrarSesion");
  if (btnCerrar) {
    btnCerrar.addEventListener("click", cerrarSesion);
  }

  // --------------------------------------------------
  // ✨ Resaltar automáticamente el menú de la página actual
  // --------------------------------------------------
  const currentPage = window.location.pathname.split("/").pop(); // Obtiene ej. "usuarios.html"
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

  navLinks.forEach(link => {
      // Si el enlace coincide con la página en la que estamos
      if (link.getAttribute('href') === currentPage) {
          link.classList.add('active', 'fw-bold');
          link.style.color = "#ffffff"; // Lo forzamos a blanco puro
      } else {
          // Si no es la página actual, le quitamos el resaltado
          link.classList.remove('active', 'fw-bold');
          link.style.color = ""; // Regresa al color tenue original
      }
  });

});

// ----------------------
// Muestra nombre usuario
// ----------------------
function mostrarUsuario() {
  const usuario = sessionStorage.getItem("usuarioActual");
  const userSpan = document.getElementById("usuarioLogueado");
  if (userSpan) {
    userSpan.textContent = usuario;
  }
}

// ----------------------
// Cerrar sesión (Pública para los onclick del HTML)
// ----------------------
window.cerrarSesion = function() {
  sessionStorage.clear();
  window.location.replace("login.html");
};

// ----------------------
// Control de permisos
// ----------------------
function controlarAccesoPorRol() {
  const rol = sessionStorage.getItem("rolUsuario");

  // Admin ve todo
  if (rol === "admin") {
    document.body.style.display = "block";
    return;
  }

  const seccionesPermitidas = JSON.parse(
    sessionStorage.getItem("seccionesPermitidas") || "[]"
  );

  // Ocultar opciones del menú
  document.querySelectorAll("[data-seccion]").forEach(item => {
    const seccion = item.dataset.seccion;
    if (!seccionesPermitidas.includes(seccion)) {
      item.closest("li")?.remove();
    }
  });

  const paginaActual = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");

  // 🚫 Bloqueo por URL
  if (!seccionesPermitidas.includes(paginaActual)) {
    // En lugar de mandarlo siempre a analytics, lo mandamos a su propia primera página permitida
    const paginaSegura = seccionesPermitidas.length > 0 ? seccionesPermitidas[0] + ".html" : "login.html";
    window.location.replace(paginaSegura);
    return;
  }

  // ✅ Mostrar página
  document.body.style.display = "block";

  // 🧹 Eliminar separadores sobrantes para que el menú se vea limpio
  document.querySelectorAll(".separator").forEach(separator => {
    const prev = separator.previousElementSibling;
    const next = separator.nextElementSibling;

    if (!prev || !next || !prev.hasAttribute("data-seccion") || !next.hasAttribute("data-seccion")) {
      separator.remove();
    }
  });

}