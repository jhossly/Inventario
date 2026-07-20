import { supabase } from '../../../services/supabase'
import { toRemote } from '../../../mappers/facturaMapper'
import { toRemote as facturaItemToRemote } from '../../../mappers/facturaItemMapper'

export async function create(factura) {
  const remote = toRemote(factura)
  if (!remote) throw new Error('Factura inválida')

  const { data, error } = await supabase
    .from('facturas')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function update(id, factura) {
  const remote = toRemote(factura)
  if (!remote) throw new Error('Factura inválida')

  const { data, error } = await supabase
    .from('facturas')
    .update(remote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findById(id) {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findAll() {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .order('fecha_emision', { ascending: false })

  if (error) throw error
  return data || []
}

export async function remove(id) {
  const { error } = await supabase
    .from('facturas')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}

export async function createItem(item) {
  const remote = facturaItemToRemote(item)
  if (!remote) throw new Error('Item de factura inválido')

  const { data, error } = await supabase
    .from('factura_items')
    .insert(remote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findItemsByFactura(facturaId) {
  const { data, error } = await supabase
    .from('factura_items')
    .select('*')
    .eq('factura_id', facturaId)

  if (error) throw error
  return data || []
}

export async function removeItemsByFactura(facturaId) {
  const { error } = await supabase
    .from('factura_items')
    .delete()
    .eq('factura_id', facturaId)

  if (error) throw error
  return { ok: true }
}
