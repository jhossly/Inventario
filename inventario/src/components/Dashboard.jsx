import { useState, useEffect } from 'react'
import { getProductos } from '../db/database'
import { Package, PlusCircle, Pencil, Trash2 } from 'lucide-react'

export default function Dashboard() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const data = await getProductos()
      setProductos(data)
      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) {
    return <div className="text-center py-10">Cargando productos...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <button className="bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <PlusCircle size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-slate-500">Total Productos</p>
          <p className="text-3xl font-bold text-slate-800">{productos.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-slate-500">Valor Inventario</p>
          <p className="text-3xl font-bold text-slate-800">
            ${productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-slate-500">Stock Total</p>
          <p className="text-3xl font-bold text-slate-800">
            {productos.reduce((sum, p) => sum + (p.cantidad || 0), 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">Producto</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600">Precio</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => (
              <tr key={p.id} className="border-b hover:bg-slate-50">
                <td className="px-6 py-3">{p.nombre}</td>
                <td className="px-6 py-3 text-right">${p.precio}</td>
                <td className="px-6 py-3 text-right">{p.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}