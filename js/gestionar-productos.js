// =========================================
//  GESTIONAR PRODUCTOS — INDALO
//  Ver (grilla), editar, ofertar y eliminar
// =========================================

import { db } from "./firebase-config.js";
import {
  collection, onSnapshot, deleteDoc, doc, query, orderBy, updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Guardamos los productos para usarlos al editar
let productosActuales = {};

// --- Formatea el precio con puntos: 18000 → "$18.000" ---
function precioLindo(num) {
  return "$" + Number(num).toLocaleString("es-AR");
}

// --- Escucha la lista de productos EN VIVO ---
const consulta = query(collection(db, "productos"), orderBy("creado", "desc"));

onSnapshot(consulta, function (snapshot) {
  const lista = document.getElementById("lista-productos");
  const contador = document.getElementById("contador-productos");
  productosActuales = {};

  if (snapshot.empty) {
    lista.innerHTML = `<p class="col-span-full text-center" style="color: var(--color-texto-suave);">Todavía no subiste ningún producto 🌿</p>`;
    contador.textContent = "";
    return;
  }

  contador.textContent = "Tenés " + snapshot.size + " producto(s) publicado(s)";
  lista.innerHTML = "";

  snapshot.forEach(function (documento) {
    const p = documento.data();
    const id = documento.id;
    productosActuales[id] = p;

    const tieneOferta = p.descuento && p.descuento > 0;
    const precioFinal = tieneOferta ? Math.round(p.precio * (1 - p.descuento / 100)) : p.precio;
    const stockBajo = p.stock != null && p.stock < 3;

    // Bloque de precio (con o sin oferta)
    let bloquePrecios;
    if (tieneOferta) {
      bloquePrecios = `
        <p style="font-size: 14px; color: var(--color-texto-suave); text-decoration: line-through;">${precioLindo(p.precio)}</p>
        <p style="font-size: 18px; color: #C0392B;">${precioLindo(precioFinal)} <span style="font-size: 13px;">(-${p.descuento}%)</span></p>
      `;
    } else {
      bloquePrecios = `<p style="font-size: 17px; color: var(--color-cuero);">${precioLindo(p.precio)}</p>`;
    }

    // Etiquetas (chips pequeños)
    let bloqueEtiquetas = "";
    if (p.etiquetas && p.etiquetas.length) {
      bloqueEtiquetas = `<div class="flex flex-wrap gap-1 mt-2">` +
        p.etiquetas.map(function (et) {
          return `<span class="px-2 py-1 rounded-full" style="font-size: 11px; background: var(--color-arena); color: var(--color-texto-suave);">${et}</span>`;
        }).join("") +
        `</div>`;
    }

    lista.innerHTML += `
      <div class="rounded-2xl border-2 overflow-hidden flex flex-col relative" style="border-color: var(--color-arena); background: #FBF9F5;">

        ${tieneOferta ? `<div class="absolute top-2 left-2 px-3 py-1 rounded-full text-white" style="font-size: 13px; background: #C0392B;">-${p.descuento}%</div>` : ""}

        <!-- Foto cuadrada -->
        <img src="${p.imagen}" alt="${p.nombre}" class="w-full object-cover" style="aspect-ratio: 1 / 1;">

        <!-- Datos -->
        <div class="p-4 flex flex-col flex-grow">
          <p class="mb-1" style="font-size: 18px; color: var(--color-texto);">${p.nombre}</p>
          ${bloquePrecios}
          <p class="mt-1" style="font-size: 14px; color: ${stockBajo ? '#C0392B' : 'var(--color-texto-suave)'};">
            📦 Stock: ${p.stock != null ? p.stock : "—"} ${stockBajo ? "¡Quedan pocas!" : "unidades"}
          </p>
          ${bloqueEtiquetas}

          <!-- Botones -->
          <div class="flex flex-col gap-2 mt-3">
            <button onclick="editarProducto('${id}')"
              class="rounded-xl px-3 py-2 text-white transition hover:opacity-90"
              style="font-size: 15px; background: var(--color-cuero);">
              ✏️ Editar
            </button>
            <button onclick="ponerOferta('${id}', '${p.nombre.replace(/'/g, "")}')"
              class="rounded-xl px-3 py-2 text-white transition hover:opacity-90"
              style="font-size: 15px; background: #D98E04;">
              🏷️ ${tieneOferta ? "Cambiar oferta" : "Poner oferta"}
            </button>
            ${tieneOferta ? `
            <button onclick="quitarOferta('${id}')"
              class="rounded-xl px-3 py-2 transition hover:opacity-90"
              style="font-size: 14px; border: 1px solid var(--color-cuerda); color: var(--color-texto-suave);">
              Quitar oferta
            </button>` : ""}
            <button onclick="eliminarProducto('${id}', '${p.nombre.replace(/'/g, "")}')"
              class="rounded-xl px-3 py-2 text-white transition hover:opacity-90"
              style="font-size: 15px; background: #C0392B;">
              🗑️ Eliminar
            </button>
          </div>
        </div>

      </div>
    `;
  });
});

// =========================================
//  ELIMINAR
// =========================================
function eliminarProducto(id, nombre) {
  const seguro = confirm("¿Seguro que querés eliminar \"" + nombre + "\"?\n\nEsta acción no se puede deshacer.");
  if (seguro) {
    deleteDoc(doc(db, "productos", id));
  }
}

// =========================================
//  OFERTAS (ventanita)
// =========================================
let idProductoOferta = null;

function ponerOferta(id, nombre) {
  idProductoOferta = id;
  document.getElementById("oferta-nombre-producto").textContent = nombre;
  document.getElementById("oferta-input").value = "";
  const modal = document.getElementById("modal-oferta");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.getElementById("oferta-input").focus();
}

function cerrarModalOferta() {
  const modal = document.getElementById("modal-oferta");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  idProductoOferta = null;
}

function confirmarOferta() {
  const descuento = Number(document.getElementById("oferta-input").value);
  if (isNaN(descuento) || descuento <= 0 || descuento >= 100) {
    alert("Por favor, escribí un número entre 1 y 99 🌿");
    return;
  }
  updateDoc(doc(db, "productos", idProductoOferta), { descuento: descuento });
  cerrarModalOferta();
}

function quitarOferta(id) {
  updateDoc(doc(db, "productos", id), { descuento: 0 });
}

// =========================================
//  EDITAR (ventanita)
// =========================================
let idProductoEditar = null;

function editarProducto(id) {
  const p = productosActuales[id];
  if (!p) return;

  idProductoEditar = id;

  document.getElementById("editar-nombre").value = p.nombre;
  document.getElementById("editar-precio").value = Number(p.precio).toLocaleString("es-AR");
  document.getElementById("editar-descripcion").value = p.descripcion;
  document.getElementById("editar-stock").value = p.stock != null ? p.stock : 0;
  document.getElementById("editar-etiquetas").value = (p.etiquetas && p.etiquetas.length) ? p.etiquetas.join(", ") : "";

  const modal = document.getElementById("modal-editar");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function cerrarModalEditar() {
  const modal = document.getElementById("modal-editar");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  idProductoEditar = null;
}

// Puntos automáticos en el precio del editar
function formatearPrecioEditar() {
  const campo = document.getElementById("editar-precio");
  let soloNumeros = campo.value.replace(/\D/g, "");
  campo.value = soloNumeros ? Number(soloNumeros).toLocaleString("es-AR") : "";
}

function guardarEdicion() {
  const nombre = document.getElementById("editar-nombre").value.trim();
  const precio = document.getElementById("editar-precio").value.replace(/\D/g, "");
  const descripcion = document.getElementById("editar-descripcion").value.trim();
  const stock = document.getElementById("editar-stock").value;

  const etiquetasTexto = document.getElementById("editar-etiquetas").value;
  const etiquetas = etiquetasTexto
    .split(",")
    .map(function (e) { return e.trim().toLowerCase(); })
    .filter(function (e) { return e !== ""; });

  if (nombre === "" || precio === "" || descripcion === "" || stock === "") {
    alert("Por favor, completá todos los campos 🌿");
    return;
  }

  updateDoc(doc(db, "productos", idProductoEditar), {
    nombre: nombre,
    precio: Number(precio),
    descripcion: descripcion,
    stock: Number(stock),
    etiquetas: etiquetas
  });

  cerrarModalEditar();
}

// =========================================
//  Funciones disponibles para el HTML
// =========================================
window.eliminarProducto = eliminarProducto;
window.ponerOferta = ponerOferta;
window.cerrarModalOferta = cerrarModalOferta;
window.confirmarOferta = confirmarOferta;
window.quitarOferta = quitarOferta;
window.editarProducto = editarProducto;
window.cerrarModalEditar = cerrarModalEditar;
window.formatearPrecioEditar = formatearPrecioEditar;
window.guardarEdicion = guardarEdicion;