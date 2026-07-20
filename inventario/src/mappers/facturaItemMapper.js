import { limpiarPayload } from '../services/dataService'

export function toRemote(localItem) {
  if (!localItem) return null
  const data = { ...localItem }

  const cleaned = limpiarPayload('factura_items', data)

  return {
    id: cleaned.id || localItem.id,
    factura_id: cleaned.factura_id || localItem.factura_id,
    producto_id: cleaned.producto_id || localItem.producto_id,
    cantidad: cleaned.cantidad != null ? cleaned.cantidad : (localItem.cantidad || 0),
    precio_unitario: cleaned.precio_unitario != null ? cleaned.precio_unitario : (localItem.precio_unitario || 0),
    total: cleaned.total != null ? cleaned.total : (localItem.total || 0),
  }
}

export function toLocal(remoteItem) {
  if (!remoteItem) return null
  return {
    id: remoteItem.id,
    factura_id: remoteItem.factura_id,
    producto_id: remoteItem.producto_id,
    cantidad: remoteItem.cantidad || 0,
    precio_unitario: remoteItem.precio_unitario || 0,
    total: remoteItem.total || 0,
    sync_status: 'synced',
  }
}
