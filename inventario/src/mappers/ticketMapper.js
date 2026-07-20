import { limpiarPayload } from '../services/dataService'

export function toRemote(localTicket) {
  if (!localTicket) return null
  const data = { ...localTicket }

  if (data.productos && typeof data.productos === 'string') {
    data.productos = JSON.parse(data.productos)
  }

  const cleaned = limpiarPayload('tickets', data)

  const esUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

  return {
    id: cleaned.id || localTicket.id,
    numero_ticket: cleaned.numero_ticket || localTicket.numero_ticket,
    cajero_id: esUuid(cleaned.cajero_id) ? cleaned.cajero_id : null,
    metodo_pago: cleaned.metodo_pago || 'efectivo',
    subtotal: cleaned.subtotal || 0,
    impuesto: cleaned.impuesto || 0,
    total: cleaned.total || 0,
    fecha_venta: cleaned.fecha_venta || null,
    turno: cleaned.turno || null,
  }
}

export function toLocal(remoteTicket) {
  if (!remoteTicket) return null
  return {
    id: remoteTicket.id,
    numero_ticket: remoteTicket.numero_ticket || '',
    productos: Array.isArray(remoteTicket.productos) ? JSON.stringify(remoteTicket.productos) : (remoteTicket.productos || '[]'),
    metodo_pago: remoteTicket.metodo_pago || 'efectivo',
    cajero_id: remoteTicket.usuario_id || null,
    subtotal: remoteTicket.subtotal || 0,
    impuesto: remoteTicket.impuesto || 0,
    total: remoteTicket.total || 0,
    precios_con_iva: remoteTicket.precios_con_iva ? 1 : 0,
    tasa_impuesto: remoteTicket.tasa_impuesto || 0,
    sync_status: 'synced',
  }
}
