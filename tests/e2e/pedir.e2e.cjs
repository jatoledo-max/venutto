// Prueba de punta a punta del menú de pedidos en un celular Android, contra las funciones SQL reales
// de la calculadora (ver correr.sh). Incluye el cambio de precio "desde la calculadora" con la página abierta.
const { chromium, devices } = require(process.env.PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const URL_BASE = "http://localhost:8770";
const DB = process.env.MENU_DB || "menu_prueba";
// Lo mismo que hace la calculadora al guardar un producto: upsert de la fila, como el dueño (RLS).
function guardarDesdeCalculadora(id, cambios) {
  const sql = "set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false);" +
    "insert into public.productos (negocio_id, id, datos) select negocio_id, id, datos || '" + JSON.stringify(cambios) + "'::jsonb from public.productos " +
    "where id = '" + id + "' on conflict (negocio_id, id) do update set datos = excluded.datos;";
  execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", sql]);
}
const textoWa = (u) => new URL(u).searchParams.get("text");

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ ...devices["Pixel 5"], locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", serviceWorkers: "block" });
  await ctx.route("**/js/config.js", (r) => r.fulfill({ contentType: "text/javascript",
    body: 'export const CONFIG = { SUPABASE_URL: "' + URL_BASE + '", SUPABASE_ANON_KEY: "anon-de-prueba", SLUG: "venutto", WHATSAPP_RESPALDO: "5493855702807" };' }));
  await ctx.route("https://fotos.prueba/**", (r) => r.fulfill({ path: path.join(__dirname, "foto-prueba.jpeg"), contentType: "image/jpeg" }));
  await ctx.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ contentType: "text/css", body: "" }));
  const abiertos = [];
  await ctx.route("https://wa.me/**", (r) => { abiertos.push(r.request().url()); r.fulfill({ contentType: "text/html", body: "<title>WhatsApp</title>WhatsApp" }); });
  const respuestas = [];
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(String(e)));
  p.on("response", async (r) => { if (r.url().includes("/rest/v1/rpc/")) { try { respuestas.push(await r.text()); } catch (e) {} } });

  // ---- 0. Portada: los precios salen de la calculadora, sin archivo de precios propio ----
  await p.goto(URL_BASE + "/index.html");
  await p.waitForSelector(".prod-card");
  assert.deepEqual(await p.$$eval(".tab-btn", (b) => b.map((x) => x.textContent)), ["Hamburguesas", "Lomitos", "Papas"]);
  assert.match(await p.textContent(".cat-panel.visible"), /Hamburguesa completa\s*\$7\.000/);
  assert.match(await p.textContent("#adicionales-grid"), /Potecito de mayonesa \$500/);
  assert.equal(await p.textContent("#banda-horario"), "Jueves a domingo de 21 a 1 h");
  assert.match(await p.textContent("#horarios-filas"), /Lunes\s*Cerrado.*Jueves\s*21 a 1 h/);
  assert.match(await p.textContent("#texto-envio"), /el envío cuesta \$1\.000/);
  await p.click(".tab-btn:has-text('Lomitos')");
  await p.click(".cat-panel.visible .prod-card:has-text('Lomito simple') a");
  await p.waitForSelector("#prod-ls");
  assert.equal(new URL(p.url()).hash, "#prod-ls");
  await p.goto(URL_BASE + "/pedir.html");
  await p.waitForSelector(".producto");

  // ---- 1. Menú: categorías, productos publicados, agotado, nada interno ----
  const chips = await p.$$eval(".chip", (c) => c.map((x) => x.textContent));
  assert.deepEqual(chips, ["Hamburguesas", "Lomitos", "Papas", "Para sumar a tu pedido"]);
  const nombres = await p.$$eval(".producto h3", (h) => h.map((x) => x.textContent));
  assert.deepEqual(nombres, ["Hamburguesa completa", "PromoPromo 2 completas + papas", "Lomito completo", "Lomito picante", "Lomito simple", "Porción de papas con cheddar M", "Potecito de mayonesa"]);
  assert.match(await p.textContent("#prod-lp"), /Agotado por hoy/);
  assert.equal(await p.locator("#prod-lp button").count(), 0);
  assert.match(await p.textContent("#estado-local"), /Horario: Jueves a domingo de 21 a 1 h/);
  assert.match(await p.textContent("#aviso-negocio"), /Desde enero de 2027/);
  for (const r of respuestas) for (const w of ["margen", "envioIncluido", "items", "insumo", "lomo-secreto", "reemplaza", "pan-frances", "personal", "costo"]) {
    assert.ok(!r.toLowerCase().includes(w.toLowerCase()), "El menú recibió un dato interno: " + w);
  }

  // ---- 2. Carrito: agregar, variantes, cantidades, barra con total ----
  assert.ok(await p.isHidden("#barra"));
  await p.click("#prod-hc .btn-agregar");
  await p.click('#prod-hc button[aria-label="Agregar 1 Hamburguesa completa"]');
  await p.click("#prod-lc .fila-precio .btn-agregar");
  await p.click('#prod-lc button[aria-label="Agregar 1 Lomito completo (Pan árabe)"]');
  for (let i = 0; i < 3; i++) await p.click('#prod-pm button[aria-label="Agregar 1 Potecito de mayonesa"]');
  await p.click('#prod-pm button[aria-label="Quitar 1 Potecito de mayonesa"]');
  assert.equal(await p.textContent("#prod-pm .cant"), "2");
  assert.equal(await p.textContent("#barra-cant"), "6 productos");
  assert.equal(await p.textContent("#barra-total"), "Total $35.200");

  // ---- 3. Revisar el pedido; Atrás y recargar no pierden nada ----
  await p.click("#ver-pedido");
  assert.equal(await p.evaluate(() => location.hash), "#pedido");
  const lineas = await p.$$eval(".linea-nombre", (l) => l.map((x) => x.textContent));
  assert.deepEqual(lineas, ["2 Hamburguesas completas", "1 Lomito completo", "1 Lomito completo (Pan árabe)", "2 Potecitos de mayonesa"]);
  await p.goBack();
  assert.ok(await p.isVisible("#paso-menu"));
  assert.equal(await p.textContent("#prod-hc .cant"), "2");
  await p.reload();
  await p.waitForSelector(".producto");
  assert.equal(await p.textContent("#barra-total"), "Total $35.200");
  await p.click("#ver-pedido");

  // ---- 4. Checkout: errores claros, delivery pide dirección, retiro no ----
  await p.click("#enviar");
  assert.equal(await p.textContent("#err-entrega"), "Elegí si querés delivery o retiro.");
  assert.equal(await p.textContent("#err-pago"), "Elegí cómo vas a pagar.");
  assert.equal(abiertos.length, 0);
  await p.check('input[name="entrega"][value="delivery"]');
  assert.ok(await p.isVisible("#calle"));
  assert.match(await p.textContent("#resumen"), /Envío\$1\.000.*Total\$36\.200/);
  await p.check('input[name="pago"][value="transferencia"]');
  assert.match(await p.textContent("#alias"), /javier\.toledo\.nx/);
  await p.click("#enviar");
  assert.equal(await p.textContent("#err-calle"), "Escribí la calle.");
  assert.match(await p.textContent("#err-numero"), /número/);
  assert.equal(await p.evaluate(() => document.activeElement.id), "calle");
  await p.fill("#calle", "Av. Belgrano");
  await p.fill("#numero", "1234");
  await p.fill("#barrio", "Centro");
  await p.check('input[name="entrega"][value="retiro"]');
  assert.ok(await p.isHidden("#calle"));
  assert.doesNotMatch(await p.textContent("#resumen"), /Envío/);
  assert.match(await p.textContent("#resumen"), /Total\$35\.200/);
  await p.check('input[name="entrega"][value="delivery"]');
  assert.equal(await p.inputValue("#calle"), "Av. Belgrano");
  await p.check('input[name="pago"][value="dividido"]');
  assert.ok(await p.isVisible("#campo-efectivo"));
  await p.check('input[name="pago"][value="transferencia"]');
  // Se quita una línea con "Quitar"
  await p.click('button[aria-label="Quitar Lomito completo del pedido"]');
  assert.equal(await p.locator(".linea").count(), 3);
  assert.match(await p.textContent("#barra-total"), /Total \$26\.200/);

  // ---- 5. Cambio de precio en la calculadora con la página abierta ----
  guardarDesdeCalculadora("hc", { precioVenta: 7500 });
  await p.click("#enviar");
  await p.waitForSelector("#cambios-precio-2:not([hidden])");
  assert.match(await p.textContent("#cambios-precio-2"), /Hamburguesa completa: antes \$7\.000, ahora \$7\.500/);
  assert.equal(abiertos.length, 0, "Abrió WhatsApp con un precio viejo");
  assert.match(await p.textContent("#resumen"), /Subtotal de productos\$26\.200.*Total\$27\.200/);
  // Ahora sí: se envía con los importes vigentes
  await p.click("#enviar");
  await p.waitForFunction(() => location.href.startsWith("https://wa.me/"));
  const url = abiertos[abiertos.length - 1];
  assert.ok(url.startsWith("https://wa.me/5493855702807?text="), url);
  assert.equal(textoWa(url), [
    "¡Hola, Venutto! Quiero hacer este pedido.", "",
    "• 2 Hamburguesas completas — $15.000",
    "• 1 Lomito completo (Pan árabe) — $10.200",
    "• 2 Potecitos de mayonesa — $1.000", "",
    "Entrega: Delivery", "Dirección: Av. Belgrano 1234, Centro", "Pago: Transferencia", "",
    "Subtotal de productos: $26.200", "Envío: $1.000", "TOTAL: $27.200",
  ].join("\n"));
  assert.ok(!/\d\s*[x×]\s/i.test(textoWa(url)));

  // ---- 6. Vuelve de WhatsApp: no dice "pedido recibido", dice que falta tocar Enviar ----
  await p.goBack();
  await p.waitForSelector("#paso-listo:not([hidden])");
  assert.match(await p.textContent("#titulo-listo"), /tocá Enviar en WhatsApp/);
  assert.doesNotMatch(await p.textContent("#paso-listo"), /recibido|confirmado/i);
  assert.equal(await p.getAttribute("#abrir-wa", "href"), url);

  // ---- 7. Al abrir de nuevo el menú se ve el precio nuevo; un producto agotado se saca del pedido ----
  await p.click("#volver-pedido");
  await p.click("#volver-menu");
  await p.reload();
  await p.waitForSelector(".producto");
  assert.match(await p.textContent("#prod-hc .precio"), /\$7\.500/);
  guardarDesdeCalculadora("pm", { agotado: true });
  await p.click("#ver-pedido");
  await p.click("#enviar");
  await p.waitForSelector("#cambios-precio-2:not([hidden])");
  assert.match(await p.textContent("#cambios-precio-2"), /Potecito de mayonesa: lo sacamos de tu pedido porque se agotó/);
  assert.equal(await p.locator(".linea").count(), 2);
  guardarDesdeCalculadora("pm", { agotado: false });

  // ---- 8. Sin conexión con la base: no se abre WhatsApp con importes sin verificar ----
  const antes = abiertos.length;
  await p.request.get(URL_BASE + "/__caer");
  await p.click("#enviar");
  await p.waitForSelector("#error-envio:not([hidden])");
  assert.match(await p.textContent("#error-envio"), /No abrimos WhatsApp con importes sin verificar/);
  assert.equal(abiertos.length, antes);
  await p.click("#volver-menu");
  await p.reload();
  await p.waitForSelector("#error-menu:not([hidden])");
  assert.match(await p.textContent("#error-menu"), /No pudimos cargar el menú/);
  assert.equal(await p.locator(".producto").count(), 0, "Mostró precios sin poder verificarlos");
  assert.match(await p.getAttribute("#error-menu a", "href"), /^https:\/\/wa\.me\/5493855702807/);
  await p.request.get(URL_BASE + "/__levantar");
  await p.click("#error-menu button");
  await p.waitForSelector(".producto");

  // ---- 9. Accesibilidad básica en el celular ----
  const chicos = await p.$$eval("button:not([hidden]), a.chip, a.btn-wa, a.btn-secundario", (bs) => bs
    .filter((x) => x.offsetParent !== null)
    .map((x) => ({ t: x.textContent.trim() || x.getAttribute("aria-label"), h: x.getBoundingClientRect().height, w: x.getBoundingClientRect().width }))
    .filter((x) => x.h < 48 || x.w < 48));
  assert.deepEqual(chicos, [], "Botones de menos de 48 px");
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).fontSize), "18px");
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "La página se desborda de costado");
  // La barra no tapa el último producto
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const solapa = await p.evaluate(() => {
    const ult = [...document.querySelectorAll(".producto")].pop().getBoundingClientRect();
    const barra = document.getElementById("barra").getBoundingClientRect();
    return ult.bottom > barra.top + 1;
  });
  assert.equal(solapa, false, "La barra tapa el último producto");
  if (process.env.CAPTURAS) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(process.env.CAPTURAS, "1-menu.png") });
    await p.click("#ver-pedido");
    await p.check('input[name="entrega"][value="delivery"]');
    await p.screenshot({ path: path.join(process.env.CAPTURAS, "2-pedido.png"), fullPage: true });
  }

  assert.deepEqual(errores, []);
  console.log("Prueba del menú de pedidos (Android, precios desde la calculadora): OK");
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
