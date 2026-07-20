import { limpiarPayload } from '../services/dataService'

export function toRemote(localFacturaProv) {
  if (!localFacturaProv) return null
  const data = { ...localFacturaProv }

  const cleaned = limpiarPayload('facturas_proveedores', data)

  return {
    id: cleaned.id || localFacturaProv.id,
    proveedor_id: cleaned.proveedor_id || localFacturaProv.proveedor_id || null,
    numero_factura: cleaned.numero_factura || localFacturaProv.numero_factura || '',
    fecha: cleaned.fecha ? cleaned.fecha.slice(0, 10) : (localFacturaProv.fecha ? String(localFacturaProv.fecha).slice(0, 10) : null),
    total: cleaned.total != null ? cleaned.total : (localFacturaProv.total || 0),
    estado: cleaned.estado || localFacturaProv.estado || 'pendiente',
  }
}

export function toLocal(remoteFacturaProv) {
  if (!remoteFacturaProv) return null
  return {
    id: remoteFacturaProv.id,
    numero_factura: remoteFacturaProv.numero_factura || '',
    proveedor_id: remoteFacturaProv.proveedor_id || null,
    fecha: remoteFacturaProv.fecha || null,
    total: remoteFacturaProv.total || 0,
    estado: remoteFacturaProv.estado || 'pendiente',
    precios_con_iva: remoteFacturaProv.precios_con_iva ? 1 : 0,
    sync_status: 'synced',
  }
}
