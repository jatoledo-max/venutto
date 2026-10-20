// Página de pedidos: 1) elegir productos, 2) revisar y completar datos, 3) enviar por WhatsApp.
// Precios, productos, fotos, medios de pago, envío y horarios vienen de la calculadora (catalogo.js).
// Antes de abrir WhatsApp el pedido se vuelve a calcular en la base: si algo cambió, se muestra y no se envía.
import { CONFIG } from "./config.js";
import { leerMenu, cotizar, SinConexion } from "./catalogo.js";
import {
  cent, pesos, indexar, precioDe, nombreLinea, cambiar, cantidadDe, unidades, totales, revisarPrecios,
  validar, armarMensaje, urlWhatsApp, textoHorario, abiertoAhora, PAGOS,
} from "./pedido.js";
import { conCantidad } from "./plural.js";

const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const CLAVE = "venutto-pedido";
const VIGENCIA = 12 * 3600 * 1000; // el carrito guardado dura 12 horas

const st = { menu: null, porId: {}, carrito: [], datos: {}, leidoEn: 0, enviando: false, ultimaUrl: "" };

// ---------- Guardado en el celular (si se puede) ----------
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify({ carrito: st.carrito, datos: st.datos, guardado: Date.now(), ultimaUrl: st.ultimaUrl })); } catch (e) {}
}
function recuperar() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE));
    if (!g) return;
    st.datos = g.datos || {};
    if (Date.now() - g.guardado < VIGENCIA) { st.carrito = Array.isArray(g.carrito) ? g.carrito : []; st.ultimaUrl = g.ultimaUrl || ""; }
  } catch (e) {}
}

// ---------- Avisos ----------
let tAviso;
function aviso(txt) {
  const a = $("#aviso");
  a.textContent = txt; a.classList.add("visible");
  clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("visible"), 2200);
}
function mostrarCambios(r) {
  const cajas = [$("#cambios-precio"), $("#cambios-precio-2")];
  if (!r || (!r.cambios.length && !r.quitados.length)) { cajas.forEach((c) => { c.hidden = true; }); return false; }
  cajas.forEach((c) => {
    c.textContent = "";
    c.appendChild(el("b", null, "Se actualizaron los precios. Revisá tu pedido antes de enviarlo:"));
    const ul = el("ul");
    r.cambios.forEach((x) => ul.appendChild(el("li", null, x.nombre.replace(/^1 /, "") + ": antes " + pesos(x.antes) + ", ahora " + pesos(x.ahora) + ".")));
    r.quitados.forEach((x) => ul.appendChild(el("li", null, x.nombre.replace(/^1 /, "") + ": lo sacamos de tu pedido porque " + (x.motivo === "agotado" ? "se agotó." : "ya no está en el menú."))));
    c.appendChild(ul);
    const ok = el("button", "btn-secundario", "Entendido");
    ok.type = "button"; ok.onclick = () => cajas.forEach((k) => { k.hidden = true; });
    c.appendChild(ok);
    c.hidden = false;
  });
  return true;
}

// ---------- Catálogo ----------
async function cargar({ silencioso = false } = {}) {
  if (!silencioso) { $("#cargando").hidden = false; $("#error-menu").hidden = true; }
  let menu;
  try {
    menu = await leerMenu();
  } catch (e) {
    $("#cargando").hidden = true;
    if (silencioso && st.menu) return; // se queda con lo que ya mostraba; antes de enviar se vuelve a verificar
    errorMenu(e instanceof SinConexion
      ? "No pudimos cargar el menú. Revisá tu conexión a internet y tocá «Reintentar»."
      : "El menú no está disponible en este momento.");
    return;
  }
  $("#cargando").hidden = true;
  if (!menu) { st.menu = null; errorMenu("El menú no está disponible en este momento."); return; }
  st.menu = menu; st.porId = indexar(menu); st.leidoEn = Date.now();
  const r = revisarPrecios(st.carrito, st.porId);
  st.carrito = r.carrito; guardar();
  mostrarCambios(r);
  pintarTodo();
  // Vino de "Pedir" en la portada (pedir.html#prod-…): llevarlo a ese producto
  if (!silencioso && /^#prod-/.test(location.hash)) { const t = document.querySelector(location.hash); if (t) t.scrollIntoView({ block: "center" }); }
}
function errorMenu(texto) {
  const c = $("#error-menu");
  c.textContent = "";
  c.appendChild(el("p", null, texto));
  const b = el("button", "btn-principal", "Reintentar"); b.type = "button"; b.onclick = () => cargar();
  const wa = el("a", "btn-secundario", "Escribinos por WhatsApp");
  wa.href = urlWhatsApp(CONFIG.WHATSAPP_RESPALDO, "¡Hola, Venutto! Quiero hacer un pedido.");
  c.append(b, wa);
  c.hidden = false;
  $("#categorias").hidden = true; $("#productos").textContent = "";
  pintarBarra();
}

// ---------- Paso 1: productos ----------
const ORDEN_FIN = { Promos: 1, Extras: 2, Otros: 3 };
function grupos() {
  const g = {};
  st.menu.productos.forEach((p) => { (g[p.categoria] = g[p.categoria] || []).push(p); });
  return Object.keys(g).sort((a, b) => (ORDEN_FIN[a] || 0) - (ORDEN_FIN[b] || 0) || a.localeCompare(b, "es"))
    .map((c) => ({ nombre: c === "Extras" ? "Para sumar a tu pedido" : c, id: "cat-" + c.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-"), productos: g[c] }));
}

function controles(p, opcion) {
  const cant = cantidadDe(st.carrito, p.id, opcion ? opcion.id : null);
  const nom = p.nombre + (opcion ? " (" + opcion.nombre + ")" : "");
  const box = el("div", "control");
  if (!cant) {
    const b = el("button", "btn-agregar", opcion ? "Agregar " + opcion.nombre.toLowerCase() : "Agregar");
    b.type = "button"; b.setAttribute("aria-label", "Agregar 1 " + nom);
    b.onclick = () => sumar(p.id, opcion && opcion.id, 1, b);
    box.appendChild(b);
    return box;
  }
  const menos = el("button", "btn-cant", "−"); menos.type = "button"; menos.setAttribute("aria-label", "Quitar 1 " + nom);
  menos.onclick = () => sumar(p.id, opcion && opcion.id, -1, menos);
  const n = el("span", "cant", String(cant)); n.setAttribute("aria-label", cant + " en tu pedido");
  const mas = el("button", "btn-cant", "+"); mas.type = "button"; mas.setAttribute("aria-label", "Agregar 1 " + nom);
  mas.onclick = () => sumar(p.id, opcion && opcion.id, 1, mas);
  box.append(menos, n, mas);
  return box;
}

function tarjeta(p) {
  const c = el("article", "producto" + (p.disponible ? "" : " agotado") + (p.tipo === "promo" ? " promo" : ""));
  c.id = "prod-" + p.id;
  if (p.foto) {
    const img = el("img", "foto"); img.src = p.foto; img.alt = p.nombre; img.loading = "lazy"; img.decoding = "async"; img.width = 640; img.height = 480;
    c.appendChild(img);
  }
  const cuerpo = el("div", "cuerpo");
  const tit = el("h3", null, p.nombre);
  if (p.tipo === "promo") tit.prepend(el("span", "etiqueta", "Promo"));
  cuerpo.appendChild(tit);
  if (p.descripcion) cuerpo.appendChild(el("p", "desc", p.descripcion));
  const fila = el("div", "fila-precio");
  fila.appendChild(el("span", "precio", pesos(cent(p.precio))));
  if (p.disponible) fila.appendChild(controles(p, null));
  else fila.appendChild(el("span", "sin-stock", "Agotado por hoy"));
  cuerpo.appendChild(fila);
  if (p.disponible) (p.opciones || []).forEach((o) => {
    const f = el("div", "fila-opcion");
    f.appendChild(el("span", "opcion-nombre", "Con " + o.nombre.toLowerCase() + (Number(o.precio_extra) ? " (+" + pesos(cent(o.precio_extra)) + ")" : "")));
    f.appendChild(controles(p, o));
    cuerpo.appendChild(f);
  });
  c.appendChild(cuerpo);
  return c;
}

function pintarMenu() {
  const m = st.menu.menu || {};
  const est = $("#estado-local");
  const abierto = abiertoAhora(m.horarios);
  const txt = textoHorario(m.horarios);
  est.hidden = !txt;
  est.className = "estado " + (abierto ? "abierto" : "cerrado");
  est.textContent = (abierto ? "Abierto ahora. " : abierto === false ? "Ahora estamos cerrados: podés dejar tu pedido y te respondemos cuando abramos. " : "") + (txt ? "Horario: " + txt + "." : "");
  $("#aviso-negocio").hidden = !m.aviso; $("#aviso-negocio").textContent = m.aviso || "";

  const gs = grupos();
  const nav = $("#categorias"); nav.textContent = "";
  gs.forEach((g) => { const a = el("a", "chip", g.nombre); a.href = "#" + g.id; a.onclick = (e) => { e.preventDefault(); document.getElementById(g.id).scrollIntoView({ behavior: "smooth", block: "start" }); }; nav.appendChild(a); });
  nav.hidden = gs.length < 2;
  const cont = $("#productos"); cont.textContent = "";
  if (!gs.length) cont.appendChild(el("p", "vacio", "Todavía no hay productos en el menú."));
  gs.forEach((g) => {
    const sec = el("section", "categoria"); sec.id = g.id; sec.setAttribute("aria-labelledby", g.id + "-t");
    const h = el("h2", null, g.nombre); h.id = g.id + "-t";
    sec.appendChild(h);
    const lista = el("div", "lista");
    g.productos.forEach((p) => lista.appendChild(tarjeta(p)));
    sec.appendChild(lista);
    cont.appendChild(sec);
  });
}

function sumar(producto, opcion, delta, boton) {
  const antes = unidades(st.carrito);
  st.carrito = cambiar(st.carrito, st.porId, producto, opcion, delta);
  guardar();
  const p = st.porId[producto];
  const o = opcion && p.opciones.find((x) => x.id === opcion);
  if (unidades(st.carrito) > antes) aviso("Agregaste " + conCantidad(1, p.nombre, p.plural).replace(/^1 /, "") + (o ? " (" + o.nombre + ")" : ""));
  else aviso("Quitaste uno");
  // Volver a dibujar sin perder el lugar ni el foco
  const id = boton && boton.closest(".producto") ? boton.closest(".producto").id : null;
  const idx = boton && boton.closest(".control") ? [...document.querySelectorAll("#" + id + " .control")].indexOf(boton.closest(".control")) : -1;
  pintarTodo();
  if (id && idx >= 0) {
    const ctl = document.querySelectorAll("#" + id + " .control")[idx];
    const destino = ctl && (ctl.querySelector(delta > 0 ? ".btn-cant:last-child" : ".btn-cant:first-child") || ctl.querySelector("button"));
    if (destino) destino.focus({ preventScroll: true });
  }
}

// ---------- Barra inferior ----------
function pintarBarra() {
  const paso = pasoActual();
  const u = unidades(st.carrito);
  const b = $("#barra");
  b.hidden = !st.menu || paso === "listo" || (paso === "menu" && !u);
  if (b.hidden) { document.body.classList.remove("con-barra"); return; }
  document.body.classList.add("con-barra");
  const t = totales(st.carrito, st.datos.entrega, st.menu.menu.envio == null ? null : cent(st.menu.menu.envio));
  $("#barra-cant").textContent = u === 1 ? "1 producto" : u + " productos";
  $("#barra-total").textContent = (paso === "pedido" && t.envioAConfirmar ? "Total sin envío " : "Total ") + pesos(t.total);
  const btn = $("#ver-pedido");
  btn.textContent = paso === "pedido" ? "Enviar por WhatsApp" : "Ver mi pedido";
  btn.disabled = !u;
}

// ---------- Paso 2: pedido y datos ----------
function pintarPedido() {
  const ul = $("#lineas"); ul.textContent = "";
  $("#pedido-vacio").hidden = st.carrito.length > 0;
  $("#datos").hidden = !st.carrito.length;
  st.carrito.forEach((l) => {
    const li = el("li", "linea");
    const p = st.porId[l.producto] || { nombre: l.nombre, opciones: [] };
    const o = l.opcion && (p.opciones || []).find((x) => x.id === l.opcion);
    li.appendChild(el("span", "linea-nombre", nombreLinea(st.porId, l)));
    li.appendChild(el("span", "linea-unit", pesos(l.precio) + " cada uno"));
    const ctl = el("div", "control");
    const nom = p.nombre + (o ? " (" + o.nombre + ")" : "");
    const menos = el("button", "btn-cant", "−"); menos.type = "button"; menos.setAttribute("aria-label", "Quitar 1 " + nom);
    menos.onclick = () => { st.carrito = cambiar(st.carrito, st.porId, l.producto, l.opcion, -1); guardar(); pintarTodo(); };
    const n = el("span", "cant", String(l.cantidad));
    const mas = el("button", "btn-cant", "+"); mas.type = "button"; mas.setAttribute("aria-label", "Agregar 1 " + nom);
    mas.disabled = precioDe(st.porId, l.producto, l.opcion) == null;
    mas.onclick = () => { st.carrito = cambiar(st.carrito, st.porId, l.producto, l.opcion, 1); guardar(); pintarTodo(); };
    ctl.append(menos, n, mas);
    li.appendChild(ctl);
    li.appendChild(el("b", "linea-sub", pesos(l.precio * l.cantidad)));
    const q = el("button", "btn-quitar", "Quitar"); q.type = "button"; q.setAttribute("aria-label", "Quitar " + nom + " del pedido");
    q.onclick = () => { st.carrito = cambiar(st.carrito, st.porId, l.producto, l.opcion, -l.cantidad); guardar(); pintarTodo(); };
    li.appendChild(q);
    ul.appendChild(li);
  });
  pintarFormulario();
}

let formListo = false;
function pintarFormulario() {
  const m = st.menu.menu || {};
  const d = st.datos;
  $("#txt-envio").textContent = m.envio == null ? "El envío se confirma por WhatsApp" : "Envío " + pesos(cent(m.envio));
  if (!formListo) {
    const op = $("#opciones-pago"); op.textContent = "";
    (m.pagos || []).forEach((k) => {
      const lab = el("label", "opcion");
      const r = el("input"); r.type = "radio"; r.name = "pago"; r.value = k;
      lab.append(r, " ", el("span", null, PAGOS[k] || k));
      op.appendChild(lab);
    });
    if ((m.pagos || []).length === 1 && !d.pago) d.pago = m.pagos[0];
    ["calle", "numero", "barrio", "referencias", "nombre", "observaciones", "efectivo"].forEach((k) => { $("#" + k).value = d[k] || ""; });
    document.querySelectorAll('input[name="entrega"]').forEach((r) => { r.checked = r.value === d.entrega; });
    document.querySelectorAll('input[name="pago"]').forEach((r) => { r.checked = r.value === d.pago; });
    $("#datos").oninput = leerFormulario;
    $("#datos").onchange = leerFormulario;
    $("#datos").onsubmit = (e) => { e.preventDefault(); enviar(); };
    $("#copiar-alias").onclick = copiarAlias;
    formListo = true;
  }
  $("#q-direccion").hidden = d.entrega !== "delivery";
  $("#alias").hidden = !(m.alias && (d.pago === "transferencia" || d.pago === "dividido"));
  $("#alias-texto").textContent = m.alias || "";
  $("#campo-efectivo").hidden = d.pago !== "dividido";
  pintarResumen();
}
function leerFormulario(e) {
  const d = st.datos;
  ["calle", "numero", "barrio", "referencias", "nombre", "observaciones", "efectivo"].forEach((k) => { d[k] = $("#" + k).value; });
  const en = document.querySelector('input[name="entrega"]:checked'); d.entrega = en ? en.value : d.entrega;
  const pa = document.querySelector('input[name="pago"]:checked'); d.pago = pa ? pa.value : d.pago;
  guardar();
  if (e && e.target && e.target.name) { const er = $("#err-" + e.target.name); if (er) er.hidden = true; }
  pintarFormulario();
  pintarBarra();
}
function pintarResumen() {
  const m = st.menu.menu || {};
  const t = totales(st.carrito, st.datos.entrega, m.envio == null ? null : cent(m.envio));
  const r = $("#resumen"); r.textContent = "";
  const fila = (k, v, cls) => { const f = el("div", "fila" + (cls ? " " + cls : "")); f.append(el("span", null, k), el("b", null, v)); r.appendChild(f); };
  fila("Subtotal de productos", pesos(t.subtotal));
  if (st.datos.entrega === "delivery") fila("Envío", t.envioAConfirmar ? "Se confirma por WhatsApp" : pesos(t.envio));
  fila(t.envioAConfirmar ? "Total sin el envío" : "Total", pesos(t.total), "total");
  if (!st.datos.entrega) r.appendChild(el("p", "ayuda", "Elegí delivery o retiro para ver el total final."));
}

async function copiarAlias() {
  const a = (st.menu.menu || {}).alias || "";
  try { await navigator.clipboard.writeText(a); aviso("Alias copiado"); } catch (e) { aviso("Copiá el alias: " + a); }
}

function mostrarErrores(errs) {
  ["entrega", "calle", "numero", "pago", "efectivo"].forEach((k) => {
    const p = $("#err-" + k);
    if (p) { p.hidden = !errs[k]; p.textContent = errs[k] || ""; }
    const inp = $("#" + k);
    if (inp) inp.setAttribute("aria-invalid", errs[k] ? "true" : "false");
  });
  const primero = ["entrega", "calle", "numero", "pago", "efectivo"].find((k) => errs[k]);
  if (primero) {
    const foco = $("#" + primero) || document.querySelector('input[name="' + primero + '"]');
    if (foco) { foco.focus(); foco.scrollIntoView({ block: "center" }); }
  }
}

async function enviar() {
  if (st.enviando || !st.carrito.length) return;
  const m = st.menu.menu || {};
  const t = totales(st.carrito, st.datos.entrega, m.envio == null ? null : cent(m.envio));
  const errs = validar(st.datos, m, t.total);
  mostrarErrores(errs);
  if (Object.keys(errs).length) return;
  const err = $("#error-envio"); err.hidden = true;
  st.enviando = true;
  const btn = $("#enviar"); btn.disabled = true; btn.textContent = "Comprobando precios…";
  try {
    // 1) Precios vigentes en la base
    const items = st.carrito.map((l) => ({ producto: l.producto, opcion: l.opcion, cantidad: l.cantidad }));
    const cot = await cotizar(items, st.datos.entrega);
    // 2) Si algo cambió, se actualiza el menú, se muestra y se pide revisar
    const distinto = cot.errores.length || cot.renglones.length !== st.carrito.length ||
      cot.renglones.some((r, i) => cent(r.precio_unitario) !== st.carrito[i].precio || r.cantidad !== st.carrito[i].cantidad) ||
      cent(cot.total) !== t.total || (st.datos.entrega === "delivery" && (cot.envio == null) !== (m.envio == null));
    if (distinto) {
      await cargar({ silencioso: true });
      if (!$("#cambios-precio-2").hidden || cot.errores.length) { pintarTodo(); $("#cambios-precio-2").scrollIntoView({ block: "center" }); return; }
      mostrarCambios({ cambios: [{ nombre: "El total", antes: t.total, ahora: cent(cot.total) }], quitados: [] });
      pintarTodo(); $("#cambios-precio-2").scrollIntoView({ block: "center" });
      return;
    }
    // 3) Mensaje con los importes de la base y WhatsApp
    const texto = armarMensaje(cot, st.datos, (st.menu.negocio || {}).nombre);
    st.ultimaUrl = urlWhatsApp(m.whatsapp, texto);
    guardar();
    location.hash = "#listo";
    location.href = st.ultimaUrl;
  } catch (e) {
    err.textContent = e instanceof SinConexion
      ? "No pudimos comprobar los precios porque no hay conexión. No abrimos WhatsApp con importes sin verificar: revisá tu internet y tocá el botón de nuevo."
      : "No pudimos comprobar el pedido (" + e.message + "). Probá de nuevo en un momento.";
    err.hidden = false;
  } finally {
    st.enviando = false; btn.disabled = false; btn.textContent = "Enviar pedido por WhatsApp";
  }
}

// ---------- Pasos (con el botón Atrás del celular) ----------
const pasoActual = () => (location.hash === "#pedido" ? "pedido" : location.hash === "#listo" ? "listo" : "menu");
function pintarTodo() {
  const paso = pasoActual();
  $("#paso-menu").hidden = paso !== "menu";
  $("#paso-pedido").hidden = paso !== "pedido";
  $("#paso-listo").hidden = paso !== "listo";
  if (st.menu) {
    if (paso === "menu") pintarMenu();
    if (paso === "pedido") pintarPedido();
  }
  $("#abrir-wa").href = st.ultimaUrl || "#";
  pintarBarra();
}
let pasoAnterior = pasoActual();
let vinoDelMenu = false; // si se llegó al pedido desde el menú, "Seguir eligiendo" es lo mismo que Atrás
window.addEventListener("hashchange", () => {
  const paso = pasoActual();
  if (paso === "pedido") vinoDelMenu = pasoAnterior === "menu";
  pintarTodo();
  if (paso !== pasoAnterior) {
    window.scrollTo(0, 0);
    const t = paso === "pedido" ? $("#titulo-pedido") : paso === "listo" ? $("#titulo-listo") : null;
    if (t) t.focus({ preventScroll: true });
  }
  pasoAnterior = paso;
});

$("#ver-pedido").onclick = () => { if (pasoActual() === "pedido") $("#datos").requestSubmit(); else location.hash = "#pedido"; };
$("#volver-menu").onclick = () => { if (vinoDelMenu) history.back(); else location.hash = ""; };
$("#volver-pedido").onclick = () => { location.hash = "#pedido"; };
$("#nuevo-pedido").onclick = () => { st.carrito = []; st.ultimaUrl = ""; guardar(); location.hash = ""; };

// Si el cliente vuelve a la página después de un rato, se releen los precios.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Date.now() - st.leidoEn > 60000) cargar({ silencioso: true });
});

recuperar();
pintarTodo();
cargar();
