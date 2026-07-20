import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(unidad) {
  const db = await getDB()
  const id = unidad.id || crypto.randomUUID()
  const ahora = Date.now()

  await db.execute(
    `INSERT INTO unidades (id, nombre, simbolo, tipo_unidad, factor_conversion)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, unidad.nombre || '', unidad.simbolo || '', unidad.tipo_unidad || 'unidad', unidad.factor_conversion || 1]
  )

  await agregarSyncQueue('unidades', 'INSERT', id, unidad)
  return { id, ...unidad }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM unidades WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM unidades ORDER BY nombre')
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    nombre: 'nombre',
    simbolo: 'simbolo',
    tipo_unidad: 'tipo_unidad',
    factor_conversion: 'factor_conversion',
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
  await db.execute(`UPDATE unidades SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('unidades', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM unidades WHERE id = $1', [id])
  await agregarSyncQueue('unidades', 'DELETE', id, { id })
  return { id }
}

export async function upsertSinSync(unidad) {
  const db = await getDB()
  const id = unidad.id || crypto.randomUUID()

  await db.execute(
    `INSERT OR IGNORE INTO unidades (id, nombre, simbolo, tipo_unidad, factor_conversion)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, unidad.nombre || '', unidad.simbolo || '', unidad.tipo_unidad || 'unidad', unidad.factor_conversion || 1]
  )

  return id
}
