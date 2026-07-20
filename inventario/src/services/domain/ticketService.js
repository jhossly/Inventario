import { getDB } from '../../db/database'
import { getTasaImpuesto as getTasaImpuestoLocal } from '../../db/database'
import * as localRepo from '../../repositories/local/ticketRepo'
import * as remoteRepo from '../../repositories/remote/supabase/ticketRepo'
import { toRemote, toLocal } from '../../mappers/ticketMapper'
import { agregarSyncQueue } from '../../db/database'

export async function createTicket(data) {
  const db = await getDB()
  const ahora = new Date().toISOString()

  const productos = data.productos || []
  const subtotal = data.subtotal != null
    ? data.subtotal
    : productos.reduce((s, p) => s + (p.precio || p.precio_venta || 0) * (p.cantidad || 1), 0)

  const tasa = data.tasa_impuesto != null ? data.tasa_impuesto : (await getTasaImpuestoLocal().catch(() => ({ tasa: 0 }))).tasa
  const preciosConIva = data.precios_con_iva || false
  const impuesto = preciosConIva ? subtotal - subtotal / (1 + tasa / 100) : subtotal * (tasa / 100)
  const total = preciosConIva ? subtotal : subtotal + impuesto

  const numeroTicket = await generarNumeroTicket(db)

  const localTicket = {
    numero_ticket: numeroTicket,
    productos: JSON.stringify(productos),
    metodo_pago: data.metodo_pago || 'efectivo',
    cajero_id: data.cajero_id || null,
    turno: data.turno || null,
    subtotal,
    impuesto,
    total,
    precios_con_iva: preciosConIva ? 1 : 0,
    tasa_impuesto: tasa,
    fecha_venta: ahora,
  }

  // Calcular costo total desde los productos enviados
  const costoTotal = productos.reduce((s, p) => s + ((p.precio_costo || 0) * (p.cantidad || 1)), 0)
  localTicket.costo_total = costoTotal
  localTicket.ganancia = subtotal - costoTotal

  const saved = await localRepo.create(localTicket)

  for (const p of productos) {
    try {
      await db.execute(
        `UPDATE productos SET stock_actual = MAX(0, stock_actual - $1), actualizado_en = $2 WHERE id = $3`,
        [p.cantidad || 1, Date.now(), p.producto_id]
      )
    } catch (e) {
      console.error('Error descontando stock:', e)
    }
  }

  return saved
}

export async function getTickets() {
  const rows = await localRepo.findAll()
  return rows
}

export async function getTicketById(id) {
  return await localRepo.findById(id)
}

export async function generarNumeroTicket(db) {
  let lastTicketNumber = 0
  try {
    const maxRow = await db.select("SELECT MAX(CAST(REPLACE(numero_ticket, 'T-', '') AS INTEGER)) as max FROM tickets WHERE numero_ticket LIKE 'T-%'")
    if (maxRow && maxRow[0] && maxRow[0].max) lastTicketNumber = maxRow[0].max
  } catch (_) {}
  return `T-${String(lastTicketNumber + 1).padStart(6, '0')}`
}

export async function syncToSupabase(ticket) {
  const remote = toRemote(ticket)
  if (!remote) return null

  const existing = await remoteRepo.findById(ticket.id)
  if (existing) {
    return await remoteRepo.update(ticket.id, remote)
  }
  return await remoteRepo.create(remote)
}
