import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(ticket) {
  const db = await getDB()
  const id = ticket.id || crypto.randomUUID()
  const ahora = Date.now()

  await db.execute(
    `INSERT INTO tickets (id, numero_ticket, productos, metodo_pago, cajero_id, turno, subtotal, impuesto, total, precios_con_iva, tasa_impuesto, fecha_venta, creado_en, sync_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      ticket.numero_ticket,
      JSON.stringify(ticket.productos || []),
      ticket.metodo_pago || 'efectivo',
      ticket.cajero_id || null,
      ticket.turno || null,
      ticket.subtotal || 0,
      ticket.impuesto || 0,
      ticket.total || 0,
      ticket.precios_con_iva ? 1 : 0,
      ticket.tasa_impuesto || 0,
      ticket.fecha_venta || new Date().toISOString(),
      ahora,
      'pending',
    ]
  )

  await agregarSyncQueue('tickets', 'INSERT', id, ticket)
  return { id, ...ticket }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM tickets WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM tickets ORDER BY creado_en DESC')
}

export async function update(id, changes) {
  const db = await getDB()
  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    numero_ticket: 'numero_ticket',
    productos: 'productos',
    metodo_pago: 'metodo_pago',
    cajero_id: 'cajero_id',
    turno: 'turno',
    subtotal: 'subtotal',
    impuesto: 'impuesto',
    total: 'total',
    fecha_venta: 'fecha_venta',
  }

  for (const [key, col] of Object.entries(mapeo)) {
    if (changes[key] !== undefined) {
      campos.push(`${col} = $${idx}`)
      valores.push(typeof changes[key] === 'object' ? JSON.stringify(changes[key]) : changes[key])
      idx++
    }
  }

  if (campos.length === 0) return { id }

  valores.push(id)
  await db.execute(`UPDATE tickets SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('tickets', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM tickets WHERE id = $1', [id])
  await agregarSyncQueue('tickets', 'DELETE', id, { id })
  return { id }
}
