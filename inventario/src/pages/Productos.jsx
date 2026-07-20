import { useState, useEffect } from 'react'
import { getProductos, createProducto, updateProducto, deleteProducto, getCategorias, getUnidades, getProveedores, createCategoria, createUnidad, createContacto, getMiEmpresa, getUltimoCostoMovimiento, getProductoByCodigo } from '../services/dataService'
import { evaluarRiegoStock } from '../services/domain/productoService'
import { Plus, Trash2, X, Save, Package, ChevronDown, Upload, AlertTriangle, Pencil } from 'lucide-react'
import useDialog from '../hooks/useDialog.jsx'

export default function Productos() {
  let _cargando = false
  const dialog = useDialog()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [unidades, setUnidades] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [alertaCosto, setAlertaCosto] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    precio_venta: 0,
    precio_costo: 0,
    categoria_id: '',
    unidad_id: '',
    proveedor_id: '',
    codigo: '',
    imagen_url: '',
    tiene_iva: false,
    stock_actual: 0,
    stock_minimo: 0,
    tiempo_entrega_dias: 0,
  })

  const [showCatForm, setShowCatForm] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [showUniForm, setShowUniForm] = useState(false)
  const [newUni, setNewUni] = useState('')
  const [newUniSimbolo, setNewUniSimbolo] = useState('')
  const [showProvForm, setShowProvForm] = useState(false)
  const [newProv, setNewProv] = useState('')
  const [stockEval, setStockEval] = useState({})

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (productos.length > 0) evaluarStockProductos()
  }, [productos])

  const cargarDatos = async () => {
    if (_cargando) return
    _cargando = true
    try {
      const [prodData, catData, uniData, provData] = await Promise.all([
        getProductos(),
        getCategorias(),
        getUnidades(),
        getProveedores()
      ])
      setProductos(Array.isArray(prodData) ? prodData : [])
      setCategorias(Array.isArray(catData) ? catData : [])
      setUnidades(Array.isArray(uniData) ? uniData : [])
      setProveedores(Array.isArray(provData?.data) ? provData.data : (Array.isArray(provData) ? provData : []))
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      _cargando = false
    }
  }

  const handleCrearCategoria = async () => {
    if (!newCat.trim()) return
    try {
      const { id } = await createCategoria({ nombre: newCat.trim() })
      await cargarDatos()
      setForm({ ...form, categoria_id: id })
      setNewCat('')
      setShowCatForm(false)
    } catch (err) {
      console.error('Error creando categoría:', err)
    }
  }

  const handleCrearUnidad = async () => {
    if (!newUni.trim()) return
    try {
      const { id } = await createUnidad({
        nombre: newUni.trim(),
        simbolo: newUniSimbolo.trim() || ''
      })
      await cargarDatos()
      setForm({ ...form, unidad_id: id })
      setNewUni('')
      setNewUniSimbolo('')
      setShowUniForm(false)
    } catch (err) {
      console.error('Error creando unidad:', err)
    }
  }

  const handleCrearProveedor = async () => {
    if (!newProv.trim()) return
    try {
      const { id } = await createContacto({ nombre: newProv.trim(), tipo: 'proveedor' })
      await cargarDatos()
      setForm({ ...form, proveedor_id: id })
      setNewProv('')
      setShowProvForm(false)
    } catch (err) {
      console.error('Error creando proveedor:', err)
    }
  }

  const checkCosto = async (precioVenta, productoId = null) => {
    const pid = productoId || form.id
    if (!pid || !precioVenta || precioVenta <= 0) {
      setAlertaCosto(null)
      return
    }
    try {
      const costo = await getUltimoCostoMovimiento(pid)
      if (costo && precioVenta < costo.precio_unitario) {
        setAlertaCosto({
          costo: costo.precio_unitario,
          fecha: costo.fecha_movimiento,
          referencia: costo.referencia
        })
      } else {
        setAlertaCosto(null)
      }
    } catch {
      setAlertaCosto(null)
    }
  }

  const handlePrecioChange = (e) => {
    const val = parseFloat(e.target.value) || 0
    setForm({ ...form, precio_venta: val })
    if (val > 0) checkCosto(val)
  }

  const evaluarStockProductos = async () => {
    const evaluaciones = {}
    for (const p of productos) {
      try {
        const res = await evaluarRiegoStock(p.id)
        if (res) {
          evaluaciones[p.id] = res
        }
      } catch {}
    }
    setStockEval(evaluaciones)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const codigo = form.codigo?.trim() || ''
      if (!codigo) {
        dialog.alert('El código es obligatorio')
        return
      }

      const existente = await getProductoByCodigo(codigo)
      if (existente && existente.id !== editingId) {
        if (existente.activo == 0) {
          const reactivar = await dialog.confirm(`El código "${codigo}" ya existe en un producto oculto: "${existente.nombre}".\n\n¿Quieres reactivar ese producto en lugar de crear uno nuevo?`)
          if (reactivar) {
            await updateProducto(existente.id, {
              nombre: form.nombre,
              precio_venta: form.precio_venta || 0,
              precio_costo: form.precio_costo || 0,
              categoria_id: form.categoria_id || null,
              unidad_id: form.unidad_id || null,
              proveedor_id: form.proveedor_id || null,
              imagen_url: form.imagen_url || null,
              tiene_impuesto: form.tiene_iva ? 1 : 0,
              stock_actual: form.stock_actual || 0,
              stock_minimo: form.stock_minimo || 0,
              tiempo_entrega_dias: form.tiempo_entrega_dias || 0,
              activo: 1,
            })
            setShowForm(false)
            setEditingId(null)
            setForm({ nombre: '', precio_venta: 0, precio_costo: 0, categoria_id: '', unidad_id: '', proveedor_id: '', codigo: '', imagen_url: '', tiene_iva: false, stock_actual: 0, stock_minimo: 0, tiempo_entrega_dias: 0 })
            setAlertaCosto(null)
            cargarDatos()
            return
          }
        } else {
          dialog.alert(`El código "${codigo}" ya está en uso por el producto "${existente.nombre}". Usa otro código.`)
          return
        }
      }

      const confirmado = await dialog.confirm('¿Guardar producto?')
      if (!confirmado) return

      const dataToSend = {
        nombre: form.nombre,
        precio_venta: form.precio_venta || 0,
        precio_costo: form.precio_costo || 0,
        categoria_id: form.categoria_id || null,
        unidad_id: form.unidad_id || null,
        proveedor_id: form.proveedor_id || null,
        codigo,
        imagen_url: form.imagen_url || null,
        tiene_impuesto: form.tiene_iva ? 1 : 0,
        stock_actual: form.stock_actual || 0,
        stock_minimo: form.stock_minimo || 0,
        tiempo_entrega_dias: form.tiempo_entrega_dias || 0,
      }

      if (editingId) {
        await updateProducto(editingId, dataToSend)
      } else {
        await createProducto(dataToSend)
      }

      setShowForm(false)
      setEditingId(null)
      setForm({ nombre: '', precio_venta: 0, precio_costo: 0, categoria_id: '', unidad_id: '', proveedor_id: '', codigo: '', imagen_url: '', tiene_iva: false, stock_actual: 0, stock_minimo: 0, tiempo_entrega_dias: 0 })
      setAlertaCosto(null)
      cargarDatos()
    } catch (err) {
      console.error('Error guardando:', err)
      dialog.alert('Error: ' + (err?.message || err || 'Error desconocido'))
    }
  }

  const handleEdit = (p) => {
    setEditingId(p.id)
    setForm({
      nombre: p.nombre || '',
      precio_venta: p.precio_venta || 0,
      precio_costo: p.precio_costo || 0,
      categoria_id: p.categoria_id || '',
      unidad_id: p.unidad_id || '',
      proveedor_id: p.proveedor_id || '',
      codigo: p.codigo || '',
      imagen_url: p.imagen_url || '',
      tiene_iva: p.tiene_impuesto ? true : false,
      stock_actual: p.stock_actual || 0,
      stock_minimo: p.stock_minimo || 0,
      tiempo_entrega_dias: p.tiempo_entrega_dias || 0,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!await dialog.confirm('¿Ocultar este producto? Se conservará en reportes y contabilidad, pero dejará de verse en la lista.')) return
    try {
      await deleteProducto(id)
      cargarDatos()
    } catch (err) {
      console.error('Error ocultando:', err)
    }
  }

  const inputClass = "w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta focus:border-transparent text-text-dark"

  // En edición solo se permite modificar nombre, precio e imagen.
  // El resto (código, categoría, unidad, proveedor, stock, IVA) se bloquea
  // para evitar cambiar el código y provocar el 409 por unique(codigo).
  const editando = !!editingId
  const lockClass = (extra = '') => (editando ? `opacity-60 bg-slate-100 cursor-not-allowed ${extra}` : extra)

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Package size={28} className="text-menta-dark" /> Productos
        </h2>
        <button
          onClick={() => {
            if (!showForm) {
              setEditingId(null)
              setForm({ nombre: '', precio_venta: 0, precio_costo: 0, categoria_id: '', unidad_id: '', proveedor_id: '', codigo: '', imagen_url: '' })
            }
            setShowForm(!showForm)
          }}
          className="btn-menta flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
        >
          <Plus size={20} /> {showForm ? (editingId ? 'Cancelar edición' : 'Cancelar') : (editingId ? 'Editar Producto' : 'Nuevo Producto')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Código / SKU *</label>
              <input
                type="text"
                required
                disabled={editando}
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                className={inputClass + ' ' + lockClass()}
                placeholder="Ej: CAM-001, PROD-123"
              />
              {editando && (
                <p className="text-xs text-slate-500 mt-1">El código no se puede modificar al editar.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputClass}
                placeholder="Ej: Camisa negra"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Precio de Venta ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.precio_venta}
                onChange={handlePrecioChange}
                className={inputClass}
              />
              {alertaCosto && (
                <div className="mt-2 p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700">
                    <p className="font-bold">Precio de venta menor al costo de compra</p>
                    <p>Último costo registrado: <b>${alertaCosto.costo?.toFixed(2)}</b></p>
                    {alertaCosto.referencia && <p>Ref: {alertaCosto.referencia}</p>}
                    {alertaCosto.fecha && <p>Fecha: {new Date(alertaCosto.fecha).toLocaleDateString()}</p>}
                  </div>
                </div>
              )}

              <label className={`flex items-center gap-2 mt-2 select-none ${editando ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  disabled={editando}
                  checked={form.tiene_iva}
                  onChange={(e) => setForm({ ...form, tiene_iva: e.target.checked })}
                  className="w-4 h-4 accent-menta"
                />
                <span className="text-sm font-semibold text-text-dark">Aplica IVA</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Precio de Compra ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.precio_costo}
                onChange={(e) => setForm({ ...form, precio_costo: parseFloat(e.target.value) || 0 })}
                className={inputClass}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Imagen del producto (opcional)</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-menta-bg border-2 border-menta-border rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {form.imagen_url ? (
                    <img src={form.imagen_url} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Package size={24} className="text-menta-dark" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={form.imagen_url}
                    onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
                    className={inputClass}
                    placeholder="URL de la imagen"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('imgFileProducto').click()}
                    className="w-full px-4 py-2.5 bg-menta-bg border-2 border-menta-border rounded-xl hover:bg-menta-tint transition text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Upload size={16} /> Subir desde PC
                  </button>
                  <input
                    id="imgFileProducto"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onloadend = () => setForm({ ...form, imagen_url: reader.result })
                      reader.readAsDataURL(file)
                    }}
                  />
                </div>
              </div>
            </div>

            {['categoria_id', 'unidad_id', 'proveedor_id'].map((field) => {
              const label = field === 'categoria_id' ? 'Categoría' : field === 'unidad_id' ? 'Unidad de Medida' : 'Proveedor'
              const options = field === 'categoria_id' ? categorias : field === 'unidad_id' ? unidades : proveedores
              const showFormState = field === 'categoria_id' ? showCatForm : field === 'unidad_id' ? showUniForm : showProvForm
              const setShowFormState = field === 'categoria_id' ? setShowCatForm : field === 'unidad_id' ? setShowUniForm : setShowProvForm
              const newValueState = field === 'categoria_id' ? newCat : field === 'unidad_id' ? newUni : newProv
              const setNewValueState = field === 'categoria_id' ? setNewCat : field === 'unidad_id' ? setNewUni : setNewProv
              const crearHandler = field === 'categoria_id' ? handleCrearCategoria : field === 'unidad_id' ? handleCrearUnidad : handleCrearProveedor
              const placeholder = field === 'categoria_id' ? 'Nombre de la categoría...' : field === 'unidad_id' ? 'Nombre de la unidad (ej: Pieza, Caja)...' : 'Nombre del proveedor...'

              return (
                <div key={field}>
                  <label className="block text-sm font-semibold mb-1">{label}</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <select
                        value={form[field]}
                        disabled={editando}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        className={inputClass + ' pr-10 ' + lockClass()}
                      >
                        <option value="">-- Seleccionar --</option>
                        {(Array.isArray(options) ? options : []).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.nombre}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      disabled={editando}
                      onClick={() => setShowFormState(true)}
                      className="px-3 py-2 bg-menta-bg border-2 border-menta-border rounded-xl hover:bg-menta-tint transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Crear ${label.toLowerCase()}`}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {showFormState && (
                    <div className="mt-3 p-4 bg-menta-bg border-2 border-dashed border-menta-border rounded-xl">
                      <p className="text-sm font-bold text-[#0f766e] mb-2">Nuevo {label.toLowerCase()}</p>
                      <input
                        type="text"
                        value={newValueState}
                        onChange={(e) => setNewValueState(e.target.value)}
                        className={inputClass}
                        placeholder={placeholder}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={crearHandler}
                          className="px-4 py-2 btn-menta-light text-white rounded-xl font-bold text-sm"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowFormState(false); setNewValueState('') }}
                          className="px-4 py-2 bg-white border-2 border-menta-border rounded-xl font-bold text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>)
            })}

            <div>
              <label className="block text-sm font-semibold mb-1">Stock Actual</label>
              <input
                type="number"
                min="0"
                disabled={editando}
                value={form.stock_actual}
                onChange={(e) => setForm({ ...form, stock_actual: parseInt(e.target.value) || 0 })}
                className={inputClass + ' ' + lockClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Stock Mínimo (alerta)</label>
              <input
                type="number"
                min="0"
                disabled={editando}
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                className={inputClass + ' ' + lockClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Tiempo de Entrega (días)</label>
              <input
                type="number"
                min="0"
                value={form.tiempo_entrega_dias}
                onChange={(e) => setForm({ ...form, tiempo_entrega_dias: parseInt(e.target.value) || 0 })}
                className={inputClass}
                placeholder="Ej: 7"
              />
              <p className="text-xs text-slate-500 mt-1">Días que tarda el proveedor en reponer.</p>
            </div>
          </div>

          <div className="md:col-span-2 flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setForm({ nombre: '', precio_venta: 0, precio_costo: 0, categoria_id: '', unidad_id: '', proveedor_id: '', codigo: '', imagen_url: '', tiene_iva: false, stock_actual: 0, stock_minimo: 0, tiempo_entrega_dias: 0 })
                setAlertaCosto(null)
              }}
              className="px-6 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold text-[#0f766e] hover:bg-menta-tint transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-menta-light flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-md"
            >
              <Save size={18} /> {editingId ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-menta-bg border-b border-menta-border">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0f766e]">Producto</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0f766e]">Categoría</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0f766e]">Stock / Mín</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-[#0f766e]">Días Rest</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-[#0f766e]">% Agot</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-[#0f766e]">Stock Sugerido</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#0f766e]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-menta-border">
              {productos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-text-sub">
                      No hay productos registrados
                    </td>
                  </tr>
              ) : (
                productos.map((p) => {
                  const ev = stockEval[p.id] || {}
                  const dias = ev.diasInventarioRestante
                  const prob = ev.probabilidadAgotamiento || 0
                  const pct = prob > 0 ? Math.round(prob * 100) : 0
                  const colorProb = pct > 80 ? 'text-red-600' : pct > 50 ? 'text-orange-600' : pct > 0 ? 'text-yellow-700' : 'text-slate-500'
                  const colorDias = dias === Infinity ? 'text-slate-500' : dias <= 3 ? 'text-red-600' : dias <= 7 ? 'text-orange-600' : 'text-[#0f766e]'
                  const badgeStock = (p.stock_actual || 0) <= (p.stock_minimo || 0)
                    ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">BAJO</span>
                    : (p.stock_actual || 0) === 0
                      ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">AGOTADO</span>
                      : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">OK</span>

                  return (
                    <tr key={p.id} className="hover:bg-menta-bg transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.imagen_url && (
                            <img src={p.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-menta-border" />
                          )}
                          <div>
                            <p className="font-bold text-text-dark">{p.nombre}</p>
                            <p className="text-xs text-text-sub">{p.codigo || 'Sin código'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-menta-tint text-menta-dark rounded-full text-sm font-semibold">
                         {p.categoria_nombre || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-text-dark">{p.stock_actual || 0} uds</span>
                          <span className="text-xs text-text-sub">mín: {p.stock_minimo || 0}</span>
                          {badgeStock}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${colorDias}`}>
                          {dias === Infinity ? '—' : `${dias} d`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${colorProb}`}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-[#0f766e]">
                          {ev.stockSugerido || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(p)}
                            title="Editar producto"
                            className="p-2 hover:bg-menta-bg rounded-lg text-menta-dark transition"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Ocultar producto"
                            className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      {dialog.Dialog}
    </>
  )
}
