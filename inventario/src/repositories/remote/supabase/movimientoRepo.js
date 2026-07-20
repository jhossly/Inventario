import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/movimientoMapper'

export async function create(movimiento) {
  const remote = toRemote(movimiento)
  if (!remote) throw new Error('Movimiento inválido')

  const { data, error } = await supabase
    .from('movimientos')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, movimiento) {
  const remote = toRemote(movimiento)
  if (!remote) throw new Error('Movimiento inválido')

  const { data, error } = await supabase
    .from('movimientos')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .order('fecha_movimiento', { ascending: false })

  if (error) throw error
  return data || []
}

export async function findByProducto(productoId) {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .eq('producto_id', productoId)
    .order('fecha_movimiento', { ascending: false })

  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('movimientos')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}
