import {
  ShoppingBag,
  UtensilsCrossed,
  Wrench,
  Pill,
  Package
} from 'lucide-react'

// Definición de rubros de negocio.
// Cada rubro decide qué módulos se muestran y qué campos extra
// tiene un producto/servicio.

export const RUBROS = {
  retail: {
    id: 'retail',
    nombre: 'Tienda / Retail',
    icono: ShoppingBag,
    descripcion: 'Vende productos con stock: abarrotes, ropa, ferretería.',
    modulos: ['dashboard', 'pos', 'productos', 'inventario', 'ajuste', 'categorias', 'contactos', 'proveedores', 'compras', 'caja', 'reportes', 'kardex', 'configuracion'],
    campos_producto: [
      { key: 'marca', label: 'Marca', tipo: 'texto' },
      { key: 'ubicacion', label: 'Ubicación', tipo: 'texto' },
    ],
  },

  restaurante: {
    id: 'restaurante',
    nombre: 'Restaurante / Comida',
    icono: UtensilsCrossed,
    descripcion: 'Platos, ingredientes y mesas. Controla insumos y recetas.',
    modulos: ['dashboard', 'pos', 'productos', 'inventario', 'ajuste', 'categorias', 'contactos', 'proveedores', 'compras', 'caja', 'reportes', 'kardex', 'configuracion'],
    campos_producto: [
      { key: 'es_plato', label: '¿Es plato preparado?', tipo: 'booleano' },
      { key: 'tiempo_preparacion', label: 'Tiempo de preparación (min)', tipo: 'numero' },
      { key: 'receta', label: 'Ingredientes / receta', tipo: 'texto' },
    ],
  },

  servicios: {
    id: 'servicios',
    nombre: 'Servicios / Profesionales',
    icono: Wrench,
    descripcion: 'Citas, reparaciones y servicios sin stock físico.',
    modulos: ['dashboard', 'pos', 'productos', 'categorias', 'contactos', 'caja', 'reportes', 'configuracion'],
    campos_producto: [
      { key: 'duracion', label: 'Duración (min)', tipo: 'numero' },
      { key: 'requiere_cita', label: '¿Requiere cita?', tipo: 'booleano' },
    ],
  },

  salud: {
    id: 'salud',
    nombre: 'Farmacia / Salud',
    icono: Pill,
    descripcion: 'Productos con lote, caducidad y control de medicamentos.',
    modulos: ['dashboard', 'pos', 'productos', 'inventario', 'ajuste', 'categorias', 'contactos', 'proveedores', 'compras', 'caja', 'reportes', 'kardex', 'configuracion'],
    campos_producto: [
      { key: 'lote', label: 'Lote', tipo: 'texto' },
      { key: 'fecha_caducidad', label: 'Fecha de caducidad', tipo: 'fecha' },
      { key: 'requiere_receta', label: '¿Requiere receta?', tipo: 'booleano' },
    ],
  },

  otro: {
    id: 'otro',
    nombre: 'Otro tipo de negocio',
    icono: Package,
    descripcion: 'Configuración genérica para cualquier tipo de negocio.',
    modulos: ['dashboard', 'pos', 'productos', 'inventario', 'ajuste', 'categorias', 'contactos', 'proveedores', 'compras', 'caja', 'reportes', 'kardex', 'configuracion'],
    campos_producto: [
      { key: 'marca', label: 'Marca', tipo: 'texto' },
      { key: 'ubicacion', label: 'Ubicación', tipo: 'texto' },
    ],
  },
}

export function getRubro(id) {
  return RUBROS[id] || RUBROS.retail
}

export function moduloActivo(rubroId, modulo) {
  const rubro = getRubro(rubroId)
  return rubro.modulos.includes(modulo)
}

// Permisos por rol (control de UI, no seguridad).
// '*' = ve todos los módulos del rubro.
export const PERMISOS_ROL = {
  'dueño': '*',
  cajero: ['dashboard', 'pos', 'tickets', 'caja', 'contactos'],
  almacen: ['dashboard', 'productos', 'inventario', 'ajuste', 'categorias', 'proveedores', 'compras', 'kardex'],
}

// ¿El rol puede ver este módulo?
export function moduloPermitido(rol, modulo) {
  const permitidos = PERMISOS_ROL[rol]
  if (!permitidos || permitidos === '*') return true
  return permitidos.includes(modulo)
}

export function camposExtraDefecto(rubroId) {
  const rubro = getRubro(rubroId)
  const extra = {}

  for (const c of rubro.campos_producto) {
    extra[c.key] = ''
  }

  return extra
}