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
}

const D = (name: string, category: string, sale_price: number, cost: number, stock = 0, min_stock = 0): DemoItem => ({
  name: `${name} (DEMO)`,
  category,
  sale_price,
  cost,
  stock,
  min_stock,
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

/** Orden en que se muestran al elegir. */
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

// Valores que usaba la app antes de los perfiles.
const LEGACY: Record<string, ProfileId> = {
  minimarket: "almacen",
  almacén: "almacen",
  almacen: "almacen",
  tienda: "otro",
  restaurante: "restaurante",
  cafetería: "restaurante",
  cafeteria: "restaurante",
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
  label: string;
  emoji: string;
  base: ProfileId;
  categories: string[];
}

// Reglas: cada palabra clave debe aparecer al INICIO de una palabra
// ("autos" no calza con "promotor", "flor" no calza con "coliflor"). Gana el
// nicho con más letras coincidentes, así "comida para perros" (mascotas) le
// gana a "comida" (restaurante) y "estetica automotriz" (taller) a "estetica".
// Se evitan palabras ambiguas sueltas ("unas", "spa", "feria", "taller", "delivery").
const NICHES: Niche[] = [
  { keywords: ["repuesto", "automotr", "neumatic", "autopart", "accesorios para auto"], label: "Repuestos automotrices", emoji: "🚗", base: "ferreteria", categories: ["Motor", "Frenos", "Suspensión", "Eléctrico", "Filtros", "Aceites", "Neumáticos", "Accesorios", "Otros"] },
  { keywords: ["taller mecanico", "taller automotriz", "mecanica automotriz", "mecanico", "vulcaniz", "desabolladur", "lubricentro", "lavado de autos", "lavado de vehiculos", "estetica automotriz", "car wash"], label: "Taller mecánico", emoji: "🔩", base: "servicios", categories: ["Mantención", "Reparación", "Diagnóstico", "Lavado", "Repuestos", "Neumáticos", "Otros"] },
  { keywords: ["bicicleta", "bicicleteri", "bicicl"], label: "Bicicletería", emoji: "🚲", base: "ferreteria", categories: ["Bicicletas", "Repuestos", "Accesorios", "Servicio técnico", "Otros"] },
  { keywords: ["manicur", "pedicur", "unas acrilic", "unas de gel", "esmaltado", "nail", "estetica", "salon de belleza", "cejas", "pestan", "depilac", "masaje", "masoterap", "lifting", "cosmetolog"], label: "Estética y belleza", emoji: "💅", base: "peluqueria", categories: ["Manicure", "Pedicure", "Cejas y pestañas", "Depilación", "Faciales", "Masajes", "Productos", "Otros"] },
  { keywords: ["panaderi", "pasteler", "reposter", "tortas", "pan amasado", "amasanderi", "empanad"], label: "Panadería / Pastelería", emoji: "🥐", base: "almacen", categories: ["Pan", "Tortas", "Pasteles", "Empanadas", "Galletas", "Bebidas", "Otros"] },
  { keywords: ["verduler", "fruteri", "frutas", "verduras", "hortaliz"], label: "Verdulería / Frutería", emoji: "🥕", base: "almacen", categories: ["Frutas", "Verduras", "Hierbas", "Huevos", "Frutos secos", "Otros"] },
  { keywords: ["carniceri", "carnes", "polleri", "embutido", "cecina"], label: "Carnicería", emoji: "🥩", base: "almacen", categories: ["Vacuno", "Cerdo", "Pollo", "Embutidos", "Cordero", "Otros"] },
  { keywords: ["mascota", "veterinar", "petshop", "pet shop", "comida para perro", "comida para gato", "alimento para perro", "alimento para gato", "alimento para mascota", "perros", "gatos"], label: "Tienda de mascotas", emoji: "🐾", base: "almacen", categories: ["Alimento perro", "Alimento gato", "Accesorios", "Higiene", "Juguetes", "Medicamentos", "Otros"] },
  { keywords: ["libreri", "papeleri", "utiles escolares", "material escolar", "fotocopia", "imprenta"], label: "Librería / Papelería", emoji: "📚", base: "almacen", categories: ["Útiles escolares", "Cuadernos", "Oficina", "Arte", "Fotocopias", "Regalos", "Otros"] },
  { keywords: ["celular", "tecnolog", "computador", "computacion", "notebook", "electronic", "gamer"], label: "Tecnología", emoji: "📱", base: "ropa", categories: ["Celulares", "Accesorios", "Audio", "Computación", "Cables y cargadores", "Servicio técnico", "Otros"] },
  { keywords: ["farmaci", "perfumeri", "perfume", "cosmetic", "maquillaj"], label: "Perfumería / Cosmética", emoji: "🧴", base: "almacen", categories: ["Perfumes", "Maquillaje", "Cuidado de la piel", "Cabello", "Higiene", "Otros"] },
  { keywords: ["floreri", "flores", "arreglos florales", "vivero", "plantas ornamentales"], label: "Florería / Vivero", emoji: "🌷", base: "almacen", categories: ["Flores", "Arreglos", "Plantas", "Maceteros", "Tierra y abono", "Otros"] },
  { keywords: ["juguet", "regalos", "cotillon", "bazar"], label: "Bazar / Regalos", emoji: "🎁", base: "ropa", categories: ["Juguetes", "Regalos", "Cotillón", "Decoración", "Hogar", "Otros"] },
  { keywords: ["mueble", "colchon", "articulos para el hogar", "menaje", "decoracion del hogar"], label: "Hogar y muebles", emoji: "🛋️", base: "ferreteria", categories: ["Muebles", "Colchones", "Decoración", "Cocina", "Baño", "Otros"] },
  { keywords: ["cafeteri", "cafe", "sushi", "pizza", "comida", "fast food", "sangucher", "sandwich", "completos", "colaciones", "almuerzos", "restaurant", "picada", "food truck", "foodtruck", "fuente de soda"], label: "Comida", emoji: "🍽️", base: "restaurante", categories: PROFILES.restaurante.categories },
  { keywords: ["kiosco", "kiosko", "minimarket", "almacen", "abarrote", "supermercado", "negocio de barrio"], label: "Almacén / Minimarket", emoji: "🛒", base: "almacen", categories: PROFILES.almacen.categories },
  { keywords: ["botiller", "vinos", "cervezas", "licores", "licoreri", "cervecer"], label: "Botillería", emoji: "🍷", base: "botilleria", categories: PROFILES.botilleria.categories },
  { keywords: ["ropa", "zapat", "calzado", "vestuario", "boutique", "lenceri", "poleras"], label: "Tienda de ropa", emoji: "👕", base: "ropa", categories: PROFILES.ropa.categories },
  { keywords: ["peluquer", "barber", "corte de pelo"], label: "Peluquería / Barbería", emoji: "💈", base: "peluqueria", categories: PROFILES.peluqueria.categories },
  { keywords: ["ferreter", "materiales de construccion", "construccion", "herramientas"], label: "Ferretería", emoji: "🔧", base: "ferreteria", categories: PROFILES.ferreteria.categories },
  { keywords: ["clases", "profesor", "asesor", "consultor", "diseno", "fotograf", "contador", "contabilidad", "abogad", "gasfiter", "electricist", "servicio de limpieza", "fletes", "flete", "mudanza", "reparacion", "reparaciones", "instalacion", "costura", "arreglos de ropa", "eventos", "cibercafe", "cyber", "cafe internet", "servicio", "tecnico"], label: "Servicios", emoji: "💻", base: "servicios", categories: PROFILES.servicios.categories },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NICHE_PATTERNS = NICHES.map((niche) => ({
  niche,
  patterns: niche.keywords.map((k) => ({ k, re: new RegExp(`(?:^|[^a-z0-9])${escapeRegex(normalize(k))}`) })),
}));

/** Busca el rubro que mejor calza con lo que escribió el usuario. */
export function matchDescription(description: string | null | undefined): Niche | null {
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
  return best?.niche ?? null;
}

function fromDescription(description: string | null | undefined): BusinessProfile {
  const generic = PROFILES.otro;
  const niche = matchDescription(description);
  if (!niche) return generic;
  const base = PROFILES[niche.base];
  const isService = base.itemSingular === "servicio";
  return {
    ...base,
    id: "otro",
    label: niche.label,
    emoji: niche.emoji,
    hint: description || base.hint,
    categories: niche.categories,
    categoryPlaceholder: `Ej. ${niche.categories.slice(0, 2).join(", ")}…`,
    // Si el nicho reutiliza las categorías de un rubro principal, se usa su demo tal cual;
    // si es un nicho (p. ej. repuestos), una demo genérica con sus categorías,
    // para no mostrar "Coca-Cola" en una tienda de repuestos.
    demoItems:
      niche.categories === base.categories
        ? base.demoItems
        : generic.demoItems.map((d, i) => ({
            ...d,
            name: isService ? d.name.replace("Producto", "Servicio") : d.name,
            category: niche.categories[i % Math.max(1, niche.categories.length - 1)],
            stock: base.hasInventory ? d.stock : 0,
            min_stock: base.hasInventory ? d.min_stock : 0,
          })),
  };
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
