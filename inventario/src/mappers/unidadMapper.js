import { limpiarPayload } from '../services/dataService'

export function toRemote(localUnidad) {
  if (!localUnidad) return null
  const data = { ...localUnidad }

  const cleaned = limpiarPayload('unidades', data)

  return {
    id: cleaned.id || localUnidad.id,
    nombre: cleaned.nombre || localUnidad.nombre || '',
    simbolo: cleaned.simbolo || localUnidad.simbolo || '',
  }
}

export function toLocal(remoteUnidad) {
  if (!remoteUnidad) return null
  return {
    id: remoteUnidad.id,
    nombre: remoteUnidad.nombre || '',
    simbolo: remoteUnidad.simbolo || '',
    tipo_unidad: remoteUnidad.tipo_unidad || 'unidad',
    factor_conversion: remoteUnidad.factor_conversion || 1,
    sync_status: 'synced',
  }
}
