import { useState, useEffect } from 'react'
import {
  Search, ShoppingCart, X, Receipt, CreditCard, Banknote,
  Building2, User, FileText, Plus, Minus, Tag, Coins
} from 'lucide-react'
import { getProductos, getTasaImpuesto, getCajaAbierta, addMovimientoCaja,
  getContactos, createContacto, createFactura, createFacturaItem, getMiEmpresa
} from '../services/dataService'
import { createTicket } from '../services/domain/ticketService'
import ComprobantePreview from '../components/ComprobantePreview'
import useDialog from '../hooks/useDialog.jsx'

export default function POS() {
  const dialog = useDialog()
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [recibido, setRecibido] = useState('')
  const [comprobante, setComprobante] = useState(null)

  const [tipoComprobante, setTipoComprobante] = useState('ticket')
  const [esCredito, setEsCredito] = useState(false)
  const [plazoDias, setPlazoDias] = useState(30)
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  const [clienteId, setClienteId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDocumento, setClienteDocumento] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteDireccion, setClienteDireccion] = useState('')

  const [tasaImpuesto, setTasaImpuesto] = useState(0)
  const [preciosConIva, setPreciosConIva] = useState(false)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => { loadProductos(); loadImpuesto() }, [])

  const loadImpuesto = async () => {
    try { const { tasa } = await getTasaImpuesto(); setTasaImpuesto(tasa || 0) } catch {}
  }

  const loadProductos = async () => {
    try {
      const res = await getProductos()
      setProductos(Array.isArray(res) ? res : [])
    } catch (err) {
      console.log('Offline')
      setProductos([])
    }
  }

  const agregarAlCarrito = (producto) => {
    const stock = producto.stock_actual || 0
    if (stock <= 0) {
      dialog.alert('No hay stock disponible de este producto.')
      return
    }
    const existe = carrito.find(c => c.producto_id === producto.id)
    if (existe) {
      if (existe.cantidad >= stock) {
        dialog.alert('No hay más stock disponible de este producto.')
        return
      }
      setCarrito(carrito.map(c =>
        c.producto_id === producto.id ? { ...c, cantidad: c.cantidad + 1 } : c
      ))
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio_venta,
        precio_costo: producto.precio_costo || 0,
        cantidad: 1,
        imagen_url: producto.imagen_url || ''
      }])
    }
  }

  const quitarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(c => c.producto_id !== productoId))
  }

  const cambiarCantidad = (productoId, cantidad) => {
    if (cantidad <= 0) { quitarDelCarrito(productoId); return }
    const producto = productos.find(p => p.id === productoId)
    const stockMax = producto ? (producto.stock_actual || 0) : cantidad
    setCarrito(carrito.map(c =>
      c.producto_id === productoId ? { ...c, cantidad: Math.min(cantidad, stockMax) } : c
    ))
  }

  const subtotal = carrito.reduce((acc, c) => acc + (c.precio * c.cantidad), 0)
  const tasa = Number(tasaImpuesto) || 0
  const impuesto = preciosConIva ? subtotal - subtotal / (1 + tasa / 100) : subtotal * (tasa / 100)
  const total = preciosConIva ? subtotal : subtotal + impuesto
  const esEfectivo = metodoPago === 'efectivo' && !esCredito
  const cambio = (parseFloat(recibido) || 0) - total

  const getCajeroId = () => {
    if (typeof window === 'undefined') return crypto.randomUUID()
    let cajeroId = localStorage.getItem('cajero_id')
    if (!cajeroId) {
      cajeroId = crypto.randomUUID()
      localStorage.setItem('cajero_id', cajeroId)
    }
    return cajeroId
  }

  const cobrar = async () => {
    if (carrito.length === 0) return

    const caja = await getCajaAbierta()
    if (!caja) {
      dialog.alert('Abre la caja primero (módulo Caja) para registrar la venta.')
      return
    }
    if (esEfectivo && (parseFloat(recibido) || 0) < total) {
      dialog.alert('El monto recibido es menor al total.')
      return
    }
    if (tipoComprobante === 'factura' && !clienteNombre.trim()) {
      dialog.alert('Ingresa el nombre del cliente para emitir la factura.')
      return
    }

    try {
      const ahora = new Date()
      const esFactura = tipoComprobante === 'factura'

      let contactoId = null
      if (esFactura) {
        const conts = await getContactos()
        const existente = (conts || []).find(c => clienteDocumento && c.documento === clienteDocumento)
        if (existente) {
          contactoId = existente.id
        } else {
          const r = await createContacto({
            nombre: clienteNombre,
            documento: clienteDocumento,
            telefono: clienteTelefono,
            email: clienteEmail,
            direccion: clienteDireccion,
            tipo: 'cliente'
          })
          contactoId = r.id
        }
      }

      const ticket = await createTicket({
        productos: carrito.map(c => ({
          producto_id: c.producto_id,
          cantidad: c.cantidad,
          precio: c.precio,
          precio_costo: c.precio_costo || 0,
          imagen_url: c.imagen_url || ''
        })),
        metodo_pago: esCredito ? 'credito' : metodoPago,
        cajero_id: getCajeroId(),
        turno: 'mañana',
        precios_con_iva: preciosConIva,
        tasa_impuesto: tasa
      })

      let numeroComprobante = ticket?.numero_ticket || ''
      if (esFactura) {
        const numeroFactura = `FAC-${Date.now().toString().slice(-8)}`
        const factura = await createFactura({
          contacto_id: contactoId || null,
          numero_factura: numeroFactura,
          tipo: 'factura',
          subtotal, impuesto, total,
          estado: esCredito ? 'pendiente' : 'pagado',
          fecha_emision: ahora.toISOString(),
          fecha_vencimiento: esCredito ? (fechaVencimiento || new Date(Date.now() + plazoDias * 864e5).toISOString().split('T')[0]) : null,
          precios_con_iva: preciosConIva,
          tasa_impuesto: tasa
        })
        for (const item of carrito) {
          await createFacturaItem({
            factura_id: factura.id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            total: item.precio * item.cantidad
          })
        }
        numeroComprobante = numeroFactura
      }

      const label = esFactura ? (esCredito ? 'Factura crédito' : 'Factura') : 'Venta POS'
      await addMovimientoCaja(caja.id, 'ingreso', total, label)

      const empresa = await getMiEmpresa().catch(() => ({}))
      setComprobante({
        tipo: esFactura ? 'factura' : 'ticket',
        numero: numeroComprobante,
        fecha: ahora.toLocaleString('es-MX'),
        cliente: { nombre: clienteNombre, documento: clienteDocumento },
        items: carrito.map(c => ({ nombre: c.nombre, cantidad: c.cantidad, precio: c.precio })),
        subtotal, impuesto, total,
        precios_con_iva: preciosConIva,
        tasa_impuesto: tasa,
        recibido: esEfectivo ? (parseFloat(recibido) || total) : total,
        cambio: esEfectivo ? cambio : 0,
        esCredito,
        metodoPago,
        empresa
      })
    } catch (e) {
      console.error('Error al cobrar:', e)
      dialog.alert('Ocurrió un error al registrar la venta.')
    }
  }

  const cerrarComprobante = () => {
    setComprobante(null)
    setRecibido('')
    setCarrito([])
    setClienteId(''); setClienteNombre(''); setClienteDocumento('')
    setClienteTelefono(''); setClienteEmail(''); setClienteDireccion('')
    setEsCredito(false); setTipoComprobante('ticket')
  }

  if (comprobante) {
    return <ComprobantePreview datos={comprobante} empresa={comprobante.empresa} onCerrar={cerrarComprobante} />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* PRODUCTOS */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" size={20} />
          <input
            type="text"
            placeholder="Buscar o escanear código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-white border-2 border-menta-border rounded-2xl text-text-dark text-lg placeholder:text-[#99f6e4] focus:outline-none focus:ring-2 focus:ring-menta transition"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {productos
            .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.codigo || '').toLowerCase().includes(busqueda.toLowerCase()))
            .map((p) => (
              <button
                key={p.id}
                onClick={() => agregarAlCarrito(p)}
                className="bg-white border-2 border-menta-border rounded-2xl p-4 hover:border-menta/50 hover:bg-menta-bg transition text-left group shadow-sm"
              >
                <div className="w-full h-20 bg-menta-bg border-2 border-menta-border border-menta-tint rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart size={40} className="text-text-sub opacity-50 group-hover:opacity-100 transition" />
                  )}
                </div>
                <p className="font-medium text-sm text-text-dark truncate">{p.nombre}</p>
                <p className="text-menta-dark font-bold mt-1">${p.precio_venta}</p>
                <p className="text-xs text-text-sub">Stock: {p.stock_actual}</p>
              </button>
            ))}
        </div>
      </div>

      {/* CARRITO */}
      <div className="bg-white border-2 border-menta-border rounded-2xl p-6 flex flex-col shadow-sm">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-text-dark">
          <ShoppingCart size={24} className="text-menta-darkk" />
          Venta
        </h3>

        {/* Tipo de comprobante */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTipoComprobante('ticket')}
            className={`flex-1 py-2 rounded-xl border-2 flex items-center justify-center gap-1 font-semibold ${tipoComprobante === 'ticket' ? 'bg-menta-tint border-menta-darkk' : 'border-gray-200'}`}
          >
            <Receipt size={16} /> Ticket
          </button>
          <button
            onClick={() => setTipoComprobante('factura')}
            className={`flex-1 py-2 rounded-xl border-2 flex items-center justify-center gap-1 font-semibold ${tipoComprobante === 'factura' ? 'bg-menta-tint border-menta-dark' : 'border-gray-200'}`}
          >
            <FileText size={16} /> Factura
          </button>
        </div>

        {/* Precios incluyen IVA */}
        {tasa > 0 && (
          <label className="flex items-center gap-2 text-sm font-semibold mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={preciosConIva}
              onChange={(e) => setPreciosConIva(e.target.checked)}
              className="w-4 h-4 accent-menta"
            />
            Precios incluyen IVA
            <span className="text-xs text-text-secondary">({tasa}% incluido)</span>
          </label>
        )}

        {/* Datos del cliente (solo factura) */}
        {tipoComprobante === 'factura' && (
          <div className="mb-3 p-3 bg-menta-bg border-2 border-menta-border rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0f766e]">
              <User size={16} /> Datos del cliente
            </div>
            <input type="text" placeholder="Nombre *" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="w-full p-2 border-2 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Documento" value={clienteDocumento} onChange={e => setClienteDocumento(e.target.value)} className="p-2 border-2 rounded-xl" />
              <input type="text" placeholder="Teléfono" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className="p-2 border-2 rounded-xl" />
            </div>
            <input type="text" placeholder="Email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className="w-full p-2 border-2 rounded-xl" />
            <input type="text" placeholder="Dirección" value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} className="w-full p-2 border-2 rounded-xl" />
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input type="checkbox" checked={esCredito} onChange={e => setEsCredito(e.target.checked)} className="accent-menta-darkk w-4 h-4" />
              Venta a crédito
            </label>
            {esCredito && (
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Plazo (días)" value={plazoDias} onChange={e => setPlazoDias(parseInt(e.target.value) || 0)} className="p-2 border-2 rounded-xl" />
                <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className="p-2 border-2 rounded-xl" />
              </div>
            )}
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto mb-4">
          {carrito.length === 0 ? (
            <p className="text-center py-8">Carrito vacío</p>
          ) : (
            carrito.map((item) => (
              <div key={item.producto_id} className="flex items-center justify-between bg-menta-bg border border-menta-tint rounded-xl p-3">
                <div>
                  <p className="font-medium text-sm text-text-dark">{item.nombre}</p>
                  <p className="text-sm">${item.precio} x {item.cantidad}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)} className="px-2 bg-gray-200 rounded"><Minus size={14} /></button>
                  <span className="font-bold text-green">${(item.precio * item.cantidad).toFixed(2)}</span>
                  <button onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)} className="px-2 bg-gray-200 rounded"><Plus size={14} /></button>
                  <button onClick={() => quitarDelCarrito(item.producto_id)} className="p-1 hover:bg-red-50 rounded-lg text-red-500 transition">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resumen */}
        <div className="border-t-2 border-menta-border pt-4 space-y-2">
          <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between">
            <span>{preciosConIva ? `IVA incluido (${tasa}%)` : `IVA (${tasa}%)`}</span>
            <span>{preciosConIva ? '-' : ''}${Math.abs(impuesto).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-text-dark pt-2 border-t-2 border-menta-border">
            <span>Total</span><span className="text-green">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Método de pago (oculto si es crédito) */}
        {!esCredito && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold">Método de pago:</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', icon: Banknote, label: 'Efectivo' },
                { id: 'tarjeta', icon: CreditCard, label: 'Tarjeta' },
                { id: 'transferencia', icon: Building2, label: 'Transf.' },
              ].map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => setMetodoPago(m.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition ${metodoPago === m.id ? 'border-menta bg-menta-tint font-semibold' : 'border-menta-border hover:bg-menta-bg'}`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Monto recibido + cambio (solo efectivo y no crédito) */}
        {esEfectivo && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Coins size={16} className="text-menta-dark" /> Monto recibido
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={recibido}
              onChange={e => setRecibido(e.target.value)}
              placeholder={total.toFixed(2)}
              className="w-full px-4 py-3 border-2 border-menta-border rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-menta"
            />
            <div className="flex justify-between text-sm">
              <span>Cambio:</span>
              <span className={`font-bold ${cambio >= 0 ? 'text-green' : 'text-red-500'}`}>
                ${cambio.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={cobrar}
          disabled={carrito.length === 0}
          className="btn-menta w-full mt-4 py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Tag size={24} className="inline mr-2" /> Cobrar ${total.toFixed(2)}
        </button>
      </div>
      {dialog.Dialog}
    </div>
  )
}