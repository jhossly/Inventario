import * as localRepo from '../../repositories/local/cajaRepo'
import * as remoteRepo from '../../repositories/remote/supabase/cajaRepo'
import { toRemote, toLocal } from '../../mappers/cajaMapper'
import { agregarSyncQueue } from '../../db/database'

export async function abrirCaja(montoApertura, responsable = 'dueño') {
  const ahora = new Date().toISOString()

  const localCaja = {
    fecha_apertura: ahora,
    monto_apertura: montoApertura || 0,
    responsable,
    estado: 'abierta',
  }

  const caja = await localRepo.create(localCaja)

  await localRepo.createMovimiento({
    caja_id: caja.id,
    tipo: 'ingreso',
    monto: montoApertura || 0,
    descripcion: 'Apertura de caja',
    fecha: ahora,
  })

  return caja
}

export async function getCajaAbierta() {
  return await localRepo.findOpen()
}

export async function getMovimientosCaja(cajaId) {
  return await localRepo.findMovimientosByCaja(cajaId)
}

export async function addMovimientoCaja(cajaId, tipo, monto, descripcion) {
  const ahora = new Date().toISOString()

  const movimiento = {
    caja_id: cajaId,
    tipo,
    monto: monto || 0,
    descripcion: descripcion || '',
    fecha: ahora,
  }

  const saved = await localRepo.createMovimiento(movimiento)

  const caja = await localRepo.findById(cajaId)
  if (caja && caja.estado === 'abierta') {
    const ingresos = await calcularIngresos(cajaId)
    const egresos = await calcularEgresos(cajaId)
    const saldoEsperado = caja.monto_apertura + ingresos - egresos
    await localRepo.update(cajaId, { saldoEsperado, diferencia: saldoEsperado - (caja.monto_cierre || 0) })
  }

  return saved
}

export async function cerrarCaja(cajaId, montoCierre, saldoEsperado) {
  const ahora = new Date().toISOString()
  const diferencia = (montoCierre || 0) - (saldoEsperado || 0)

  await localRepo.update(cajaId, {
    estado: 'cerrada',
    fecha_cierre: ahora,
    monto_cierre: montoCierre || 0,
    saldo_esperado: saldoEsperado || 0,
    diferencia,
  })

  return { id: cajaId, estado: 'cerrada', diferencia }
}

export async function syncToSupabase(caja) {
  const remote = toRemote(caja)
  if (!remote) return null

  const existing = await remoteRepo.findById(caja.id)
  if (existing) {
    return await remoteRepo.update(caja.id, remote)
  }
  return await remoteRepo.create(remote)
}

export async function syncMovimientoToSupabase(movimiento) {
  const remote = {
    caja_id: movimiento.caja_id,
    tipo: movimiento.tipo,
    monto: movimiento.monto || 0,
    descripcion: movimiento.descripcion || '',
    fecha: movimiento.fecha || new Date().toISOString(),
  }

  const existing = await remoteRepo.findMovimientosByCaja(movimiento.caja_id)
  const found = existing.find(m => m.descripcion === movimiento.descripcion && m.monto === movimiento.monto)
  if (found) return found

  return await remoteRepo.createMovimiento(remote)
}

async function calcularIngresos(cajaId) {
  const movimientos = await localRepo.findMovimientosByCaja(cajaId)
  return movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + (m.monto || 0), 0)
}

async function calcularEgresos(cajaId) {
  const movimientos = await localRepo.findMovimientosByCaja(cajaId)
  return movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + (m.monto || 0), 0)
}
