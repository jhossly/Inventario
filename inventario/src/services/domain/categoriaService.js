import * as localRepo from '../../repositories/local/categoriaRepo'
import * as remoteRepo from '../../repositories/remote/supabase/categoriaRepo'
import { toRemote, toLocal } from '../../mappers/categoriaMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createCategoria(data) {
  const categoria = {
    ...data,
    empresa_id: data.empresa_id || null,
    activa: data.activa ?? true,
  }

  const saved = await localRepo.create(categoria)
  return saved
}

export async function updateCategoria(id, data) {
  const updated = await localRepo.update(id, data)
  return updated
}

export async function deleteCategoria(id) {
  return await localRepo.remove(id)
}

export async function getCategorias() {
  const rows = await localRepo.findAll()
  return rows
}

export async function getCategoriaById(id) {
  return await localRepo.findById(id)
}

export async function syncToSupabase(categoria) {
  const remote = toRemote(categoria)
  if (!remote) {
    throw new Error(`Categoría "${categoria.nombre || categoria.id}" no se puede sincronizar`)
  }

  const existing = await remoteRepo.findById(categoria.id)
  if (existing) {
    return await remoteRepo.update(categoria.id, remote)
  }
  return await remoteRepo.create(remote)
}
