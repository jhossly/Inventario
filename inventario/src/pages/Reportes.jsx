import { useState, useEffect, useMemo } from 'react'
import { exportExcel, exportCSV, exportPDF } from '../utils/exportExcel'
import {
    getTickets, getPagos, getFacturasProveedores, getCajaAbierta, getMovimientosCaja, getProductos
} from '../services/dataService'
import {
    BarChart3, FileDown, Calendar, Wallet, TrendingUp, TrendingDown, ShoppingCart,
    ArrowUpCircle, ArrowDownCircle, Boxes, Scale, Printer, FileSpreadsheet, FileText
} from 'lucide-react'

function inicioDia(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function finDia(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

function calcularRango(periodo, desde, hasta) {
    const now = new Date()
    if (periodo === 'dia') return { inicio: inicioDia(now).getTime(), fin: finDia(now).getTime() }
    if (periodo === 'semana') { const s = new Date(now); s.setDate(now.getDate() - 7); return { inicio: s.getTime(), fin: now.getTime() } }
    if (periodo === 'mes') return { inicio: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), fin: now.getTime() }
    if (periodo === 'año') return { inicio: new Date(now.getFullYear(), 0, 1).getTime(), fin: now.getTime() }
    // rango personalizado
    return {
        inicio: desde ? inicioDia(desde).getTime() : 0,
        fin: hasta ? finDia(hasta).getTime() : now.getTime()
    }
}

function parseFecha(v) {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.getTime()
}

const fmt = (n) => `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function Reportes() {
    const [periodo, setPeriodo] = useState('mes')
    const [desde, setDesde] = useState('')
    const [hasta, setHasta] = useState('')
    const [datos, setDatos] = useState({ tickets: [], ingresos: [], gastos: [], compras: [], caja: null, cajaMovs: [], productos: [] })
    const [cargando, setCargando] = useState(true)
    const [mensaje, setMensaje] = useState('')

    useEffect(() => { cargar() }, [])

    const cargar = async () => {
        try {
            const [tickets, ingresos, gastos, comprasResp, caja, productos] = await Promise.all([
                getTickets().catch(() => []),
                getPagos('ingreso').catch(() => []),
                getPagos('egreso').catch(() => []),
                getFacturasProveedores().catch(() => ({ data: [] })),
                getCajaAbierta().catch(() => null),
                getProductos().catch(() => []),
            ])
            const compras = comprasResp?.data || comprasResp || []
            let cajaMovs = []
            if (caja) cajaMovs = await getMovimientosCaja(caja.id).catch(() => [])
            setDatos({ tickets, ingresos, gastos, compras, caja, cajaMovs, productos: Array.isArray(productos) ? productos : [] })
        } catch (e) {
            console.error('Error cargando reportes:', e)
        } finally {
            setCargando(false)
        }
    }

    const { inicio, fin } = useMemo(() => calcularRango(periodo, desde, hasta), [periodo, desde, hasta])

    const enRango = (fecha) => {
        const t = parseFecha(fecha)
        return t !== null && t >= inicio && t <= fin
    }

    const ventas = useMemo(() => datos.tickets.filter(t => enRango(t.fecha_venta || t.creado_en)), [datos.tickets, inicio, fin])
    const ingresos = useMemo(() => datos.ingresos.filter(p => enRango(p.fecha)), [datos.ingresos, inicio, fin])
    const gastos = useMemo(() => datos.gastos.filter(p => enRango(p.fecha)), [datos.gastos, inicio, fin])
    const compras = useMemo(() => datos.compras.filter(c => enRango(c.fecha)), [datos.compras, inicio, fin])

    const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0)
    const totalIngresos = ingresos.reduce((s, p) => s + (p.monto || 0), 0)
    const totalGastos = gastos.reduce((s, p) => s + (p.monto || 0), 0)
    const totalCompras = compras.reduce((s, c) => s + (c.total || 0), 0)

    // Calcular costo y ganancia de ventas
    let costoVentas = 0
    const ventasConGanancia = ventas.map(v => {
      let costo = 0
      let prods = []
      try {
        const parsed = JSON.parse(v.productos || '[]')
        prods = Array.isArray(parsed) ? parsed : []
      } catch {}
      costo = prods.reduce((a, p) => a + ((p.precio_costo || 0) * (p.cantidad || 1)), 0)
      costoVentas += costo
      return { ...v, costo, ganancia: (v.total || 0) - costo }
    })
    const gananciaVentas = ventasConGanancia.reduce((s, v) => s + v.ganancia, 0)

    // Detalle de ventas por producto
    const detalleVentasPorProducto = useMemo(() => {
      const rows = []
      ventasConGanancia.forEach(v => {
        let prods = []
        try {
          const parsed = JSON.parse(v.productos || '[]')
          prods = Array.isArray(parsed) ? parsed : []
        } catch {}
        prods.forEach(p => {
          const precioVenta = p.precio || p.precio_venta || 0
          const precioCosto = p.precio_costo || 0
          const cantidad = p.cantidad || 1
          const ganancia = (precioVenta - precioCosto) * cantidad
          rows.push({
            Ticket: v.numero_ticket || '',
            Fecha: v.fecha_venta ? new Date(v.fecha_venta).toLocaleDateString('es-MX') : '',
            Producto: p.nombre || p.producto_id || '',
            Cantidad: cantidad,
            'Precio Venta': precioVenta,
            'Precio Costo': precioCosto,
            Ganancia: ganancia
          })
        })
      })
      return rows
    }, [ventasConGanancia])

    const utilidad = totalVentas + totalIngresos - totalGastos - totalCompras

    const productosRentabilidad = useMemo(() => {
        return datos.productos
            .filter(p => (p.precio_venta || 0) > 0 || (p.precio_costo || 0) > 0)
            .map(p => {
                const costo = p.precio_costo || 0
                const venta = p.precio_venta || 0
                const gananciaUnitaria = venta - costo
                const margen = venta > 0 ? ((gananciaUnitaria / venta) * 100) : 0
                const stock = p.stock_actual || 0
                const gananciaPotencial = gananciaUnitaria * stock
                return {
                    Producto: p.nombre || p.codigo || 'Sin nombre',
                    'Precio Compra': fmt(costo),
                    'Precio Venta': fmt(venta),
                    'Ganancia/unidad': fmt(gananciaUnitaria),
                    'Margen %': `${margen.toFixed(1)}%`,
                    Stock: stock,
                    'Ganancia Potencial': fmt(gananciaPotencial),
                }
            })
    }, [datos.productos])

    const saldoCaja = datos.cajaMovs.reduce((s, m) => s + ((m.tipo === 'ingreso' ? 1 : -1) * (m.monto || 0)), 0)

    const kpis = [
        { id: 'ventas', nombre: 'Ventas', valor: fmt(totalVentas), icon: ShoppingCart, color: 'text-[#22c55e]' },
        { id: 'ganancia', nombre: 'Ganancia Ventas', valor: fmt(gananciaVentas), icon: TrendingUp, color: 'text-[#0d9488]' },
        { id: 'ingresos', nombre: 'Ingresos', valor: fmt(totalIngresos), icon: ArrowUpCircle, color: 'text-[#14b8a6]' },
        { id: 'gastos', nombre: 'Gastos', valor: fmt(totalGastos), icon: ArrowDownCircle, color: 'text-red-500' },
        { id: 'compras', nombre: 'Compras', valor: fmt(totalCompras), icon: Boxes, color: 'text-[#eab308]' },
        { id: 'utilidad', nombre: 'Utilidad / Cuadre', valor: fmt(utilidad), icon: Scale, color: utilidad >= 0 ? 'text-[#22c55e]' : 'text-red-500' },
        { id: 'caja', nombre: 'Saldo en Caja', valor: fmt(saldoCaja), icon: Wallet, color: 'text-[#0d9488]' },
    ]

    const sufijo = periodo === 'rango' ? `reporte_${desde}_a_${hasta}` : `reporte_${periodo}`

    const ventasRows = ventasConGanancia.map(v => ({
        Fecha: (v.fecha_venta || v.creado_en) ? new Date(v.fecha_venta || v.creado_en).toLocaleDateString('es-MX') : '',
        Ticket: v.numero_ticket || '',
        Total: (v.total || 0).toFixed(2),
        Ganancia: (v.ganancia || 0).toFixed(2),
        Método: v.metodo_pago || '',
    }))
    const ingresosRows = ingresos.map(p => ({
        Fecha: p.fecha ? new Date(p.fecha).toLocaleDateString('es-MX') : '',
        Motivo: p.motivo || '',
        Detalle: p.descripcion || '',
        Monto: (p.monto || 0).toFixed(2),
    }))
    const gastosRows = gastos.map(p => ({
        Fecha: p.fecha ? new Date(p.fecha).toLocaleDateString('es-MX') : '',
        Motivo: p.motivo || '',
        Detalle: p.descripcion || '',
        Monto: (p.monto || 0).toFixed(2),
    }))
    const comprasRows = compras.map(c => ({
        Fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-MX') : '',
        Factura: c.numero_factura || '',
        Total: (c.total || 0).toFixed(2),
        Estado: c.estado || '',
    }))

    const exportarSeccion = async (tipo) => {
        const map = {
            ventas: { rows: ventasRows, cols: [
                { key: 'Fecha', header: 'Fecha' }, { key: 'Ticket', header: 'Ticket' },
                { key: 'Total', header: 'Total' }, { key: 'Ganancia', header: 'Ganancia' }, { key: 'Método', header: 'Método' }], name: 'ventas' },
            ingresos: { rows: ingresosRows, cols: [
                { key: 'Fecha', header: 'Fecha' }, { key: 'Motivo', header: 'Motivo' },
                { key: 'Detalle', header: 'Detalle' }, { key: 'Monto', header: 'Monto' }], name: 'ingresos' },
            gastos: { rows: gastosRows, cols: [
                { key: 'Fecha', header: 'Fecha' }, { key: 'Motivo', header: 'Motivo' },
                { key: 'Detalle', header: 'Detalle' }, { key: 'Monto', header: 'Monto' }], name: 'gastos' },
            compras: { rows: comprasRows, cols: [
                { key: 'Fecha', header: 'Fecha' }, { key: 'Factura', header: 'Factura' },
                { key: 'Total', header: 'Total' }, { key: 'Estado', header: 'Estado' }], name: 'compras' },
            rentabilidad: { rows: productosRentabilidad, cols: [
                { key: 'Producto', header: 'Producto' }, { key: 'Precio Compra', header: 'Precio Compra' },
                { key: 'Precio Venta', header: 'Precio Venta' }, { key: 'Ganancia/unidad', header: 'Ganancia/unidad' },
                { key: 'Margen %', header: 'Margen %' }, { key: 'Stock', header: 'Stock' },
                { key: 'Ganancia Potencial', header: 'Ganancia Potencial' }], name: 'rentabilidad' },
        }
        return map[tipo]
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
                    <BarChart3 size={28} className="text-menta-dark" /> Reportes
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => exportExcel([...ventasRows, ...ingresosRows, ...gastosRows, ...comprasRows], sufijo)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition">
                        <FileSpreadsheet size={18} /> Excel
                    </button>
                    <button onClick={() => exportCSV([...ventasRows, ...ingresosRows, ...gastosRows, ...comprasRows], sufijo)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#0d9488] text-white rounded-xl font-bold hover:bg-[#0f766e] transition">
                        <FileText size={18} /> CSV
                    </button>
                    <button onClick={() => exportPDF([...ventasRows, ...ingresosRows, ...gastosRows, ...comprasRows].length ? [...ventasRows, ...ingresosRows, ...gastosRows, ...comprasRows] : [{ 'Sin datos': '—' }],
                        [{ key: 'Fecha', header: 'Fecha' }, { key: 'Ticket', header: 'Ticket' }, { key: 'Motivo', header: 'Motivo' }, { key: 'Total', header: 'Total' }, { key: 'Monto', header: 'Monto' }, { key: 'Factura', header: 'Factura' }], sufijo, 'Reporte consolidado')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">
                        <Printer size={18} /> PDF
                    </button>
                </div>
            </div>

            {mensaje && (
                <div className="fixed top-4 right-4 z-50 bg-[#0f766e] text-white px-5 py-3 rounded-xl shadow-lg font-semibold text-sm animate-pulse">
                    {mensaje}
                </div>
            )}

            {/* Periodo */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'dia', label: 'Hoy' },
                    { id: 'semana', label: 'Semana' },
                    { id: 'mes', label: 'Mes' },
                    { id: 'año', label: 'Año' },
                    { id: 'rango', label: 'Rango' },
                ].map((p) => (
                    <button key={p.id}
                        onClick={() => setPeriodo(p.id)}
                        className={`px-4 py-2 rounded-xl font-medium transition ${
                            periodo === p.id ? 'btn-menta shadow-md' : 'bg-white border-2 border-menta-border text-black hover:bg-menta-bg'
                        }`}>
                        {p.label}
                    </button>
                ))}
            </div>

            {periodo === 'rango' && (
                <div className="flex flex-wrap gap-3 items-end bg-menta-bg border-2 border-menta-border rounded-2xl p-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Desde</label>
                        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="px-4 py-2.5 border-2 border-menta-border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Hasta</label>
                        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="px-4 py-2.5 border-2 border-menta-border rounded-xl" />
                    </div>
                </div>
            )}

            {cargando ? (
                <p className="text-menta-dark font-bold">Cargando reportes…</p>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kpis.map(k => (
                            <div key={k.id} className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <k.icon size={30} className={k.color} />
                                    <Calendar size={18} className="text-text-sub" />
                                </div>
                                <p className="text-sm text-text-muted">{k.nombre}</p>
                                <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.valor}</p>
                            </div>
                        ))}
                    </div>

                    {/* Secciones con tablas y export por sección */}
                    <SeccionReporte titulo="Facturas de Venta" icon={ShoppingCart} color="text-[#22c55e]"
                        columnas={[{ k: 'Fecha', h: 'Fecha' }, { k: 'Ticket', h: 'Ticket' }, { k: 'Total', h: 'Total' }, { k: 'Ganancia', h: 'Ganancia' }, { k: 'Método', h: 'Método' }]}
                        filas={ventasRows} onExport={async (f) => { const s = await exportarSeccion('ventas'); aplicarExport(s, f, sufijo + '_ventas') }} />

                    <SeccionReporte titulo="Detalle de Ventas por Producto" icon={TrendingUp} color="text-[#8b5cf6]"
                        columnas={[{ k: 'Ticket', h: 'Ticket' }, { k: 'Fecha', h: 'Fecha' }, { k: 'Producto', h: 'Producto' }, { k: 'Cantidad', h: 'Cantidad' }, { k: 'Precio Venta', h: 'Precio Venta' }, { k: 'Precio Costo', h: 'Precio Costo' }, { k: 'Ganancia', h: 'Ganancia' }]}
                        filas={detalleVentasPorProducto} onExport={async (f) => { const s = await exportarSeccion('rentabilidad'); aplicarExport(s, f, sufijo + '_detalle_ventas') }} />

                    <SeccionReporte titulo="Ingresos" icon={ArrowUpCircle} color="text-[#14b8a6]"
                        columnas={[{ k: 'Fecha', h: 'Fecha' }, { k: 'Motivo', h: 'Motivo' }, { k: 'Detalle', h: 'Detalle' }, { k: 'Monto', h: 'Monto' }]}
                        filas={ingresosRows} onExport={async (f) => { const s = await exportarSeccion('ingresos'); aplicarExport(s, f, sufijo + '_ingresos') }} />

                    <SeccionReporte titulo="Gastos" icon={ArrowDownCircle} color="text-red-500"
                        columnas={[{ k: 'Fecha', h: 'Fecha' }, { k: 'Motivo', h: 'Motivo' }, { k: 'Detalle', h: 'Detalle' }, { k: 'Monto', h: 'Monto' }]}
                        filas={gastosRows} onExport={async (f) => { const s = await exportarSeccion('gastos'); aplicarExport(s, f, sufijo + '_gastos') }} />

                    <SeccionReporte titulo="Compras a Proveedores" icon={Boxes} color="text-[#eab308]"
                        columnas={[{ k: 'Fecha', h: 'Fecha' }, { k: 'Factura', h: 'Factura' }, { k: 'Total', h: 'Total' }, { k: 'Estado', h: 'Estado' }]}
                        filas={comprasRows} onExport={async (f) => { const s = await exportarSeccion('compras'); aplicarExport(s, f, sufijo + '_compras') }} />

                    <SeccionReporte titulo="Rentabilidad por Producto" icon={TrendingUp} color="text-[#8b5cf6]"
                        columnas={[{ k: 'Producto', h: 'Producto' }, { k: 'Precio Compra', h: 'Precio Compra' }, { k: 'Precio Venta', h: 'Precio Venta' }, { k: 'Ganancia/unidad', h: 'Ganancia/unidad' }, { k: 'Margen %', h: 'Margen %' }, { k: 'Stock', h: 'Stock' }, { k: 'Ganancia Potencial', h: 'Ganancia Potencial' }]}
                        filas={productosRentabilidad} onExport={async (f) => { const s = await exportarSeccion('rentabilidad'); aplicarExport(s, f, sufijo + '_rentabilidad') }} />
                </>
            )}
        </div>
    )
}

function aplicarExport(seccion, formato, nombre) {
    if (formato === 'excel') exportExcel(seccion.rows, nombre)
    else if (formato === 'csv') exportCSV(seccion.rows, nombre)
    else if (formato === 'pdf') exportPDF(seccion.rows, seccion.cols, nombre, nombre)

    if (nombre) {
        const ext = formato === 'excel' ? 'xlsx' : formato
        setMensaje(`Archivo descargado: ${nombre}.${ext}`)
        setTimeout(() => setMensaje(''), 3000)
    }
}

function SeccionReporte({ titulo, icon: Icon, color, columnas, filas, onExport }) {
    const [ver, setVer] = useState(false)
    return (
        <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center gap-2 text-text-dark">
                    <Icon size={20} className={color} /> {titulo}
                    <span className="text-sm font-normal text-text-muted">({filas.length})</span>
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setVer(!ver)} className="text-sm px-3 py-1.5 rounded-lg border-2 border-menta-border hover:bg-menta-bgfont-semibold">
                        {ver ? 'Ocultar' : 'Ver'}
                    </button>
                    <button onClick={() => onExport('excel')} className="text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700">Excel</button>
                    <button onClick={() => onExport('csv')} className="text-sm px-3 py-1.5 rounded-lg bg-[#0d9488] text-white font-semibold hover:bg-[#0f766e]">CSV</button>
                    <button onClick={() => onExport('pdf')} className="text-sm px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600">PDF</button>
                </div>
            </div>
            {ver && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-menta-bg">
                            <tr>{columnas.map(c => <th key={c.k} className="text-left px-4 py-2">{c.h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-menta-border">
                            {filas.length === 0 ? (
                                <tr><td colSpan={columnas.length} className="text-center py-6 text-text-sub">Sin registros en el período</td></tr>
                            ) : filas.map((f, i) => (
                                <tr key={i}>
                                    {columnas.map(c => <td key={c.k} className="px-4 py-2">{f[c.h]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             )}
        </div>
    )
}
