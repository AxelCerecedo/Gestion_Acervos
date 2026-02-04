// seguridad.js

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
// Cerrar sesión
// ----------------------
function cerrarSesion() {
  sessionStorage.clear();
  window.location.replace("login.html");
}

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
    window.location.replace("analytics.html");
    return;
  }

  // ✅ Mostrar página
  document.body.style.display = "block";

  // 🧹 Eliminar separadores sobrantes
document.querySelectorAll(".separator").forEach(separator => {
  const prev = separator.previousElementSibling;
  const next = separator.nextElementSibling;

  if (!prev || !next || !prev.hasAttribute("data-seccion") || !next.hasAttribute("data-seccion")) {
    separator.remove();
  }
});

}
