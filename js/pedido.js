// Lógica del pedido, sin pantalla: carrito, importes, horarios, validación y mensaje de WhatsApp.
// Los importes se manejan en centavos enteros para no tener errores de redondeo.
// Los precios vienen siempre de la calculadora (menu_publico); el mensaje se arma con la cotización
// que devuelve la base (cotizar_pedido), nunca con importes calculados solo en el navegador.
import { conCantidad } from "./plural.js";

export const cent = (n) => Math.round(Number(n) * 100);
export function pesos(c) {
  const v = Math.round(Number(c) || 0);
  const s = (Math.abs(v) / 100).toLocaleString("es-AR", { minimumFractionDigits: v % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return (v < 0 ? "-$" : "$") + s;
}

// ---------- Catálogo ----------
export function indexar(menu) {
  const porId = {};
  (menu && menu.productos ? menu.productos : []).forEach((p) => { porId[p.id] = p; });
  return porId;
}
// Precio (centavos) de un producto con una opción, o null si ya no se puede pedir.
export function precioDe(porId, producto, opcion) {
  const p = porId[producto];
  if (!p || !p.disponible) return null;
  if (!opcion) return cent(p.precio);
  const o = (p.opciones || []).find((x) => x.id === opcion);
  return o ? cent(p.precio) + cent(o.precio_extra) : null;
}
export function nombreLinea(porId, l, cantidad = l.cantidad) {
  const p = porId[l.producto] || { nombre: l.nombre, plural: l.plural };
  const o = l.opcion && p.opciones ? p.opciones.find((x) => x.id === l.opcion) : null;
  return conCantidad(cantidad, p.nombre, p.plural) + (o ? " (" + o.nombre + ")" : l.opcion_nombre ? " (" + l.opcion_nombre + ")" : "");
}

// ---------- Carrito: [{ producto, opcion, cantidad, precio (centavos, el que vio el cliente), nombre }] ----------
export const clave = (producto, opcion) => producto + "|" + (opcion || "");
export const MAX_CANTIDAD = 99;
export function cambiar(carrito, porId, producto, opcion, delta) {
  const k = clave(producto, opcion);
  const i = carrito.findIndex((l) => clave(l.producto, l.opcion) === k);
  const nueva = carrito.map((l) => ({ ...l }));
  if (i < 0) {
    if (delta <= 0) return carrito;
    const precio = precioDe(porId, producto, opcion);
    if (precio == null) return carrito;
    nueva.push({ producto, opcion: opcion || null, cantidad: Math.min(delta, MAX_CANTIDAD), precio, nombre: porId[producto].nombre });
    return nueva;
  }
  nueva[i].cantidad = Math.min(nueva[i].cantidad + delta, MAX_CANTIDAD);
  return nueva.filter((l) => l.cantidad > 0);
}
export const cantidadDe = (carrito, producto, opcion) => (carrito.find((l) => clave(l.producto, l.opcion) === clave(producto, opcion)) || {}).cantidad || 0;
export const unidades = (carrito) => carrito.reduce((a, l) => a + l.cantidad, 0);
export const subtotal = (carrito) => carrito.reduce((a, l) => a + l.precio * l.cantidad, 0);
// envio: centavos o null (delivery sin precio fijo). Solo se suma con delivery.
export function totales(carrito, entrega, envio) {
  const sub = subtotal(carrito);
  const env = entrega === "delivery" ? envio : 0;
  return { unidades: unidades(carrito), subtotal: sub, envio: env, envioAConfirmar: entrega === "delivery" && env == null, total: sub + (env || 0) };
}

// Compara el carrito con el catálogo vigente: precios que cambiaron y productos que ya no se pueden pedir.
// Devuelve el carrito actualizado y la lista de cambios para mostrársela al cliente antes de seguir.
export function revisarPrecios(carrito, porId) {
  const cambios = [], quitados = [], nuevo = [];
  carrito.forEach((l) => {
    const ahora = precioDe(porId, l.producto, l.opcion);
    if (ahora == null) { quitados.push({ nombre: nombreLinea(porId, l, 1), motivo: porId[l.producto] && !porId[l.producto].disponible ? "agotado" : "no está en el menú" }); return; }
    if (ahora !== l.precio) cambios.push({ nombre: nombreLinea(porId, l, 1), antes: l.precio, ahora });
    nuevo.push({ ...l, precio: ahora, nombre: porId[l.producto].nombre });
  });
  return { carrito: nuevo, cambios, quitados };
}

// ---------- Datos del cliente ----------
export const PAGOS = { efectivo: "Efectivo", transferencia: "Transferencia", dividido: "Dividido (efectivo y transferencia)" };
export function validar(d, menu, total) {
  const e = {};
  if (d.entrega !== "delivery" && d.entrega !== "retiro") e.entrega = "Elegí si querés delivery o retiro.";
  if (d.entrega === "delivery") {
    if (!String(d.calle || "").trim()) e.calle = "Escribí la calle.";
    if (!String(d.numero || "").trim()) e.numero = "Escribí el número de la casa. Si no tiene, poné S/N.";
  }
  const pagos = (menu && menu.pagos) || [];
  if (!pagos.includes(d.pago)) e.pago = "Elegí cómo vas a pagar.";
  if (d.pago === "dividido" && String(d.efectivo || "").trim()) {
    const ef = cent(String(d.efectivo).replace(/\./g, "").replace(",", "."));
    if (!(ef > 0) || (total && ef >= total)) e.efectivo = "Poné cuánto pagás en efectivo (menos que el total), o dejalo vacío.";
  }
  return e;
}

// ---------- Mensaje de WhatsApp ----------
// cot: respuesta de cotizar_pedido (importes en pesos). d: datos del formulario.
export function armarMensaje(cot, d, negocio) {
  const r = [];
  r.push("¡Hola, " + (negocio || "Venutto") + "! Quiero hacer este pedido.", "");
  cot.renglones.forEach((l) => r.push("• " + nombreLinea({}, l) + " — " + pesos(cent(l.subtotal))));
  r.push("");
  r.push("Entrega: " + (d.entrega === "delivery" ? "Delivery" : "Retiro en el local"));
  if (d.entrega === "delivery") {
    r.push("Dirección: " + [String(d.calle).trim() + " " + String(d.numero).trim(), String(d.barrio || "").trim()].filter(Boolean).join(", "));
    if (String(d.referencias || "").trim()) r.push("Referencias: " + String(d.referencias).trim());
  }
  let pago = "Pago: " + (PAGOS[d.pago] || d.pago);
  if (d.pago === "dividido" && String(d.efectivo || "").trim()) {
    const ef = cent(String(d.efectivo).replace(/\./g, "").replace(",", "."));
    pago = "Pago: Dividido (" + pesos(ef) + " en efectivo y " + pesos(cent(cot.total) - ef) + " por transferencia)";
  }
  r.push(pago);
  if (String(d.nombre || "").trim()) r.push("Nombre: " + String(d.nombre).trim());
  if (String(d.observaciones || "").trim()) r.push("Observaciones: " + String(d.observaciones).trim());
  r.push("");
  r.push("Subtotal de productos: " + pesos(cent(cot.subtotal)));
  if (d.entrega === "delivery") {
    if (cot.envio_a_confirmar) {
      r.push("Envío: a confirmar");
      r.push("TOTAL sin el envío: " + pesos(cent(cot.total)));
    } else {
      r.push("Envío: " + pesos(cent(cot.envio)));
      r.push("TOTAL: " + pesos(cent(cot.total)));
    }
  } else r.push("TOTAL: " + pesos(cent(cot.total)));
  return r.join("\n");
}
export const urlWhatsApp = (numero, texto) => "https://wa.me/" + String(numero || "").replace(/\D/g, "") + (texto ? "?text=" + encodeURIComponent(texto) : "");

// ---------- Horarios (hora de Argentina) ----------
const NOMBRES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ORDEN = [1, 2, 3, 4, 5, 6, 0]; // la semana empieza el lunes
const hora = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h + (m ? ":" + String(m).padStart(2, "0") : ""); };
export function textoHorario(h) {
  if (!h || !Array.isArray(h.dias) || !h.dias.length || !h.desde || !h.hasta) return "";
  const ds = ORDEN.filter((d) => h.dias.includes(d));
  let dias;
  if (ds.length === 7) dias = "Todos los días";
  else {
    const pos = ds.map((d) => ORDEN.indexOf(d));
    const seguidos = pos.every((p, i) => i === 0 || p === pos[i - 1] + 1);
    if (seguidos && ds.length >= 3) dias = NOMBRES[ds[0]] + " a " + NOMBRES[ds[ds.length - 1]];
    else dias = ds.length === 1 ? NOMBRES[ds[0]] : ds.slice(0, -1).map((d) => NOMBRES[d]).join(", ") + " y " + NOMBRES[ds[ds.length - 1]];
    dias = dias[0].toUpperCase() + dias.slice(1);
  }
  return dias + " de " + hora(h.desde) + " a " + hora(h.hasta) + " h";
}
// ¿Está abierto ahora? null si no hay horarios cargados.
export function abiertoAhora(h, fecha = new Date()) {
  if (!h || !Array.isArray(h.dias) || !h.dias.length || !h.desde || !h.hasta) return null;
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(fecha).map((p) => [p.type, p.value]));
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.weekday);
  const min = Number(partes.hour) * 60 + Number(partes.minute);
  const aMin = (s) => { const [a, b] = s.split(":").map(Number); return a * 60 + b; };
  const desde = aMin(h.desde), hasta = aMin(h.hasta);
  if (desde < hasta) return h.dias.includes(dia) && min >= desde && min < hasta;
  // Cruza la medianoche (ej: 21 a 1): abierto desde las 21 de un día de atención hasta la 1 del día siguiente.
  return (h.dias.includes(dia) && min >= desde) || (h.dias.includes((dia + 6) % 7) && min < hasta);
}
