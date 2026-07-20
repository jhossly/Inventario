import { useState, useEffect } from 'react'
import { getMovimientos } from '../services/dataService'
import { BookOpen, ArrowDownCircle, ArrowUpCircle, ClipboardList, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export default function Kardex() {
  const [movimientos, setMovimientos] = useState([])

  useEffect(() => {
    loadMovimientos()
  }, [])

  const loadMovimientos = async () => {
    try {
      const data = await getMovimientos()
      setMovimientos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.log('Offline:', err)
      setMovimientos([])
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
        <ClipboardList size={28} className="text-menta-dark" /> Kardex - Libro de Movimientos
      </h2>
      <p className="flex items-center gap-2">
        <BookOpen size={18} /> Vista contable completa de entradas y salidas
      </p>

      <div className="bg-white border-2 border-menta-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-menta-bg">
            <tr>
              <th className="text-left px-6 py-4 text-sm">Fecha</th>
              <th className="text-left px-6 py-4 text-sm">Tipo</th>
              <th className="text-right px-6 py-4 text-sm">Cantidad</th>
              <th className="text-right px-6 py-4 text-sm">Precio Unit.</th>
              <th className="text-right px-6 py-4 text-sm">Total</th>
              <th className="text-center px-6 py-4 text-sm">Icono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-menta-border">
            {movimientos.map((m) => (
              <tr key={m.id} className="hover:bg-menta-bg transition">
                <td className="px-6 py-4">{new Date(m.fecha_movimiento).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    m.tipo.startsWith('entrada') ? 'bg-menta-tint' : 'text-red-600'
                  }`}>
                    {m.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-text-dark">{m.cantidad}</td>
                <td className="px-6 py-4 text-right">${m.precio_unitario}</td>
                <td className="px-6 py-4 text-right font-bold text-text-dark">${m.total}</td>
                <td className="px-6 py-4 text-center text-2xl">
                  {m.tipo.startsWith('entrada') ? <ArrowDownCircle size={28} className="text-green mx-auto" /> : <ArrowUpCircle size={28} className="text-red-500 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
