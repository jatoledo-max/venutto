// Portada: muestra el menú con los precios vigentes de la calculadora (los mismos que usa pedir.html).
// Si no se puede leer la base, no muestra precios viejos: invita a entrar a "Hacé tu pedido".
import { leerMenu } from "./catalogo.js";
import { cent, pesos, textoHorario } from "./pedido.js";

const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const ORDEN_FIN = { Promos: 1, Extras: 2, Otros: 3 };
const DIAS = [[1, "Lunes"], [2, "Martes"], [3, "Miércoles"], [4, "Jueves"], [5, "Viernes"], [6, "Sábado"], [0, "Domingo"]];
const hora = (s) => s.replace(/^0(\d)/, "$1").replace(/:00$/, "");

function tarjeta(p) {
  const card = el("div", "prod-card" + (p.tipo === "promo" ? " promo" : ""));
  if (p.tipo === "promo") card.appendChild(el("span", "badge-promo", "Promo"));
  if (p.foto) { const f = el("div", "prod-foto"); const img = el("img"); img.src = p.foto; img.alt = p.nombre; img.loading = "lazy"; f.appendChild(img); card.appendChild(f); }
  const c = el("div", "prod-cuerpo");
  c.appendChild(el("div", "prod-nombre", p.nombre));
  if (p.descripcion) c.appendChild(el("div", "prod-desc", p.descripcion));
  const pie = el("div", "prod-footer");
  pie.appendChild(el("div", "prod-precio", p.disponible ? pesos(cent(p.precio)) : "Agotado"));
  const a = el("a", "btn-agregar", "Pedir"); a.href = "./pedir.html#prod-" + p.id;
  pie.appendChild(a);
  c.appendChild(pie);
  card.appendChild(c);
  return card;
}

function pintar(menu) {
  const g = {};
  menu.productos.forEach((p) => { (g[p.categoria] = g[p.categoria] || []).push(p); });
  const cats = Object.keys(g).filter((c) => c !== "Extras").sort((a, b) => (ORDEN_FIN[a] || 0) - (ORDEN_FIN[b] || 0) || a.localeCompare(b, "es"));
  const tabs = $("#menu-tabs"), paneles = $("#menu-paneles");
  tabs.textContent = ""; paneles.textContent = "";
  cats.forEach((c, i) => {
    const b = el("button", "tab-btn" + (i ? "" : " activo"), c); b.type = "button";
    const panel = el("div", "cat-panel" + (i ? "" : " visible"));
    const grid = el("div", "productos-grid");
    g[c].forEach((p) => grid.appendChild(tarjeta(p)));
    panel.appendChild(grid);
    b.onclick = () => {
      document.querySelectorAll(".cat-panel").forEach((x) => x.classList.remove("visible"));
      document.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("activo"));
      panel.classList.add("visible"); b.classList.add("activo");
    };
    tabs.appendChild(b); paneles.appendChild(panel);
  });
  const extras = $("#adicionales-grid"); extras.textContent = "";
  (g.Extras || []).forEach((p) => {
    const chip = el("div", "extra-chip", p.nombre + " ");
    chip.appendChild(el("span", "chip-precio", p.disponible ? pesos(cent(p.precio)) : "Agotado"));
    extras.appendChild(chip);
  });
  $("#adicionales-wrap").hidden = !(g.Extras || []).length;

  const m = menu.menu || {};
  const h = m.horarios;
  const txt = textoHorario(h);
  if (txt) {
    $("#banda-horario").textContent = txt;
    const filas = $("#horarios-filas"); filas.textContent = "";
    DIAS.forEach(([d, nombre]) => {
      const f = el("div", "horario-row");
      f.append(el("span", "h-dia", nombre), el("span", "h-hora" + (h.dias.includes(d) ? "" : " cerrado"), h.dias.includes(d) ? hora(h.desde) + " a " + hora(h.hasta) + " h" : "Cerrado"));
      filas.appendChild(f);
    });
  }
  if (m.envio != null) $("#texto-envio").textContent = "Hacemos delivery dentro de la ciudad. Pidiendo por la web, el envío cuesta " + pesos(cent(m.envio)) + ".";
  if (m.aviso) { const av = $("#aviso-horario"); av.textContent = m.aviso; av.hidden = false; }
}

function sinMenu() {
  $("#menu-tabs").textContent = "";
  $("#menu-paneles").textContent = "";
  $("#menu-paneles").appendChild(el("p", "menu-nota", "Mirá el menú con los precios de hoy en «Armar mi pedido»."));
  $("#adicionales-wrap").hidden = true;
}

leerMenu().then((m) => (m ? pintar(m) : sinMenu())).catch(sinMenu);

window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 60);
});
