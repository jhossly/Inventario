import { useState, useEffect } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { getProveedores, createContacto, updateContacto, deleteContacto } from '../services/dataService'
import { Plus, Edit2, Trash2, X, Save, Truck } from 'lucide-react'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', tipo: 'proveedor', documento: '', telefono: '', email: '', direccion: '' })
  const dialog = useDialog()

  useEffect(() => { cargarProveedores() }, [])

  const cargarProveedores = async () => {
    try {
      const { data } = await getProveedores()
      setProveedores(data || [])
    } catch (err) {
      console.log('Error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editando) {
      await updateContacto(editando.id, form)
      setEditando(null)
    } else {
      await createContacto({ ...form, tipo: 'proveedor' })
    }
    setShowForm(false)
    setForm({ nombre: '', tipo: 'proveedor', documento: '', telefono: '', email: '', direccion: '' })
    cargarProveedores()
  }

  const handleEdit = (p) => {
    setEditando(p)
    setForm({ nombre: p.nombre, documento: p.documento || '', telefono: p.telefono || '', email: p.email || '', direccion: p.direccion || '' })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!await dialog.confirm('¿Eliminar proveedor?')) return;
    await deleteProveedor(id)
    cargarProveedores()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Truck size={28} className="text-menta-dark" /> Proveedores
        </h2>
        <button
          onClick={() => { setShowForm(true); setEditando(null); setForm({ nombre: '', tipo: 'proveedor', documento: '', telefono: '', email: '', direccion: '' }) }}
          className="btn-menta flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
        >
          <Plus size={20} /> Nuevo Proveedor
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-dark">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-menta-bg rounded-lg"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nombre *</label>
              <input type="text" required value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition" placeholder="Ej: Distribuidora ABC" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Documento / RUC</label>
              <input type="text" value={form.documento} onChange={(e) => setForm({...form, documento: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition" placeholder="Ej: 12345678-9" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Teléfono</label>
              <input type="text" value={form.telefono} onChange={(e) => setForm({...form, telefono: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition" placeholder="999-123-456" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition" placeholder="ventas@abc.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Dirección</label>
              <input type="text" value={form.direccion} onChange={(e) => setForm({...form, direccion: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition" placeholder="Calle 123" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold hover:bg-menta-tint transition">Cancelar</button>
              <button type="submit" className="btn-menta-light flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md">
                <Save size={18} /> {editando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-menta-bg border-b border-menta-border">
            <tr>
              <th className="text-left px-6 py-4 text-sm">Proveedor</th>
              <th className="text-left px-6 py-4 text-sm">Teléfono</th>
              <th className="text-left px-6 py-4 text-sm">Email</th>
              <th className="text-center px-6 py-4 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-menta-border">
            {proveedores.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12">No hay proveedores</td></tr>
            ) : proveedores.map((p) => (
              <tr key={p.id} className="hover:bg-menta-bg transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 btn-menta rounded-xl flex items-center justify-center">
                      <Truck size={20} className="text-white" />
                    </div>
                    <span className="font-semibold text-text-dark">{p.nombre}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{p.telefono || '-'}</td>
                <td className="px-6 py-4">{p.email || '-'}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleEdit(p)} className="p-2 hover:bg-menta-tint rounded-lg text-menta-dark transition"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog.Dialog}
    </div>
  )
}