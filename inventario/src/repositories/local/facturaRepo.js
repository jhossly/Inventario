import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(factura) {
  const db = await getDB()
  const id = factura.id || crypto.randomUUID()

  await db.execute(
    `INSERT INTO facturas (id, contacto_id, numero_factura, tipo, subtotal, impuesto, total, estado, fecha_emision, fecha_vencimiento, sync_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
    [
      id,
      factura.contacto_id || null,
      factura.numero_factura || '',
      factura.tipo || 'factura',
      factura.subtotal || 0,
      factura.impuesto || 0,
      factura.total || 0,
      factura.estado || 'pendiente',
      factura.fecha_emision || null,
      factura.fecha_vencimiento || null,
    ]
  )

  await agregarSyncQueue('facturas', 'INSERT', id, factura)
  return { id, ...factura }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM facturas WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM facturas ORDER BY fecha_emision DESC')
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    contacto_id: 'contacto_id',
    numero_factura: 'numero_factura',
    tipo: 'tipo',
    subtotal: 'subtotal',
    impuesto: 'impuesto',
    total: 'total',
    estado: 'estado',
    fecha_emision: 'fecha_emision',
    fecha_vencimiento: 'fecha_vencimiento',
    notas: 'notas',
    usuario_id: 'usuario_id',
  }

  for (const [key, col] of Object.entries(mapeo)) {
    if (changes[key] !== undefined) {
      campos.push(`${col} = $${idx}`)
      valores.push(changes[key])
      idx++
    }
  }

  if (campos.length === 0) return { id }

  valores.push(id)
  await db.execute(`UPDATE facturas SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('facturas', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM facturas WHERE id = $1', [id])
  await agregarSyncQueue('facturas', 'DELETE', id, { id })
  return { id }
}

export async function createItem(item) {
  const db = await getDB()
  const id = item.id || crypto.randomUUID()

  await db.execute(
    `INSERT INTO factura_items (id, factura_id, producto_id, cantidad, precio_unitario, total)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      item.factura_id,
      item.producto_id,
      item.cantidad || 0,
      item.precio_unitario || 0,
      item.total || 0,
    ]
  )

  await agregarSyncQueue('factura_items', 'INSERT', id, item)
  return { id, ...item }
}

export async function findItemsByFactura(facturaId) {
  const db = await getDB()
  return await db.select('SELECT * FROM factura_items WHERE factura_id = $1', [facturaId])
}

export async function removeItemsByFactura(facturaId) {
  const db = await getDB()
  await db.execute('DELETE FROM factura_items WHERE factura_id = $1', [facturaId])
}
