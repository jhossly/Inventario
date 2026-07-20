import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(movimiento) {
  const db = await getDB()
  const id = movimiento.id || crypto.randomUUID()
  const ahora = Date.now()

  await db.execute(
    `INSERT INTO movimientos (id, producto_id, tipo, cantidad, precio_unitario, total, fecha_movimiento, usuario_id, referencia, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      movimiento.producto_id,
      movimiento.tipo || 'salida',
      movimiento.cantidad || 0,
      movimiento.precio_unitario || 0,
      movimiento.total || 0,
      movimiento.fecha_movimiento || new Date().toISOString(),
      movimiento.usuario_id || null,
      movimiento.referencia || '',
      ahora,
    ]
  )

  await agregarSyncQueue('movimientos', 'INSERT', id, movimiento)
  return { id, ...movimiento }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM movimientos WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM movimientos ORDER BY fecha_movimiento DESC')
}

export async function findByProducto(productoId) {
  const db = await getDB()
  return await db.select('SELECT * FROM movimientos WHERE producto_id = $1 ORDER BY fecha_movimiento DESC', [productoId])
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    producto_id: 'producto_id',
    tipo: 'tipo',
    cantidad: 'cantidad',
    precio_unitario: 'precio_unitario',
    total: 'total',
    fecha_movimiento: 'fecha_movimiento',
    usuario_id: 'usuario_id',
    referencia: 'referencia',
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
  await db.execute(`UPDATE movimientos SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('movimientos', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM movimientos WHERE id = $1', [id])
  await agregarSyncQueue('movimientos', 'DELETE', id, { id })
  return { id }
}
