import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/contactoMapper'

export async function create(contacto) {
  const remote = toRemote(contacto)
  if (!remote) throw new Error('Contacto inválido')

  const { data, error } = await supabase
    .from('contactos')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, contacto) {
  const remote = toRemote(contacto)
  if (!remote) throw new Error('Contacto inválido')

  const { data, error } = await supabase
    .from('contactos')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .order('nombre')

  if (error) throw error
  return data || []
}

export async function findByDocumento(documento) {
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .eq('documento', documento)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findByEmail(email) {
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function remove(id) {
  const { error } = await supabase
    .from('contactos')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}
