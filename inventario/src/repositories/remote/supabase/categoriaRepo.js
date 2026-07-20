import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/categoriaMapper'

export async function create(categoria) {
  const remote = toRemote(categoria)
  if (!remote) throw new Error('Categoría inválida')

  const { data, error } = await supabase
    .from('categorias')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, categoria) {
  const remote = toRemote(categoria)
  if (!remote) throw new Error('Categoría inválida')

  const { data, error } = await supabase
    .from('categorias')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre')

  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}
