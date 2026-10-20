# Venutto Fast Food: sitio y pedidos por WhatsApp

Tiene dos páginas:

- **`index.html`** es la portada: menú con fotos y precios, horarios, delivery y cómo pedir.
- **`pedir.html`** es la página de pedidos. El cliente:
  1. elige productos;
  2. revisa el pedido y completa sus datos;
  3. lo manda por WhatsApp.

## De dónde salen los precios

**No se editan acá.** Precios, productos, fotos, descripciones, medios de pago, envío y horarios
se cargan en la calculadora ([CalculadoraDeGananciasMV](https://calculadoracostosmv.netlify.app)):

- **En cada producto**, en la sección "En el menú de pedidos": mostrar, agotado, descripción, plural y foto.
  El precio es el "Precio de venta" de la ficha.
- **En Mi negocio > Menú de pedidos**: publicado, WhatsApp, alias, medios de pago, envío, horarios y aviso.

Las dos páginas leen esos datos de la base de la calculadora con las funciones `menu_publico` y `cotizar_pedido`
(archivo `supabase/menu.sql` del repo `calculadora-costos`). Solo reciben datos de venta, nunca costos ni márgenes.

- **Cambio de precio:** se ve la próxima vez que la página lee el menú. Eso pasa al abrir la página, al volver a ella
  después de un minuto o más, y siempre justo antes de abrir WhatsApp. No hay caché intermedia.
- **Si el precio cambió** con el pedido ya armado, la página muestra qué cambió y pide revisar antes de enviar.
- **Si la base no responde**, la página no muestra precios ni abre WhatsApp con importes sin verificar.
  Ofrece escribir por WhatsApp sin el pedido armado.

## Estructura

```
index.html, pedir.html
css/styles.css      → estilos de la portada
css/pedir.css       → estilos de la página de pedidos (letra grande, botones de 48 px o más)
js/config.js        → dirección de la base, clave pública y "dirección del menú" (venutto)
js/catalogo.js      → lee el menú y cotiza el pedido en la base
js/pedido.js        → carrito, importes en centavos, horarios, validación y mensaje de WhatsApp
js/plural.js        → "1 Lomito completo" / "2 Lomitos completos" (copia del de la calculadora)
js/pedir.js         → pantalla de pedidos
js/vitrina.js       → menú de la portada
tests/              → pruebas (npm test; tests/e2e/correr.sh)
```

## Publicar

Netlify publica lo que está en la rama `main` de este repo, o lo que se suba a mano en **Deploys**.
No hay que compilar nada.

## Pruebas

- `npm test` prueba el carrito, los importes, el singular y plural, el mensaje, la URL de WhatsApp y los horarios.
- `tests/e2e/correr.sh` prueba las dos páginas en un celular Android simulado contra las funciones SQL reales
  de la calculadora (en un Postgres local). Incluye un cambio de precio con la página abierta, un producto agotado
  y la base caída. Necesita Postgres, Playwright y el repo `calculadora-costos` al lado.
