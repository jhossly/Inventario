import * as localRepo from '../../repositories/local/pagoRepo'
import * as remoteRepo from '../../repositories/remote/supabase/pagoRepo'
import { toRemote, toLocal } from '../../mappers/pagoMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createPago(data) {
  const pago = {
    ...data,
    tipo: data.tipo || 'ingreso',
    creado_en: Date.now(),
  }

  const saved = await localRepo.create(pago)
  return saved
}

export async function updatePago(id, data) {
  const updated = await localRepo.update(id, data)
  return updated
}

export async function deletePago(id) {
  return await localRepo.remove(id)
}

export async function getPagos(tipo) {
  if (tipo) {
    return await localRepo.findByTipo(tipo)
  }
  return await localRepo.findAll()
}

export async function getPagoById(id) {
  return await localRepo.findById(id)
}

export async function syncToSupabase(pago) {
  const remote = toRemote(pago)
  if (!remote) {
    throw new Error(`Pago "${pago.descripcion || pago.id}" no se puede sincronizar`)
  }

  const existing = await remoteRepo.findById(pago.id)
  if (existing) {
    return await remoteRepo.update(pago.id, remote)
  }
  return await remoteRepo.create(remote)
}
