import { supabase } from '../../../services/supabase'

export async function create(ticket) {
  const { data, error } = await supabase
    .from('tickets')
    .insert(ticket)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function update(id, ticket) {
  const { data, error } = await supabase
    .from('tickets')
    .update(ticket)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('fecha_venta', { ascending: false })
  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', id)
  if (error) throw error
  return { id }
}
