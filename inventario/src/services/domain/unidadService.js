import * as localRepo from '../../repositories/local/unidadRepo'
import * as remoteRepo from '../../repositories/remote/supabase/unidadRepo'
import { toRemote, toLocal } from '../../mappers/unidadMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createUnidad(data) {
  const unidad = {
    ...data,
    tipo_unidad: data.tipo_unidad || 'unidad',
    factor_conversion: data.factor_conversion || 1,
  }

  const saved = await localRepo.create(unidad)
  return saved
}

export async function updateUnidad(id, data) {
  const updated = await localRepo.update(id, data)
  return updated
}

export async function deleteUnidad(id) {
  return await localRepo.remove(id)
}

export async function getUnidades() {
  const rows = await localRepo.findAll()
  return rows
}

export async function getUnidadById(id) {
  return await localRepo.findById(id)
}

export async function syncToSupabase(unidad) {
  const remote = toRemote(unidad)
  if (!remote) {
    throw new Error(`Unidad "${unidad.nombre || unidad.id}" no se puede sincronizar`)
  }

  const existing = await remoteRepo.findById(unidad.id)
  if (existing) {
    return await remoteRepo.update(unidad.id, remote)
  }
  return await remoteRepo.create(remote)
}
