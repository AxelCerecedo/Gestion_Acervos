document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const correo = document.getElementById("usuario").value;
  const contrasena = document.getElementById("contrasena").value;

  try {
    const response = await fetch("http://172.17.175.137:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password: contrasena })
    });

    const data = await response.json();

    if (!response.ok || !data.usuario) {
      alert(data.error || "Correo o contraseña incorrectos.");
      return;
    }

    // 🔐 Guardar sesión
    sessionStorage.setItem("usuarioId", data.usuario.id);
    sessionStorage.setItem("usuarioActual", data.usuario.nombre);
    sessionStorage.setItem("rolUsuario", data.usuario.rol);

    // 📌 Permisos
    if (data.usuario.rol === "lector") {
      const secciones = ["analytics", "acervos", "perfil"];
      sessionStorage.setItem(
        "seccionesPermitidas",
        JSON.stringify(secciones)
      );

      // 👉 Redirigir lector
      window.location.href = "analytics.html";
    } else {
      sessionStorage.removeItem("seccionesPermitidas");

      // 👉 Redirigir admin
      window.location.href = "directorio.html";
    }

  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    alert("No se pudo conectar con el servidor.");
  }
});
