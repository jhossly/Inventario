import { useState, useEffect, useMemo } from 'react'
import {
  getFacturasProveedores,
  createFacturaProveedor,
  deleteFacturaProveedor,
  getProductosByProveedor,
  createFacturaItemProveedor,
  getProveedores,
  getEmpresas,
  createGasto,
  updateProducto,
  createMovimiento,
  getMiEmpresa,
  getProductos
} from '../services/dataService'
import { updateProducto as updateProductoApi } from '../services/api'
import { Plus, Trash2, X, Save, FileText, Package, AlertTriangle, Search } from 'lucide-react'
import useDialog from '../hooks/useDialog.jsx'

export default function FacturasProveedores() {
  const dialog = useDialog()
  const [showForm, setShowForm] = useState(false)
  const [facturas, setFacturas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [preciosConIva, setPreciosConIva] = useState(false)
  const [tasaIva, setTasaIva] = useState(15)
  const [productos, setProductos] = useState([])
  const [items, setItems] = useState([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [facData, provData, empresasData, emp] = await Promise.all([
        getFacturasProveedores(),
        getProveedores(),
        getEmpresas(),
        getMiEmpresa()
      ])
      setFacturas(Array.isArray(facData) ? facData : [])
      setProveedores(Array.isArray(provData?.data) ? provData.data : [])
      if (emp?.tasa_impuesto) setTasaIva(Number(emp.tasa_impuesto))
    } catch (err) {
      console.log('Error cargando datos:', err)
    }

    try {
      const prodData = await getProductos()
      setProductos(Array.isArray(prodData) ? prodData : [])
    } catch (err) {
      console.log('Error cargando productos:', err)
    }
  }

  const handleProveedorChange = async (e) => {
    const id = e.target.value
    setProveedorId(id)
    setItems([])
    if (id) {
      try {
        const { data } = await getProductosByProveedor(id)
        setProductos(data || [])
      } catch (err) {
        console.error('Error cargando productos:', err)
        setProductos([])
      }
    } else {
      setProductos([])
    }
  }

  const handleAgregarItem = (producto) => {
    if (items.find(i => i.producto_id === producto.id)) {
      dialog.alert('Este producto ya está en la factura')
      return
    }
    setItems([...items, {
      producto_id: producto.id,
      nombre: producto.nombre,
      codigo: producto.codigo,
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0
    }])
  }

  const handlePrecioChange = (index, nuevoPrecio) => {
    const newItems = [...items]
    newItems[index].precio_unitario = parseFloat(nuevoPrecio) || 0
    setItems(newItems)
  }

  const handleCantidadChange = (index, cantidad) => {
    const newItems = [...items]
    newItems[index].cantidad = parseInt(cantidad) || 0
    setItems(newItems)
  }

  const handleEliminarItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const baseTotal = useMemo(() =>
    items.reduce((sum, i) => sum + ((i.precio_unitario || 0) * (i.cantidad || 0)), 0),
    [items]
  )

  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q)
    )
  }, [busquedaProducto, productos])

  const ivaCalculado = useMemo(() => {
    const tasa = Number(tasaIva) || 15
    if (baseTotal <= 0) return 0
    if (preciosConIva) {
      const neto = baseTotal / (1 + tasa / 100)
      return baseTotal - neto
    }
    return baseTotal * (tasa / 100)
  }, [baseTotal, preciosConIva, tasaIva])

  const netoCalculado = useMemo(() => {
    if (baseTotal <= 0) return 0
    if (preciosConIva) {
      return baseTotal / (1 + (Number(tasaIva) || 15) / 100)
    }
    return baseTotal
  }, [baseTotal, preciosConIva, tasaIva])

  const totalFactura = useMemo(() => {
    if (preciosConIva) return baseTotal
    return baseTotal + ivaCalculado
  }, [baseTotal, preciosConIva, ivaCalculado])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (guardando) return
    if (!proveedorId) return dialog.alert('Selecciona un proveedor')
    if (items.length === 0) return dialog.alert('Agrega al menos un producto')
    if (!await dialog.confirm('¿Guardar factura de proveedor?')) return

    setGuardando(true)
    try {
      const total = preciosConIva ? baseTotal : totalFactura

      const { data: factura, error: factError } = await createFacturaProveedor({
        numero_factura: numeroFactura || `FP-${Date.now()}`,
        proveedor_id: proveedorId,
        fecha: fecha,
        total: total,
        estado: 'pagada',
        precios_con_iva: preciosConIva
      })

      if (factError) throw factError

      let currentProductos = productos
      for (const item of items) {
        const cantidad = item.cantidad || 0
        const precioUnitario = item.precio_unitario || 0
        const subtotal = cantidad * precioUnitario

        await createFacturaItemProveedor({
          factura_proveedor_id: factura.id,
          producto_id: item.producto_id,
          cantidad,
          precio_unitario: precioUnitario,
          subtotal
        })

        const productoActual = currentProductos.find(p => p.id === item.producto_id)
        const nuevoStock = (productoActual?.stock_actual || 0) + cantidad

        await updateProducto(item.producto_id, {
          stock_actual: nuevoStock,
          precio_costo: precioUnitario
        })

        try {
          const result = await updateProductoApi(item.producto_id, { stock_actual: nuevoStock, precio_costo: precioUnitario })
          if (result.error) {
            console.error('Error actualizando stock/costo en Supabase:', result.error)
          }
        } catch (e) {
          console.error('Error sincronizando stock/costo:', e)
        }

        currentProductos = currentProductos.map(p =>
          p.id === item.producto_id ? { ...p, stock_actual: nuevoStock, precio_costo: precioUnitario } : p
        )

        await createMovimiento({
          producto_id: item.producto_id,
          tipo: 'entrada',
          cantidad,
          precio_unitario: precioUnitario,
          total: subtotal,
          referencia: factura.numero_factura,
          notas: `Compra a proveedor - Factura: ${factura.numero_factura}`
        })
      }
      setProductos(currentProductos)

      await createGasto({
        monto: total,
        tipo: 'egreso',
        descripcion: `Factura proveedor ${factura.numero_factura}`,
        fecha: fecha,
        contacto_id: proveedorId
      })

      setShowForm(false)
      setItems([])
      setProveedorId('')
      setPreciosConIva(false)
      setNumeroFactura('')
      setProductos(currentProductos)

      try {
        const facData = await getFacturasProveedores()
        setFacturas(Array.isArray(facData) ? facData : [])
      } catch (err) {
        console.log('Error recargando facturas:', err)
      }

    } catch (err) {
      console.error('Error guardando:', err)
      dialog.alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleDelete = async (id) => {
    if (!await dialog.confirm('¿Eliminar factura?')) return
    try {
      await deleteFacturaProveedor(id)
      cargarDatos()
    } catch (err) {
      console.error('Error eliminando factura:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={28} className="text-menta-dark" /> Facturas de Proveedores
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-menta flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
        >
          <Plus size={20} /> Nueva Factura Proveedor
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-dark">Nueva Factura de Proveedor</h3>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-menta-bg rounded-lg">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">N° Factura</label>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
                  placeholder="FP-001"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Proveedor *</label>
                <select
                  required
                  value={proveedorId}
                  onChange={handleProveedorChange}
                  className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.ruc ? `(${c.ruc})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {proveedorId && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preciosConIva}
                    onChange={(e) => setPreciosConIva(e.target.checked)}
                    className="w-4 h-4 accent-menta"
                  />
                  <span className="text-sm font-semibold text-text-dark">Precios incluyen IVA</span>
                </label>
                {preciosConIva && (
                  <span className="text-xs text-[#64748b]">(Se desglosará el IVA {tasaIva}% incluido)</span>
                )}
              </div>
            )}

            {proveedorId && productos.length > 0 && (
              <div className="bg-menta-bg border-2 border-menta-border rounded-xl p-4">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <Package size={18} /> Productos de este proveedor:
                </h4>
                <div className="mb-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta transition"
                      placeholder="Buscar por nombre o código..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {productosFiltrados.map(p => (
                    <div key={p.id} className="bg-white border-2 border-menta-border rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-text-dark">{p.nombre}</p>
                        <p className="text-xs">{p.codigo} | Stock: {p.stock_actual}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAgregarItem(p)}
                        className="btn-menta px-3 py-2 rounded-lg transition text-sm font-bold"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                  {productosFiltrados.length === 0 && (
                    <div className="col-span-full text-center text-sm text-gray-500 py-2">
                      No se encontraron productos
                    </div>
                  )}
                </div>
              </div>
            )}

            {proveedorId && productos.length === 0 && (
              <div className="bg-white border-2 border-menta-border rounded-xl p-4 text-center">
                No hay productos asociados a este proveedor
              </div>
            )}

            {items.length > 0 && (
              <div className="bg-white border-2 border-menta-border rounded-xl p-4">
                <h4 className="font-bold text-text-dark mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-yellow" /> Items
                </h4>
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const cantidad = item.cantidad || 0
                    const precio = item.precio_unitario || 0
                    const subtotal = cantidad * precio
                    return (
                      <div key={index} className="bg-white border-2 border-menta-border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-text-dark">{item.nombre}</p>
                          <p className="text-xs">{item.codigo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold">Cant:</label>
                          <input
                            type="number"
                            min="1"
                            value={cantidad}
                            onChange={(e) => handleCantidadChange(index, e.target.value)}
                            className="w-20 px-3 py-2 bg-white border-2 border-menta-border rounded-lg text-center"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold">Precio:</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={precio}
                            onChange={(e) => handlePrecioChange(index, e.target.value)}
                            className="w-28 px-3 py-2 bg-yellow-bg border-2 border-[#fde68a] rounded-lg text-center font-bold"
                          />
                        </div>
                        <div className="text-right min-w-20">
                          <p className="font-bold text-green">${subtotal.toFixed(2)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarItem(index)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-4 bg-menta-bg rounded-xl space-y-2">
                  {preciosConIva ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Subtotal (neto)</span>
                        <span className="font-bold">${netoCalculado.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-yellow">
                        <span>IVA {tasaIva}% incluido</span>
                        <span className="font-bold">${ivaCalculado.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-base border-t border-menta-border pt-2">
                        <span className="font-bold">TOTAL (con IVA)</span>
                        <span className="font-bold text-menta-dark">${totalFactura.toFixed(4)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Subtotal (sin IVA)</span>
                        <span className="font-bold">${baseTotal.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-yellow">
                        <span>IVA {tasaIva}%</span>
                        <span className="font-bold">${ivaCalculado.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-base border-t border-menta-border pt-2">
                        <span className="font-bold">TOTAL</span>
                        <span className="font-bold text-menta-dark">${totalFactura.toFixed(4)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold hover:bg-menta-tint transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="btn-menta flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {guardando ? 'Guardando...' : 'Guardar Factura'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-menta-bg border-b border-menta-border">
              <tr>
                <th className="text-left px-6 py-4 text-sm">N° Factura</th>
                <th className="text-left px-6 py-4 text-sm">Proveedor</th>
                <th className="text-left px-6 py-4 text-sm">Fecha</th>
                <th className="text-left px-6 py-4 text-sm">Estado</th>
                <th className="text-right px-6 py-4 text-sm">Total</th>
                <th className="text-center px-6 py-4 text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-menta-border">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">No hay facturas de proveedores</td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-menta-bg transition">
                    <td className="px-6 py-4 font-bold text-text-dark">{f.numero_factura}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-menta-tint rounded-full text-sm font-semibold">
                        {f.proveedor_nombre || f.proveedor?.nombre || 'Sin proveedor'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{f.fecha}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        f.estado === 'pendiente' ? 'bg-menta-tint' :
                        f.estado === 'pagada' ? 'text-green-700' :
                        'text-red-600'
                      }`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">${f.total?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(f.id)}
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
