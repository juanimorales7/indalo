// =========================================
//  SUBIR PRODUCTO — INDALO
//  Maneja la foto, el precio y publicar
// =========================================

import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 🔑 Tus datos de Cloudinary
const CLOUD_NAME = "dn5kdjvgs";
const UPLOAD_PRESET = "indalo_productos";

// Guarda la foto que el usuario eligió
let archivoFoto = null;

// --- Cuando se elige una foto con el botón ---
function mostrarNombreFoto() {
  const input = document.getElementById("foto");
  if (input.files.length > 0) {
    procesarFoto(input.files[0]);
  }
}

// --- Muestra la vista previa de la foto ---
function procesarFoto(archivo) {
  archivoFoto = archivo;
  const vista = document.getElementById("vista-previa");
  const estado = document.getElementById("estado-foto");
  vista.src = URL.createObjectURL(archivo);
  vista.classList.remove("hidden");
  estado.textContent = "✅ Foto lista: " + archivo.name;
}

// --- Arrastrar y soltar ---
const zona = document.getElementById("zona-foto");
if (zona) {
  zona.addEventListener("dragover", function (e) {
    e.preventDefault();
    zona.style.background = "#F0EADD";
  });
  zona.addEventListener("dragleave", function () {
    zona.style.background = "#FBF9F5";
  });
  zona.addEventListener("drop", function (e) {
    e.preventDefault();
    zona.style.background = "#FBF9F5";
    if (e.dataTransfer.files.length > 0) {
      procesarFoto(e.dataTransfer.files[0]);
    }
  });
}

// --- Pone puntos de miles automáticamente mientras se escribe ---
function formatearPrecio() {
  const campo = document.getElementById("precio");
  let soloNumeros = campo.value.replace(/\D/g, "");
  if (soloNumeros) {
    campo.value = Number(soloNumeros).toLocaleString("es-AR");
  } else {
    campo.value = "";
  }
}

// --- Mostrar y ocultar el formulario ---
function mostrarFormulario() {
  document.getElementById("formulario-producto").classList.remove("hidden");
  document.getElementById("boton-agregar").classList.add("hidden");
}

function ocultarFormulario() {
  document.getElementById("formulario-producto").classList.add("hidden");
  document.getElementById("boton-agregar").classList.remove("hidden");
}

// =========================================
//  PUBLICAR PRODUCTO (sube foto + guarda datos)
// =========================================
async function publicarProducto() {
  const nombre = document.getElementById("nombre").value.trim();
  const precioTexto = document.getElementById("precio").value.replace(/\D/g, "");
  const descripcion = document.getElementById("descripcion").value.trim();
  const stock = document.getElementById("stock").value;

  // Convertimos el texto "posavasos, cocina" en una lista de etiquetas
  const etiquetasTexto = document.getElementById("etiquetas").value;
  const etiquetas = etiquetasTexto
    .split(",")
    .map(function (e) { return e.trim().toLowerCase(); })
    .filter(function (e) { return e !== ""; });

  const boton = document.querySelector('button[onclick="publicarProducto()"]');

  if (!archivoFoto) {
    mostrarMensaje("Por favor, elegí una foto del producto 📷", "error");
    return;
  }
  if (nombre === "" || precioTexto === "" || descripcion === "" || stock === "") {
    mostrarMensaje("Por favor, completá todos los pasos 🌿", "error");
    return;
  }

  boton.disabled = true;
  boton.textContent = "Subiendo tu producto... ⏳";

  try {
    // 1) Subimos la foto a Cloudinary
    const datosFoto = new FormData();
    datosFoto.append("file", archivoFoto);
    datosFoto.append("upload_preset", UPLOAD_PRESET);

    const respuesta = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: datosFoto }
    );
    const resultadoFoto = await respuesta.json();

    if (!resultadoFoto.secure_url) {
      throw new Error("No se pudo subir la foto");
    }

    // 2) Guardamos el producto en Firestore
    await addDoc(collection(db, "productos"), {
      nombre: nombre,
      precio: Number(precioTexto),
      descripcion: descripcion,
      imagen: resultadoFoto.secure_url,
      stock: Number(stock),
      descuento: 0,
      etiquetas: etiquetas,
      creado: Date.now()
    });

    // 3) ¡Éxito!
    mostrarMensaje("¡Tu producto se subió con éxito! 🎉 Ya está en la página.", "exito");
    limpiarFormulario();

  } catch (error) {
    mostrarMensaje("Ups, algo salió mal. Probá de nuevo 🌿", "error");
  }

  boton.disabled = false;
  boton.textContent = "✅ ¡Publicar producto!";
}

// --- Muestra el mensaje de resultado ---
function mostrarMensaje(texto, tipo) {
  const mensaje = document.getElementById("mensaje-resultado");
  mensaje.textContent = texto;
  mensaje.classList.remove("hidden");
  mensaje.style.color = (tipo === "exito") ? "#6B8E4E" : "#A32D2D";
}

// --- Limpia el formulario después de publicar ---
function limpiarFormulario() {
  document.getElementById("nombre").value = "";
  document.getElementById("precio").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("stock").value = "";
  document.getElementById("etiquetas").value = "";
  document.getElementById("foto").value = "";
  document.getElementById("vista-previa").classList.add("hidden");
  document.getElementById("estado-foto").textContent = "";
  archivoFoto = null;
}

window.mostrarNombreFoto = mostrarNombreFoto;
window.formatearPrecio = formatearPrecio;
window.mostrarFormulario = mostrarFormulario;
window.ocultarFormulario = ocultarFormulario;
window.publicarProducto = publicarProducto;