-- Datos de prueba: el negocio Venutto con productos cargados como los guarda la calculadora
-- (con receta, márgenes y costos internos, que el menú NUNCA debe ver).
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.negocios (id, owner_id, nombre, suscripcion_estado) values
  ('a0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Venutto', 'authorized');
insert into public.productos (negocio_id, id, datos) values
  ('a0000000-0000-0000-0000-00000000000a', 'lc', '{"nombre":"Lomito completo","plural":"Lomitos completos","categoria":"Lomitos","precioVenta":10000,"enMenu":true,
     "descripcion":"Con lechuga, tomate, huevo, jamón, queso y mayonesa.","foto":"https://fotos.prueba/completo.jpg",
     "margen":35,"envioIncluido":1000,"items":[{"insumo":"lomo-secreto","cantidad":180}],
     "opciones":[{"id":"arabe","nombre":"Pan árabe","reemplaza":"pan-frances","por":"pan-arabe","precioExtra":200}]}'),
  ('a0000000-0000-0000-0000-00000000000a', 'ls', '{"nombre":"Lomito simple","categoria":"Lomitos","precioVenta":9500,"enMenu":true,"margen":30}'),
  ('a0000000-0000-0000-0000-00000000000a', 'lp', '{"nombre":"Lomito picante","categoria":"Lomitos","precioVenta":10000,"enMenu":true,"agotado":true}'),
  ('a0000000-0000-0000-0000-00000000000a', 'hc', '{"nombre":"Hamburguesa completa","categoria":"Hamburguesas","precioVenta":7000,"enMenu":true,"foto":"https://fotos.prueba/burger.jpg"}'),
  ('a0000000-0000-0000-0000-00000000000a', 'p2', '{"nombre":"Promo 2 completas + papas","plural":"Promos 2 completas + papas","tipo":"promo","categoria":"Hamburguesas","precioVenta":12000,"enMenu":true}'),
  ('a0000000-0000-0000-0000-00000000000a', 'pc', '{"nombre":"Porción de papas con cheddar M","categoria":"Papas","precioVenta":4000,"enMenu":true}'),
  ('a0000000-0000-0000-0000-00000000000a', 'pm', '{"nombre":"Potecito de mayonesa","tipo":"extra","precioVenta":500,"enMenu":true}'),
  ('a0000000-0000-0000-0000-00000000000a', 'interno', '{"nombre":"Lomito para el personal","categoria":"Lomitos","precioVenta":1,"margen":0}'),
  ('a0000000-0000-0000-0000-00000000000a', 'mayo', '{"nombre":"Mayonesa casera","esPreparacion":true,"rinde":750}');
insert into public.ajustes (negocio_id, id, datos) values
  ('a0000000-0000-0000-0000-00000000000a', 'delivery', '{"naftaMes":20000,"pedidosMes":80,"cobroEnvio":1000}'),
  ('a0000000-0000-0000-0000-00000000000a', 'menu', '{"publicado":true,"slug":"venutto","whatsapp":"5493855702807","alias":"javier.toledo.nx",
     "pagos":["transferencia","efectivo","dividido"],"envio":1000,"horarios":{"dias":[4,5,6,0],"desde":"21:00","hasta":"01:00"},
     "aviso":"Desde enero de 2027 abrimos todos los días."}');
-- Como en Supabase: los roles tienen permiso sobre las tablas y lo que frena es RLS.
grant select, insert, update, delete on public.productos, public.ajustes, public.negocios to anon, authenticated;
