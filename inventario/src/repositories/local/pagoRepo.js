import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(pago) {
  const db = await getDB()
  const id = pago.id || crypto.randomUUID()
  const ahora = Date.now()

  await db.execute(
    `INSERT INTO pagos (id, tipo, monto, descripcion, fecha, usuario_id, contacto_id, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      pago.tipo || 'ingreso',
      pago.monto || 0,
      pago.descripcion || '',
      pago.fecha || new Date().toISOString().split('T')[0],
      pago.usuario_id || null,
      pago.contacto_id || null,
      ahora,
    ]
  )

  await agregarSyncQueue('pagos', 'INSERT', id, pago)
  return { id, ...pago }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM pagos WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM pagos ORDER BY fecha DESC')
}

export async function findByTipo(tipo) {
  const db = await getDB()
  return await db.select('SELECT * FROM pagos WHERE tipo = $1 ORDER BY fecha DESC', [tipo])
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    tipo: 'tipo',
    monto: 'monto',
    descripcion: 'descripcion',
    fecha: 'fecha',
    usuario_id: 'usuario_id',
    contacto_id: 'contacto_id',
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
  await db.execute(`UPDATE pagos SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('pagos', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM pagos WHERE id = $1', [id])
  await agregarSyncQueue('pagos', 'DELETE', id, { id })
  return { id }
}
