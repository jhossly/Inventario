import * as localRepo from '../../repositories/local/facturaRepo'
import * as remoteRepo from '../../repositories/remote/supabase/facturaRepo'
import { toRemote, toLocal } from '../../mappers/facturaMapper'
import { toRemote as facturaItemToRemote } from '../../mappers/facturaItemMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createFactura(data) {
  const factura = {
    ...data,
    subtotal: data.subtotal || 0,
    impuesto: data.impuesto || 0,
    total: data.total || 0,
    estado: data.estado || 'pendiente',
    tipo: data.tipo || 'factura',
  }

  const saved = await localRepo.create(factura)

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      const itemData = {
        ...item,
        factura_id: saved.id,
      }
      await localRepo.createItem(itemData)
    }
  }

  return saved
}

export async function createFacturaItem(data) {
  const item = {
    ...data,
  }
  const saved = await localRepo.createItem(item)
  return saved
}

export async function updateFactura(id, data) {
  const updated = await localRepo.update(id, data)
  return updated
}

export async function deleteFactura(id) {
  await localRepo.removeItemsByFactura(id)
  return await localRepo.remove(id)
}

export async function getFacturas() {
  const rows = await localRepo.findAll()
  return rows
}

export async function getFacturaById(id) {
  return await localRepo.findById(id)
}

export async function getFacturaItems(facturaId) {
  return await localRepo.findItemsByFactura(facturaId)
}

export async function syncToSupabase(factura) {
  const remote = toRemote(factura)
  if (!remote) {
    throw new Error(`Factura "${factura.numero_factura || factura.id}" no se puede sincronizar`)
  }

  const existing = await remoteRepo.findById(factura.id)
  if (existing) {
    return await remoteRepo.update(factura.id, remote)
  }
  return await remoteRepo.create(remote)
}

export async function syncItemToSupabase(item) {
  const remote = facturaItemToRemote(item)
  if (!remote) return null

  const existing = await remoteRepo.findItemsByFactura(item.factura_id)
  const found = existing.find(i => i.producto_id === item.producto_id && i.precio_unitario === item.precio_unitario)
  if (found) return found

  return await remoteRepo.createItem(remote)
}
