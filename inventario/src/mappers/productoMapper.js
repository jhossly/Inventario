import { limpiarPayload } from '../services/dataService'

export function toRemote(localProducto) {
  if (!localProducto) return null
  const data = { ...localProducto }

  const cleaned = limpiarPayload('productos', data)

  const producto = {
    id: cleaned.id || localProducto.id,
    empresa_id: cleaned.empresa_id || localProducto.empresa_id || null,
    proveedor_id: cleaned.proveedor_id || localProducto.proveedor_id || null,
    codigo: cleaned.codigo ? cleaned.codigo : (localProducto.codigo || null),
    nombre: cleaned.nombre || localProducto.nombre || '',
    descripcion: cleaned.descripcion || localProducto.descripcion || '',
    imagen_url: cleaned.imagen_url || localProducto.imagen_url || '',
    precio_venta: cleaned.precio_venta != null ? cleaned.precio_venta : (localProducto.precio_venta || 0),
    precio_costo: cleaned.precio_costo != null ? cleaned.precio_costo : (localProducto.precio_costo || 0),
    stock_actual: cleaned.stock_actual != null ? cleaned.stock_actual : (localProducto.stock_actual || 0),
    stock_minimo: cleaned.stock_minimo != null ? cleaned.stock_minimo : (localProducto.stock_minimo || 0),
    tiempo_entrega_dias: cleaned.tiempo_entrega_dias != null ? cleaned.tiempo_entrega_dias : (localProducto.tiempo_entrega_dias || 0),
    tiene_impuesto: cleaned.tiene_impuesto != null ? cleaned.tiene_impuesto : (localProducto.tiene_impuesto ? 1 : 0),
    tasa_impuesto_producto: cleaned.tasa_impuesto_producto != null ? cleaned.tasa_impuesto_producto : (localProducto.tasa_impuesto_producto || 0),
    activo: cleaned.activo != null ? cleaned.activo : (localProducto.activo ?? 1),
  }

  if (!producto.nombre) {
    return null
  }

  return producto
}

export function toLocal(remoteProducto) {
  if (!remoteProducto) return null
  return {
    id: remoteProducto.id,
    empresa_id: remoteProducto.empresa_id || null,
    proveedor_id: remoteProducto.proveedor_id || null,
    categoria_id: remoteProducto.categoria_id || null,
    unidad_id: remoteProducto.unidad_id || null,
    contacto_id: remoteProducto.contacto_id || null,
    codigo: remoteProducto.codigo || null,
    nombre: remoteProducto.nombre || '',
    descripcion: remoteProducto.descripcion || '',
    imagen_url: remoteProducto.imagen_url || '',
    precio_venta: remoteProducto.precio_venta || 0,
    precio_costo: remoteProducto.precio_costo || 0,
    stock_actual: remoteProducto.stock_actual || 0,
    stock_minimo: remoteProducto.stock_minimo || 0,
    tiempo_entrega_dias: remoteProducto.tiempo_entrega_dias || 0,
    tiene_impuesto: remoteProducto.tiene_impuesto ? 1 : 0,
    tasa_impuesto_producto: remoteProducto.tasa_impuesto_producto || 0,
    campos_extra: remoteProducto.campos_extra || {},
    // Respeta el estado de la nube. Un producto con activo = 0 (oculto /
    // "eliminado" lógicamente) se queda oculto localmente. Solo default a 1
    // si la nube no envía el campo.
    activo: remoteProducto.activo ?? 1,
    sync_status: 'synced',
  }
}
