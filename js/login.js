// =========================================
//  LÓGICA DEL LOGIN — INDALO
// =========================================

// Traemos el "portero" que preparamos antes
import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// --- Botón "Ver mi contraseña" ---
// Cambia el campo de puntitos (•••) a texto visible y viceversa
function verContrasena() {
  const campo = document.getElementById("password");
  if (campo.type === "password") {
    campo.type = "text";   // se ve la contraseña
  } else {
    campo.type = "password"; // se oculta de nuevo
  }
}

// --- Botón "Entrar a mi panel" ---
function iniciarSesion() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const mensajeError = document.getElementById("mensaje-error");

  // Si dejó algún campo vacío, avisamos con cariño
  if (email === "" || password === "") {
    mensajeError.textContent = "Por favor, completá tu correo y tu contraseña 🌿";
    mensajeError.classList.remove("hidden");
    return;
  }

  // Le preguntamos al portero de Firebase si los datos son correctos
  signInWithEmailAndPassword(auth, email, password)
    .then(function () {
      // ¡Datos correctos! La llevamos a su panel
      window.location.href = "panel.html";
    })
    .catch(function () {
      // Datos incorrectos: mensaje claro y amable
      mensajeError.textContent = "El correo o la contraseña no son correctos. Probá de nuevo 🌿";
      mensajeError.classList.remove("hidden");
    });
}

// Hacemos que los botones del HTML puedan usar estas funciones
window.verContrasena = verContrasena;
window.iniciarSesion = iniciarSesion;