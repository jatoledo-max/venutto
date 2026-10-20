// Lectura del catálogo y cotización del pedido desde la base de la calculadora (Supabase).
// Se llama a las funciones por HTTP, sin librerías: el menú carga más rápido en el celular.
import { CONFIG } from "./config.js";

export class SinConexion extends Error {}

async function rpc(fn, args, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  let r;
  try {
    r = await fetch(CONFIG.SUPABASE_URL + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: "Bearer " + CONFIG.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: ctl.signal,
    });
  } catch (e) {
    throw new SinConexion("No hay conexión.");
  } finally {
    clearTimeout(t);
  }
  let j = null;
  try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((j && j.message) || "El servidor no respondió bien.");
  return j;
}

// null si el menú no está publicado.
export const leerMenu = () => rpc("menu_publico", { p_slug: CONFIG.SLUG });
export const cotizar = (items, entrega) => rpc("cotizar_pedido", { p_slug: CONFIG.SLUG, p_items: items, p_entrega: entrega });
