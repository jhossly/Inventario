import { limpiarPayload } from '../services/dataService'

export function toRemote(localCategoria) {
  if (!localCategoria) return null
  const data = { ...localCategoria }

  const cleaned = limpiarPayload('categorias', data)

  return {
    id: cleaned.id || localCategoria.id,
    nombre: cleaned.nombre || localCategoria.nombre || '',
    descripcion: cleaned.descripcion || localCategoria.descripcion || '',
    color: cleaned.color || localCategoria.color || null,
    icono: cleaned.icono || localCategoria.icono || null,
    activa: cleaned.activa != null ? cleaned.activa : (localCategoria.activa ?? true),
    empresa_id: cleaned.empresa_id || localCategoria.empresa_id || null,
  }
}

export function toLocal(remoteCategoria) {
  if (!remoteCategoria) return null
  return {
    id: remoteCategoria.id,
    nombre: remoteCategoria.nombre || '',
    descripcion: remoteCategoria.descripcion || '',
    color: remoteCategoria.color || null,
    icono: remoteCategoria.icono || null,
    activa: remoteCategoria.activa ?? true,
    empresa_id: remoteCategoria.empresa_id || null,
    creado_en: Date.now(),
    sync_status: 'synced',
  }
}
