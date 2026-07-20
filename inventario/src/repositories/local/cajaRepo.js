import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(caja) {
  const db = await getDB()
  const id = caja.id || crypto.randomUUID()

  await db.execute(
    `INSERT INTO caja (id, fecha_apertura, monto_apertura, responsable, estado, sync_status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [
      id,
      caja.fecha_apertura || new Date().toISOString(),
      caja.monto_apertura || 0,
      caja.responsable || null,
      caja.estado || 'abierta',
    ]
  )

  await agregarSyncQueue('caja', 'INSERT', id, caja)
  return { id, ...caja }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM caja WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findOpen() {
  const db = await getDB()
  const rows = await db.select(
    `SELECT * FROM caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1`
  )
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM caja ORDER BY fecha_apertura DESC')
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    estado: 'estado',
    fecha_cierre: 'fecha_cierre',
    monto_cierre: 'monto_cierre',
    saldo_esperado: 'saldo_esperado',
    responsable: 'responsable',
    notas: 'notas',
    diferencia: 'diferencia',
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
  await db.execute(`UPDATE caja SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('caja', 'UPDATE', id, changes)
  return { id }
}

export async function createMovimiento(movimiento) {
  const db = await getDB()
  const id = movimiento.id || crypto.randomUUID()

  await db.execute(
    `INSERT INTO caja_movimientos (id, caja_id, tipo, monto, descripcion, fecha, sync_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [
      id,
      movimiento.caja_id,
      movimiento.tipo,
      movimiento.monto || 0,
      movimiento.descripcion || '',
      movimiento.fecha || new Date().toISOString(),
    ]
  )

  await agregarSyncQueue('caja_movimientos', 'INSERT', id, movimiento)
  return { id, ...movimiento }
}

export async function findMovimientosByCaja(cajaId) {
  const db = await getDB()
  return await db.select(
    'SELECT * FROM caja_movimientos WHERE caja_id = $1 ORDER BY fecha ASC',
    [cajaId]
  )
}
