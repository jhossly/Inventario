import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/pagoMapper'

export async function create(pago) {
  const remote = toRemote(pago)
  if (!remote) throw new Error('Pago inválido')

  const { data, error } = await supabase
    .from('pagos')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, pago) {
  const remote = toRemote(pago)
  if (!remote) throw new Error('Pago inválido')

  const { data, error } = await supabase
    .from('pagos')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .order('fecha', { ascending: false })

  if (error) throw error
  return data || []
}

export async function findByTipo(tipo) {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('tipo', tipo)
    .order('fecha', { ascending: false })

  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('pagos')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}
