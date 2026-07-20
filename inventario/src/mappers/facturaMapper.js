import { limpiarPayload } from '../services/dataService'

export function toRemote(localFactura) {
  if (!localFactura) return null
  const data = { ...localFactura }

  const cleaned = limpiarPayload('facturas', data)

  return {
    id: cleaned.id || localFactura.id,
    empresa_id: cleaned.empresa_id || localFactura.empresa_id || null,
    contacto_id: cleaned.contacto_id || localFactura.contacto_id || null,
    numero_factura: cleaned.numero_factura || localFactura.numero_factura || '',
    tipo: cleaned.tipo || localFactura.tipo || 'factura',
    subtotal: cleaned.subtotal != null ? cleaned.subtotal : (localFactura.subtotal || 0),
    impuesto: cleaned.impuesto != null ? cleaned.impuesto : (localFactura.impuesto || 0),
    total: cleaned.total != null ? cleaned.total : (localFactura.total || 0),
    estado: cleaned.estado || localFactura.estado || 'pendiente',
    fecha_emision: cleaned.fecha_emision || localFactura.fecha_emision || null,
    fecha_vencimiento: cleaned.fecha_vencimiento || localFactura.fecha_vencimiento || null,
    notas: cleaned.notas || localFactura.notas || null,
    usuario_id: cleaned.usuario_id || localFactura.usuario_id || null,
  }
}

export function toLocal(remoteFactura) {
  if (!remoteFactura) return null
  return {
    id: remoteFactura.id,
    empresa_id: remoteFactura.empresa_id || null,
    contacto_id: remoteFactura.contacto_id || null,
    numero_factura: remoteFactura.numero_factura || '',
    tipo: remoteFactura.tipo || 'factura',
    subtotal: remoteFactura.subtotal || 0,
    impuesto: remoteFactura.impuesto || 0,
    total: remoteFactura.total || 0,
    estado: remoteFactura.estado || 'pendiente',
    fecha_emision: remoteFactura.fecha_emision || null,
    fecha_vencimiento: remoteFactura.fecha_vencimiento || null,
    notas: remoteFactura.notas || null,
    usuario_id: remoteFactura.usuario_id || null,
    sync_status: 'synced',
  }
}
