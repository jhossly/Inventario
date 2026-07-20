import { useState, useEffect } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { getContactos, createContacto, deleteContacto } from '../services/dataService'
import { Save, Upload, UserPlus, Trash2, Users } from 'lucide-react'

export default function Contactos() {
  const [contactos, setContactos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', tipo: 'cliente', telefono: '', email: '' })
  const dialog = useDialog()

  useEffect(() => {
    cargarContactos()
  }, [])

  const cargarContactos = async () => {
    try {
      const data = await getContactos()
      setContactos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando contactos:', err)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await createContacto(form)
      setForm({ nombre: '', tipo: 'cliente', telefono: '', email: '' })
      setShowForm(false)
      cargarContactos()
    } catch (err) {
      console.error('Error creando contacto:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!await dialog.confirm('¿Eliminar contacto?')) return;
    try {
      await deleteContacto(id)
      cargarContactos()
    } catch (err) {
      console.error('Error eliminando contacto:', err)
    }
  }

  const handleImportCSV = () => {
    dialog.alert('📁 Función de importar CSV - conectar con papaparse')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Users size={28} className="text-menta-dark" /> Contactos
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleImportCSV}
            className="flex items-center gap-2 px-4 py-3 bg-linear-to-r from-[#818cf8] to-[#6366f1] rounded-xl font-bold transition shadow-md hover:shadow-lg text-white"
          >
            <Upload size={20} />
            Importar CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-menta flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition shadow-md"
          >
            <UserPlus size={20} />
            Nuevo Contacto
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nombre *</label>
              <input
                type="text" required value={form.nombre}
                onChange={(e) => setForm({...form, nombre: e.target.value})}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({...form, tipo: e.target.value})}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
              >
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
                <option value="empleado">Empleado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Teléfono</label>
              <input
                type="text" value={form.telefono}
                onChange={(e) => setForm({...form, telefono: e.target.value})}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
              />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold hover:bg-menta-tint transition">Cancelar</button>
              <button type="submit" className="btn-menta-light px-6 py-3 rounded-xl font-bold transition shadow-md">
                <Save size={20} className="inline mr-2" />Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-menta-bg">
            <tr>
              <th className="text-left px-6 py-4 text-sm">Nombre</th>
              <th className="text-left px-6 py-4 text-sm">Tipo</th>
              <th className="text-left px-6 py-4 text-sm">Teléfono</th>
              <th className="text-left px-6 py-4 text-sm">Email</th>
              <th className="text-center px-6 py-4 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-menta-border">
            {contactos.map((c) => (
              <tr key={c.id} className="hover:bg-menta-bg transition">
                <td className="px-6 py-4 font-medium text-text-dark">{c.nombre}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    c.tipo === 'cliente' ? 'bg-menta-tint text-menta-dark' :
                    c.tipo === 'proveedor' ? 'bg-green-bg text-[#16a34a]' :
                    'bg-[#ede9fe] text-[#7c3aed]'
                  }`}>
                    {c.tipo}
                  </span>
                </td>
                <td className="px-6 py-4">{c.telefono}</td>
                <td className="px-6 py-4">{c.email}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition">
                    <Trash2 size={18} />
                  </button>
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