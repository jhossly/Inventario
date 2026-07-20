import * as localRepo from '../../repositories/local/productoRepo'
import * as remoteRepo from '../../repositories/remote/supabase/productoRepo'
import { toRemote, toLocal } from '../../mappers/productoMapper'
import { agregarSyncQueue } from '../../db/database'
import { getDB } from '../../db/database'
import { simularAgotamiento } from '../montecarloService'

export async function createProducto(data) {
  const producto = {
    ...data,
    empresa_id: data.empresa_id || null,
    proveedor_id: data.proveedor_id || null,
    campos_extra: data.campos_extra || {},
    activo: data.activo ?? 1,
    creado_en: Date.now(),
    actualizado_en: Date.now(),
  }

  const saved = await localRepo.create(producto)
  return saved
}

export async function updateProducto(id, data) {
  const changes = {
    ...data,
    actualizado_en: Date.now(),
  }

  const updated = await localRepo.update(id, changes)
  return updated
}

export async function deleteProducto(id) {
  return await localRepo.remove(id)
}

export async function getProductos() {
  const rows = await localRepo.findAll()
  console.log('[getProductos] filas en BD local:', rows.length, rows.map(r => ({ id: r.id, nombre: r.nombre, activo: r.activo, codigo: r.codigo })))
  return rows.map(p => {
    let camposExtra = {}
    try {
      camposExtra = typeof p.campos_extra === 'string'
        ? JSON.parse(p.campos_extra)
        : (p.campos_extra || {})
    } catch {
      camposExtra = {}
    }
    return {
      ...p,
      campos_extra: camposExtra,
      proveedor_nombre: p.proveedor_nombre || null,
    }
  })
}

export async function getProductoById(id) {
  const row = await localRepo.findById(id)
  if (!row) return null
  return {
    ...row,
    campos_extra: typeof row.campos_extra === 'string' ? JSON.parse(row.campos_extra) : (row.campos_extra || {}),
    proveedor_nombre: row.proveedor_nombre || null,
  }
}

export async function getProductoByCodigo(codigo) {
  const row = await localRepo.findByCodigo(codigo)
  if (!row) return null
  return {
    ...row,
    campos_extra: typeof row.campos_extra === 'string' ? JSON.parse(row.campos_extra) : (row.campos_extra || {}),
    proveedor_nombre: row.proveedor_nombre || null,
  }
}

export async function evaluarRiegoStock(productoId) {
  const producto = await localRepo.findById(productoId)
  if (!producto) return null

  const db = await getDB()
  const movimientos = await db.select(
    'SELECT cantidad, tipo, fecha_movimiento FROM movimientos WHERE producto_id = $1 ORDER BY fecha_movimiento DESC LIMIT 60',
    [productoId]
  )

  const ventasPorDiaMap = new Map()

  for (let i = 0; i < movimientos.length; i++) {
    const m = movimientos[i]
    if (m.tipo === 'salida') {
      const fecha = new Date(m.fecha_movimiento)
      const key = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`
      ventasPorDiaMap.set(key, (ventasPorDiaMap.get(key) || 0) + m.cantidad)
    }
  }

  const ventasPorDia = Array.from(ventasPorDiaMap.values())

  const stockActual = producto.stock_actual || 0
  const stockMinimo = producto.stock_minimo || 0
  const leadTime = producto.tiempo_entrega_dias || 0

  if (ventasPorDia.length < 3) {
    const diasRestantes = ventasPorDia.length > 0
      ? Math.round(stockActual / (ventasPorDia.reduce((a, b) => a + b, 0) / ventasPorDia.length))
      : Infinity
    return {
      productoId,
      nombre: producto.nombre,
      stockActual,
      stockMinimo,
      probabilidadAgotamiento: stockActual <= stockMinimo ? 1 : 0,
      stockSugerido: stockMinimo + Math.round(ventasPorDia.reduce((a, b) => a + b, 0) / (ventasPorDia.length || 1) * (7 + (leadTime || 0))),
      alerta: stockActual <= stockMinimo,
      diasInventarioRestante: diasRestantes,
      recomendacion: stockActual <= stockMinimo ? 'Reponer stock' : 'Datos insuficientes',
    }
  }

  const resultado = simularAgotamiento(ventasPorDia, stockActual, 7, 1000, leadTime)

  return {
    productoId,
    nombre: producto.nombre,
    stockActual,
    stockMinimo,
    probabilidadAgotamiento: resultado.probabilidadAgotamiento,
    stockSugerido: resultado.stockSugerido,
    alerta: resultado.alerta,
    diasInventarioRestante: resultado.diasInventarioRestante,
    recomendacion: resultado.alerta
      ? `URGENTE: Reponer. Stock sugerido: ${resultado.stockSugerido}`
      : `Stock suficiente. Sugerido: ${resultado.stockSugerido}`,
  }
}

export async function syncToSupabase(producto) {
  const remote = toRemote(producto)
  if (!remote) {
    throw new Error(`Producto "${producto.nombre || producto.id}" no se puede sincronizar: falta nombre`)
  }

  const existing = await remoteRepo.findById(producto.id)
  if (existing) {
    return await remoteRepo.update(producto.id, remote)
  }
  return await remoteRepo.create(remote)
}
