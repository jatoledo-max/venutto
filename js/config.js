// Configuración del menú de pedidos. Todo esto es público (va al navegador de los clientes).
// Los precios, productos, fotos, medios de pago, envío y horarios NO van acá: salen de la calculadora
// (CalculadoraDeGananciasMV, Mi negocio > Menú de pedidos y cada producto > En el menú de pedidos).
export const CONFIG = {
  // Base de datos de la calculadora. La "anon key" es la clave pública de Supabase: solo permite
  // llamar a menu_publico y cotizar_pedido, que devuelven datos de venta (nunca costos ni márgenes).
  SUPABASE_URL: "https://trroercvimupqlpbvndx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycm9lcmN2aW11cHFscGJ2bmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MjAzMDcsImV4cCI6MjEwNzQ5NjMwN30.At6SIQprAcsXaHI4zYGC9o4uD4lLgnoJEELfJ4vGC6g",
  // La "Dirección del menú" puesta en Mi negocio > Menú de pedidos.
  SLUG: "venutto",
  // Solo para el botón "Escribinos por WhatsApp" si el menú no carga (sin internet, base caída).
  WHATSAPP_RESPALDO: "5493855702807",
};
