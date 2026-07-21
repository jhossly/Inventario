import { useState, useEffect } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { getProductos, ajustarStockProducto, getMiEmpresa, updateProducto } from '../services/dataService'
import { PackageMinus, PackagePlus, Search, Save, AlertTriangle, ClipboardList } from 'lucide-react'

const MOTIVOS = [
  'Producto dañado',
  'Producto vencido',
  'Producto perdido / robo',
  'Conteo físico (corrección)',
  'Devolución a proveedor',
  'Uso interno',
]

export default function AjusteStock() {
  const dialog = useDialog()
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState(null)
  const [tipo, setTipo] = useState('salida') // salida = resta, entrada = suma
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [motivoDetalle, setMotivoDetalle] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [adminNombre, setAdminNombre] = useState('')

  useEffect(() => {
    cargar()
    getMiEmpresa().then(e => { if (e?.admin_nombre) setAdminNombre(e.admin_nombre) }).catch(() => {})
  }, [])

  const cargar = async () => {
    try {
      const data = await getProductos()
      setProductos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando productos:', err)
    }
  }

  const filtrados = productos.filter(p => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (p.nombre || '').toLowerCase().includes(q) ||
           (p.codigo || '').toLowerCase().includes(q)
  })

  const nuevoStock = () => {
    if (!seleccionado) return null
    const actual = Number(seleccionado.stock_actual) || 0
    const cant = Math.abs(Number(cantidad) || 0)
    return tipo === 'entrada' ? actual + cant : Math.max(0, actual - cant)
  }

  const registrar = async (e) => {
    e.preventDefault()
    const cant = Math.abs(Number(cantidad) || 0)
    if (!seleccionado || cant <= 0) return

    setGuardando(true)
    try {
      const motivoFinal = motivoDetalle.trim()
        ? `${motivo} — ${motivoDetalle.trim()}`
        : motivo
      await ajustarStockProducto(
        seleccionado.id,
        cant,
        tipo,
        motivoFinal,
        adminNombre || 'Administrador'
      )
      await updateProducto(seleccionado.id, {
        stock_actual: nuevoStock()
      })
      setOk(true)
      setTimeout(() => setOk(false), 2500)
      // Reset y recarga
      setCantidad('')
      setMotivoDetalle('')
      await cargar()
      setSeleccionado(prev => prev
        ? { ...prev, stock_actual: nuevoStock() }
        : null)
    } catch (err) {
      console.error(err)
      dialog.alert('No se pudo registrar el ajuste. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <ClipboardList size={28} className="text-menta-dark" /> Ajuste de Inventario
        </h2>
        <p className="text-text-muted mt-1">
          Registra pérdidas, daños o correcciones de stock. No es una venta ni una compra.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Selección de producto ── */}
        <div className="bg-white border-2 border-menta-border rounded-2xl p-5 shadow-sm">
          <label className="block text-sm font-semibold mb-2 text-text-dark">1. Elige el producto</label>
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-menta-dark" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {filtrados.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">No hay productos.</p>
            )}
            {filtrados.map(p => {
              const activo = seleccionado?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSeleccionado(p)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition ${
                    activo ? 'border-menta bg-menta-tint' : 'border-menta-border hover:border-menta'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-text-dark">{p.nombre}</p>
                      <p className="text-xs text-text-muted">{p.codigo || 'Sin código'}</p>
                    </div>
                    <span className="text-sm font-bold text-menta-dark">
                      Stock: {p.stock_actual ?? 0}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Formulario de ajuste ── */}
        <div className="bg-white border-2 border-menta-border rounded-2xl p-5 shadow-sm">
          <label className="block text-sm font-semibold mb-2 text-text-dark">2. Registra el ajuste</label>

          {!seleccionado ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted">
              <AlertTriangle size={36} className="mb-2 text-menta-border" />
              <p>Selecciona un producto para ajustar su stock.</p>
            </div>
          ) : (
            <form onSubmit={registrar} className="space-y-4">
              <div className="p-3 bg-menta-bg rounded-xl border border-menta-tint">
                <p className="font-bold text-text-dark">{seleccionado.nombre}</p>
                <p className="text-sm text-text-muted">
                  Stock actual: <b>{seleccionado.stock_actual ?? 0}</b>
                </p>
              </div>

              {/* Tipo de ajuste */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo('salida')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition ${
                    tipo === 'salida' ? 'border-red-400 bg-red-50 text-red-600' : 'border-menta-border text-text-dark'
                  }`}
                >
                  <PackageMinus size={18} /> Restar
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('entrada')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition ${
                    tipo === 'entrada' ? 'border-green-400 bg-green-50 text-green-600' : 'border-menta-border text-text-dark'
                  }`}
                >
                  <PackagePlus size={18} /> Sumar
                </button>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-text-dark">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder="Ej. 5"
                  className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-text-dark">Motivo</label>
                <select
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
                >
                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-text-dark">Detalle (opcional)</label>
                <input
                  type="text"
                  value={motivoDetalle}
                  onChange={e => setMotivoDetalle(e.target.value)}
                  placeholder="Ej. se rompieron al descargar"
                  className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
                />
              </div>

              {/* Preview */}
              {Number(cantidad) > 0 && (
                <div className="p-3 rounded-xl bg-menta-bg border border-menta-tint text-sm text-text-dark">
                  Stock después del ajuste: <b>{nuevoStock()}</b>
                </div>
              )}

              <button
                type="submit"
                disabled={guardando || !(Number(cantidad) > 0)}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md disabled:opacity-50 ${
                  ok ? 'bg-green text-white' : 'btn-menta'
                }`}
              >
                <Save size={18} />
                {guardando ? 'Guardando...' : ok ? 'Ajuste registrado!' : 'Registrar ajuste'}
              </button>
            </form>
          )}
        </div>
      </div>
      {dialog.Dialog}
    </div>
  )
}