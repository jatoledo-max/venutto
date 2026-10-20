/* ============================================================
   VENUTTO — LÓGICA DE LA PÁGINA DE PEDIDO (pedir.html)
   Menú con fotos + armador de pedido + mensaje de WhatsApp
   (Los datos viven en js/menu-data.js)
   ============================================================ */

/* ── Estado ─────────────────────────────────────────────── */
const cart = {};                  // { idProducto: cantidad }
let tipoEntrega = "retiro";       // "retiro" | "envio"
let metodoPago = "transferencia"; // "transferencia" | "efectivo"
let direccion = "";

/* ── Índice de productos (menú + adicionales) ───────────── */
const PRODUCTOS = {};
CATEGORIAS.forEach(c => c.productos.forEach(p => (PRODUCTOS[p.id] = { ...p, cat: c.id })));
ADICIONALES.forEach(a => (PRODUCTOS[a.id] = { ...a, esAdicional: true }));

/* ── Helpers ────────────────────────────────────────────── */
const $ = sel => document.querySelector(sel);
const fmt = n => "$" + Number(n).toLocaleString("es-AR");

/* ============================================================
   RENDER DEL MENÚ (tabs + cards con foto + adicionales)
   ============================================================ */
function renderMenu() {
  const tabs = $("#menu-tabs");
  const paneles = $("#menu-paneles");

  CATEGORIAS.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i === 0 ? " activo" : "");
    btn.textContent = `${c.emoji} ${c.nombre}`;
    btn.addEventListener("click", () => mostrarCat(c.id, btn));
    tabs.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "cat-panel" + (i === 0 ? " visible" : "");
    panel.id = "cat-" + c.id;

    const grid = document.createElement("div");
    grid.className = "productos-grid";
    c.productos.forEach(p => grid.appendChild(cardProducto(p)));
    panel.appendChild(grid);

    if (c.nota) {
      const nota = document.createElement("div");
      nota.className = "menu-nota";
      nota.innerHTML = c.nota;
      panel.appendChild(nota);
    }
    paneles.appendChild(panel);
  });
}

function cardProducto(p) {
  const card = document.createElement("div");
  card.className = "prod-card" + (p.promo ? " promo" : "");
  card.innerHTML = `
    ${p.promo ? '<span class="badge-promo">🔥 Promo</span>' : ""}
    <div class="prod-foto"><img src="./${p.img}" alt="${p.nombre}" loading="lazy"></div>
    <div class="prod-cuerpo">
      <div class="prod-nombre">${p.nombre}</div>
      <div class="prod-desc">${p.desc}</div>
      <div class="prod-footer">
        <div class="prod-precio">${fmt(p.precio)}</div>
        <button class="btn-agregar" type="button" data-agregar="${p.id}">
          <i class="bi bi-plus-lg"></i> Agregar
        </button>
      </div>
    </div>`;
  return card;
}

function renderAdicionalesMenu() {
  const grid = $("#adicionales-grid");
  ADICIONALES.forEach(a => {
    const b = document.createElement("button");
    b.className = "extra-chip";
    b.type = "button";
    b.dataset.agregar = a.id;
    b.innerHTML = `<i class="bi bi-plus-circle"></i> ${a.nombre} <span class="chip-precio">${fmt(a.precio)}</span>`;
    grid.appendChild(b);
  });
}

function mostrarCat(id, btn) {
  document.querySelectorAll(".cat-panel").forEach(p => p.classList.remove("visible"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("activo"));
  $("#cat-" + id).classList.add("visible");
  btn.classList.add("activo");
}

/* ============================================================
   CARRITO
   ============================================================ */
function agregar(id) {
  if (!PRODUCTOS[id]) return;
  cart[id] = (cart[id] || 0) + 1;
  toast(`${PRODUCTOS[id].nombre} agregado`);
  actualizarTodo();
}

function cambiarCantidad(id, delta) {
  if (!cart[id]) return;
  cart[id] += delta;
  if (cart[id] <= 0) delete cart[id];
  actualizarTodo();
}

function calcularTotal() {
  return Object.keys(cart).reduce((t, id) => t + PRODUCTOS[id].precio * cart[id], 0);
}

function contarItems() {
  return Object.values(cart).reduce((t, q) => t + q, 0);
}

/* ── Skeleton del drawer (se arma una sola vez) ─────────── */
function buildDrawer() {
  const body = $("#drawer-body");
  body.innerHTML = `
    <div id="cart-items"></div>
    <div id="cart-adicionales" class="drawer-adicionales"></div>
    <div id="cart-checkout"></div>`;

  const add = $("#cart-adicionales");
  add.innerHTML = `<h4>Sumale a tu pedido</h4>` +
    ADICIONALES.map(a => `
      <div class="add-row">
        <div class="add-row-info">${a.nombre}<span>${fmt(a.precio)}</span></div>
        <button class="btn-add-mini" type="button" data-agregar="${a.id}" aria-label="Agregar ${a.nombre}">
          <i class="bi bi-plus"></i>
        </button>
      </div>`).join("");

  buildCheckout();
}

function buildCheckout() {
  const el = $("#cart-checkout");
  el.innerHTML = `
    <div class="checkout">
      <p class="drawer-seccion-titulo">¿Cómo lo querés?</p>
      <div class="opciones" id="op-entrega">
        <div class="opcion sel" data-tipo="retiro"><i class="bi bi-bag-check"></i>Retiro</div>
        <div class="opcion" data-tipo="envio"><i class="bi bi-bicycle"></i>Envío</div>
      </div>

      <div id="envio-campos" style="display:none;">
        <div class="campo">
          <label>Dirección de entrega</label>
          <input id="input-direccion" type="text" autocomplete="off"
                 placeholder="Calle, número, barrio...">
        </div>
        <div class="aviso">
          <i class="bi bi-geo-alt-fill"></i>
          <div>Acordate de mandar tu <strong>ubicación</strong> por WhatsApp después de confirmar.
          El costo del envío ($500 a $1500 según la distancia) te lo confirmamos ahí 📍</div>
        </div>
      </div>

      <p class="drawer-seccion-titulo" style="margin-top:22px;">¿Cómo pagás?</p>
      <div class="opciones" id="op-pago">
        <div class="opcion sel" data-pago="transferencia"><i class="bi bi-bank"></i>Transferencia</div>
        <div class="opcion" data-pago="efectivo"><i class="bi bi-cash-coin"></i>Efectivo</div>
      </div>

      <div id="alias-campos">
        <div class="alias-box">
          <div class="alias-info">
            <span>Alias para transferir</span>
            <strong>${CONFIG.aliasTransferencia}</strong>
          </div>
          <button class="btn-copiar" id="btn-copiar-alias" type="button">
            <i class="bi bi-clipboard"></i> Copiar
          </button>
        </div>
      </div>
    </div>`;

  el.querySelectorAll("#op-entrega .opcion").forEach(op => {
    op.addEventListener("click", () => {
      tipoEntrega = op.dataset.tipo;
      el.querySelectorAll("#op-entrega .opcion").forEach(o => o.classList.toggle("sel", o === op));
      $("#envio-campos").style.display = tipoEntrega === "envio" ? "block" : "none";
      actualizarBotonEnviar();
    });
  });

  el.querySelectorAll("#op-pago .opcion").forEach(op => {
    op.addEventListener("click", () => {
      metodoPago = op.dataset.pago;
      el.querySelectorAll("#op-pago .opcion").forEach(o => o.classList.toggle("sel", o === op));
      $("#alias-campos").style.display = metodoPago === "transferencia" ? "block" : "none";
    });
  });

  $("#input-direccion").addEventListener("input", e => {
    direccion = e.target.value;
    actualizarBotonEnviar();
  });

  $("#btn-copiar-alias").addEventListener("click", copiarAlias);
}

/* ── Actualizaciones de UI ──────────────────────────────── */
function actualizarTodo() {
  renderCart();
  actualizarFab();
}

function renderCart() {
  const cont = $("#cart-items");
  if (!cont) return;
  const ids = Object.keys(cart);

  if (ids.length === 0) {
    cont.innerHTML = `
      <div class="cart-vacio">
        <i class="bi bi-bag"></i>
        <p>Tu pedido está vacío.<br>Agregá algo del menú para empezar.</p>
      </div>`;
    $("#cart-adicionales").style.display = "none";
    $("#cart-checkout").style.display = "none";
    setTotal(0);
    actualizarBotonEnviar();
    return;
  }

  $("#cart-adicionales").style.display = "block";
  $("#cart-checkout").style.display = "block";

  cont.innerHTML = ids.map(id => {
    const p = PRODUCTOS[id];
    const qty = cart[id];
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-nombre">${p.nombre}</div>
          <div class="cart-item-precio">${fmt(p.precio)} c/u</div>
          <div class="qty">
            <button type="button" data-menos="${id}" aria-label="Quitar uno">−</button>
            <span>${qty}</span>
            <button type="button" data-mas="${id}" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <div class="cart-item-sub">${fmt(p.precio * qty)}</div>
      </div>`;
  }).join("");

  setTotal(calcularTotal());
  actualizarBotonEnviar();
}

function setTotal(n) {
  $("#total-monto").textContent = fmt(n);
  $("#cart-fab-total").textContent = fmt(n);
}

function actualizarFab() {
  const n = contarItems();
  $("#cart-fab-count").textContent = n;
  $("#cart-fab").classList.toggle("visible", n > 0);
}

function actualizarBotonEnviar() {
  const btn = $("#btn-enviar");
  const hayItems = Object.keys(cart).length > 0;
  const faltaDireccion = tipoEntrega === "envio" && !direccion.trim();
  btn.disabled = !hayItems || faltaDireccion;
  btn.innerHTML = faltaDireccion
    ? '<i class="bi bi-geo-alt"></i> Completá la dirección'
    : '<i class="bi bi-whatsapp"></i> Confirmar por WhatsApp';
}

/* ============================================================
   ENVIAR PEDIDO A WHATSAPP
   ============================================================ */
function enviarPedido() {
  const ids = Object.keys(cart);
  if (ids.length === 0) return;
  if (tipoEntrega === "envio" && !direccion.trim()) {
    toast("Completá la dirección de entrega");
    return;
  }

  const lineas = ids.map(id => `• ${cart[id]}x ${PRODUCTOS[id].nombre} (${fmt(PRODUCTOS[id].precio)})`);
  let msg = `¡Hola Venutto! 🍔 Quiero hacer este pedido:\n\n${lineas.join("\n")}\n\n*Total: ${fmt(calcularTotal())}*\n\n`;

  if (tipoEntrega === "envio") {
    msg += `Entrega: *Envío* 🛵\nDirección: ${direccion.trim()}\n(Te mando mi ubicación por acá 📍 — el costo del envío lo confirmamos)\n\n`;
  } else {
    msg += `Entrega: *Retiro en el local* 🏠\n\n`;
  }

  if (metodoPago === "transferencia") {
    msg += `Pago: *Transferencia* (alias: ${CONFIG.aliasTransferencia})`;
  } else {
    msg += `Pago: *Efectivo* 💵`;
  }

  const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

/* ============================================================
   DRAWER (abrir / cerrar)
   ============================================================ */
function abrirCarrito() {
  $("#drawer").classList.add("abierto");
  $("#drawer-overlay").classList.add("abierto");
  document.body.style.overflow = "hidden";
}

function cerrarCarrito() {
  $("#drawer").classList.remove("abierto");
  $("#drawer-overlay").classList.remove("abierto");
  document.body.style.overflow = "";
}

/* ============================================================
   COPIAR ALIAS
   ============================================================ */
function copiarAlias() {
  const alias = CONFIG.aliasTransferencia;
  const btn = $("#btn-copiar-alias");
  const ok = () => {
    btn.classList.add("copiado");
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Copiado';
    toast("Alias copiado ✓");
    setTimeout(() => {
      btn.classList.remove("copiado");
      btn.innerHTML = '<i class="bi bi-clipboard"></i> Copiar';
    }, 1800);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(alias).then(ok).catch(() => fallbackCopiar(alias, ok));
  } else {
    fallbackCopiar(alias, ok);
  }
}

function fallbackCopiar(texto, cb) {
  const ta = document.createElement("textarea");
  ta.value = texto;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); cb(); } catch (e) { toast("Copiá el alias manualmente"); }
  document.body.removeChild(ta);
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
}

/* ============================================================
   EVENTOS GLOBALES (delegación)
   ============================================================ */
function initEventos() {
  document.addEventListener("click", e => {
    const agregarBtn = e.target.closest("[data-agregar]");
    if (agregarBtn) { agregar(agregarBtn.dataset.agregar); return; }

    if (e.target.closest("[data-abrir-carrito]")) { abrirCarrito(); return; }
    if (e.target.closest("[data-cerrar-carrito]")) { cerrarCarrito(); return; }

    const mas = e.target.closest("[data-mas]");
    if (mas) { cambiarCantidad(mas.dataset.mas, +1); return; }

    const menos = e.target.closest("[data-menos]");
    if (menos) { cambiarCantidad(menos.dataset.menos, -1); return; }
  });

  $("#btn-enviar").addEventListener("click", enviarPedido);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") cerrarCarrito();
  });
}

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  renderMenu();
  renderAdicionalesMenu();
  buildDrawer();
  initEventos();
  renderCart();
  actualizarFab();
});
