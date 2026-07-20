import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/unidadMapper'

export async function create(unidad) {
  const remote = toRemote(unidad)
  if (!remote) throw new Error('Unidad inválida')

  const { data, error } = await supabase
    .from('unidades')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, unidad) {
  const remote = toRemote(unidad)
  if (!remote) throw new Error('Unidad inválida')

  const { data, error } = await supabase
    .from('unidades')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .order('nombre')

  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('unidades')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}
