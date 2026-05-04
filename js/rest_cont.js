
document.addEventListener('DOMContentLoaded', function () {
    const emailInput = document.getElementById('email');
    const form = document.getElementById('reset-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        if (!email) {
            alert('Por favor, escribe tu correo electrónico.');
            return;
        }

        try {
            const response = await fetch('http://172.17.175.137:3000/solicitar-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Error al enviar el correo.');
                return;
            }

            alert(data.message);
        } catch (error) {
            console.error('Error en el cliente:', error);
            alert('Error al solicitar el restablecimiento.');
        }
    });
});


/*

document.addEventListener('DOMContentLoaded', function () {
    const emailInput = document.getElementById('email');
    const nuevaContrasenaInput = document.getElementById('nuevaContrasena');
    const form = document.getElementById('reset-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const nuevaContrasena = nuevaContrasenaInput.value.trim();

        if (!email || !nuevaContrasena) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        try {
            const response = await fetch('http://172.17.175.137:3000/restablecerContrasena', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nuevaContrasena })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Error al restablecer la contraseña.');
                return;
            }

            alert(data.message);
            window.location.href = 'login.html'; // Redirige al login después del éxito
        } catch (error) {
            console.error('Error en el cliente:', error);
            alert('Ocurrió un error en el cliente.');
        }
    });
});

*/