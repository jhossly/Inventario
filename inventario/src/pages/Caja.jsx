import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Plus, Minus, CheckCircle2, X, ShoppingCart, TrendingUp, TrendingDown
} from 'lucide-react'
import * as dataService from '../services/dataService'
import { useTema } from '../context/TemaContext'

export default function Caja() {
  const tema = useTema()
  // Estado de caja (PERSISTENTE en SQLite, no en useState)
  const [caja, setCaja] = useState(null)
  const [apertura, setApertura] = useState(0)
  const [movimientos, setMovimientos] = useState([])
  const [tickets, setTickets] = useState([])
  const [cargandoCaja, setCargandoCaja] = useState(true)

  // Modal interno para ingreso/egreso/cerrar (reemplaza prompt nativo)
  const [modal, setModal] = useState(null)
  const MOTIVOS = {
    ingreso: ['Venta', 'Abono de cliente', 'Préstamo', 'Otro ingreso'],
    egreso: ['Pago a proveedor', 'Luz', 'Agua', 'Alquiler', 'Salarios', 'Transporte', 'Otro egreso'],
  }

  const navigate = useNavigate()

  // Cargar estado de caja persistente al montar.
  useEffect(() => {
    const cargarCaja = async () => {
      try {
        const cajaAbierta = await dataService.getCajaAbierta()
        if (cajaAbierta) {
          setCaja(cajaAbierta)
          setApertura(cajaAbierta.monto_apertura || 0)
          const movs = await dataService.getMovimientosCaja(cajaAbierta.id)
          setMovimientos(movs || [])
          const ticks = await dataService.getTickets().catch(() => [])
          setTickets(Array.isArray(ticks) ? ticks : [])
        }
      } catch (e) {
        console.error('Error cargando caja:', e)
      } finally {
        setCargandoCaja(false)
      }
    }
    cargarCaja()
  }, [])

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + (m.monto || 0), 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + (m.monto || 0), 0)
  const cierreEsperado = apertura + totalIngresos - totalEgresos

  // Calcular ventas y ganancias del turno desde tickets
  const ticketsDelTurno = caja ? tickets.filter(t => {
    const aperturaMs = new Date(caja.fecha_apertura || caja.creado_en || 0).getTime()
    const ventaMs = new Date(t.fecha_venta || t.creado_en || 0).getTime()
    return ventaMs >= aperturaMs
  }) : []

  const totalVentasTurno = ticketsDelTurno.reduce((s, t) => s + (t.total || 0), 0)
  const costoVentasTurno = ticketsDelTurno.reduce((s, t) => {
    try {
      const prods = JSON.parse(t.productos || '[]')
      return s + prods.reduce((a, p) => a + ((p.precio_costo || 0) * (p.cantidad || 1)), 0)
    } catch {
      return s
    }
  }, 0)
  const gananciaTurno = totalVentasTurno - costoVentasTurno

  // Acciones caja (PERSISTENTES)
  const abrirCaja = async () => {
    if (apertura <= 0) return
    const id = await dataService.abrirCaja(apertura, 'dueño')
    setCaja({ id, monto_apertura: apertura, estado: 'abierta' })
    const movs = await dataService.getMovimientosCaja(id)
    setMovimientos(movs || [])
  }

  const cerrarCaja = () => {
    if (!caja) return
    setModal({ tipo: 'cierre', monto: cierreEsperado.toFixed(2), descripcion: '' })
  }

  const confirmarCierre = async () => {
    const montoCierre = parseFloat(modal.monto) || cierreEsperado
    await dataService.cerrarCaja(caja.id, montoCierre, cierreEsperado)
    setModal(null)
    // Recargar el estado REAL desde la BD para no depender solo de memoria.
    // Tras cerrar, getCajaAbierta() debe devolver null y la UI queda en "Apertura".
    const cajaAbierta = await dataService.getCajaAbierta().catch(() => null)
    if (cajaAbierta) {
      setCaja(cajaAbierta)
      setApertura(cajaAbierta.monto_apertura || 0)
      const movs = await dataService.getMovimientosCaja(cajaAbierta.id)
      setMovimientos(movs || [])
    } else {
      setCaja(null)
      setMovimientos([])
      setApertura(0)
    }
  }

  const agregarMovimiento = (tipo) => {
    if (!caja) return
    const motivoDef = MOTIVOS[tipo][0]
    setModal({ tipo, monto: '', motivo: motivoDef, descripcion: '' })
  }

  const confirmarMovimiento = async () => {
    const { tipo, monto, motivo, descripcion } = modal
    const m = parseFloat(monto) || 0
    if (m <= 0) { setModal(null); return }
    const texto = descripcion ? `${motivo} - ${descripcion}` : motivo
    await dataService.addMovimientoCaja(caja.id, tipo, m, texto)
    const movs = await dataService.getMovimientosCaja(caja.id)
    setMovimientos(movs || [])
    setModal(null)
  }

  if (cargandoCaja) {
    return (
      <div className="flex items-center justify-center h-full text-menta-dark font-bold">Cargando caja…</div>
    )
  }

  if (!caja) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Wallet size={28} className="text-menta-dark" />
          Caja - Apertura de Turno
        </h2>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-20 h-20 bg-menta-tint rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet size={40} className="text-menta-dark" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-text-dark">Abrir Caja</h3>
          <p className="mb-6 text-sm text-gray-500">Ingresa el monto inicial</p>
          <input
            type="number"
            step="0.01"
            min="0"
            value={apertura}
            onChange={(e) => setApertura(parseFloat(e.target.value) || 0)}
            className="w-full px-6 py-4 bg-white border-2 border-menta-border rounded-xl text-center text-3xl font-bold focus:outline-none focus:ring-2 focus:ring-menta mb-6"
            placeholder="0.00"
          />
          <button
            onClick={abrirCaja}
            disabled={apertura <= 0}
            className="w-full py-4 rounded-xl font-bold text-lg transition shadow-md hover:shadow-lg text-white disabled:opacity-40"
            style={{ backgroundColor: tema.primary }}
          >
            <CheckCircle2 size={24} className="inline mr-2" />
            Abrir Caja
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
        <Wallet size={28} className="text-menta-dark" />
        Caja - Turno Activo
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-menta-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase">Apertura</p>
          <p className="text-2xl font-bold text-menta-dark">${apertura.toFixed(2)}</p>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase">Ventas del Turno</p>
          <p className="text-2xl font-bold text-green">+${totalVentasTurno.toFixed(2)}</p>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase">Ganancia del Turno</p>
          <p className="text-2xl font-bold text-[#0d9488]">${gananciaTurno.toFixed(2)}</p>
        </div>
        <div className="bg-white border-2 border-menta-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase">Cierre Esperado</p>
          <p className="text-2xl font-bold text-yellow">${cierreEsperado.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/POS')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
          style={{ backgroundColor: tema.primary }}
        >
          <ShoppingCart size={20} /> Nueva Venta
        </button>
        <button
          onClick={() => agregarMovimiento('ingreso')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white"
          style={{ backgroundColor: tema.success }}
        >
          <Plus size={18} /> Ingreso
        </button>
        <button
          onClick={() => agregarMovimiento('egreso')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white"
          style={{ backgroundColor: tema.danger }}
        >
          <Minus size={18} /> Egreso
        </button>
        <button
          onClick={cerrarCaja}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white ml-auto"
          style={{ backgroundColor: tema.textSecondary }}
        >
          <CheckCircle2 size={18} /> Cerrar Turno
        </button>
      </div>

      {ticketsDelTurno.length > 0 && (
        <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden">
          <div className="px-6 py-3 bg-menta-bg font-bold">Ventas del Turno</div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-4 py-2">Ticket</th>
                <th className="text-left px-4 py-2">Fecha</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {ticketsDelTurno.map(t => {
                let costo = 0
                try {
                  const prods = JSON.parse(t.productos || '[]')
                  costo = prods.reduce((a, p) => a + ((p.precio_costo || 0) * (p.cantidad || 1)), 0)
                } catch {}
                const ganancia = (t.total || 0) - costo
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-2 font-semibold">{t.numero_ticket}</td>
                    <td className="px-4 py-2 text-sm">{t.fecha_venta ? new Date(t.fecha_venta).toLocaleTimeString() : ''}</td>
                    <td className="text-right px-4 py-2 font-semibold">${(t.total || 0).toFixed(2)}</td>
                    <td className="text-right px-4 py-2 font-semibold text-green">+${ganancia.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {movimientos.length > 0 && (
        <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden">
          <div className="px-6 py-3 bg-menta-bg font-bold">Movimientos del Turno</div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-4 py-2">Tipo</th>
                <th>Descripción</th>
                <th className="text-right">Monto</th>
                <th className="text-right">Hora</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">{m.descripcion}</td>
                  <td className="text-right px-4 py-2 font-semibold">
                    {m.tipo === 'ingreso' ? '+' : '-'}${(m.monto || 0).toFixed(2)}
                  </td>
                  <td className="text-right px-4 py-2 text-xs text-gray-400">
                    {m.fecha ? new Date(m.fecha).toLocaleTimeString() : ''}
                  </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FLOTANTE (reemplaza prompt/confirm nativos) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-dark">
                {modal.tipo === 'cierre'
                  ? 'Cerrar Turno de Caja'
                  : modal.tipo === 'ingreso'
                    ? 'Nuevo Ingreso'
                    : 'Nuevo Egreso'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            {modal.tipo === 'cierre' && (
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-menta-bg rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 uppercase">Total Vendido</p>
                    <p className="font-bold text-menta-dark">${totalVentasTurno.toFixed(2)}</p>
                  </div>
                  <div className="bg-menta-bg rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 uppercase">Ganancia del Día</p>
                    <p className="font-bold text-green-600">${gananciaTurno.toFixed(2)}</p>
                  </div>
                  <div className="bg-menta-bg rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 uppercase">Saldo Esperado</p>
                    <p className="font-bold text-yellow">${cierreEsperado.toFixed(2)}</p>
                  </div>
                  <div className="bg-menta-bg rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 uppercase">Ingresos/Egresos</p>
                    <p className="font-bold">+${totalIngresos.toFixed(2)} / -${totalEgresos.toFixed(2)}</p>
                  </div>
                </div>

                {ticketsDelTurno.length > 0 && (
                  <div className="bg-white border-2 border-menta-border rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-menta-bg font-semibold text-xs">Ventas del Turno</div>
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-menta-border">
                          {ticketsDelTurno.map(t => {
                            let costo = 0
                            try {
                              const prods = JSON.parse(t.productos || '[]')
                              costo = prods.reduce((a, p) => a + ((p.precio_costo || 0) * (p.cantidad || 1)), 0)
                            } catch {}
                            return (
                              <tr key={t.id}>
                                <td className="px-3 py-1 font-semibold">{t.numero_ticket}</td>
                                <td className="px-3 py-1 text-right">${(t.total || 0).toFixed(2)}</td>
                                <td className="px-3 py-1 text-right text-green-600">+${((t.total || 0) - costo).toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {movimientos.length > 0 && (
                  <div className="bg-white border-2 border-menta-border rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-menta-bg font-semibold text-xs">Movimientos del Turno</div>
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-menta-border">
                          {movimientos.map(m => (
                            <tr key={m.id}>
                              <td className="px-3 py-1">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.tipo}</span>
                              </td>
                              <td className="px-3 py-1">{m.descripcion || '-'}</td>
                              <td className="px-3 py-1 text-right font-semibold">{m.tipo === 'ingreso' ? '+' : '-'}${(m.monto || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500">
                  Ingresa el monto contado físicamente para cerrar el turno.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {modal.tipo !== 'cierre' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Motivo *</label>
                  <select
                    value={modal.motivo || ''}
                    onChange={(e) => setModal({ ...modal, motivo: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta"
                  >
                    {(MOTIVOS[modal.tipo] || []).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
              {modal.tipo !== 'cierre' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Detalle (opcional)</label>
                  <input
                    type="text"
                    value={modal.descripcion || ''}
                    onChange={(e) => setModal({ ...modal, descripcion: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-menta-borderder rounded-xl focus:outline-none focus:ringfocus:ring-mentabf]"
                    placeholder="Ej: Factura #123, proveedor Juan"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {modal.tipo === 'cierre' ? 'Monto contado' : 'Monto'} ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={modal.monto}
                  onChange={(e) => setModal({ ...modal, monto: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (modal.tipo === 'cierre' ? confirmarCierre() : confirmarMovimiento())}
                  className="w-full px-4 py-3 border-2 border-menta-border rounded-xl text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-menta"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-400">Fecha: {new Date().toLocaleDateString('es-MX')} (automática)</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold text-[#0f766e] hover:bg-menta-tint transition"
              >
                Cancelar
              </button>
              <button
                onClick={modal.tipo === 'cierre' ? confirmarCierre : confirmarMovimiento}
                className="flex-1 py-3 rounded-xl font-bold text-white transition"
                style={{
                  backgroundColor:
                    modal.tipo === 'egreso'
                      ? tema.danger
                      : tema.success
                }}
              >
                {modal.tipo === 'cierre' ? 'Cerrar Caja' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
