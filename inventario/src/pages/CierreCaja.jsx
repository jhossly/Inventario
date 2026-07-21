import { useState, useEffect, useMemo } from 'react'
import {
  getFacturas,
  getFacturaItems,
  getFacturasProveedores,
  getFacturaItemsProveedores,
  getTickets,
  getCajas,
  getMovimientosCaja,
  getPagos,
  getProductos,
} from '../services/dataService'
import {
  Calculator, RefreshCw, Package, ShoppingCart, Wallet,
  TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react'

function formatearMoneda(valor) {
  const n = Number(valor) || 0
  return `$${n.toFixed(2)}`
}

function formatearFecha(valor) {
  if (!valor) return '-'
  const d = new Date(valor)
  if (isNaN(d.getTime())) return valor
  return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export default function CierreCaja() {
  const [fecha, setFecha] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [cargando, setCargando] = useState(false)
  const [ventas, setVentas] = useState([])
  const [ventasPorTicket, setVentasPorTicket] = useState([])
  const [compras, setCompras] = useState([])
  const [itemsCompra, setItemsCompra] = useState([])
  const [cajas, setCajas] = useState([])
  const [movimientosCaja, setMovimientosCaja] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [gastos, setGastos] = useState([])
  const [debugInfo, setDebugInfo] = useState('')

  const cargar = async () => {
    setCargando(true)
    setDebugInfo('')
    try {
      const [facturas, factItems, tickets, proveedores, itemsProv, todasCajas, todosPagos, productos] = await Promise.all([
        getFacturas(),
        getFacturaItems(),
        getTickets(),
        getFacturasProveedores(),
        getFacturaItemsProveedores(),
        getCajas(),
        getPagos('ingreso'),
        getPagos('egreso'),
        getProductos(),
      ])

      const productosMap = new Map((productos || []).map(p => [String(p.id), p]))

      const filtrarDia = (fechaStr) => {
        if (!fechaStr) return false
        const d = new Date(fechaStr)
        if (isNaN(d.getTime())) {
          return String(fechaStr).slice(0, 10) === fecha
        }
        return d.toLocaleDateString('en-CA') === fecha
      }

      const facturasDia = (facturas || []).filter(f => filtrarDia(f.fecha_emision))
      const ticketsDia = (tickets || []).filter(t => filtrarDia(t.fecha_venta || t.creado_en))
      const comprasDia = (proveedores || []).filter(c => filtrarDia(c.fecha))
      const itemsCompraDia = (itemsProv || []).filter(i => comprasDia.some(c => c.id === i.factura_proveedor_id))

      const factItemsDia = (factItems || []).filter(i => facturasDia.some(f => f.id === i.factura_id))

      const ventasDetalle = []

      const ventasUnicas = new Map()

      for (const item of factItemsDia) {
        const prod = productosMap.get(String(item.producto_id)) || {}
        const precioVenta = Number(item.precio_unitario || 0)
        const costo = Number(prod.precio_costo || 0)
        const cantidad = Number(item.cantidad || 0)
        const subtotal = Number(item.total || precioVenta * cantidad)
        const beneficio = (precioVenta - costo) * cantidad
        const key = `${prod.nombre || item.producto_id}|Factura|${precioVenta}|${costo}|${cantidad}`
        if (!ventasUnicas.has(key)) {
          ventasUnicas.set(key, {
            nombre: prod.nombre || item.producto_id,
            codigo: prod.codigo || '',
            cantidad,
            precio_venta: precioVenta,
            costo_unitario: costo,
            beneficio,
            total: subtotal,
            origen: 'Factura',
          })
        }
      }

      for (const ticket of ticketsDia) {
        let items = []
        try {
          items = typeof ticket.productos === 'string' ? JSON.parse(ticket.productos) : (ticket.productos || [])
        } catch {
          items = []
        }
        for (const it of items) {
          const prod = productosMap.get(String(it.producto_id || it.id)) || {}
          const precioVenta = Number(it.precio || it.precio_venta || it.precio_unitario || 0)
          const costo = Number(prod.precio_costo || it.precio_costo || 0)
          const cantidad = Number(it.cantidad || 0)
          const subtotal = precioVenta * cantidad
          const beneficio = (precioVenta - costo) * cantidad
          const key = `${prod.nombre || it.nombre || it.producto_id || it.id}|Ticket|${precioVenta}|${costo}|${cantidad}`
          if (!ventasUnicas.has(key)) {
            ventasUnicas.set(key, {
              nombre: prod.nombre || it.nombre || it.producto_id || it.id,
              codigo: prod.codigo || '',
              cantidad,
              precio_venta: precioVenta,
              costo_unitario: costo,
              beneficio,
              total: subtotal,
              origen: 'Ticket',
            })
          }
        }
      }

      setVentas(Array.from(ventasUnicas.values()))
      setCompras(comprasDia)
      setItemsCompra(itemsCompraDia)

      // Calcular ventas agrupadas por ticket/factura
      const ventasPorTicketMap = new Map()

      // Procesar facturas
      for (const factura of facturasDia) {
        const items = (factItems || []).filter(i => i.factura_id === factura.id)
        let totalFactura = 0
        let costoFactura = 0
        for (const item of items) {
          const prod = productosMap.get(String(item.producto_id)) || {}
          const precioVenta = Number(item.precio_unitario || 0)
          const costo = Number(prod.precio_costo || 0)
          const cantidad = Number(item.cantidad || 0)
          totalFactura += Number(item.total || precioVenta * cantidad)
          costoFactura += costo * cantidad
        }
        ventasPorTicketMap.set(`Factura|${factura.id}`, {
          numero: factura.numero_factura || factura.id,
          fecha: factura.fecha_emision || factura.fecha,
          total: totalFactura || Number(factura.total || 0),
          costo: costoFactura,
          origen: 'Factura'
        })
      }

      // Procesar tickets
      for (const ticket of ticketsDia) {
        let items = []
        try {
          items = typeof ticket.productos === 'string' ? JSON.parse(ticket.productos) : (ticket.productos || [])
        } catch {
          items = []
        }
        let totalTicket = 0
        let costoTicket = 0
        for (const it of items) {
          const prod = productosMap.get(String(it.producto_id || it.id)) || {}
          const precioVenta = Number(it.precio || it.precio_venta || it.precio_unitario || 0)
          const costo = Number(prod.precio_costo || it.precio_costo || 0)
          const cantidad = Number(it.cantidad || 0)
          totalTicket += precioVenta * cantidad
          costoTicket += costo * cantidad
        }
        const key = `Ticket|${ticket.id}`
        if (!ventasPorTicketMap.has(key)) {
          ventasPorTicketMap.set(key, {
            numero: ticket.numero_ticket || ticket.id,
            fecha: ticket.fecha_venta || ticket.creado_en,
            total: totalTicket || Number(ticket.total || 0),
            costo: costoTicket,
            origen: 'Ticket'
          })
        }
      }

      const ventasPorTicketArray = Array.from(ventasPorTicketMap.values()).map(v => ({
        ...v,
        ganancia: (v.total || 0) - (v.costo || 0)
      }))
      setVentasPorTicket(ventasPorTicketArray)

      const cajasDia = (todasCajas || [])
        .filter(c => filtrarDia(c.fecha_apertura) || filtrarDia(c.fecha_cierre))
        .sort((a, b) => new Date(b.fecha_apertura || 0) - new Date(a.fecha_apertura || 0))
      setCajas(cajasDia)

      const movs = []
      const cajasParaMovimientos = cajasDia.length > 0 ? [cajasDia[0]] : []
      for (const caja of cajasParaMovimientos) {
        const ms = await getMovimientosCaja(caja.id)
        movs.push(...(ms || []))
      }
      const movsFiltrados = movs
        .filter(m => filtrarDia(m.fecha))
        .filter(m => !(m.tipo === 'ingreso' && m.descripcion === 'Apertura de caja' && Number(m.monto || 0) === 0))
      const movsUnicos = movsFiltrados.filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx)
      setMovimientosCaja(movsUnicos)

      const pagosIngreso = (todosPagos || []).filter(p => p.tipo === 'ingreso' && filtrarDia(p.fecha))
      const pagosEgreso = (todosPagos || []).filter(p => p.tipo === 'egreso' && filtrarDia(p.fecha))
      setIngresos(pagosIngreso)
      setGastos(pagosEgreso)

      setDebugInfo(`Facturas: ${facturasDia.length} | Tickets: ${ticketsDia.length} | Compras: ${comprasDia.length} | Cajas: ${cajasDia.length}`)
      console.log('[CierreCaja] fecha:', fecha, 'facturasDia:', facturasDia.length, 'ticketsDia:', ticketsDia.length, 'comprasDia:', comprasDia.length, 'ventasDetalle:', Array.from(ventasUnicas.values()).length)
    } catch (err) {
      console.error('Error cargando cierre de caja:', err)
      setDebugInfo('Error cargando datos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [fecha])

  const resumen = useMemo(() => {
    const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
    const totalCompras = compras.reduce((s, c) => s + Number(c.total || 0), 0)
    const totalBeneficio = ventas.reduce((s, v) => s + v.beneficio, 0)
    const neto = totalVentas - totalCompras
    const totalIngresos = ingresos.reduce((s, p) => s + Number(p.monto || 0), 0)
    const totalEgresos = gastos.reduce((s, p) => s + Number(p.monto || 0), 0)
    const totalMovs = movimientosCaja.reduce((s, m) => s + (m.tipo === 'ingreso' ? Number(m.monto || 0) : -Number(m.monto || 0)), 0)
    return { totalVentas, totalCompras, totalBeneficio, neto, totalIngresos, totalEgresos, totalMovs }
  }, [ventas, compras, ingresos, gastos, movimientosCaja])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Calculator size={28} className="text-menta-dark" /> Cierre de Caja
        </h2>
        <div className="flex gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-4 py-2 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta"
          />
          <button
            onClick={cargar}
            disabled={cargando}
            className="btn-menta flex items-center gap-2 px-4 py-2 rounded-xl font-bold disabled:opacity-60"
          >
            <RefreshCw size={18} /> Actualizar
          </button>
        </div>
      </div>

      {debugInfo && (
        <div className="text-xs text-text-secondary bg-menta-bg border-2 border-menta-border rounded-xl px-4 py-2">
          {debugInfo}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-menta-border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase">Ventas</p>
          <p className="text-2xl font-bold text-menta-dark mt-1">{formatearMoneda(resumen.totalVentas)}</p>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase">Compras</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatearMoneda(resumen.totalCompras)}</p>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase">Beneficio</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatearMoneda(resumen.totalBeneficio)}</p>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase">Neto</p>
          <p className={`text-2xl font-bold mt-1 ${resumen.neto >= 0 ? 'text-menta-dark' : 'text-red-600'}`}>{formatearMoneda(resumen.neto)}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-menta-border">
          <h3 className="font-bold text-text-dark flex items-center gap-2">
            <ShoppingCart size={18} /> Facturas / Tickets del Día
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-menta-bg">
              <tr>
                <th className="text-left px-4 py-3 text-sm">Número</th>
                <th className="text-left px-4 py-3 text-sm">Origen</th>
                <th className="text-left px-4 py-3 text-sm">Fecha</th>
                <th className="text-right px-4 py-3 text-sm">Total</th>
                <th className="text-right px-4 py-3 text-sm">Ganancia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-menta-border">
              {ventasPorTicket.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-text-sub">No hay ventas en esta fecha</td></tr>
              ) : ventasPorTicket.map((v, i) => (
                <tr key={i} className="hover:bg-menta-bg transition">
                  <td className="px-4 py-3 font-semibold text-text-dark">{v.numero}</td>
                  <td className="px-4 py-3 text-sm">{v.origen}</td>
                  <td className="px-4 py-3 text-sm">{formatearFecha(v.fecha)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold">${(v.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">+${(v.ganancia || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-menta-border">
          <h3 className="font-bold text-text-dark flex items-center gap-2">
            <Package size={18} /> Detalle de Ventas por Producto
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-menta-bg">
              <tr>
                <th className="text-left px-4 py-3 text-sm">Producto</th>
                <th className="text-left px-4 py-3 text-sm">Origen</th>
                <th className="text-center px-4 py-3 text-sm">Cant</th>
                <th className="text-right px-4 py-3 text-sm">Precio Venta</th>
                <th className="text-right px-4 py-3 text-sm">Costo Unit</th>
                <th className="text-right px-4 py-3 text-sm">Beneficio</th>
                <th className="text-right px-4 py-3 text-sm">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-menta-border">
              {ventas.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-text-sub">No hay ventas en esta fecha</td></tr>
              ) : ventas.map((v, i) => (
                <tr key={i} className="hover:bg-menta-bg transition">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text-dark">{v.nombre}</p>
                    <p className="text-xs text-text-sub">{v.codigo}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{v.origen}</td>
                  <td className="px-4 py-3 text-center text-sm">{v.cantidad}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatearMoneda(v.precio_venta)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatearMoneda(v.costo_unitario)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{formatearMoneda(v.beneficio)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-text-dark">{formatearMoneda(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-menta-border">
          <h3 className="font-bold text-text-dark flex items-center gap-2">
            <ShoppingCart size={18} /> Compras del Día (Facturas Proveedores)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-menta-bg">
              <tr>
                <th className="text-left px-4 py-3 text-sm">Factura</th>
                <th className="text-left px-4 py-3 text-sm">Proveedor</th>
                <th className="text-left px-4 py-3 text-sm">Fecha</th>
                <th className="text-right px-4 py-3 text-sm">Total</th>
                <th className="text-center px-4 py-3 text-sm">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-menta-border">
              {compras.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-text-sub">No hay compras en esta fecha</td></tr>
              ) : compras.map((c) => (
                <tr key={c.id} className="hover:bg-menta-bg transition">
                  <td className="px-4 py-3 font-semibold text-text-dark">{c.numero_factura}</td>
                  <td className="px-4 py-3 text-sm">{c.proveedor_nombre || c.proveedor?.nombre || '-'}</td>
                  <td className="px-4 py-3 text-sm">{c.fecha}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{formatearMoneda(c.total)}</td>
                  <td className="px-4 py-3 text-center text-sm">{c.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-menta-border">
          <h3 className="font-bold text-text-dark flex items-center gap-2">
            <Wallet size={18} /> Movimientos de Caja
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-menta-bg">
              <tr>
                <th className="text-left px-4 py-3 text-sm">Tipo</th>
                <th className="text-left px-4 py-3 text-sm">Descripción</th>
                <th className="text-left px-4 py-3 text-sm">Fecha</th>
                <th className="text-right px-4 py-3 text-sm">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-menta-border">
              {movimientosCaja.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-text-sub">No hay movimientos de caja en esta fecha</td></tr>
              ) : movimientosCaja.map((m) => (
                <tr key={m.id} className="hover:bg-menta-bg transition">
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      m.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : m.tipo === 'credito' ? 'text-orange-600' : 'bg-red-100 text-red-700'
                    }`}>
                      {m.tipo === 'ingreso' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{m.descripcion || '-'}</td>
                  <td className="px-4 py-3 text-sm">{formatearFecha(m.fecha)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-bold ${m.tipo === 'ingreso' ? 'text-green-600' : m.tipo === 'credito' ? 'text-orange-600' : 'text-red-600'}`}>
                    {formatearMoneda(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
