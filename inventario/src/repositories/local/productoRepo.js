import { getDB } from '../../db/database'
import { agregarSyncQueue } from '../../db/database'

export async function create(producto) {
  const db = await getDB()
  const id = producto.id || crypto.randomUUID()
  const ahora = Date.now()
  const codigo = producto.codigo?.trim() || `PROD-${Date.now()}`

  await db.execute(
    `INSERT INTO productos (
      id, empresa_id, codigo, nombre, descripcion,
      categoria_id, unidad_id, contacto_id, proveedor_id, imagen_url,
      precio_venta, precio_costo, stock_actual, stock_minimo, tiempo_entrega_dias,
      tiene_impuesto, tasa_impuesto_producto, campos_extra,
      activo, creado_en, actualizado_en
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [
      id,
      producto.empresa_id || null,
      codigo,
      producto.nombre || '',
      producto.descripcion || '',
      producto.categoria_id || null,
      producto.unidad_id || null,
      producto.contacto_id || null,
      producto.proveedor_id || null,
      producto.imagen_url || '',
      producto.precio_venta || 0,
      producto.precio_costo || 0,
      producto.stock_actual || 0,
      producto.stock_minimo || 0,
      producto.tiempo_entrega_dias || 0,
      producto.tiene_impuesto ? 1 : 0,
      producto.tasa_impuesto_producto || 0,
      JSON.stringify(producto.campos_extra || {}),
      producto.activo ?? 1,
      ahora,
      ahora,
    ]
  )

  await agregarSyncQueue('productos', 'INSERT', id, { ...producto, codigo })
  console.log('📝 Producto encolado para sync:', producto.nombre, 'código:', codigo)
  return { id, ...producto, codigo }
}

export async function findById(id) {
  const db = await getDB()
  const rows = await db.select(`
    SELECT
      p.*,
      c.nombre as categoria_nombre,
      u.nombre as unidad_nombre,
      u.simbolo as unidad_simbolo,
      co.nombre as contacto_nombre,
      e.nombre as proveedor_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN unidades u ON p.unidad_id = u.id
    LEFT JOIN contactos co ON p.contacto_id = co.id
    LEFT JOIN empresa e ON e.id = COALESCE(p.empresa_id, p.proveedor_id)
    WHERE p.id = $1 LIMIT 1
  `, [id])
  return rows && rows[0] ? rows[0] : null
}

export async function findByCodigo(codigo) {
  const db = await getDB()
  const rows = await db.select('SELECT * FROM productos WHERE LOWER(codigo) = LOWER($1) LIMIT 1', [codigo])
  return rows && rows[0] ? rows[0] : null
}

export async function findAll() {
  const db = await getDB()
  return await db.select(`
    SELECT
      p.*,
      c.nombre as categoria_nombre,
      u.nombre as unidad_nombre,
      u.simbolo as unidad_simbolo,
      co.nombre as contacto_nombre,
      e.nombre as proveedor_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN unidades u ON p.unidad_id = u.id
    LEFT JOIN contactos co ON p.contacto_id = co.id
      LEFT JOIN empresa e ON e.id = COALESCE(p.empresa_id, p.proveedor_id)
    WHERE COALESCE(p.activo, 1) <> 0
    ORDER BY p.creado_en DESC
  `)
}

export async function update(id, changes) {
  const db = await getDB()
  const ahora = Date.now()

  const campos = []
  const valores = []
  let idx = 1

  const mapeo = {
    codigo: 'codigo',
    nombre: 'nombre',
    descripcion: 'descripcion',
    categoria_id: 'categoria_id',
    unidad_id: 'unidad_id',
    contacto_id: 'contacto_id',
    proveedor_id: 'proveedor_id',
    empresa_id: 'empresa_id',
    imagen_url: 'imagen_url',
    precio_venta: 'precio_venta',
    precio_costo: 'precio_costo',
    stock_actual: 'stock_actual',
    stock_minimo: 'stock_minimo',
    tiempo_entrega_dias: 'tiempo_entrega_dias',
    tiene_impuesto: 'tiene_impuesto',
    tasa_impuesto_producto: 'tasa_impuesto_producto',
    campos_extra: 'campos_extra',
    activo: 'activo',
  }

  for (const [key, col] of Object.entries(mapeo)) {
    if (changes[key] !== undefined) {
      campos.push(`${col} = $${idx}`)
      if (key === 'campos_extra') {
        valores.push(JSON.stringify(changes[key]))
      } else if (key === 'tiene_impuesto' || key === 'activo') {
        valores.push(changes[key] ? 1 : 0)
      } else {
        valores.push(changes[key])
      }
      idx++
    }
  }

  if (campos.length === 0) return { id }

  valores.push(ahora)
  valores.push(id)

  await db.execute(
    `UPDATE productos SET ${campos.join(', ')}, actualizado_en = $${idx} WHERE id = $${idx + 1}`,
    valores
  )

  await agregarSyncQueue('productos', 'UPDATE', id, changes)
  return { id }
}

export async function remove(id) {
  const db = await getDB()
  await db.execute('UPDATE productos SET activo = 0 WHERE id = $1', [id])
  // Borrado lógico: solo se oculta de la interfaz (se conserva para
  // reportes/contabilidad). Propagamos activo=0 a la nube para que el
  // próximo sync no lo reactive.
  const rows = await db.select('SELECT * FROM productos WHERE id = $1 LIMIT 1', [id])
  const prod = rows && rows[0]
  if (prod) {
    await agregarSyncQueue('productos', 'UPDATE', id, { ...prod, activo: 0 })
  }
  return { id }
}

export async function upsertSinSync(data) {
  const db = await getDB()
  const id = data.id || crypto.randomUUID()
  const ahora = Date.now()

  const camposUpdate = []
  const valoresUpdate = []
  let idx = 1

  if (data.codigo != null) { camposUpdate.push(`codigo = $${idx}`); valoresUpdate.push(String(data.codigo)); idx++; }
  if (data.nombre != null) { camposUpdate.push(`nombre = $${idx}`); valoresUpdate.push(String(data.nombre)); idx++; }
  if (data.descripcion != null) { camposUpdate.push(`descripcion = $${idx}`); valoresUpdate.push(String(data.descripcion)); idx++; }
  if (data.empresa_id != null) { camposUpdate.push(`empresa_id = $${idx}`); valoresUpdate.push(String(data.empresa_id)); idx++; }
  if (data.categoria_id != null) { camposUpdate.push(`categoria_id = $${idx}`); valoresUpdate.push(String(data.categoria_id)); idx++; }
  if (data.unidad_id != null) { camposUpdate.push(`unidad_id = $${idx}`); valoresUpdate.push(String(data.unidad_id)); idx++; }
  if (data.contacto_id != null) { camposUpdate.push(`contacto_id = $${idx}`); valoresUpdate.push(String(data.contacto_id)); idx++; }
  if (data.proveedor_id != null) { camposUpdate.push(`proveedor_id = $${idx}`); valoresUpdate.push(String(data.proveedor_id)); idx++; }
  if (data.imagen_url != null) { camposUpdate.push(`imagen_url = $${idx}`); valoresUpdate.push(data.imagen_url); idx++; }
  if (data.precio_venta != null) { camposUpdate.push(`precio_venta = $${idx}`); valoresUpdate.push(data.precio_venta); idx++; }
  if (data.precio_costo != null) { camposUpdate.push(`precio_costo = $${idx}`); valoresUpdate.push(data.precio_costo); idx++; }
  if (data.stock_actual != null) { camposUpdate.push(`stock_actual = $${idx}`); valoresUpdate.push(data.stock_actual); idx++; }
  if (data.stock_minimo != null) { camposUpdate.push(`stock_minimo = $${idx}`); valoresUpdate.push(data.stock_minimo); idx++; }
  if (data.tiempo_entrega_dias != null) { camposUpdate.push(`tiempo_entrega_dias = $${idx}`); valoresUpdate.push(data.tiempo_entrega_dias); idx++; }
  if (data.tiene_impuesto != null) { camposUpdate.push(`tiene_impuesto = $${idx}`); valoresUpdate.push(data.tiene_impuesto ? 1 : 0); idx++; }
  if (data.tasa_impuesto_producto != null) { camposUpdate.push(`tasa_impuesto_producto = $${idx}`); valoresUpdate.push(data.tasa_impuesto_producto); idx++; }
  if (data.campos_extra != null) { camposUpdate.push(`campos_extra = $${idx}`); valoresUpdate.push(JSON.stringify(data.campos_extra)); idx++; }
  if (data.activo != null) { camposUpdate.push(`activo = $${idx}`); valoresUpdate.push(data.activo); idx++; }
  camposUpdate.push(`actualizado_en = $${idx}`); valoresUpdate.push(ahora); idx++;

  const filas = await db.execute(
    `UPDATE productos SET ${camposUpdate.join(', ')} WHERE id = $${idx}`,
    [...valoresUpdate, id]
  )

  if (filas.changes === 0) {
    await db.execute(
      `INSERT INTO productos (
        id, empresa_id, codigo, nombre, descripcion,
        categoria_id, unidad_id, contacto_id, proveedor_id, imagen_url,
        precio_venta, precio_costo, stock_actual, stock_minimo, tiempo_entrega_dias,
        tiene_impuesto, tasa_impuesto_producto, campos_extra,
        activo, creado_en, actualizado_en
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        id,
        (data.empresa_id != null) ? String(data.empresa_id) : null,
        data.codigo || '',
        data.nombre || '',
        data.descripcion || '',
        (data.categoria_id != null) ? String(data.categoria_id) : null,
        (data.unidad_id != null) ? String(data.unidad_id) : null,
        (data.contacto_id != null) ? String(data.contacto_id) : null,
        (data.proveedor_id != null) ? String(data.proveedor_id) : null,
        data.imagen_url || '',
        data.precio_venta || 0,
        data.precio_costo || 0,
        data.stock_actual || 0,
        data.stock_minimo || 0,
        data.tiempo_entrega_dias || 0,
        data.tiene_impuesto ? 1 : 0,
        data.tasa_impuesto_producto || 0,
        JSON.stringify(data.campos_extra || {}),
        data.activo ?? 1,
        ahora,
        ahora,
      ]
    )
  }

  return id
}
