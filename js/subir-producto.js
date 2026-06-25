// =========================================
//  SUBIR PRODUCTO — INDALO
//  Maneja varias fotos, el precio y publicar
// =========================================

import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 🔑 Tus datos de Cloudinary
const CLOUD_NAME = "dn5kdjvgs";
const UPLOAD_PRESET = "indalo_productos";

// 📷 Máximo de fotos por producto
const MAX_FOTOS = 6;

// Lista de fotos que el usuario eligió
let archivosFotos = [];

// --- Cuando se eligen fotos con el botón ---
function mostrarNombreFoto() {
  const input = document.getElementById("foto");
  if (input.files.length > 0) {
    agregarFotos(input.files);
  }
}

// --- Agrega fotos a la lista (sin pasar el máximo) ---
function agregarFotos(listaArchivos) {
  for (let i = 0; i < listaArchivos.length; i++) {
    if (archivosFotos.length >= MAX_FOTOS) {
      mostrarMensaje(`Máximo ${MAX_FOTOS} fotos por producto 🌿`, "error");
      break;
    }
    archivosFotos.push(listaArchivos[i]);
  }
  dibujarVistasPrevias();
}

// --- Dibuja las miniaturas de todas las fotos elegidas ---
function dibujarVistasPrevias() {
  const cont = document.getElementById("vistas-previas");
  const estado = document.getElementById("estado-foto");
  if (!cont) return;

  cont.innerHTML = "";
  archivosFotos.forEach(function (archivo, indice) {
    const url = URL.createObjectURL(archivo);
    cont.innerHTML += `
      <div style="position: relative; display: inline-block;">
        <img src="${url}" style="width: 90px; height: 90px; object-fit: cover; border-radius: 12px; border: 1px solid #D4C3A8;">
        <button type="button" onclick="quitarFoto(${indice})"
          style="position: absolute; top: -6px; right: -6px; width: 24px; height: 24px; border-radius: 50%; background: #A32D2D; color: white; font-size: 14px; line-height: 1; border: none; cursor: pointer;">×</button>
      </div>
    `;
  });

  if (estado) {
    estado.textContent = archivosFotos.length > 0
      ? `✅ ${archivosFotos.length} foto(s) lista(s)`
      : "";
  }
}

// --- Quita una foto de la lista ---
function quitarFoto(indice) {
  archivosFotos.splice(indice, 1);
  dibujarVistasPrevias();
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
      agregarFotos(e.dataTransfer.files);
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
//  PUBLICAR PRODUCTO (sube fotos + guarda datos)
// =========================================
async function publicarProducto() {
  const nombre = document.getElementById("nombre").value.trim();
  const precioTexto = document.getElementById("precio").value.replace(/\D/g, "");
  const descripcion = document.getElementById("descripcion").value.trim();
  const stock = document.getElementById("stock").value;

  const etiquetasTexto = document.getElementById("etiquetas").value;
  const etiquetas = etiquetasTexto
    .split(",")
    .map(function (e) { return e.trim().toLowerCase(); })
    .filter(function (e) { return e !== ""; });

  const boton = document.querySelector('button[onclick="publicarProducto()"]');

  if (archivosFotos.length === 0) {
    mostrarMensaje("Por favor, elegí al menos una foto del producto 📷", "error");
    return;
  }
  if (nombre === "" || precioTexto === "" || descripcion === "" || stock === "") {
    mostrarMensaje("Por favor, completá todos los pasos 🌿", "error");
    return;
  }

  boton.disabled = true;
  boton.textContent = "Subiendo tu producto... ⏳";

  try {
    // 1) Subimos TODAS las fotos a Cloudinary
    const urls = [];
    for (let i = 0; i < archivosFotos.length; i++) {
      boton.textContent = `Subiendo foto ${i + 1} de ${archivosFotos.length}... ⏳`;

      const datosFoto = new FormData();
      datosFoto.append("file", archivosFotos[i]);
      datosFoto.append("upload_preset", UPLOAD_PRESET);

      const respuesta = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: datosFoto }
      );
      const resultadoFoto = await respuesta.json();

      if (!resultadoFoto.secure_url) {
        throw new Error("No se pudo subir una foto");
      }
      urls.push(resultadoFoto.secure_url);
    }

    // 2) Guardamos el producto en Firestore
    //    imagen = la primera (compatibilidad) / imagenes = la lista completa
    await addDoc(collection(db, "productos"), {
      nombre: nombre,
      precio: Number(precioTexto),
      descripcion: descripcion,
      imagen: urls[0],
      imagenes: urls,
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
  archivosFotos = [];
  dibujarVistasPrevias();
  document.getElementById("estado-foto").textContent = "";
}

window.mostrarNombreFoto = mostrarNombreFoto;
window.quitarFoto = quitarFoto;
window.formatearPrecio = formatearPrecio;
window.mostrarFormulario = mostrarFormulario;
window.ocultarFormulario = ocultarFormulario;
window.publicarProducto = publicarProducto;