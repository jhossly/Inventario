import { limpiarPayload } from '../services/dataService'

export function toRemote(localEmpresa) {
  if (!localEmpresa) return null
  const data = { ...localEmpresa }

  const cleaned = limpiarPayload('empresa', data)

  return {
    id: cleaned.id || localEmpresa.id,
    nombre: cleaned.nombre || localEmpresa.nombre || '',
    ruc: cleaned.ruc || localEmpresa.ruc || '',
    direccion: cleaned.direccion || localEmpresa.direccion || '',
    telefono: cleaned.telefono || localEmpresa.telefono || '',
    email: cleaned.email || localEmpresa.email || '',
    logo_url: cleaned.logo_url || localEmpresa.logo_url || '',
    moneda: cleaned.moneda || localEmpresa.moneda || 'USD',
    tasa_impuesto: cleaned.tasa_impuesto != null ? cleaned.tasa_impuesto : (localEmpresa.tasa_impuesto || 0),
    serie_factura: cleaned.serie_factura || localEmpresa.serie_factura || '',
    serie_ticket: cleaned.serie_ticket || localEmpresa.serie_ticket || '',
  }
}

export function toLocal(remoteEmpresa) {
  if (!remoteEmpresa) return null
  return {
    id: remoteEmpresa.id,
    nombre: remoteEmpresa.nombre || '',
    ruc: remoteEmpresa.ruc || '',
    direccion: remoteEmpresa.direccion || '',
    telefono: remoteEmpresa.telefono || '',
    email: remoteEmpresa.email || '',
    logo_url: remoteEmpresa.logo_url || '',
    moneda: remoteEmpresa.moneda || 'USD',
    tasa_impuesto: remoteEmpresa.tasa_impuesto || 0,
    serie_factura: remoteEmpresa.serie_factura || '',
    serie_ticket: remoteEmpresa.serie_ticket || '',
    created_at: Date.now(),
    updated_at: Date.now(),
    sync_status: 'synced',
  }
}
