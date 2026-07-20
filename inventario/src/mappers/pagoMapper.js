import { limpiarPayload } from '../services/dataService'

export function toRemote(localPago) {
  if (!localPago) return null
  const data = { ...localPago }

  const cleaned = limpiarPayload('pagos', data)

  return {
    id: cleaned.id || localPago.id,
    tipo: cleaned.tipo || localPago.tipo || 'ingreso',
    monto: cleaned.monto != null ? cleaned.monto : (localPago.monto || 0),
    descripcion: cleaned.descripcion || localPago.descripcion || '',
    fecha: cleaned.fecha || localPago.fecha || null,
    usuario_id: cleaned.usuario_id || localPago.usuario_id || null,
  }
}

export function toLocal(remotePago) {
  if (!remotePago) return null
  return {
    id: remotePago.id,
    tipo: remotePago.tipo || 'ingreso',
    monto: remotePago.monto || 0,
    descripcion: remotePago.descripcion || '',
    fecha: remotePago.fecha || null,
    usuario_id: remotePago.usuario_id || null,
    contacto_id: remotePago.contacto_id || null,
    creado_en: Date.now(),
    sync_status: 'synced',
  }
}
