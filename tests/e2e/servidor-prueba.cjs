// Servidor de prueba: sirve la página y hace de "Supabase" con las funciones SQL REALES de la calculadora
// (supabase/menu.sql corriendo en un Postgres local). Imita la API de Supabase (PostgREST) para
// POST /rest/v1/rpc/menu_publico y /rest/v1/rpc/cotizar_pedido, llamando como el rol anon (sin login).
// Uso: node tests/e2e/servidor-prueba.cjs <puerto> <base>
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const crypto = require("node:crypto");

const PUERTO = Number(process.argv[2] || 8770);
const BASE = process.argv[3] || "menu_prueba";
const RAIZ = path.resolve(__dirname, "../..");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".json": "application/json" };
let caido = false; // /__caer y /__levantar simulan que la base no responde

function sql(consulta) {
  return new Promise((resolve) => {
    execFile("psql", ["-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-d", BASE, "-c", "set role anon", "-c", consulta],
      { env: process.env }, (err, stdout, stderr) => resolve({ err, out: stdout.trim(), stderr }));
  });
}
const lit = (v) => { const tag = "q" + crypto.randomBytes(6).toString("hex"); const s = typeof v === "string" ? v : JSON.stringify(v); return "$" + tag + "$" + s + "$" + tag + "$"; };

http.createServer(async (req, res) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, authorization, content-type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }
  if (req.url === "/__caer") { caido = true; res.end("ok"); return; }
  if (req.url === "/__levantar") { caido = false; res.end("ok"); return; }
  const m = req.url.match(/^\/rest\/v1\/rpc\/(menu_publico|cotizar_pedido)$/);
  if (m && req.method === "POST") {
    if (caido) { req.socket.destroy(); return; }
    let body = "";
    for await (const c of req) body += c;
    const a = JSON.parse(body || "{}");
    const q = m[1] === "menu_publico"
      ? "select public.menu_publico(" + lit(a.p_slug) + ")"
      : "select public.cotizar_pedido(" + lit(a.p_slug) + ", " + lit(a.p_items) + "::jsonb, " + lit(a.p_entrega) + ")";
    const r = await sql(q);
    if (r.err) {
      const msg = (r.stderr.match(/ERROR:\s+(.*)/) || [, "error"])[1];
      res.writeHead(400, { ...cors, "Content-Type": "application/json" }); res.end(JSON.stringify({ message: msg })); return;
    }
    res.writeHead(200, { ...cors, "Content-Type": "application/json" }); res.end(r.out === "" ? "null" : r.out); return;
  }
  let f = decodeURIComponent(req.url.split("?")[0]);
  if (f === "/") f = "/index.html";
  const ruta = path.join(RAIZ, f);
  if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); res.end("no"); return; }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(ruta)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(ruta).pipe(res);
}).listen(PUERTO, () => console.log("servidor de prueba en " + PUERTO));
