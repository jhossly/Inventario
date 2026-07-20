import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(categoria) {
  const db = await getDB()
  const id = categoria.id || crypto.randomUUID()
  const ahora = Date.now()

  await db.execute(
    `INSERT INTO categorias (id, nombre, descripcion, creado_en)
     VALUES ($1, $2, $3, $4)`,
    [id, categoria.nombre || '', categoria.descripcion || '', ahora]
  )

  await agregarSyncQueue('categorias', 'INSERT', id, categoria)
  console.log('📝 Categoría encolada para sync:', categoria.nombre, 'id:', id)
  return { id, ...categoria }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM categorias WHERE id = $1 LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select('SELECT * FROM categorias ORDER BY nombre')
}

export async function update(id, changes) {
  const db = await getDB()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    nombre: 'nombre',
    descripcion: 'descripcion',
    color: 'color',
    icono: 'icono',
    activa: 'activa',
    empresa_id: 'empresa_id',
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
  await db.execute(`UPDATE categorias SET ${campos.join(', ')} WHERE id = $${idx}`, valores)
  await agregarSyncQueue('categorias', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('DELETE FROM categorias WHERE id = $1', [id])
  await agregarSyncQueue('categorias', 'DELETE', id, { id })
  return { id }
}

export async function upsertSinSync(categoria) {
  const db = await getDB()
  const id = categoria.id || crypto.randomUUID()

  await db.execute(
    `INSERT OR IGNORE INTO categorias (id, nombre, descripcion, creado_en)
     VALUES ($1, $2, $3, $4)`,
    [id, categoria.nombre || '', categoria.descripcion || '', Date.now()]
  )

  return id
}
