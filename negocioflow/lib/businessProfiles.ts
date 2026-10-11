// Perfil del negocio: según el rubro, la app cambia sus textos, las
// categorías sugeridas, los indicadores del inicio y los datos de demostración.
//
// En la base se guarda el id del rubro en `businesses.business_type` y, para
// "Otro", lo que el usuario escribió en `businesses.business_description`.
// Los negocios antiguos tienen etiquetas como "Minimarket" o "Tienda": por eso
// `getProfile` también entiende esos valores.

export type ProfileId =
  | "almacen"
  | "botilleria"
  | "ropa"
  | "peluqueria"
  | "restaurante"
  | "ferreteria"
  | "servicios"
  // Rubros adicionales (se muestran en "Más rubros")
  | "panaderia"
  | "verduleria"
  | "carniceria"
  | "cafeteria"
  | "estetica"
  | "mascotas"
  | "libreria"
  | "tecnologia"
  | "cosmetica"
  | "floreria"
  | "bazar"
  | "hogar"
  | "taller"
  | "repuestos"
  | "bicicleteria"
  | "otro";

/** Qué indicadores muestra el inicio. */
export type KpiMode = "retail" | "services" | "food";

export interface DemoItem {
  name: string;
  category: string;
  sale_price: number;
  cost: number;
  stock: number;
  min_stock: number;
}

export interface BusinessProfile {
  id: ProfileId;
  /** Nombre del rubro tal como se muestra. */
  label: string;
  emoji: string;
  /** Ej. "Vendo vinos, cervezas y destilados". */
  hint: string;
  /** "producto" / "servicio" — siempre masculino. */
  itemSingular: string;
  itemPlural: string;
  /** Nombre de la sección en el menú: "Productos", "Servicios", "Carta". */
  navLabel: string;
  /** Si por defecto lleva control de stock. */
  hasInventory: boolean;
  kpiMode: KpiMode;
  categories: string[];
  /** Ejemplo para el campo categoría. */
  categoryPlaceholder: string;
  demoItems: DemoItem[];
  /** Ícono de la sección en el menú. */
  navIcon?: "package" | "scissors" | "utensils" | "briefcase" | "wrench";
}

const D = (name: string, category: string, sale_price: number, cost: number, stock = 0, min_stock = 0): DemoItem => ({
  name: `${name} (DEMO)`,
  category,
  sale_price,
  cost,
  stock,
  min_stock,
});

// Atajos para definir los rubros adicionales.
const retail = (
  id: ProfileId,
  label: string,
  emoji: string,
  hint: string,
  categories: string[],
  demoItems: DemoItem[],
  hasInventory = true
): BusinessProfile => ({
  id,
  label,
  emoji,
  hint,
  itemSingular: "producto",
  itemPlural: "productos",
  navLabel: "Productos",
  hasInventory,
  kpiMode: "retail",
  categories,
  categoryPlaceholder: `Ej. ${categories.slice(0, 2).join(", ")}…`,
  demoItems,
  navIcon: "package",
});

const service = (
  id: ProfileId,
  label: string,
  emoji: string,
  hint: string,
  categories: string[],
  demoItems: DemoItem[],
  navIcon: BusinessProfile["navIcon"] = "briefcase"
): BusinessProfile => ({
  id,
  label,
  emoji,
  hint,
  itemSingular: "servicio",
  itemPlural: "servicios",
  navLabel: "Servicios",
  hasInventory: false,
  kpiMode: "services",
  categories,
  categoryPlaceholder: `Ej. ${categories.slice(0, 2).join(", ")}…`,
  demoItems,
  navIcon,
});

export const PROFILES: Record<ProfileId, BusinessProfile> = {
  almacen: {
    id: "almacen",
    label: "Almacén / Minimarket",
    emoji: "🛒",
    hint: "Abarrotes, bebidas, pan, aseo",
    itemSingular: "producto",
    itemPlural: "productos",
    navLabel: "Productos",
    hasInventory: true,
    kpiMode: "retail",
    categories: ["Abarrotes", "Bebidas", "Lácteos", "Panadería", "Fiambrería", "Snacks", "Congelados", "Aseo", "Otros"],
    categoryPlaceholder: "Ej. Bebidas, Abarrotes…",
    demoItems: [
      D("Coca-Cola 1.5L", "Bebidas", 1800, 1100, 24, 10),
      D("Pan hallulla (kg)", "Panadería", 2200, 1100, 8, 10),
      D("Leche entera 1L", "Lácteos", 1150, 820, 30, 12),
      D("Arroz 1kg", "Abarrotes", 1600, 1050, 20, 8),
      D("Detergente 1kg", "Aseo", 4200, 2800, 3, 5),
      D("Papas fritas 150g", "Snacks", 1500, 900, 40, 15),
    ],
  },
  botilleria: {
    id: "botilleria",
    label: "Botillería",
    emoji: "🍷",
    hint: "Vinos, cervezas, destilados",
    itemSingular: "producto",
    itemPlural: "productos",
    navLabel: "Productos",
    hasInventory: true,
    kpiMode: "retail",
    categories: ["Vinos", "Cervezas", "Destilados", "Espumantes", "Bebidas", "Hielo", "Snacks", "Otros"],
    categoryPlaceholder: "Ej. Cervezas, Vinos…",
    demoItems: [
      D("Cerveza lata 470cc", "Cervezas", 1300, 850, 96, 48),
      D("Vino reserva 750cc", "Vinos", 5990, 3800, 18, 6),
      D("Pisco 35° 1L", "Destilados", 8990, 6200, 10, 4),
      D("Espumante brut", "Espumantes", 6990, 4300, 6, 3),
      D("Coca-Cola 1.5L", "Bebidas", 1800, 1100, 24, 12),
      D("Hielo 2kg", "Hielo", 1500, 600, 4, 10),
    ],
  },
  ropa: {
    id: "ropa",
    label: "Tienda de ropa",
    emoji: "👕",
    hint: "Ropa, calzado, accesorios",
    itemSingular: "producto",
    itemPlural: "productos",
    navLabel: "Productos",
    hasInventory: true,
    kpiMode: "retail",
    categories: ["Poleras", "Pantalones", "Polerones", "Vestidos", "Calzado", "Accesorios", "Ropa interior", "Otros"],
    categoryPlaceholder: "Ej. Poleras, Calzado…",
    demoItems: [
      D("Polera algodón M", "Poleras", 9990, 4500, 15, 5),
      D("Jeans mujer 38", "Pantalones", 19990, 9800, 8, 3),
      D("Polerón canguro L", "Polerones", 22990, 11500, 6, 3),
      D("Zapatillas urbanas 40", "Calzado", 34990, 19000, 2, 2),
      D("Gorro de lana", "Accesorios", 6990, 2900, 20, 5),
    ],
  },
  peluqueria: {
    id: "peluqueria",
    label: "Peluquería / Barbería",
    emoji: "💈",
    hint: "Cortes, barba, tinturas",
    itemSingular: "servicio",
    itemPlural: "servicios",
    navLabel: "Servicios",
    hasInventory: false,
    kpiMode: "services",
    navIcon: "scissors",
    categories: ["Corte", "Barba", "Tintura", "Lavado", "Peinado", "Tratamientos", "Productos", "Otros"],
    categoryPlaceholder: "Ej. Corte, Barba…",
    demoItems: [
      D("Corte de pelo", "Corte", 8000, 500),
      D("Corte + barba", "Barba", 12000, 800),
      D("Perfilado de barba", "Barba", 5000, 300),
      D("Tintura completa", "Tintura", 25000, 6000),
      D("Lavado y peinado", "Lavado", 6000, 700),
    ],
  },
  restaurante: {
    id: "restaurante",
    label: "Restaurante / Comida",
    emoji: "🍔",
    hint: "Restaurante, cafetería, comida rápida",
    itemSingular: "producto",
    itemPlural: "productos",
    navLabel: "Carta",
    hasInventory: false,
    kpiMode: "food",
    navIcon: "utensils",
    categories: ["Entradas", "Platos de fondo", "Sándwiches", "Completos", "Pizzas", "Bebidas", "Postres", "Promociones", "Otros"],
    categoryPlaceholder: "Ej. Sándwiches, Bebidas…",
    demoItems: [
      D("Completo italiano", "Completos", 2500, 900),
      D("Churrasco palta", "Sándwiches", 5990, 2400),
      D("Pizza familiar", "Pizzas", 11990, 4200),
      D("Menú del día", "Platos de fondo", 6500, 2600),
      D("Bebida lata", "Bebidas", 1300, 600),
      D("Kuchen de manzana", "Postres", 2900, 900),
    ],
  },
  ferreteria: {
    id: "ferreteria",
    label: "Ferretería",
    emoji: "🔧",
    hint: "Herramientas, construcción, gasfitería",
    itemSingular: "producto",
    itemPlural: "productos",
    navLabel: "Productos",
    hasInventory: true,
    kpiMode: "retail",
    categories: ["Herramientas", "Construcción", "Electricidad", "Gasfitería", "Pinturas", "Fijaciones", "Jardín", "Otros"],
    categoryPlaceholder: "Ej. Herramientas, Pinturas…",
    demoItems: [
      D("Martillo carpintero", "Herramientas", 7990, 4200, 6, 3),
      D("Cemento 25kg", "Construcción", 5490, 4100, 30, 10),
      D("Tornillos 100u", "Fijaciones", 2490, 1100, 40, 15),
      D("Pintura látex 1gl", "Pinturas", 14990, 9200, 4, 5),
      D("Ampolleta LED 9W", "Electricidad", 1990, 900, 25, 10),
      D("Llave de paso 1/2", "Gasfitería", 4990, 2600, 8, 4),
    ],
  },
  servicios: {
    id: "servicios",
    label: "Servicios",
    emoji: "💻",
    hint: "Técnico, profesional, reparaciones",
    itemSingular: "servicio",
    itemPlural: "servicios",
    navLabel: "Servicios",
    hasInventory: false,
    kpiMode: "services",
    navIcon: "briefcase",
    categories: ["Servicios", "Reparaciones", "Mantenciones", "Asesorías", "Instalaciones", "Repuestos", "Otros"],
    categoryPlaceholder: "Ej. Reparaciones, Asesorías…",
    demoItems: [
      D("Visita técnica", "Servicios", 15000, 3000),
      D("Mantención equipo", "Mantenciones", 25000, 6000),
      D("Instalación", "Instalaciones", 35000, 9000),
      D("Asesoría 1 hora", "Asesorías", 20000, 0),
      D("Reparación menor", "Reparaciones", 18000, 4000),
    ],
  },
  // ---------- Rubros adicionales ----------
  panaderia: retail(
    "panaderia",
    "Panadería / Pastelería",
    "🥐",
    "Pan, tortas, empanadas",
    ["Pan", "Tortas", "Pasteles", "Empanadas", "Galletas", "Bebidas", "Otros"],
    [
      D("Marraqueta (kg)", "Pan", 2400, 1200),
      D("Hallulla (kg)", "Pan", 2400, 1150),
      D("Empanada de pino", "Empanadas", 2500, 1100),
      D("Torta mil hojas", "Tortas", 18990, 8500),
      D("Kuchen de nuez", "Pasteles", 2900, 1000),
      D("Bebida 1.5L", "Bebidas", 1900, 1150, 24, 8),
    ],
    false
  ),
  verduleria: retail(
    "verduleria",
    "Verdulería / Frutería",
    "🥕",
    "Frutas, verduras, huevos",
    ["Frutas", "Verduras", "Hierbas", "Huevos", "Frutos secos", "Otros"],
    [
      D("Tomate (kg)", "Verduras", 1490, 850, 30, 10),
      D("Palta Hass (kg)", "Frutas", 4990, 3200, 12, 5),
      D("Papas malla 2kg", "Verduras", 2490, 1500, 20, 8),
      D("Plátano (kg)", "Frutas", 1290, 750, 25, 10),
      D("Lechuga", "Verduras", 990, 450, 4, 8),
      D("Huevos bandeja 30", "Huevos", 6490, 4800, 10, 4),
    ]
  ),
  carniceria: retail(
    "carniceria",
    "Carnicería",
    "🥩",
    "Vacuno, cerdo, pollo, embutidos",
    ["Vacuno", "Cerdo", "Pollo", "Embutidos", "Cordero", "Otros"],
    [
      D("Carne molida (kg)", "Vacuno", 8990, 6200, 15, 5),
      D("Lomo vetado (kg)", "Vacuno", 15990, 11500, 6, 3),
      D("Pollo entero (kg)", "Pollo", 3490, 2400, 20, 8),
      D("Chuleta de cerdo (kg)", "Cerdo", 5990, 4100, 10, 5),
      D("Longaniza (kg)", "Embutidos", 6490, 4300, 3, 4),
    ]
  ),
  cafeteria: {
    id: "cafeteria",
    label: "Cafetería",
    emoji: "☕",
    hint: "Café, pastelería, desayunos",
    itemSingular: "producto",
    itemPlural: "productos",
    navLabel: "Carta",
    hasInventory: false,
    kpiMode: "food",
    categories: ["Cafés", "Tés", "Bebidas", "Sándwiches", "Pasteles", "Desayunos", "Promociones", "Otros"],
    categoryPlaceholder: "Ej. Cafés, Pasteles…",
    demoItems: [
      D("Café americano", "Cafés", 2200, 450),
      D("Cappuccino", "Cafés", 2900, 700),
      D("Té de hierbas", "Tés", 1500, 250),
      D("Sándwich ave palta", "Sándwiches", 4500, 1900),
      D("Pie de limón", "Pasteles", 2900, 900),
      D("Jugo natural", "Bebidas", 2800, 900),
    ],
    navIcon: "utensils",
  },
  estetica: service(
    "estetica",
    "Estética y belleza",
    "💅",
    "Uñas, cejas, pestañas, depilación",
    ["Manicure", "Pedicure", "Cejas y pestañas", "Depilación", "Faciales", "Masajes", "Productos", "Otros"],
    [
      D("Manicure", "Manicure", 10000, 1500),
      D("Uñas acrílicas", "Manicure", 18000, 4000),
      D("Pedicure", "Pedicure", 13000, 2000),
      D("Perfilado de cejas", "Cejas y pestañas", 6000, 500),
      D("Lifting de pestañas", "Cejas y pestañas", 15000, 3000),
    ],
    "scissors"
  ),
  mascotas: retail(
    "mascotas",
    "Tienda de mascotas",
    "🐾",
    "Alimento, accesorios, higiene",
    ["Alimento perro", "Alimento gato", "Accesorios", "Higiene", "Juguetes", "Medicamentos", "Otros"],
    [
      D("Alimento perro adulto 15kg", "Alimento perro", 32990, 24000, 6, 2),
      D("Alimento gato 3kg", "Alimento gato", 12990, 9000, 8, 3),
      D("Arena sanitaria 10kg", "Higiene", 7990, 4800, 10, 4),
      D("Collar ajustable", "Accesorios", 4990, 2000, 15, 5),
      D("Pipeta antipulgas", "Medicamentos", 6990, 4000, 3, 5),
    ]
  ),
  libreria: retail(
    "libreria",
    "Librería / Papelería",
    "📚",
    "Útiles, oficina, fotocopias",
    ["Útiles escolares", "Cuadernos", "Oficina", "Arte", "Fotocopias", "Regalos", "Otros"],
    [
      D("Cuaderno universitario", "Cuadernos", 2490, 1300, 40, 15),
      D("Lápiz pasta azul", "Útiles escolares", 400, 150, 100, 30),
      D("Resma tamaño carta", "Oficina", 5990, 4200, 10, 4),
      D("Pegamento en barra", "Útiles escolares", 1290, 600, 25, 10),
      D("Fotocopia", "Fotocopias", 50, 15),
      D("Carpeta con acoclip", "Oficina", 1990, 900, 3, 8),
    ]
  ),
  tecnologia: retail(
    "tecnologia",
    "Tecnología / Celulares",
    "📱",
    "Accesorios, audio, servicio técnico",
    ["Celulares", "Accesorios", "Audio", "Computación", "Cables y cargadores", "Servicio técnico", "Otros"],
    [
      D("Cargador USB-C 20W", "Cables y cargadores", 7990, 3500, 12, 5),
      D("Cable USB-C 1m", "Cables y cargadores", 3990, 1200, 25, 10),
      D("Audífonos bluetooth", "Audio", 14990, 7500, 6, 3),
      D("Lámina de vidrio", "Accesorios", 4990, 900, 30, 10),
      D("Carcasa celular", "Accesorios", 6990, 2000, 2, 5),
      D("Cambio de pantalla", "Servicio técnico", 25000, 12000),
    ]
  ),
  cosmetica: retail(
    "cosmetica",
    "Perfumería / Cosmética",
    "🧴",
    "Perfumes, maquillaje, cuidado personal",
    ["Perfumes", "Maquillaje", "Cuidado de la piel", "Cabello", "Higiene", "Otros"],
    [
      D("Perfume 100ml", "Perfumes", 24990, 13000, 5, 2),
      D("Base de maquillaje", "Maquillaje", 12990, 6800, 8, 3),
      D("Labial mate", "Maquillaje", 6990, 3000, 15, 5),
      D("Crema facial", "Cuidado de la piel", 9990, 5200, 6, 3),
      D("Shampoo 400ml", "Cabello", 4990, 2600, 3, 5),
    ]
  ),
  floreria: retail(
    "floreria",
    "Florería / Vivero",
    "🌷",
    "Flores, arreglos, plantas",
    ["Flores", "Arreglos", "Plantas", "Maceteros", "Tierra y abono", "Otros"],
    [
      D("Rosa (unidad)", "Flores", 1500, 600, 60, 24),
      D("Ramo mixto", "Arreglos", 14990, 6000),
      D("Arreglo floral", "Arreglos", 24990, 10000),
      D("Planta de interior", "Plantas", 7990, 3500, 10, 4),
      D("Macetero mediano", "Maceteros", 4990, 2200, 3, 4),
    ]
  ),
  bazar: retail(
    "bazar",
    "Bazar / Regalos",
    "🎁",
    "Juguetes, regalos, cotillón",
    ["Juguetes", "Regalos", "Cotillón", "Decoración", "Hogar", "Otros"],
    [
      D("Juguete didáctico", "Juguetes", 9990, 5000, 6, 3),
      D("Set de cotillón", "Cotillón", 4990, 2000, 10, 4),
      D("Taza decorada", "Regalos", 5990, 2500, 12, 4),
      D("Globo metalizado", "Cotillón", 1990, 600, 30, 10),
      D("Peluche", "Juguetes", 12990, 6500, 2, 3),
    ]
  ),
  hogar: retail(
    "hogar",
    "Hogar y muebles",
    "🛋️",
    "Muebles, cocina, decoración",
    ["Muebles", "Colchones", "Decoración", "Cocina", "Baño", "Otros"],
    [
      D("Silla de comedor", "Muebles", 24990, 14000, 6, 2),
      D("Juego de sábanas 2 plazas", "Decoración", 19990, 10000, 8, 3),
      D("Set de ollas", "Cocina", 39990, 24000, 3, 2),
      D("Lámpara de velador", "Decoración", 14990, 7000, 5, 2),
      D("Cortina de baño", "Baño", 7990, 3500, 1, 3),
    ]
  ),
  taller: service(
    "taller",
    "Taller mecánico",
    "🔩",
    "Mantención, reparación, lavado",
    ["Mantención", "Reparación", "Diagnóstico", "Lavado", "Repuestos", "Neumáticos", "Otros"],
    [
      D("Cambio de aceite", "Mantención", 25000, 14000),
      D("Alineación y balanceo", "Mantención", 15000, 2000),
      D("Cambio de pastillas", "Reparación", 35000, 18000),
      D("Diagnóstico computarizado", "Diagnóstico", 15000, 0),
      D("Lavado completo", "Lavado", 12000, 2500),
    ],
    "wrench"
  ),
  repuestos: retail(
    "repuestos",
    "Repuestos automotrices",
    "🚗",
    "Repuestos, aceites, accesorios",
    ["Motor", "Frenos", "Suspensión", "Eléctrico", "Filtros", "Aceites", "Neumáticos", "Accesorios", "Otros"],
    [
      D("Filtro de aceite", "Filtros", 5990, 3000, 15, 5),
      D("Pastillas de freno", "Frenos", 19990, 11000, 6, 3),
      D("Aceite 5W-30 4L", "Aceites", 29990, 20000, 8, 3),
      D("Batería 60Ah", "Eléctrico", 69990, 48000, 2, 2),
      D("Ampolleta H4", "Eléctrico", 3990, 1600, 20, 8),
    ]
  ),
  bicicleteria: retail(
    "bicicleteria",
    "Bicicletería",
    "🚲",
    "Bicicletas, repuestos, mantención",
    ["Bicicletas", "Repuestos", "Accesorios", "Servicio técnico", "Otros"],
    [
      D("Cámara aro 29", "Repuestos", 5990, 2800, 15, 5),
      D("Neumático aro 29", "Repuestos", 16990, 9000, 6, 3),
      D("Mantención completa", "Servicio técnico", 25000, 3000),
      D("Luz LED recargable", "Accesorios", 7990, 3500, 10, 4),
      D("Casco", "Accesorios", 24990, 14000, 2, 3),
    ]
  ),
  otro: {
    id: "otro",
    label: "Otro",
    emoji: "📦",
    hint: "Cuéntanos qué haces",
    itemSingular: "producto",
    itemPlural: "productos",
    navLabel: "Productos",
    hasInventory: true,
    kpiMode: "retail",
    categories: ["General", "Otros"],
    categoryPlaceholder: "Ej. la familia del producto",
    demoItems: [
      D("Producto A", "General", 5000, 2500, 20, 5),
      D("Producto B", "General", 12000, 7000, 8, 3),
      D("Producto C", "General", 2500, 1200, 3, 5),
      D("Producto D", "Otros", 8000, 4500, 15, 5),
    ],
  },
};

/** Rubros principales, en el orden en que se muestran al elegir ("otro" al final). */
export const PROFILE_ORDER: ProfileId[] = [
  "almacen",
  "botilleria",
  "ropa",
  "peluqueria",
  "restaurante",
  "ferreteria",
  "servicios",
  "otro",
];

/** Rubros adicionales, detrás de "Más rubros". */
export const EXTRA_PROFILE_ORDER: ProfileId[] = [
  "panaderia",
  "verduleria",
  "carniceria",
  "cafeteria",
  "estetica",
  "mascotas",
  "libreria",
  "tecnologia",
  "cosmetica",
  "floreria",
  "bazar",
  "hogar",
  "taller",
  "repuestos",
  "bicicleteria",
];

// Valores que usaba la app antes de los perfiles.
const LEGACY: Record<string, ProfileId> = {
  minimarket: "almacen",
  almacén: "almacen",
  almacen: "almacen",
  tienda: "otro",
  restaurante: "restaurante",
  cafetería: "cafeteria",
  ropa: "ropa",
  servicios: "servicios",
  "emprendimiento online": "otro",
  otro: "otro",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// ---------- "Otro": armar una configuración a partir de lo que escribió ----------
//
// Es un emparejamiento por palabras clave (sin IA): rápido, gratis y
// predecible. Si nada calza, queda el perfil genérico.

interface Niche {
  /** Inicio de palabra a buscar (sin tildes). Puede tener varias palabras. */
  keywords: string[];
  profile: ProfileId;
}

// Reglas: cada palabra clave debe aparecer al INICIO de una palabra
// ("autos" no calza con "promotor", "flor" no calza con "coliflor"). Gana el
// rubro con más letras coincidentes, así "comida para perros" (mascotas) le
// gana a "comida" (restaurante) y "estetica automotriz" (taller) a "estetica".
// Se evitan palabras ambiguas sueltas ("unas", "spa", "feria", "taller", "delivery").
const NICHES: Niche[] = [
  { profile: "repuestos", keywords: ["repuesto", "automotr", "neumatic", "autopart", "accesorios para auto"] },
  { profile: "taller", keywords: ["taller mecanico", "taller automotriz", "mecanica automotriz", "mecanico", "vulcaniz", "desabolladur", "lubricentro", "lavado de autos", "lavado de vehiculos", "estetica automotriz", "car wash"] },
  { profile: "bicicleteria", keywords: ["bicicleta", "bicicleteri", "bicicl"] },
  { profile: "estetica", keywords: ["manicur", "pedicur", "unas acrilic", "unas de gel", "esmaltado", "nail", "estetica", "salon de belleza", "cejas", "pestan", "depilac", "masaje", "masoterap", "lifting", "cosmetolog"] },
  { profile: "panaderia", keywords: ["panaderi", "pasteler", "reposter", "tortas", "pan amasado", "amasanderi", "empanad"] },
  { profile: "verduleria", keywords: ["verduler", "fruteri", "frutas", "verduras", "hortaliz"] },
  { profile: "carniceria", keywords: ["carniceri", "carnes", "polleri", "embutido", "cecina"] },
  { profile: "mascotas", keywords: ["mascota", "veterinar", "petshop", "pet shop", "comida para perro", "comida para gato", "alimento para perro", "alimento para gato", "alimento para mascota", "perros", "gatos"] },
  { profile: "libreria", keywords: ["libreri", "papeleri", "utiles escolares", "material escolar", "fotocopia", "imprenta"] },
  { profile: "tecnologia", keywords: ["celular", "tecnolog", "computador", "computacion", "notebook", "electronic", "gamer"] },
  { profile: "cosmetica", keywords: ["farmaci", "perfumeri", "perfume", "cosmetic", "maquillaj"] },
  { profile: "floreria", keywords: ["floreri", "flores", "arreglos florales", "vivero", "plantas ornamentales"] },
  { profile: "bazar", keywords: ["juguet", "regalos", "cotillon", "bazar"] },
  { profile: "hogar", keywords: ["mueble", "colchon", "articulos para el hogar", "menaje", "decoracion del hogar"] },
  { profile: "cafeteria", keywords: ["cafeteri", "cafe", "cafes de especialidad", "coffee"] },
  { profile: "restaurante", keywords: ["sushi", "pizza", "comida", "fast food", "sangucher", "sandwich", "completos", "colaciones", "almuerzos", "restaurant", "picada", "food truck", "foodtruck", "fuente de soda"] },
  { profile: "almacen", keywords: ["kiosco", "kiosko", "minimarket", "almacen", "abarrote", "supermercado", "negocio de barrio"] },
  { profile: "botilleria", keywords: ["botiller", "vinos", "cervezas", "licores", "licoreri", "cervecer"] },
  { profile: "ropa", keywords: ["ropa", "zapat", "calzado", "vestuario", "boutique", "lenceri", "poleras"] },
  { profile: "peluqueria", keywords: ["peluquer", "barber", "corte de pelo"] },
  { profile: "ferreteria", keywords: ["ferreter", "materiales de construccion", "construccion", "herramientas"] },
  { profile: "servicios", keywords: ["clases", "profesor", "asesor", "consultor", "diseno", "fotograf", "contador", "contabilidad", "abogad", "gasfiter", "electricist", "servicio de limpieza", "fletes", "flete", "mudanza", "reparacion", "reparaciones", "instalacion", "costura", "arreglos de ropa", "eventos", "cibercafe", "cyber", "cafe internet", "servicio", "tecnico"] },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NICHE_PATTERNS = NICHES.map((niche) => ({
  niche,
  patterns: niche.keywords.map((k) => ({ k, re: new RegExp(`(?:^|[^a-z0-9])${escapeRegex(normalize(k))}`) })),
}));

/** Busca el rubro que mejor calza con lo que escribió el usuario (null si ninguno). */
export function matchDescription(description: string | null | undefined): BusinessProfile | null {
  const text = normalize(description || "");
  if (text.length < 3) return null;
  let best: { niche: Niche; score: number } | null = null;
  for (const { niche, patterns } of NICHE_PATTERNS) {
    let score = 0;
    for (const { k, re } of patterns) {
      if (re.test(text)) score += k.length; // las coincidencias más largas pesan más
    }
    if (score > 0 && (!best || score > best.score)) best = { niche, score };
  }
  return best ? PROFILES[best.niche.profile] : null;
}

function fromDescription(description: string | null | undefined): BusinessProfile {
  const matched = matchDescription(description);
  if (!matched) return PROFILES.otro;
  // Se guarda como "otro" (con la descripción), pero se comporta como el rubro detectado.
  return { ...matched, id: "otro", hint: description || matched.hint };
}

/** Perfil a partir de lo guardado en el negocio (acepta valores antiguos). */
export function getProfile(
  business: { business_type?: string | null; business_description?: string | null } | null | undefined
): BusinessProfile {
  const raw = normalize(business?.business_type || "");
  const id: ProfileId = (PROFILES as Record<string, BusinessProfile>)[raw] ? (raw as ProfileId) : LEGACY[raw] || "otro";
  if (id === "otro") return fromDescription(business?.business_description);
  return PROFILES[id];
}

/** "Nuevo producto", "Nuevo servicio"… */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
