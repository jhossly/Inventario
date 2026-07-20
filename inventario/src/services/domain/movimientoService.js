import * as localRepo from '../../repositories/local/movimientoRepo'
import * as remoteRepo from '../../repositories/remote/supabase/movimientoRepo'
import { toRemote, toLocal } from '../../mappers/movimientoMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createMovimiento(data) {
  const movimiento = {
    ...data,
    tipo: data.tipo || 'salida',
    creado_en: Date.now(),
  }

  const saved = await localRepo.create(movimiento)
  return saved
}

export async function updateMovimiento(id, data) {
  const updated = await localRepo.update(id, data)
  return updated
}

export async function deleteMovimiento(id) {
  return await localRepo.remove(id)
}

export async function getMovimientos() {
  return await localRepo.findAll()
}

export async function getMovimientoById(id) {
  return await localRepo.findById(id)
}

export async function getMovimientosByProducto(productoId) {
  return await localRepo.findByProducto(productoId)
}

export async function syncToSupabase(movimiento) {
  const remote = toRemote(movimiento)
  if (!remote) {
    throw new Error(`Movimiento "${movimiento.id}" no se puede sincronizar`)
  }

  const existing = await remoteRepo.findById(movimiento.id)
  if (existing) {
    return await remoteRepo.update(movimiento.id, remote)
  }
  return await remoteRepo.create(remote)
}
