import * as localRepo from '../../repositories/local/contactoRepo'
import * as remoteRepo from '../../repositories/remote/supabase/contactoRepo'
import { toRemote, toLocal } from '../../mappers/contactoMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createContacto(data) {
  const contacto = {
    ...data,
    tipo: data.tipo || 'cliente',
    creado_en: Date.now(),
  }

  const saved = await localRepo.create(contacto)
  return saved
}

export async function updateContacto(id, data) {
  const changes = {
    ...data,
  }

  const updated = await localRepo.update(id, changes)
  return updated
}

export async function deleteContacto(id) {
  return await localRepo.remove(id)
}

export async function getContactos() {
  const rows = await localRepo.findAll()
  return rows
}

export async function getContactoById(id) {
  return await localRepo.findById(id)
}

export async function findContactoByDocumento(documento) {
  return await localRepo.findByDocumento(documento)
}

export async function findContactoByEmail(email) {
  return await localRepo.findByEmail(email)
}

export async function syncToSupabase(contacto) {
  const remote = toRemote(contacto)
  if (!remote) {
    throw new Error(`Contacto "${contacto.nombre || contacto.id}" no se puede sincronizar: falta nombre`)
  }

  const existing = await remoteRepo.findByDocumento(remote.documento)
  if (existing) {
    return await remoteRepo.update(existing.id, remote)
  }

  const existingEmail = remote.email ? await remoteRepo.findByEmail(remote.email) : null
  if (existingEmail) {
    return await remoteRepo.update(existingEmail.id, remote)
  }

  const existingId = await remoteRepo.findById(remote.id)
  if (existingId) {
    return await remoteRepo.update(remote.id, remote)
  }

  return await remoteRepo.create(remote)
}
