import { limpiarPayload } from '../services/dataService'

export function toRemote(localMovimiento) {
  if (!localMovimiento) return null
  const data = { ...localMovimiento }

  const cleaned = limpiarPayload('movimientos', data)

  return {
    id: cleaned.id || localMovimiento.id,
    producto_id: cleaned.producto_id || localMovimiento.producto_id,
    tipo: cleaned.tipo || localMovimiento.tipo || 'salida',
    cantidad: cleaned.cantidad != null ? cleaned.cantidad : (localMovimiento.cantidad || 0),
    precio_unitario: cleaned.precio_unitario != null ? cleaned.precio_unitario : (localMovimiento.precio_unitario || 0),
    total: cleaned.total != null ? cleaned.total : (localMovimiento.total || 0),
    fecha_movimiento: cleaned.fecha_movimiento || localMovimiento.fecha_movimiento || null,
    usuario_id: cleaned.usuario_id || localMovimiento.usuario_id || null,
    referencia: cleaned.referencia || localMovimiento.referencia || '',
  }
}

export function toLocal(remoteMovimiento) {
  if (!remoteMovimiento) return null
  return {
    id: remoteMovimiento.id,
    producto_id: remoteMovimiento.producto_id,
    tipo: remoteMovimiento.tipo || 'salida',
    cantidad: remoteMovimiento.cantidad || 0,
    precio_unitario: remoteMovimiento.precio_unitario || 0,
    total: remoteMovimiento.total || 0,
    fecha_movimiento: remoteMovimiento.fecha_movimiento || null,
    usuario_id: remoteMovimiento.usuario_id || null,
    creado_en: Date.now(),
    sync_status: 'synced',
  }
}
