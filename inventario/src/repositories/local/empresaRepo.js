import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(empresa) {
  const db = await getDB()
  const id = empresa.id || crypto.randomUUID()
  const ahora = Date.now()

  await db.execute(
    `INSERT INTO empresa (id, nombre, ruc, direccion, telefono, email, logo_url, moneda, tasa_impuesto, serie_factura, serie_ticket, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      empresa.nombre || '',
      empresa.ruc || '',
      empresa.direccion || '',
      empresa.telefono || '',
      empresa.email || '',
      empresa.logo_url || '',
      empresa.moneda || 'USD',
      empresa.tasa_impuesto || 0,
      empresa.serie_factura || '',
      empresa.serie_ticket || '',
      ahora,
      ahora,
    ]
  )

  await agregarSyncQueue('empresa', 'INSERT', id, empresa)
  return { id, ...empresa }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM empresa WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM empresa ORDER BY nombre')
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    nombre: 'nombre',
    ruc: 'ruc',
    direccion: 'direccion',
    telefono: 'telefono',
    email: 'email',
    logo_url: 'logo_url',
    moneda: 'moneda',
    tasa_impuesto: 'tasa_impuesto',
    serie_factura: 'serie_factura',
    serie_ticket: 'serie_ticket',
  }

  for (const [key, col] of Object.entries(mapeo)) {
    if (changes[key] !== undefined) {
      campos.push(`${col} = $${idx}`)
      valores.push(changes[key])
      idx++
    }
  }

  if (campos.length === 0) return { id }

  const ahora = Date.now()
  valores.push(ahora)
  valores.push(id)

  await db.execute(`UPDATE empresa SET ${campos.join(', ')}, updated_at = $${idx} WHERE id = $${idx + 1}`, valores)
  await agregarSyncQueue('empresa', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM empresa WHERE id = $1', [id])
  await agregarSyncQueue('empresa', 'DELETE', id, { id })
  return { id }
}

export async function upsertSinSync(empresa) {
  const db = await getDB()
  const id = empresa.id || crypto.randomUUID()

  await db.execute(
    `INSERT OR IGNORE INTO empresa (id, nombre, ruc, direccion, telefono, email, logo_url, moneda, tasa_impuesto, serie_factura, serie_ticket, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      empresa.nombre || '',
      empresa.ruc || '',
      empresa.direccion || '',
      empresa.telefono || '',
      empresa.email || '',
      empresa.logo_url || '',
      empresa.moneda || 'USD',
      empresa.tasa_impuesto || 0,
      empresa.serie_factura || '',
      empresa.serie_ticket || '',
      Date.now(),
      Date.now(),
    ]
  )

  return id
}
