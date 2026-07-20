import { useState, useEffect } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { supabase } from '../services/supabase' 
import { getIngresos, createIngreso, getGastos, createGasto, deletePago, getUsuarios } from '../services/dataService'
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, X, Save, Search, Filter, Wallet } from 'lucide-react'

export default function GastosIngresos() {
  const dialog = useDialog()
  const [tab, setTab] = useState('ingresos')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ monto: 0, motivo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], usuario_id: '' })
  const MOTIVOS = {
    ingresos: ['Venta', 'Abono de cliente', 'Préstamo', 'Otro ingreso'],
    gastos: ['Pago a proveedor', 'Luz', 'Agua', 'Alquiler', 'Salarios', 'Transporte', 'Otro egreso'],
  }
  const [busqueda, setBusqueda] = useState('')
  const [usuarios, setUsuarios] = useState([])

  const [ingresos, setIngresos] = useState([])
  const [gastos, setGastos] = useState([])
  
  const [refreshKey, setRefreshKey] = useState(0)
  
  useEffect(() => {
    cargarDatos()
    cargarUsuarios()
  }, [refreshKey])

  const cargarDatos = async () => {
    try {
      const [ingData, gasData] = await Promise.all([
        getIngresos(),
        getGastos()
      ])
      if (ingData.error) throw ingData.error
      if (gasData.error) throw gasData.error
      setIngresos(ingData.data || [])
      setGastos(gasData.data || [])
    } catch (err) {
      console.log('Error cargando datos:', err)
    }
  }

  const cargarUsuarios = async () => {
    try {
      const { data, error } = await getUsuarios()
      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.log('Error cargando usuarios:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (tab === 'ingresos') {
        const { error } = await createIngreso(form)
        if (error) throw error
      } else {
        const { error } = await createGasto(form)
        if (error) throw error
      }
      setShowForm(false)
      setForm({ monto: 0, motivo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], usuario_id: usuarios[0]?.id || '' })
      setRefreshKey(k => k + 1)
    } catch (err) {
      console.error('Error guardando:', err)
      dialog.alert('Error: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!await dialog.confirm('¿Eliminar este registro?')) return
    try {
      await deletePago(id)
      setRefreshKey(k => k + 1)
    } catch (err) {
      console.error('Error eliminando:', err)
    }
  }

  const totalIngresos = ingresos.reduce((sum, i) => sum + (i.monto || 0), 0)
  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0)
  const balance = totalIngresos - totalGastos

  const datosActuales = tab === 'ingresos' ? ingresos : gastos
  const filtrados = datosActuales.filter(d =>
    d.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
        <Wallet size={28} className="text-menta-dark" /> Gastos e Ingresos
      </h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-menta flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
        >
          <Plus size={20} /> Nuevo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-menta-tint rounded-xl flex items-center justify-center">
              <TrendingUp size={24} className="text-green" />
            </div>
            <div>
              <p className="text-sm">Total Ingresos</p>
              <p className="text-2xl font-bold text-green">${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs">{ingresos.length} registros</p>
        </div>

        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm">Total Gastos</p>
              <p className="text-2xl font-bold text-red-500">${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs">{gastos.length} registros</p>
        </div>

        <div className={`bg-white border-2 rounded-2xl p-6 shadow-sm ${balance >= 0 ? 'border-menta-border' : 'border-[#fde68a]'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${balance >= 0 ? 'bg-menta-tint' : 'bg-yellow-bg'}`}>
              <DollarSign size={24} className={balance >= 0 ? 'text-menta-dark' : 'text-yellow'} />
            </div>
            <div>
              <p className="text-sm">Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-menta-dark' : 'text-yellow'}`}>
                ${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <p className="text-xs">{balance >= 0 ? 'Ganancia' : 'Pérdida'}</p>
        </div>
      </div>

      <div className="flex gap-2 bg-menta-bg p-1.5 rounded-xl">
        <button
          onClick={() => { setTab('ingresos'); setBusqueda('') }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition ${
            tab === 'ingresos'
              ? 'bg-linear-to-r from-green to-[#16a34a] text-white shadow-md'
              : 'text-[#0f766e] hover:bg-white'
          }`}
        >
          <TrendingUp size={18} /> Ingresos ({ingresos.length})
        </button>
        <button
          onClick={() => { setTab('gastos'); setBusqueda('') }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition ${
            tab === 'gastos'
              ? 'bg-linear-to-r from-red to-[#dc2626] text-white shadow-md'
              : 'text-[#0f766e] hover:bg-white'
          }`}
        >
          <TrendingDown size={18} /> Gastos ({gastos.length})
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
        <input
          type="text"
          placeholder={`Buscar ${tab}...`}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-menta-border rounded-xl text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
        />
      </div>

      {showForm && (
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
              {tab === 'ingresos' ? <TrendingUp size={20} className="text-green" /> : <TrendingDown size={20} className="text-red-500" />}
              Nuevo {tab === 'ingresos' ? 'Ingreso' : 'Gasto'}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-menta-bgrounded-lg text-[#0f766e]">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.monto || ''}
                onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Motivo *</label>
              <select
                required
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
              >
                <option value="">Seleccionar motivo...</option>
                {MOTIVOS[tab].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Detalle (opcional)</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-menta-borderder rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
                placeholder={tab === 'ingresos' ? 'Ej: Factura #123' : 'Ej: Compra de fundas'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Registrado por</label>
              <select
                value={form.usuario_id}
                onChange={(e) => setForm({ ...form, usuario_id: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-menta-borderder rounded-xl focus:outline-none focus:ringfocus:ring-mentabf] transition text-sm"
              >
                <option value="">Seleccionar...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold text-[#0f766e] hover:bg-menta-tint transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-bold transition shadow-md ${
                  tab === 'ingresos'
                    ? 'bg-linear-to-r from-green to-[#16a34a]'
                    : 'bg-linear-to-r from-red to-[#dc2626]'
                }`}
              >
                <Save size={18} /> Guardar {tab === 'ingresos' ? 'Ingreso' : 'Gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-menta-bg border-b border-menta-borderder">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold">Fecha</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Motivo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Detalle</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Registrado por</th>
                <th className="text-right px-6 py-4 text-sm font-semibold">Monto</th>
                <th className="text-center px-6 py-4 text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-menta-border">
              {filtrados.length === 0 ? (
                <tr>
                <td colSpan={6} className="text-center py-12 text-text-sub">
                     No hay {tab} registrados
                </td>
                </tr>
              ) : (
                filtrados.map((d) => (
                  <tr key={d.id} className="hover:bg-menta-bg transition">
                    <td className="px-6 py-4 text-sm text-menta-dark">
                      {new Date(d.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-text-dark">{d.motivo || '—'}</p>
                      {d.descripcion && <p className="text-xs text-text-sub">{d.descripcion}</p>}
                    </td>
                    <td className="px-6 py-4">{d.usuario?.nombre || 'Sin asignar'}</td>
                    <td className={`px-6 py-4 text-right font-bold text-lg ${
                      tab === 'ingresos' ? 'text-green' : 'text-red-500'
                    }`}>
                      {tab === 'ingresos' ? '+' : '-'}${d.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
<button
                         onClick={() => handleDelete(d.id)}
                         className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
                       >
                         <Trash2 size={18} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {dialog.Dialog}
    </div>
  )
}