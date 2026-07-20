import * as localRepo from '../../repositories/local/empresaRepo'
import * as remoteRepo from '../../repositories/remote/supabase/empresaRepo'
import { toRemote, toLocal } from '../../mappers/empresaMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createEmpresa(data) {
  const empresa = {
    ...data,
    moneda: data.moneda || 'USD',
    tasa_impuesto: data.tasa_impuesto || 0,
  }

  const saved = await localRepo.create(empresa)
  return saved
}

export async function updateEmpresa(id, data) {
  const updated = await localRepo.update(id, data)
  return updated
}

export async function deleteEmpresa(id) {
  return await localRepo.remove(id)
}

export async function getEmpresas() {
  const rows = await localRepo.findAll()
  return rows
}

export async function getEmpresaById(id) {
  return await localRepo.findById(id)
}

export async function syncToSupabase(empresa) {
  const remote = toRemote(empresa)
  if (!remote) {
    throw new Error(`Empresa "${empresa.nombre || empresa.id}" no se puede sincronizar`)
  }

  const existing = await remoteRepo.findById(empresa.id)
  if (existing) {
    return await remoteRepo.update(empresa.id, remote)
  }
  return await remoteRepo.create(remote)
}
