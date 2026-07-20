import { limpiarPayload } from '../services/dataService'

export function toRemote(localContacto) {
  if (!localContacto) return null
  const data = { ...localContacto }

  const cleaned = limpiarPayload('contactos', data)

  return {
    id: cleaned.id || localContacto.id,
    empresa_id: cleaned.empresa_id || localContacto.empresa_id || null,
    tipo: cleaned.tipo || 'cliente',
    nombre: cleaned.nombre || localContacto.nombre || '',
    documento: cleaned.documento || localContacto.documento || '',
    email: cleaned.email || localContacto.email || '',
    telefono: cleaned.telefono || localContacto.telefono || '',
    direccion: cleaned.direccion || localContacto.direccion || '',
    notas: cleaned.notas || localContacto.notas || '',
  }
}

export function toLocal(remoteContacto) {
  if (!remoteContacto) return null
  return {
    id: remoteContacto.id,
    empresa_id: remoteContacto.empresa_id || null,
    tipo: remoteContacto.tipo || 'cliente',
    nombre: remoteContacto.nombre || '',
    documento: remoteContacto.documento || '',
    email: remoteContacto.email || '',
    telefono: remoteContacto.telefono || '',
    direccion: remoteContacto.direccion || '',
    creado_en: remoteContacto.creado_en || Date.now(),
    sync_status: 'synced',
  }
}
