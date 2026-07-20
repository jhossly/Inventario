import { useState, useEffect, useMemo } from 'react'
import { getProductos, getCategorias, getProveedores, createFacturaProveedor, createFacturaItemProveedor, updateProducto, createMovimiento, createGasto, createTicket, addMovimientoCaja, getCajaAbierta, getTasaImpuesto } from '../services/dataService'
import { exportReport } from '../utils/exportExcel'
import { Package, Filter, FileDown, Search, Plus, X, ShoppingCart, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { useTema } from '../context/TemaContext'
import useDialog from '../hooks/useDialog.jsx'

export default function Inventario() {
  const tema = useTema()
  const dialog = useDialog()
  const [filtro, setFiltro] = useState('todos')
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [tipoOperacion, setTipoOperacion] = useState('compra')
  const [busqueda, setBusqueda] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [precioUnitario, setPrecioUnitario] = useState(0)
  const [proveedorId, setProveedorId] = useState('')
  const [itemsOperacion, setItemsOperacion] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [tasaImpuesto, setTasaImpuesto] = useState(0)
  const [preciosConIva, setPreciosConIva] = useState(false)

  useEffect(() => {
    cargarDatos()
    loadImpuesto()
  }, [])

  const cargarDatos = async () => {
    try {
      const [prodData, catData, provResp] = await Promise.all([
        getProductos(),
        getCategorias(),
        getProveedores().catch(() => ({ data: [] }))
      ])
      setProductos(Array.isArray(prodData) ? prodData : [])
      setCategorias(Array.isArray(catData) ? catData : [])
      setProveedores(Array.isArray(provResp?.data) ? provResp.data : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
    }
  }

  const loadImpuesto = async () => {
    try {
      const { tasa } = await getTasaImpuesto()
      setTasaImpuesto(tasa || 0)
    } catch {}
  }

  const getEstado = (stock, minimo = 0) => {
    if (stock <= 0) return 'agotado'
    if (stock <= minimo) return 'bajo'
    return 'ok'
  }

  const productosConEstado = productos.map(p => ({
    ...p,
    estado: getEstado(p.stock_actual, p.stock_minimo),
    categoria: categorias.find(c => c.id === p.categoria_id)?.nombre || ''
  }))

  const filtered = productosConEstado.filter(p => {
    if (filtro === 'todos') return true
    return p.estado === filtro
  })

  const productosBusqueda = useMemo(() => {
    if (!busqueda.trim()) return []
    const q = busqueda.toLowerCase()
    return productos.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.codigo?.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [busqueda, productos])

  const handleSeleccionarProducto = (p) => {
    setProductoSeleccionado(p)
    setCantidad(1)
    setPrecioUnitario(p.precio_costo || p.precio_venta || 0)
    setBusqueda('')
  }

  const handleAgregarItem = () => {
    if (!productoSeleccionado) return
    const item = {
      producto_id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      codigo: productoSeleccionado.codigo,
      cantidad,
      precio_unitario: precioUnitario,
      subtotal: cantidad * precioUnitario
    }
    setItemsOperacion([...itemsOperacion, item])
    setProductoSeleccionado(null)
    setCantidad(1)
    setPrecioUnitario(0)
  }

  const handleQuitarItem = (productoId) => {
    setItemsOperacion(itemsOperacion.filter(i => i.producto_id !== productoId))
  }

  const totalOperacion = useMemo(() =>
    itemsOperacion.reduce((sum, i) => sum + (i.cantidad || 0) * (i.precio_unitario || 0), 0),
    [itemsOperacion]
  )

  const impuestoOperacion = useMemo(() => {
    if (tipoOperacion === 'venta' && !preciosConIva && tasaImpuesto > 0) {
      return totalOperacion * (tasaImpuesto / 100)
    }
    return 0
  }, [totalOperacion, tipoOperacion, preciosConIva, tasaImpuesto])

  const totalConImpuesto = totalOperacion + impuestoOperacion

  const handleConfirmarOperacion = async () => {
    if (guardando) return
    if (itemsOperacion.length === 0) {
      dialog.alert('Agrega al menos un producto')
      return
    }
    if (!await dialog.confirm(`¿Confirmar ${tipoOperacion === 'compra' ? 'compra' : 'venta'}?`)) return

    setGuardando(true)
    try {
      for (const item of itemsOperacion) {
        const prod = productos.find(p => p.id === item.producto_id)
        const nuevoStock = tipoOperacion === 'compra'
          ? (prod?.stock_actual || 0) + item.cantidad
          : (prod?.stock_actual || 0) - item.cantidad

        await updateProducto(item.producto_id, {
          stock_actual: Math.max(0, nuevoStock),
          precio_costo: tipoOperacion === 'compra' ? item.precio_unitario : prod?.precio_costo,
          precio_venta: prod?.precio_venta
        })

        await createMovimiento({
          producto_id: item.producto_id,
          tipo: tipoOperacion === 'compra' ? 'entrada' : 'salida',
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          total: item.cantidad * item.precio_unitario,
          referencia: tipoOperacion === 'compra' ? `Compra a ${proveedores.find(p => p.id === proveedorId)?.nombre || 'proveedor'}` : 'Venta directa',
          notas: ''
        })
      }

      if (tipoOperacion === 'compra' && proveedorId) {
        await createGasto({
          monto: totalConImpuesto,
          tipo: 'egreso',
          descripcion: `Compra a proveedor - ${itemsOperacion.length} productos`,
          fecha: new Date().toISOString().split('T')[0],
          contacto_id: proveedorId
        })
      }

      await cargarDatos()
      setShowModal(false)
      setItemsOperacion([])
      setProductoSeleccionado(null)
      setBusqueda('')
      setPreciosConIva(false)
      dialog.alert('✅ Operación guardada exitosamente')
    } catch (err) {
      console.error('Error guardando operación:', err)
      dialog.alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleExport = async () => {
    try {
      const headers = ['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Precio Venta', 'Estado']
      const rows = productosConEstado.map(p => [
        p.nombre,
        p.categoria,
        p.stock_actual,
        p.stock_minimo,
        p.precio_venta,
        p.estado === 'ok' ? 'Con Stock' : p.estado === 'bajo' ? 'Stock Bajo' : 'Agotado'
      ])
      await exportReport('inventario', headers, rows)
      dialog.alert('✅ Exportado a Excel exitosamente')
    } catch (err) {
      console.error('Error exportando:', err)
      dialog.alert('Error al exportar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark">Inventario</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
            style={{ backgroundColor: tema.primary, color: '#fff' }}
          >
            <Plus size={20} />
            Entrada/Salida
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
            style={{ backgroundColor: tema.primaryDark, color: '#fff' }}
          >
            <FileDown size={20} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'ok', label: 'Con Stock' },
          { id: 'bajo', label: 'Stock Bajo' },
          { id: 'agotado', label: 'Agotados' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className="px-4 py-2 rounded-xl font-medium transition border-2"
            style={filtro === f.id ? { backgroundColor: tema.primary, color: '#fff', borderColor: tema.primary } : { borderColor: tema.border, color: tema.text, backgroundColor: tema.card }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-menta-tint rounded-xl flex items-center justify-center">
              <Package size={24} className="text-menta-dark" />
            </div>
            <div>
              <p className="text-sm">Total Productos</p>
              <p className="text-2xl font-bold text-text-dark">{productosConEstado.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-menta-tint rounded-xl flex items-center justify-center">
              <Package size={24} className="text-menta-dark" />
            </div>
            <div>
              <p className="text-sm">Con Stock</p>
              <p className="text-2xl font-bold text-green">{productosConEstado.filter(p => p.estado === 'ok').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-bg rounded-xl flex items-center justify-center">
              <Package size={24} className="text-yellow" />
            </div>
            <div>
              <p className="text-sm">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow">{productosConEstado.filter(p => p.estado === 'bajo').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm">Agotados</p>
              <p className="text-2xl font-bold text-red-600">{productosConEstado.filter(p => p.estado === 'agotado').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-menta-bg border-b border-menta-border">
            <tr>
              <th className="text-left px-6 py-4 text-sm">Producto</th>
              <th className="text-left px-6 py-4 text-sm">Categoría</th>
              <th className="text-right px-6 py-4 text-sm">Stock</th>
              <th className="text-right px-6 py-4 text-sm">Precio</th>
              <th className="text-center px-6 py-4 text-sm">Estado</th>
              <th className="text-center px-6 py-4 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-menta-border">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-menta-bg transition">
                <td className="px-6 py-4 font-medium text-text-dark">{p.nombre}</td>
                <td className="px-6 py-4">{p.categoria}</td>
                <td className="px-6 py-4 text-right font-bold text-text-dark">{p.stock_actual}</td>
                <td className="px-6 py-4 text-right">${p.precio_venta.toFixed(2)}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold`} style={{
                    backgroundColor: p.estado === 'ok' ? tema.primaryTint : p.estado === 'bajo' ? 'transparent' : tema.danger + '20',
                    color: p.estado === 'ok' ? tema.primaryDark : tema.danger
                  }}>
                    {p.estado === 'ok' ? 'Con Stock' : p.estado === 'bajo' ? 'Stock Bajo' : 'Agotado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-2 rounded-lg transition" style={{ color: tema.primaryDark }}>
                    <Filter size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-menta-border">
              <h3 className="font-bold text-text-dark flex items-center gap-2">
                {tipoOperacion === 'compra' ? (
                  <><ArrowDownCircle size={18} style={{ color: tema.primary }} /> Registrar Compra a Proveedor</>
                ) : (
                  <><ArrowUpCircle size={18} style={{ color: tema.warning }} /> Venta Rápida</>
                )}
              </h3>
              <button onClick={() => { setShowModal(false); setItemsOperacion([]); setProductoSeleccionado(null); setBusqueda(''); setPreciosConIva(false); }} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Tipo de operación */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setTipoOperacion('compra'); setItemsOperacion([]); setProductoSeleccionado(null); setPreciosConIva(false); }}
                  className={`flex-1 py-2 rounded-xl font-bold transition text-white`}
                  style={{ backgroundColor: tipoOperacion === 'compra' ? tema.primary : tema.primaryTint, color: tipoOperacion === 'compra' ? '#fff' : tema.text }}
                >
                  <ArrowDownCircle size={18} className="inline mr-1" />
                  Compra a Proveedor
                </button>
                <button
                  onClick={() => { setTipoOperacion('venta'); setItemsOperacion([]); setProductoSeleccionado(null); setPreciosConIva(false); }}
                  className={`flex-1 py-2 rounded-xl font-bold transition text-white`}
                  style={{ backgroundColor: tipoOperacion === 'venta' ? tema.warning : tema.primaryTint, color: tipoOperacion === 'venta' ? '#fff' : tema.text }}
                >
                  <ArrowUpCircle size={18} className="inline mr-1" />
                  Venta / Descontar
                </button>
              </div>

              {/* Búsqueda de producto */}
              <div className="mb-4 relative">
                <label className="block text-sm font-semibold mb-1">
                  {tipoOperacion === 'compra' ? 'Buscar producto a comprar' : 'Buscar producto a vender'}
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Código o nombre del producto..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-menta-border rounded-xl"
                    autoFocus
                  />
                </div>
                {productosBusqueda.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-menta-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {productosBusqueda.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSeleccionarProducto(p)}
                        className="w-full text-left px-4 py-3 hover:bg-menta-bg transition border-b border-menta-border last:border-b-0"
                      >
                        <p className="font-medium text-text-dark">{p.nombre}</p>
                        <p className="text-xs text-text-sub">
                          Código: {p.codigo || 'N/A'} | Stock: {p.stock_actual} |
                          Compra: ${(p.precio_costo || 0).toFixed(2)} |
                          Venta: ${(p.precio_venta || 0).toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulario de cantidad y precio */}
              {productoSeleccionado && (
                <div className="bg-menta-bg border-2 border-menta-border rounded-xl p-4 mb-4">
                  <p className="font-bold text-text-dark mb-2">
                    Producto: {productoSeleccionado.nombre} ({productoSeleccionado.codigo || 'Sin código'})
                  </p>
                  <p className="text-xs text-text-sub mb-3">
                    Stock actual: {productoSeleccionado.stock_actual}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        max={tipoOperacion === 'venta' ? productoSeleccionado.stock_actual : 99999}
                        value={cantidad}
                        onChange={e => setCantidad(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2.5 border-2 border-menta-border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        {tipoOperacion === 'compra' ? 'Precio Compra ($)' : 'Precio Venta ($)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={precioUnitario}
                        onChange={e => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 border-2 border-menta-border rounded-xl"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAgregarItem}
                    className="w-full mt-3 py-2.5 text-white rounded-xl font-bold hover:opacity-90 transition"
                    style={{ backgroundColor: tema.primaryDark }}
                  >
                    <Plus size={18} className="inline mr-1" />
                    Agregar a lista
                  </button>
                </div>
              )}

              {/* Proveedor (solo para compra) */}
              {tipoOperacion === 'compra' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-1">Proveedor</label>
                  <select
                    value={proveedorId}
                    onChange={e => setProveedorId(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-menta-border rounded-xl"
                    required
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Precios incluyen IVA (solo venta) */}
              {tipoOperacion === 'venta' && tasaImpuesto > 0 && (
                <label className="flex items-center gap-2 text-sm font-semibold mb-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preciosConIva}
                    onChange={(e) => setPreciosConIva(e.target.checked)}
                    className="w-4 h-4 accent-menta"
                  />
                  Precios incluyen IVA
                  <span className="text-xs text-text-secondary">({tasaImpuesto}% incluido)</span>
                </label>
              )}

              {/* Lista de items */}
              {itemsOperacion.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-text-dark mb-2">
                    Items a {tipoOperacion === 'compra' ? 'comprar' : 'vender'} ({itemsOperacion.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {itemsOperacion.map(item => (
                      <div key={item.producto_id} className="flex items-center justify-between p-3 bg-white border-2 border-menta-border rounded-xl">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-text-dark">{item.nombre}</p>
                          <p className="text-xs text-text-sub">
                            {item.cantidad} x ${item.precio_unitario.toFixed(2)} = ${(item.cantidad * item.precio_unitario).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleQuitarItem(item.producto_id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 p-3 rounded-xl flex flex-col items-end gap-1" style={{ backgroundColor: tema.primaryTint }}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-text-dark">Subtotal:</span>
                      <span className="font-bold" style={{ color: tema.primaryDark }}>${totalOperacion.toFixed(2)}</span>
                    </div>
                    {tipoOperacion === 'venta' && !preciosConIva && tasaImpuesto > 0 && (
                      <div className="flex items-center justify-between w-full text-sm">
                        <span className="text-text-secondary">IVA ({tasaImpuesto}%):</span>
                        <span className="font-bold" style={{ color: tema.primaryDark }}>${impuestoOperacion.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-text-dark">Total:</span>
                      <span className="text-xl font-bold" style={{ color: tema.primaryDark }}>${totalConImpuesto.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="p-4 border-t border-menta-border flex gap-3">
              <button
                onClick={() => { setShowModal(false); setItemsOperacion([]); setProductoSeleccionado(null); setBusqueda(''); setPreciosConIva(false); }}
                className="flex-1 py-3 border-2 rounded-xl font-bold transition hover:opacity-80"
                style={{ borderColor: tema.border, color: tema.text, backgroundColor: tema.card }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarOperacion}
                disabled={guardando || itemsOperacion.length === 0}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition disabled:opacity-60 disabled:cursor-not-allowed`}
                style={{ backgroundColor: tipoOperacion === 'compra' ? tema.success : tema.warning }}
              >
                {guardando ? 'Procesando...' : tipoOperacion === 'compra' ? 'Guardar Compra' : 'Guardar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog.Dialog}
    </div>
  )
}