import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(contacto) {
  const db = await getDB()
  const id = contacto.id || crypto.randomUUID()
  const ahora = Date.now()

  await db.execute(
    `INSERT INTO contactos (id, tipo, nombre, documento, email, telefono, direccion, notas, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      contacto.tipo || 'cliente',
      contacto.nombre || '',
      contacto.documento || '',
      contacto.email || '',
      contacto.telefono || '',
      contacto.direccion || '',
      contacto.notas || '',
      ahora,
    ]
  )

  await agregarSyncQueue('contactos', 'INSERT', id, contacto)
  return { id, ...contacto }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM contactos WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM contactos ORDER BY nombre')
}

export async function findByDocumento(documento) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM contactos WHERE documento = $1 LIMIT 1', [documento])
  return rows && rows[0] ? rows[0] : null
}

export async function findByEmail(email) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM contactos WHERE email = $1 LIMIT 1', [email])
  return rows && rows[0] ? rows[0] : null
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    tipo: 'tipo',
    nombre: 'nombre',
    documento: 'documento',
    email: 'email',
    telefono: 'telefono',
    direccion: 'direccion',
    notas: 'notas',
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
  await db.execute(`UPDATE contactos SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('contactos', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM contactos WHERE id = $1', [id])
  await agregarSyncQueue('contactos', 'DELETE', id, { id })
  return { id }
}

export async function upsertSinSync(contacto) {
  const db = await getDB()
  const id = contacto.id || crypto.randomUUID()

  await db.execute(
    `INSERT OR IGNORE INTO contactos (id, tipo, nombre, documento, email, telefono, direccion, notas, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      contacto.tipo || 'cliente',
      contacto.nombre || '',
      contacto.documento || '',
      contacto.email || '',
      contacto.telefono || '',
      contacto.direccion || '',
      contacto.notas || '',
      Date.now(),
    ]
  )

  return id
}
