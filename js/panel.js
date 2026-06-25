// =========================================
//  LÓGICA DEL PANEL — INDALO
// =========================================

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// --- Portero: si nadie inició sesión, lo mandamos al login ---
// Esto protege el panel: nadie puede entrar sin haber iniciado sesión
onAuthStateChanged(auth, function (usuario) {
  if (!usuario) {
    window.location.href = "admin.html";
  }
});

// --- Botón "Cerrar sesión" ---
function cerrarSesion() {
  signOut(auth).then(function () {
    window.location.href = "admin.html";
  });
}

window.cerrarSesion = cerrarSesion;