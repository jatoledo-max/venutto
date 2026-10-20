# Venutto Fast Food — Sitio + armador de pedido por WhatsApp

Dos páginas:

- **`index.html`** → la vitrina (menú con fotos, horarios, cómo pedir). Los botones
  "Armar pedido" llevan a la página del armador.
- **`pedir.html`** → el armador: el cliente elige productos, suma adicionales, ve el
  total automático, elige retiro o envío y forma de pago, y confirma con un mensaje
  ya escrito que llega directo a tu WhatsApp.

## Estructura

```
/
├── index.html                  → vitrina (página de inicio)
├── pedir.html                  → armador de pedido
├── css/
│   └── styles.css              → estilos (compartidos por las dos páginas)
├── js/
│   ├── menu-data.js            → ⭐ ÚNICO archivo para editar precios, fotos y productos
│   └── app.js                  → lógica del armador (carrito, checkout, WhatsApp)
├── Logo.jpeg
├── lomitos.jpeg                → foto de los lomitos
├── hamburguesa-cheddar.jpeg    → foto de las hamburguesas
├── promo-hamburguesas.jpeg     → foto de las promos de hamburguesa
├── sandwich-milanesa.jpeg      → foto de los sánguches
├── porcion-papas.jpeg          → foto de la porción de papas
├── papas-cheddar.jpeg          → foto de las papas con cheddar
└── papas.jpeg                  → foto (papas con cheddar XL)
```

## Cómo cambiar precios, productos o fotos

Todo se edita en **`js/menu-data.js`** (un solo lugar, y se actualizan las dos páginas):

- **Precio:** editá el número en `precio` (sin puntos ni símbolo). Ej: `precio: 9500`.
- **Foto:** cambiá el nombre del archivo en `img`. Ej: `img: "lomitos.jpeg"`.
  La imagen tiene que estar en la carpeta con ese mismo nombre.
- **Agregar un producto:** copiá una línea `{ id, nombre, desc, precio, img }` y cambiala.
  El `id` tiene que ser único.
- **Alias de transferencia y número de WhatsApp:** en `CONFIG`, arriba del archivo.

## Subir los cambios (GitHub → Netlify)

1. Subí al repo `jatoledo-max/venutto`: `index.html`, `pedir.html`, las carpetas
   `css/` y `js/`, y las imágenes nuevas (`lomitos.jpeg`, `hamburguesa-cheddar.jpeg`,
   `promo-hamburguesas.jpeg`, `sandwich-milanesa.jpeg`, `porcion-papas.jpeg`,
   `papas-cheddar.jpeg`).
2. **Borrá el viejo `venutto.html`** del repo: ahora la página de inicio es `index.html`,
   que Netlify sirve automáticamente.
3. Commit y push. Netlify redeploya solo en unos segundos.

> Nota: como el sitio ahora usa archivos separados, probalo en la URL de Netlify
> (venutto.netlify.app). Si lo abrís con doble clic, tiene que ser con las carpetas
> `css/` y `js/` al lado (si no, no cargan los estilos ni el menú).

## Mensaje de bienvenida en WhatsApp Business

`WhatsApp Business → Ajustes → Herramientas para la empresa → Mensaje de bienvenida`

> ¡Hola! 👋 Gracias por escribir a **Venutto** 🍔
> Armá tu pedido acá y en un toque te confirmamos:
> 👉 https://venutto.netlify.app/pedir.html
>
> Elegís lo que querés, ves el total y confirmás. ¡Te esperamos!

## El flujo, de punta a punta

1. El cliente te escribe → recibe el mensaje de bienvenida con el link a `pedir.html`.
2. Elige productos y adicionales, ve el total automático.
3. Elige **Retiro** o **Envío** (con envío pide dirección y le recuerda mandar ubicación).
4. Elige **Transferencia** (alias copiable `javier.toledo.nx`) o **Efectivo**.
5. Toca "Confirmar por WhatsApp" → te llega el pedido preformateado listo.
