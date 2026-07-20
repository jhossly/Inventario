import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/cajaMapper'

export async function create(caja) {
  const remote = toRemote(caja)
  const { data, error } = await supabase
    .from('caja')
    .insert(remote)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function update(id, caja) {
  const remote = toRemote(caja)
  const { data, error } = await supabase
    .from('caja')
    .update(remote)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('caja')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function findOpen() {
  const { data, error } = await supabase
    .from('caja')
    .select('*')
    .eq('estado', 'abierta')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('caja')
    .select('*')
    .order('fecha_apertura', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createMovimiento(movimiento) {
  const remote = {
    caja_id: movimiento.caja_id,
    tipo: movimiento.tipo,
    monto: movimiento.monto || 0,
    descripcion: movimiento.descripcion || '',
    fecha: movimiento.fecha || new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('caja_movimientos')
    .insert(remote)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function findMovimientosByCaja(cajaId) {
  const { data, error } = await supabase
    .from('caja_movimientos')
    .select('*')
    .eq('caja_id', cajaId)
    .order('fecha', { ascending: true })
  if (error) throw error
  return data || []
}
