// =========================================
//  LÓGICA DE LA TIENDA — INDALO
// =========================================

import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 📱 NÚMERO DE WHATSAPP (sin + ni espacios)
const WHATSAPP = "542625592060";

// 🛒 Productos que el cliente va agregando
let carrito = [];

// 📦 Lista de productos (se llena desde Firestore)
let PRODUCTOS = [];

// 🔍 Filtros activos
let filtroTexto = "";
let categoriaActiva = "todas";

// 📦 Envío
let costoEnvio = 0;
let envioElegido = "";

// --- Formatea un número como precio: 18000 → "$18.000" ---
function formatearPrecio(num) {
  return "$" + Number(num).toLocaleString("es-AR");
}

// --- Calcula el precio final (con descuento si tiene) ---
function precioConDescuento(p) {
  if (p.descuento && p.descuento > 0) {
    return Math.round(p.precio * (1 - p.descuento / 100));
  }
  return p.precio;
}

// --- Devuelve la lista de imágenes de un producto (compatible con productos viejos) ---
function obtenerImagenes(p) {
  if (p.imagenes && p.imagenes.length > 0) {
    return p.imagenes;
  }
  if (p.imagen) {
    return [p.imagen];
  }
  return [];
}

// --- Dibuja las tarjetas de productos (respetando el filtro) ---
function mostrarProductos() {
  const galeria = document.getElementById("galeria");
  galeria.innerHTML = "";

  if (PRODUCTOS.length === 0) {
    galeria.innerHTML = `<p class="col-span-full text-center text-[#8A7B6B] py-12">Pronto vas a ver nuestros productos aquí 🌿</p>`;
    return;
  }

  const filtrados = PRODUCTOS.filter(function (p) {
    const coincideCategoria = categoriaActiva === "todas" ||
      (p.etiquetas && p.etiquetas.includes(categoriaActiva));

    const enNombre = p.nombre.toLowerCase().includes(filtroTexto);
    const enDescripcion = p.descripcion.toLowerCase().includes(filtroTexto);
    const enEtiquetas = p.etiquetas && p.etiquetas.some(function (et) {
      return et.includes(filtroTexto);
    });
    const coincideTexto = filtroTexto === "" || enNombre || enDescripcion || enEtiquetas;

    return coincideCategoria && coincideTexto;
  });

  if (filtrados.length === 0) {
    galeria.innerHTML = `<p class="col-span-full text-center text-[#8A7B6B] py-12">No encontramos productos con esa búsqueda 🔍</p>`;
    return;
  }

  filtrados.forEach(function (p) {
    const tieneOferta = p.descuento && p.descuento > 0;
    const precioFinal = precioConDescuento(p);
    const sinStock = p.stock <= 0;
    const pocasUnidades = p.stock > 0 && p.stock < 3;

    let bloquePrecio;
    if (tieneOferta) {
      bloquePrecio = `
        <div class="flex flex-col">
          <span class="text-sm text-[#8A7B6B] line-through">${formatearPrecio(p.precio)}</span>
          <span class="text-lg" style="color: #C0392B;">${formatearPrecio(precioFinal)}</span>
        </div>
      `;
    } else {
      bloquePrecio = `<span class="text-lg" style="color: var(--color-cuero);">${formatearPrecio(p.precio)}</span>`;
    }

    const etiquetaOferta = tieneOferta
      ? `<div class="absolute top-3 left-3 px-3 py-1 rounded-full text-white text-sm" style="background: #C0392B;">-${p.descuento}%</div>`
      : "";

    const boton = sinStock
      ? `<span class="px-4 py-2 rounded-full text-sm" style="background: #E5DBCC; color: #8A7B6B;">Sin stock</span>`
      : `<button onclick="event.stopPropagation(); agregarAlCarrito('${p.id}')"
            class="px-4 py-2 rounded-full text-sm text-white transition hover:opacity-90"
            style="background: var(--color-cuero);">Agregar</button>`;

    galeria.innerHTML += `
      <div onclick="abrirModalProducto('${p.id}')" class="bg-white rounded-2xl overflow-hidden border border-[#E5DBCC] flex flex-col relative cursor-pointer">

        ${etiquetaOferta}

        <div class="aspect-square bg-[#E5DBCC] flex items-center justify-center text-[#8A7B6B] text-sm">
          <img src="${p.imagen}" alt="${p.nombre}"
               class="w-full h-full object-cover"
               onerror="this.style.display='none'; this.parentElement.innerHTML='Foto próximamente';">
        </div>

        <div class="p-5 flex flex-col flex-grow">
          <h3 class="text-xl mb-1" style="font-family: var(--fuente-titulo);">${p.nombre}</h3>
          <p class="text-sm text-[#8A7B6B] mb-2 flex-grow">${p.descripcion}</p>
          ${pocasUnidades ? `<p class="text-sm mb-3" style="color: #C0392B;">🔥 ¡Últimas ${p.stock} unidades!</p>` : ""}
          <div class="flex items-center justify-between mt-auto">
            ${bloquePrecio}
            ${boton}
          </div>
        </div>

      </div>
    `;
  });
}

// --- Muestra los productos en oferta en la sección de arriba ---
function mostrarOfertas() {
  const seccion = document.getElementById("seccion-ofertas");
  const galeria = document.getElementById("galeria-ofertas");
  if (!seccion || !galeria) return;

  const enOferta = PRODUCTOS.filter(function (p) {
    return p.descuento && p.descuento > 0 && p.stock > 0;
  });

  if (enOferta.length === 0) {
    seccion.classList.add("hidden");
    return;
  }

  seccion.classList.remove("hidden");
  galeria.innerHTML = "";

  enOferta.forEach(function (p) {
    const precioFinal = precioConDescuento(p);
    galeria.innerHTML += `
      <div onclick="abrirModalProducto('${p.id}')" class="bg-white rounded-2xl overflow-hidden border border-[#E5DBCC] flex flex-col relative cursor-pointer">
        <div class="absolute top-3 left-3 px-3 py-1 rounded-full text-white text-sm" style="background: #C0392B;">-${p.descuento}%</div>
        <div class="aspect-square bg-[#E5DBCC] flex items-center justify-center text-[#8A7B6B] text-sm">
          <img src="${p.imagen}" alt="${p.nombre}" class="w-full h-full object-cover"
               onerror="this.style.display='none'; this.parentElement.innerHTML='Foto próximamente';">
        </div>
        <div class="p-5 flex flex-col flex-grow">
          <h3 class="text-xl mb-1" style="font-family: var(--fuente-titulo);">${p.nombre}</h3>
          <p class="text-sm text-[#8A7B6B] mb-4 flex-grow">${p.descripcion}</p>
          <div class="flex items-center justify-between mt-auto">
            <div class="flex flex-col">
              <span class="text-sm text-[#8A7B6B] line-through">${formatearPrecio(p.precio)}</span>
              <span class="text-lg" style="color: #C0392B;">${formatearPrecio(precioFinal)}</span>
            </div>
            <button onclick="event.stopPropagation(); agregarAlCarrito('${p.id}')"
              class="px-4 py-2 rounded-full text-sm text-white transition hover:opacity-90"
              style="background: var(--color-cuero);">Agregar</button>
          </div>
        </div>
      </div>
    `;
  });
}

// --- Muestra los 2 últimos productos con etiqueta "nuevo" ---
function mostrarNuevos() {
  const galeria = document.getElementById("galeria-nuevos");
  if (!galeria) return;

  const nuevos = PRODUCTOS.filter(function (p) {
    return p.etiquetas && p.etiquetas.includes("nuevo") && p.stock > 0;
  }).slice(0, 2);

  if (nuevos.length === 0) {
    galeria.innerHTML = `<p class="col-span-full text-[#8A7B6B]" style="font-size: 15px;">Pronto vas a ver nuestras novedades aquí 🌿</p>`;
    return;
  }

  galeria.innerHTML = "";
  nuevos.forEach(function (p) {
    const tieneOferta = p.descuento && p.descuento > 0;
    const precioFinal = precioConDescuento(p);

    let bloquePrecio;
    if (tieneOferta) {
      bloquePrecio = `
        <div class="flex flex-col">
          <span class="text-xs text-[#8A7B6B] line-through">${formatearPrecio(p.precio)}</span>
          <span class="text-base" style="color: #C0392B;">${formatearPrecio(precioFinal)}</span>
        </div>
      `;
    } else {
      bloquePrecio = `<span class="text-base" style="color: var(--color-cuero);">${formatearPrecio(p.precio)}</span>`;
    }

    galeria.innerHTML += `
      <div onclick="abrirModalProducto('${p.id}')" class="bg-white rounded-2xl overflow-hidden border border-[#E5DBCC] flex flex-col relative cursor-pointer">
        <div class="absolute top-2 left-2 px-3 py-1 rounded-full text-white" style="font-size: 12px; background: var(--color-verde);">Nuevo</div>
        <div class="aspect-square bg-[#E5DBCC] flex items-center justify-center text-[#8A7B6B] text-sm">
          <img src="${p.imagen}" alt="${p.nombre}" class="w-full h-full object-cover"
               onerror="this.style.display='none'; this.parentElement.innerHTML='Foto próximamente';">
        </div>
        <div class="p-4 flex flex-col flex-grow">
          <h3 class="text-lg mb-2" style="font-family: var(--fuente-titulo);">${p.nombre}</h3>
          <div class="flex items-center justify-between mt-auto">
            ${bloquePrecio}
            <button onclick="event.stopPropagation(); agregarAlCarrito('${p.id}')"
              class="px-3 py-2 rounded-full text-sm text-white transition hover:opacity-90"
              style="background: var(--color-cuero);">Agregar</button>
          </div>
        </div>
      </div>
    `;
  });
}

// =========================================
//  MODAL DE PRODUCTO (ventana grande con galería)
// =========================================
let productoModalActual = null;
let imagenesModal = [];
let indiceImagenActual = 0;

function abrirModalProducto(id) {
  const p = PRODUCTOS.find(function (prod) { return prod.id === id; });
  if (!p) return;

  productoModalActual = p;
  imagenesModal = obtenerImagenes(p);
  indiceImagenActual = 0;

  const tieneOferta = p.descuento && p.descuento > 0;
  const precioFinal = precioConDescuento(p);

  // Dibujamos la galería (foto grande + flechitas + miniaturas)
  dibujarGaleriaModal();

  document.getElementById("modal-nombre").textContent = p.nombre;

  const precioDiv = document.getElementById("modal-precio");
  if (tieneOferta) {
    precioDiv.innerHTML = `
      <span style="font-size: 18px; color: var(--color-texto-suave); text-decoration: line-through;">${formatearPrecio(p.precio)}</span>
      <span class="ml-2" style="font-size: 28px; color: #C0392B;">${formatearPrecio(precioFinal)}</span>
      <span class="ml-2 px-3 py-1 rounded-full text-white" style="font-size: 14px; background: #C0392B;">-${p.descuento}%</span>
    `;
  } else {
    precioDiv.innerHTML = `<span style="font-size: 28px; color: var(--color-cuero);">${formatearPrecio(p.precio)}</span>`;
  }

  document.getElementById("modal-descripcion").textContent = p.descripcion;

  const stockP = document.getElementById("modal-stock");
  if (p.stock <= 0) {
    stockP.innerHTML = `<span style="color: #C0392B;">Sin stock por el momento</span>`;
  } else if (p.stock < 3) {
    stockP.innerHTML = `<span style="color: #C0392B;">🔥 ¡Últimas ${p.stock} unidades!</span>`;
  } else {
    stockP.innerHTML = `<span style="color: var(--color-texto-suave);">📦 ${p.stock} unidades disponibles</span>`;
  }

  const btnAgregar = document.getElementById("modal-btn-agregar");
  const btnComprar = document.getElementById("modal-btn-comprar");

  if (p.stock <= 0) {
    btnAgregar.style.display = "none";
    btnComprar.style.display = "none";
  } else {
    btnAgregar.style.display = "block";
    btnComprar.style.display = "block";
    btnAgregar.onclick = function () {
      agregarAlCarrito(id);
      cerrarModalProducto();
      abrirCarrito();
    };
    btnComprar.onclick = function () {
      comprarAhora(p);
    };
  }

  const modal = document.getElementById("modal-producto");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

// --- Dibuja la foto grande, las flechitas y las miniaturas ---
function dibujarGaleriaModal() {
  const fotoGrande = document.getElementById("modal-foto");
  const miniaturas = document.getElementById("modal-miniaturas");
  const flechaIzq = document.getElementById("modal-flecha-izq");
  const flechaDer = document.getElementById("modal-flecha-der");

  if (imagenesModal.length === 0) {
    fotoGrande.src = "";
    if (miniaturas) miniaturas.innerHTML = "";
    return;
  }

  // Foto grande = la del índice actual
  fotoGrande.src = imagenesModal[indiceImagenActual];
  fotoGrande.alt = productoModalActual ? productoModalActual.nombre : "";

  // Flechitas: solo se muestran si hay más de una foto
  const hayVarias = imagenesModal.length > 1;
  if (flechaIzq) flechaIzq.style.display = hayVarias ? "flex" : "none";
  if (flechaDer) flechaDer.style.display = hayVarias ? "flex" : "none";

  // Miniaturas
  if (miniaturas) {
    if (hayVarias) {
      miniaturas.innerHTML = "";
      imagenesModal.forEach(function (url, indice) {
        const activa = indice === indiceImagenActual;
        miniaturas.innerHTML += `
          <img src="${url}" onclick="elegirImagenModal(${indice})"
            style="width: 64px; height: 64px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 2px solid ${activa ? 'var(--color-cuero)' : 'transparent'}; opacity: ${activa ? '1' : '0.7'};">
        `;
      });
    } else {
      miniaturas.innerHTML = "";
    }
  }
}

// --- Elegir una foto tocando su miniatura ---
function elegirImagenModal(indice) {
  indiceImagenActual = indice;
  dibujarGaleriaModal();
}

// --- Pasar a la foto anterior ---
function imagenAnterior() {
  if (imagenesModal.length === 0) return;
  indiceImagenActual = (indiceImagenActual - 1 + imagenesModal.length) % imagenesModal.length;
  dibujarGaleriaModal();
}

// --- Pasar a la foto siguiente ---
function imagenSiguiente() {
  if (imagenesModal.length === 0) return;
  indiceImagenActual = (indiceImagenActual + 1) % imagenesModal.length;
  dibujarGaleriaModal();
}

function cerrarModalProducto() {
  const modal = document.getElementById("modal-producto");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  productoModalActual = null;
  imagenesModal = [];
  indiceImagenActual = 0;
}

// =========================================
//  MODAL DE INFORMACIÓN (Nosotros)
// =========================================
function abrirModalInfo(datos) {
  document.getElementById("modal-info-icono").textContent = datos.icono || "";
  document.getElementById("modal-info-titulo").textContent = datos.titulo || "";
  document.getElementById("modal-info-subtitulo").textContent = datos.subtitulo || "";
  document.getElementById("modal-info-texto").textContent = datos.texto || "";

  const img = document.getElementById("modal-info-imagen");
  if (datos.imagen) {
    img.src = datos.imagen;
    img.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
  }

  const modal = document.getElementById("modal-info");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function cerrarModalInfo() {
  const modal = document.getElementById("modal-info");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// --- Comprar ahora: arma un mensaje directo de WhatsApp con ese producto ---
function comprarAhora(p) {
  const precioFinal = precioConDescuento(p);
  let mensaje = "¡Hola Indalo! 🌿 Quiero comprar:%0A%0A";
  mensaje += `• ${p.nombre} — ${formatearPrecio(precioFinal)}%0A%0A`;
  mensaje += "¿Me confirman disponibilidad y forma de pago? ¡Gracias!";
  window.open(`https://wa.me/${WHATSAPP}?text=${mensaje}`, "_blank");
}

// --- Arma los botones de categorías con las etiquetas existentes ---
function armarCategorias() {
  const cont = document.getElementById("categorias");
  if (!cont) return;

  const todas = new Set();
  PRODUCTOS.forEach(function (p) {
    if (p.etiquetas) {
      p.etiquetas.forEach(function (et) { todas.add(et); });
    }
  });

  let html = `<button onclick="filtrarPorCategoria('todas')" class="px-4 py-2 rounded-full transition" style="font-size: 14px; background: ${categoriaActiva === 'todas' ? 'var(--color-cuero)' : 'white'}; color: ${categoriaActiva === 'todas' ? 'white' : 'var(--color-texto-suave)'}; border: 1px solid var(--color-cuerda);">Todas</button>`;

  todas.forEach(function (et) {
    const activa = categoriaActiva === et;
    html += `<button onclick="filtrarPorCategoria('${et}')" class="px-4 py-2 rounded-full transition" style="font-size: 14px; background: ${activa ? 'var(--color-cuero)' : 'white'}; color: ${activa ? 'white' : 'var(--color-texto-suave)'}; border: 1px solid var(--color-cuerda);">${et}</button>`;
  });

  cont.innerHTML = html;
}

// --- Cuando se toca un botón de categoría ---
function filtrarPorCategoria(cat) {
  categoriaActiva = cat;
  armarCategorias();
  mostrarProductos();
}

// --- Cuando se escribe en el buscador ---
function filtrarProductos() {
  filtroTexto = document.getElementById("buscador").value.trim().toLowerCase();
  mostrarProductos();
}

// --- Agrega un producto al carrito ---
function agregarAlCarrito(id) {
  const producto = PRODUCTOS.find(function (p) { return p.id === id; });
  if (!producto) return;

  const enCarrito = carrito.find(function (item) { return item.id === id; });
  if (enCarrito) {
    enCarrito.cantidad++;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: precioConDescuento(producto),
      cantidad: 1
    });
  }
  actualizarCarrito();
}

// --- Quita una unidad de un producto ---
function quitarDelCarrito(id) {
  const enCarrito = carrito.find(function (item) { return item.id === id; });
  if (enCarrito) {
    enCarrito.cantidad--;
    if (enCarrito.cantidad <= 0) {
      carrito = carrito.filter(function (item) { return item.id !== id; });
    }
  }
  actualizarCarrito();
}

// --- Redibuja el carrito y recalcula el subtotal + envío ---
function actualizarCarrito() {
  const lista = document.getElementById("carrito-items");
  const totalEl = document.getElementById("carrito-total");
  const contador = document.getElementById("carrito-contador");

  lista.innerHTML = "";
  let subtotal = 0;
  let cantidadTotal = 0;

  if (carrito.length === 0) {
    lista.innerHTML = `<p class="text-center text-[#8A7B6B] py-8">Tu carrito está vacío</p>`;
  }

  carrito.forEach(function (item) {
    subtotal += item.precio * item.cantidad;
    cantidadTotal += item.cantidad;

    lista.innerHTML += `
      <div class="flex items-center justify-between py-3 border-b border-[#E5DBCC]">
        <div class="flex-grow">
          <p class="text-sm">${item.nombre}</p>
          <p class="text-xs text-[#8A7B6B]">${formatearPrecio(item.precio)} c/u</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="quitarDelCarrito('${item.id}')" class="w-7 h-7 rounded-full border border-[#D4C3A8]">−</button>
          <span class="text-sm w-5 text-center">${item.cantidad}</span>
          <button onclick="agregarAlCarrito('${item.id}')" class="w-7 h-7 rounded-full border border-[#D4C3A8]">+</button>
        </div>
      </div>
    `;
  });

  const subtotalEl = document.getElementById("carrito-subtotal");
  if (subtotalEl) subtotalEl.textContent = formatearPrecio(subtotal);

  const envioEl = document.getElementById("carrito-envio");
  if (envioEl) {
    if (envioElegido === "") {
      envioEl.textContent = "—";
    } else if (costoEnvio === 0) {
      envioEl.textContent = "Gratis 🎉";
    } else {
      envioEl.textContent = formatearPrecio(costoEnvio);
    }
  }

  totalEl.textContent = formatearPrecio(subtotal + costoEnvio);
  contador.textContent = cantidadTotal;
}

// =========================================
//  CÁLCULO DE ENVÍO (por zona de código postal)
// =========================================

// 🔧 PRECIOS DE ENVÍO POR ZONA (cambiá estos números por los reales)
const PRECIOS_ENVIO = {
  cuyo:      { andreani: 6000,  correo: 4500 },   // Mendoza y alrededores
  centro:    { andreani: 8000,  correo: 6000 },   // Buenos Aires, Córdoba, Santa Fe
  norte:     { andreani: 9500,  correo: 7000 },   // Salta, Tucumán, etc.
  patagonia: { andreani: 12000, correo: 9000 }    // Sur del país
};

// --- Según el código postal, devuelve la zona ---
function obtenerZona(cp) {
  const primerDigito = cp.charAt(0);
  if (primerDigito === "5") return "cuyo";
  if (primerDigito === "1" || primerDigito === "2" || primerDigito === "3") return "centro";
  if (primerDigito === "4") return "norte";
  return "patagonia"; // 6, 7, 8, 9
}

// --- Calcula el envío cuando se toca "Calcular" ---
function calcularEnvio() {
  const cp = document.getElementById("codigo-postal").value.trim();
  const resultado = document.getElementById("resultado-envio");

  if (cp.length < 4) {
    resultado.innerHTML = `<p style="font-size: 14px; color: #C0392B;">Escribí un código postal válido 🌿</p>`;
    return;
  }

  // ¿Zona de entrega gratis? (San Rafael 5600 / Gral. Alvear 5620)
  if (cp === "5600" || cp === "5620") {
    costoEnvio = 0;
    envioElegido = "Entrega sin costo (zona local)";
    resultado.innerHTML = `
      <div class="p-3 rounded-xl text-center" style="background: #E7EDE1;">
        <p style="font-size: 16px; color: var(--color-verde);">🎉 ¡Entrega sin costo en tu zona!</p>
      </div>
    `;
    actualizarCarrito();
    return;
  }

  // Otra zona: mostramos las dos opciones
  const zona = obtenerZona(cp);
  const precios = PRECIOS_ENVIO[zona];

  resultado.innerHTML = `
    <p class="mb-2" style="font-size: 14px; color: var(--color-texto-suave);">Elegí tu forma de envío:</p>
    <div class="space-y-2">
      <button onclick="elegirEnvio('Andreani', ${precios.andreani})"
        id="btn-andreani"
        class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition hover:opacity-90"
        style="background: white; border: 1px solid var(--color-cuerda);">
        <span style="font-size: 15px; color: var(--color-texto);">📦 Andreani</span>
        <span style="font-size: 15px; color: var(--color-cuero);">${formatearPrecio(precios.andreani)}</span>
      </button>
      <button onclick="elegirEnvio('Correo Argentino', ${precios.correo})"
        id="btn-correo"
        class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition hover:opacity-90"
        style="background: white; border: 1px solid var(--color-cuerda);">
        <span style="font-size: 15px; color: var(--color-texto);">📮 Correo Argentino</span>
        <span style="font-size: 15px; color: var(--color-cuero);">${formatearPrecio(precios.correo)}</span>
      </button>
    </div>
    <p class="mt-2" style="font-size: 12px; color: var(--color-texto-suave);">* Precio estimado, se confirma por WhatsApp</p>
  `;
}

// --- Cuando la persona elige Andreani o Correo ---
function elegirEnvio(nombre, precio) {
  costoEnvio = precio;
  envioElegido = nombre;

  const btnA = document.getElementById("btn-andreani");
  const btnC = document.getElementById("btn-correo");
  if (btnA) { btnA.style.background = "white"; btnA.style.borderColor = "var(--color-cuerda)"; }
  if (btnC) { btnC.style.background = "white"; btnC.style.borderColor = "var(--color-cuerda)"; }

  const elegido = (nombre === "Andreani") ? btnA : btnC;
  if (elegido) {
    elegido.style.background = "#E7EDE1";
    elegido.style.borderColor = "var(--color-verde)";
  }

  actualizarCarrito();
}

// --- Arma el mensaje y abre WhatsApp ---
function enviarPedido() {
  if (carrito.length === 0) {
    alert("Tu carrito está vacío. Agregá algún producto antes de enviar el pedido 🧺");
    return;
  }

  let mensaje = "¡Hola Indalo! 🌿 Quiero hacer un pedido:%0A%0A";
  let subtotal = 0;

  carrito.forEach(function (item) {
    const linea = item.precio * item.cantidad;
    subtotal += linea;
    mensaje += `• ${item.cantidad}x ${item.nombre} — ${formatearPrecio(linea)}%0A`;
  });

  mensaje += `%0A*Subtotal: ${formatearPrecio(subtotal)}*%0A`;
  if (envioElegido !== "") {
    const textoEnvio = costoEnvio === 0 ? "Gratis" : formatearPrecio(costoEnvio);
    mensaje += `*Envío (${envioElegido}): ${textoEnvio}*%0A`;
    mensaje += `*TOTAL: ${formatearPrecio(subtotal + costoEnvio)}*%0A`;
  }
  mensaje += `%0A¿Me confirman disponibilidad y forma de pago? ¡Gracias!`;

  const url = `https://wa.me/${WHATSAPP}?text=${mensaje}`;
  window.open(url, "_blank");
}

// --- Escuchamos los productos EN VIVO desde Firestore ---
const consultaTienda = query(collection(db, "productos"), orderBy("creado", "desc"));

onSnapshot(consultaTienda, function (snapshot) {
  PRODUCTOS = [];
  snapshot.forEach(function (documento) {
    const p = documento.data();
    PRODUCTOS.push({
      id: documento.id,
      nombre: p.nombre,
      precio: p.precio,
      descripcion: p.descripcion,
      imagen: p.imagen,
      imagenes: p.imagenes || null,
      stock: p.stock != null ? p.stock : 0,
      descuento: p.descuento || 0,
      etiquetas: p.etiquetas || []
    });
  });
  mostrarProductos();
  armarCategorias();
  mostrarOfertas();
  mostrarNuevos();
});

// --- Funciones disponibles para los botones del HTML ---
window.agregarAlCarrito = agregarAlCarrito;
window.quitarDelCarrito = quitarDelCarrito;
window.enviarPedido = enviarPedido;
window.filtrarProductos = filtrarProductos;
window.filtrarPorCategoria = filtrarPorCategoria;
window.abrirModalProducto = abrirModalProducto;
window.cerrarModalProducto = cerrarModalProducto;
window.abrirModalInfo = abrirModalInfo;
window.cerrarModalInfo = cerrarModalInfo;
window.calcularEnvio = calcularEnvio;
window.elegirEnvio = elegirEnvio;
window.elegirImagenModal = elegirImagenModal;
window.imagenAnterior = imagenAnterior;
window.imagenSiguiente = imagenSiguiente;

// --- Arranca el carrito vacío ---
actualizarCarrito();