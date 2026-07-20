import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/productoMapper'

export async function create(producto) {
  const remote = toRemote(producto)
  if (!remote) throw new Error('Producto inválido para sincronizar')

  const { data, error } = await supabase
    .from('productos')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, producto) {
  const remote = toRemote(producto)
  if (!remote) throw new Error('Producto inválido para sincronizar')

  const { data, error } = await supabase
    .from('productos')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findByCodigo(codigo) {
  if (!codigo) return null
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre')

  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}
