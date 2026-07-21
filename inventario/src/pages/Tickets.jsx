import { useState, useEffect, useMemo } from 'react'
import { getTickets, getTicketById, getMiEmpresa } from '../services/dataService'
import { Printer, Eye, Search } from 'lucide-react'
import ComprobantePreview from '../components/ComprobantePreview'

function ParseJSONSafe(value, fallback = []) {
    try { const v = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(v) ? v : fallback }
    catch { return fallback }
}

export default function Tickets() {
    const [tickets, setTickets] = useState([])
    const [empresa, setEmpresa] = useState({})
    const [cargando, setCargando] = useState(true)
    const [texto, setTexto] = useState('')
    const [ticketSeleccionado, setTicketSeleccionado] = useState(null)

    const cargar = async () => {
        setCargando(true)
        try {
            const [ts, emp] = await Promise.all([getTickets().catch(() => []), getMiEmpresa().catch(() => ({}))])
            setTickets(ts || [])
            setEmpresa(emp || {})
        } catch (e) {
            console.error('Error cargando tickets:', e)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    const filtrados = useMemo(() => {
        const q = texto.trim().toLowerCase()
        if (!q) return tickets
        return tickets.filter(t => {
            const fecha = (t.fecha_venta || t.creado_en || '').toString().toLowerCase()
            const num = (t.numero_ticket || '').toLowerCase()
            const total = (t.total || '').toString()
            const metodo = (t.metodo_pago || '').toLowerCase()
            return num.includes(q) || fecha.includes(q) || total.includes(q) || metodo.includes(q)
        })
    }, [tickets, texto])

    const abrir = async (ticket) => {
        const t = ticket._raw || await getTicketById(ticket.id) || ticket
        const fecha = t.fecha_venta || t.creado_en
        const fechaFmt = fecha ? new Date(fecha).toLocaleString('es-MX') : ''
        const productos = ParseJSONSafe(t.productos, [])
        setTicketSeleccionado({
            tipo: 'ticket',
            numero: t.numero_ticket || ticket.numero_ticket || '',
            fecha: fechaFmt,
            cliente: {},
            items: productos.map(p => ({
                nombre: p.nombre || p.producto_nombre || 'Producto',
                cantidad: p.cantidad || 1,
                precio: p.precio || p.precio_unitario || 0
            })),
            subtotal: t.subtotal || 0,
            impuesto: t.impuesto || 0,
            total: t.total || 0,
            recibido: t.total || 0,
            cambio: 0,
            esCredito: t.metodo_pago === 'credito',
            metodoPago: t.metodo_pago || 'efectivo',
            empresa
        })
    }

    const cerrarComprobante = () => setTicketSeleccionado(null)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
                    <Printer size={28} className="text-menta-dark" /> Tickets / Comprobantes
                </h2>
                <button onClick={cargar} className="px-4 py-2.5 bg-menta-dark text-white rounded-xl font-bold hover:bg-[#0d9488] transition">
                    Actualizar
                </button>
            </div>

            <div className="bg-white border-2 border-menta-border rounded-2xl p-4">
                <div className="flex items-center gap-2">
                    <Search size={20} className="text-menta-dark" />
                    <input
                        type="text"
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        placeholder="Buscar por ticket, fecha, total o método..."
                        className="w-full px-4 py-2.5 border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta"
                    />
                </div>
            </div>

            {cargando ? (
                <p className="text-menta-dark font-bold text-center py-10">Cargando tickets…</p>
            ) : filtrados.length === 0 ? (
                <p className="text-text-subfont-bold text-center py-10 border-2 border-dashed border-menta-borderrderrounded-2xl">Sin tickets registrados</p>
            ) : (
                <div className="overflow-x-auto bg-white border-2 border-menta-border rounded-2xl">
                    <table className="w-full text-sm">
                        <thead className="bg-menta-bg">
                            <tr>
                                <th className="text-left px-4 py-3">Ticket</th>
                                <th className="text-left px-4 py-3">Fecha</th>
                                <th className="text-left px-4 py-3">Método</th>
                                <th className="text-right px-4 py-3">Total</th>
                                <th className="text-center px-4 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-menta-border">
                            {filtrados.map((t, i) => {
                                const fecha = t.fecha_venta || t.creado_en
                                const fechaStr = fecha ? new Date(fecha).toLocaleString('es-MX') : '—'
                                return (
                                    <tr key={t.id || i} className="hover:bg-menta-bg">
                                        <td className="px-4 py-3 font-medium">{t.numero_ticket || '—'}</td>
                                        <td className="px-4 py-3">{fechaStr}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${t.metodo_pago === 'credito' ? 'text-orange-600' : 'bg-menta-border text-[#0d9488]'}`}>
                                                {t.metodo_pago || 'efectivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold">${(t.total || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => abrir({ ...t, _raw: t })}
                                                    className="p-2 rounded-lg bg-menta-bgborder-2 bborder-menta-borderhover:bg-[#ccfbf1] text-[#0d9488]"
                                                    title="Ver / Imprimir"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {ticketSeleccionado && (
                <ComprobantePreview datos={ticketSeleccionado} empresa={ticketSeleccionado.empresa} onCerrar={cerrarComprobante} />
            )}
        </div>
    )
}
