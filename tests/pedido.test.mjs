import { test } from "node:test";
import assert from "node:assert/strict";
import { cent, pesos, indexar, cambiar, totales, revisarPrecios, validar, armarMensaje, urlWhatsApp, textoHorario, abiertoAhora, cantidadDe } from "../js/pedido.js";

const MENU = {
  menu: { whatsapp: "5493855702807", pagos: ["transferencia", "efectivo", "dividido"], envio: 1000 },
  productos: [
    { id: "hc", nombre: "Hamburguesa completa", plural: null, precio: 7000, disponible: true, opciones: [] },
    { id: "lc", nombre: "Lomito completo", plural: "Lomitos completos", precio: 10000, disponible: true, opciones: [{ id: "arabe", nombre: "Pan árabe", precio_extra: 200 }] },
    { id: "pm", nombre: "Potecito de mayonesa", plural: null, precio: 500, disponible: true, opciones: [] },
    { id: "pc", nombre: "Porción de papas con cheddar M", plural: null, precio: 4000.5, disponible: true, opciones: [] },
    { id: "ag", nombre: "Lomito picante", precio: 10000, disponible: false, opciones: [] },
  ],
};
const ix = indexar(MENU);

test("carrito: agregar, variantes, cantidades, quitar y totales en centavos", () => {
  let c = [];
  c = cambiar(c, ix, "hc", null, 1); c = cambiar(c, ix, "hc", null, 1);
  c = cambiar(c, ix, "lc", null, 1); c = cambiar(c, ix, "lc", "arabe", 1);
  c = cambiar(c, ix, "pm", null, 3); c = cambiar(c, ix, "pc", null, 1);
  assert.equal(cantidadDe(c, "hc"), 2);
  assert.equal(cantidadDe(c, "lc", "arabe"), 1);
  c = cambiar(c, ix, "pm", null, -1);
  assert.equal(cantidadDe(c, "pm"), 2);
  c = cambiar(c, ix, "lc", null, -1);
  assert.equal(cantidadDe(c, "lc"), 0);
  assert.equal(c.length, 4);
  // agotado, opción inventada y cantidades negativas no entran
  assert.equal(cambiar(c, ix, "ag", null, 1), c);
  assert.equal(cambiar(c, ix, "lc", "otra", 1), c);
  assert.equal(cambiar(c, ix, "zz", null, -1), c);
  const t = totales(c, "delivery", cent(1000));
  assert.equal(t.subtotal, 2 * 700000 + 1020000 + 2 * 50000 + 400050);
  assert.equal(t.total, t.subtotal + 100000);
  assert.equal(t.unidades, 6);
  assert.equal(totales(c, "retiro", cent(1000)).total, t.subtotal);
  assert.equal(totales(c, "delivery", null).envioAConfirmar, true);
  assert.equal(pesos(1230000), "$12.300");
  assert.equal(pesos(400050), "$4.000,50");
});

test("cambio de precio con el carrito armado: se muestra, se actualiza y se avisa lo agotado", () => {
  let c = cambiar([], ix, "lc", "arabe", 2);
  c = cambiar(c, ix, "hc", null, 1);
  c = cambiar(c, ix, "pm", null, 1);
  const menu2 = structuredClone(MENU);
  menu2.productos[1].precio = 11000;
  menu2.productos[0].disponible = false;
  menu2.productos = menu2.productos.filter((p) => p.id !== "pm");
  const r = revisarPrecios(c, indexar(menu2));
  assert.deepEqual(r.cambios, [{ nombre: "1 Lomito completo (Pan árabe)", antes: 1020000, ahora: 1120000 }]);
  assert.deepEqual(r.quitados.map((q) => q.nombre + ": " + q.motivo), ["1 Hamburguesa completa: agotado", "1 Potecito de mayonesa: no está en el menú"]);
  assert.equal(r.carrito.length, 1);
  assert.equal(r.carrito[0].precio, 1120000);
  assert.deepEqual(revisarPrecios(r.carrito, indexar(menu2)).cambios, []);
});

test("checkout: solo entrega y pago son obligatorios; medios de pago reales", () => {
  const m = MENU.menu;
  assert.deepEqual(Object.keys(validar({}, m)), ["entrega", "pago"]);
  assert.deepEqual(validar({ entrega: "delivery", pago: "efectivo" }, m), {});
  assert.deepEqual(validar({ entrega: "retiro", pago: "transferencia" }, m), {});
  assert.deepEqual(Object.keys(validar({ entrega: "retiro", pago: "mercadopago" }, m)), ["pago"]);
  assert.deepEqual(validar({ entrega: "retiro", pago: "dividido", efectivo: "" }, m, 1000000), {});
  assert.deepEqual(validar({ entrega: "retiro", pago: "dividido", efectivo: "5.000" }, m, 1000000), {});
  assert.deepEqual(Object.keys(validar({ entrega: "retiro", pago: "dividido", efectivo: "20000" }, m, 1000000)), ["efectivo"]);
});

const COT = {
  renglones: [
    { producto: "hc", nombre: "Hamburguesa completa", plural: null, cantidad: 2, precio_unitario: 6000, subtotal: 12000 },
    { producto: "pc", nombre: "Porción de papas con cheddar M", plural: null, cantidad: 1, precio_unitario: 4000, subtotal: 4000 },
    { producto: "pm", nombre: "Potecito de mayonesa", plural: "Potecitos de mayonesa", cantidad: 1, precio_unitario: 500, subtotal: 500 },
    { producto: "lc", nombre: "Lomito completo", plural: "Lomitos completos", opcion: "arabe", opcion_nombre: "Pan árabe", cantidad: 3, precio_unitario: 10200, subtotal: 30600 },
  ],
  subtotal: 47100, envio: 1000, envio_a_confirmar: false, total: 48100,
};

test("mensaje de WhatsApp: singular y plural, sin x, importes de la cotización", () => {
  const d = { entrega: "delivery", pago: "transferencia" };
  const txt = armarMensaje(COT, d, "Venutto");
  assert.equal(txt, [
    "¡Hola, Venutto! Quiero hacer este pedido.", "",
    "• 2 Hamburguesas completas — $12.000",
    "• 1 Porción de papas con cheddar M — $4.000",
    "• 1 Potecito de mayonesa — $500",
    "• 3 Lomitos completos (Pan árabe) — $30.600", "",
    "Entrega: Delivery", "Ubicación: te la mando en el próximo mensaje.", "Pago: Transferencia", "",
    "Subtotal de productos: $47.100", "Envío: $1.000", "TOTAL: $48.100",
  ].join("\n"));
  assert.ok(!/\d+\s*[x×]\s/i.test(txt));
  const ret = armarMensaje({ ...COT, envio: null, total: 47100 }, { entrega: "retiro", pago: "dividido", efectivo: "20.000" }, "Venutto");
  assert.match(ret, /Entrega: Retiro en el local\nPago: Dividido \(\$20\.000 en efectivo y \$27\.100 por transferencia\)\n\nSubtotal de productos: \$47\.100\nTOTAL: \$47\.100$/);
  assert.doesNotMatch(ret, /Ubicación|Envío/);
  const sinEnvio = armarMensaje({ ...COT, envio: null, envio_a_confirmar: true, total: 47100 }, { entrega: "delivery", pago: "efectivo" });
  assert.match(sinEnvio, /Envío: a confirmar\nTOTAL sin el envío: \$47\.100$/);
});

test("URL de WhatsApp con el número oficial y el texto codificado", () => {
  const u = urlWhatsApp("+54 9 385 570-2807", "Hola & chau\n• 2 Lomitos — $1.000 #1");
  assert.equal(u, "https://wa.me/5493855702807?text=Hola%20%26%20chau%0A%E2%80%A2%202%20Lomitos%20%E2%80%94%20%241.000%20%231");
  assert.equal(decodeURIComponent(new URL(u).searchParams.get("text")), "Hola & chau\n• 2 Lomitos — $1.000 #1");
});

test("horarios: texto y abierto ahora en hora argentina (cruza la medianoche)", () => {
  const h = { dias: [4, 5, 6, 0], desde: "21:00", hasta: "01:00" };
  assert.equal(textoHorario(h), "Jueves a domingo de 21 a 1 h");
  assert.equal(textoHorario({ dias: [0, 1, 2, 3, 4, 5, 6], desde: "21:30", hasta: "00:30" }), "Todos los días de 21:30 a 0:30 h");
  assert.equal(textoHorario({ dias: [1, 3], desde: "12:00", hasta: "15:00" }), "Lunes y miércoles de 12 a 15 h");
  // Jueves 23/10/2026 22:00 en Argentina (UTC-3) = 01:00 UTC del viernes
  assert.equal(abiertoAhora(h, new Date("2026-10-24T01:00:00Z")), true);
  // Lunes 0:30 (domingo a la noche sigue abierto)
  assert.equal(abiertoAhora(h, new Date("2026-10-26T03:30:00Z")), true);
  // Lunes 1:30: cerrado
  assert.equal(abiertoAhora(h, new Date("2026-10-26T04:30:00Z")), false);
  // Jueves 0:30 (miércoles no se abre): cerrado
  assert.equal(abiertoAhora(h, new Date("2026-10-22T03:30:00Z")), false);
  // Jueves 20:59: cerrado
  assert.equal(abiertoAhora(h, new Date("2026-10-22T23:59:00Z")), false);
  assert.equal(abiertoAhora(null), null);
});
