import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/empresaMapper'

export async function create(empresa) {
  const remote = toRemote(empresa)
  if (!remote) throw new Error('Empresa inválida')

  const { data, error } = await supabase
    .from('empresa')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, empresa) {
  const remote = toRemote(empresa)
  if (!remote) throw new Error('Empresa inválida')

  const { data, error } = await supabase
    .from('empresa')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('empresa')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('empresa')
    .select('*')
    .order('nombre')

  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('empresa')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}
