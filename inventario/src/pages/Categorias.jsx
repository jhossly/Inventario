import { useState, useEffect } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/dataService'
import { Plus, Edit2, Trash2, X, Save, Tag } from 'lucide-react'

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const dialog = useDialog()

  useEffect(() => { cargarCategorias() }, [])

  const cargarCategorias = async () => {
    try {
      const data = await getCategorias()
      setCategorias(Array.isArray(data) ? data : [])
    } catch (err) {
      console.log('Error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editando) {
      const { error } = await updateCategoria(editando.id, form)
      if (error) throw error
      setEditando(null)
    } else {
      const { error } = await createCategoria(form)
      if (error) throw error
    }
    setShowForm(false)
    setForm({ nombre: '', descripcion: '' })
    cargarCategorias()
  }

  const handleEdit = (c) => {
    setEditando(c)
    setForm({ nombre: c.nombre, descripcion: c.descripcion })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!await dialog.confirm('¿Eliminar categoría?')) return;
    const { error } = await deleteCategoria(id)
    if (error) throw error
    cargarCategorias()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Tag size={28} className="text-menta-darkk" /> Categorías
        </h2>
        <button
          onClick={() => { setShowForm(true); setEditando(null); setForm({ nombre: '', descripcion: '' }) }}
          className="btn-menta flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
        >
          <Plus size={20} /> Nueva Categoría
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-dark">{editando ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-menta-bg rounded-lg"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nombre *</label>
              <input type="text" required value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition" placeholder="Ej: Lácteos" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Descripción</label>
              <input type="text" value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition" placeholder="Opcional" />
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
              <th className="text-left px-6 py-4 text-sm">Categoría</th>
              <th className="text-left px-6 py-4 text-sm">Descripción</th>
              <th className="text-center px-6 py-4 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-menta-border">
            {categorias.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12">No hay categorías</td></tr>
            ) : categorias.map((c) => (
              <tr key={c.id} className="hover:bg-menta-bg transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 btn-menta rounded-xl flex items-center justify-center">
                      <Tag size={20} className="text-white" />
                    </div>
                    <span className="font-semibold text-text-dark">{c.nombre}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{c.descripcion || '-'}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleEdit(c)} className="p-2 hover:bg-menta-tint rounded-lg text-menta-dark transition"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"><Trash2 size={18} /></button>
                  </div>
                  {dialog.Dialog}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
  )
}