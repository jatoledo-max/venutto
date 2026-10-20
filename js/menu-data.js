/* ============================================================
   VENUTTO — DATOS DEL MENÚ
   ------------------------------------------------------------
   Este es el ÚNICO archivo que necesitás tocar para cambiar
   precios, fotos, productos, adicionales o datos del negocio.
   No hace falta tocar el HTML ni el JS.

   - Cambiar un precio: editá el número en "precio".
   - Cambiar una foto: editá el nombre del archivo en "img".
   - Agregar un producto: copiá una línea { ... } y cambiala.
   ============================================================ */

const CONFIG = {
  // Número de WhatsApp del negocio (formato internacional, sin + ni espacios)
  whatsapp: "5493855702807",

  // Alias para transferencias (se copia con un toque en el checkout)
  aliasTransferencia: "javier.toledo.nx",

  // Envío: el costo depende de la distancia, así que NO se suma al total.
  // Se le avisa al cliente que se confirma con la ubicación.
  envio: {
    notaCosto: "El costo del envío ($500 a $1500 según la distancia) te lo confirmamos cuando mandás tu ubicación 📍",
  },

  instagram: "https://instagram.com/venutto.oficial",
};

/* ── Categorías del menú ──────────────────────────────────────
   Cada producto: { id, nombre, desc, precio, img, promo (opcional) }
   El "id" debe ser único en todo el menú.
   "img" es el nombre del archivo de imagen en la carpeta.        */
const CATEGORIAS = [
  {
    id: "lomitos",
    nombre: "Lomitos",
    emoji: "🥩",
    nota: "<strong>Todos los lomitos vienen con papas.</strong> Podés sumar potecito de mayonesa casera, extra de papas o pedirlos en pan árabe.",
    productos: [
      { id: "lomito-completo", nombre: "Lomito Completo", desc: "Con lechuga, tomate, huevo, jamón, queso y mayonesa. El clásico de siempre.", precio: 10000, img: "lomitos.jpeg" },
      { id: "lomito-simple", nombre: "Lomito Simple", desc: "Lomito con lechuga, tomate y mayonesa. Directo y sin rodeos.", precio: 9500, img: "lomitos.jpeg" },
      { id: "lomito-mostaza", nombre: "Lomito a la Mostaza", desc: "Lomito con lechuga, tomate y mostaza como protagonista.", precio: 10000, img: "lomitos.jpeg" },
      { id: "lomito-cheddar", nombre: "Lomito Cheddar", desc: "Lomito con cheddar derretido, jamón y queso.", precio: 11000, img: "lomitos.jpeg" },
      { id: "lomito-caballo", nombre: "Lomito a Caballo", desc: "Con huevo frito y papas fritas encima. El toque que lo cambia todo.", precio: 10500, img: "lomitos.jpeg" },
      { id: "lomito-picante", nombre: "Lomito Picante", desc: "Para los que saben lo que quieren. Con aderezo picante de la casa.", precio: 10000, img: "lomitos.jpeg" },
      { id: "lomito-mixto", nombre: "Lomito Mixto", desc: "Mitad de un sabor, mitad de otro. Elegís la combinación.", precio: 12000, img: "lomitos.jpeg" },
      { id: "promo-3-lomitos", nombre: "Promo 3 Lomitos", desc: "Tres lomitos completos + papas. Para el que tiene hambre en serio.", precio: 28000, img: "lomitos.jpeg", promo: true },
    ],
  },
  {
    id: "hamburguesas",
    nombre: "Hamburguesas",
    emoji: "🍔",
    nota: "<strong>Todas las hamburguesas vienen con papas.</strong> Podés sumar mayonesa casera o extra de papas.",
    productos: [
      { id: "burger-cheddar", nombre: "Burger Cheddar", desc: "Medallón de carne, cheddar fundido, jamón y huevo.", precio: 8000, img: "hamburguesa-cheddar.jpeg" },
      { id: "burger-doble-cheddar", nombre: "Burger Doble Cheddar", desc: "Doble medallón, doble cheddar. Para cuando uno no alcanza.", precio: 10000, img: "hamburguesa-cheddar.jpeg" },
      { id: "burger-completa", nombre: "Burger Completa", desc: "Con lechuga, tomate, huevo, jamón, queso y mayonesa.", precio: 7000, img: "hamburguesa-completa.jpeg" },
      { id: "promo-2-completas", nombre: "Promo 2 Completas + Papas", desc: "Dos hamburguesas completas más papas. Ideal para dos.", precio: 12000, img: "promo-hamburguesas.jpeg", promo: true },
      { id: "promo-2-cheddar", nombre: "Promo 2 Cheddar + Papas", desc: "Dos hamburguesas cheddar más papas. El combo ideal.", precio: 13000, img: "promo-hamburguesas.jpeg", promo: true },
    ],
  },
  {
    id: "sanguchitos",
    nombre: "Milas",
    emoji: "🥪",
    nota: "<strong>Los sánguches vienen con papas.</strong> Podés sumar mayonesa casera o extra de papas.",
    productos: [
      { id: "mila-completa", nombre: "Milanesa Completa", desc: "Con lechuga, tomate, huevo, jamón, queso y mayonesa.", precio: 10000, img: "sandwich-milanesa.jpeg" },
      { id: "mila-simple", nombre: "Milanesa Simple", desc: "Con lechuga, tomate y mayonesa. Clásico y directo.", precio: 9000, img: "sandwich-milanesa.jpeg" },
    ],
  },
  {
    id: "papas",
    nombre: "Papas",
    emoji: "🍟",
    nota: "",
    productos: [
      { id: "papas-porcion", nombre: "Porción de Papas", desc: "Papas fritas crocantes. El acompañamiento de siempre.", precio: 6500, img: "porcion-papas.jpeg" },
      { id: "papas-cheddar", nombre: "Papas con Cheddar M", desc: "Papas con cheddar caliente y verdeo fresco. Directamente adictivas.", precio: 6000, img: "papas-cheddar.jpeg" },
      { id: "papas-cheddar-xl", nombre: "Papas con Cheddar XL", desc: "La versión grande. Misma locura, más cantidad.", precio: 9000, img: "papas.jpeg" },
    ],
  },
];

/* ── Adicionales ──────────────────────────────────────────────
   El cliente los suma a su pedido con cantidad.                  */
const ADICIONALES = [
  { id: "add-mayo", nombre: "Potecito de mayonesa casera", precio: 1000 },
  { id: "add-papas", nombre: "Extra de papas", precio: 2000 },
  { id: "add-pan-arabe", nombre: "Pan árabe (para lomitos)", precio: 200 },
];
