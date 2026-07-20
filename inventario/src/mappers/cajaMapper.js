export function toRemote(localCaja) {
  if (!localCaja) return null
  const data = { ...localCaja }

  const esUuidValido = (v) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)

  const cajeroId = esUuidValido(data.responsable) ? data.responsable : null

  return {
    id: data.id,
    empresa_id: null,
    cajero_id: cajeroId,
    turno: data.turno || null,
    apertura_efectivo: data.monto_apertura != null ? data.monto_apertura : 0,
    cierre_esperado: data.saldo_esperado != null ? data.saldo_esperado : 0,
    cierre_real: data.monto_cierre != null ? data.monto_cierre : 0,
    diferencia: data.diferencia != null ? data.diferencia : 0,
    estado: data.estado || 'abierta',
    fecha_apertura: data.fecha_apertura || null,
    fecha_cierre: data.fecha_cierre || null,
    notas: data.notas || null,
  }
}

export function toLocal(remoteCaja) {
  if (!remoteCaja) return null
  return {
    id: remoteCaja.id,
    fecha_apertura: remoteCaja.fecha_apertura,
    fecha_cierre: remoteCaja.fecha_cierre,
    monto_apertura: remoteCaja.apertura_efectivo || 0,
    monto_cierre: remoteCaja.cierre_real || 0,
    saldo_esperado: remoteCaja.cierre_esperado || 0,
    responsable: remoteCaja.cajero_id || remoteCaja.usuario_id || null,
    estado: remoteCaja.estado || 'abierta',
    sync_status: 'synced',
  }
}
