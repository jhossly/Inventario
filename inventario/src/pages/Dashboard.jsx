import { useEffect, useState } from 'react'
import { getDashboard, getProductos } from '../services/dataService'
import { useTema } from '../context/TemaContext'
import {
  TrendingUp, Package, AlertTriangle, DollarSign,
  ShoppingCart, ArrowUpRight, ArrowDownRight,
  BarChart3, Box, Zap, RefreshCw, TrendingDown
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, Area, ScatterChart, Scatter, ZAxis } from 'recharts'

export default function Dashboard() {
  const tema = useTema()
  const [data, setData] = useState({
    total_ventas: 0,
    ingresos: 0,
    productos_bajo_stock: 0,
    movimientos_pendientes: 0,
    ventas_por_dia: [],
    productos_mas_vendidos: []
  })
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const dashRes = await getDashboard()
      const prodRes = await getProductos()
      
      setData(dashRes || {
        total_ventas: 0,
        ingresos: 0,
        productos_bajo_stock: 0,
        movimientos_pendientes: 0,
        ventas_por_dia: []
      })
      setProductos(Array.isArray(prodRes) ? prodRes : (prodRes?.data || []))
    } catch (err) {
      console.log('Offline - usando datos locales', err)
    } finally {
      setLoading(false)
    }
  }

  // Datos para gráfica 3D simulada (recharts no tiene 3D real, pero podemos simular profundidad)
  const ventasData = data.ventas_por_dia?.length ? data.ventas_por_dia : [
    { name: 'Lun', ventas: 1200, ganancia: 240 },
    { name: 'Mar', ventas: 1900, ganancia: 380 },
    { name: 'Mié', ventas: 1500, ganancia: 300 },
    { name: 'Jue', ventas: 2100, ganancia: 420 },
    { name: 'Vie', ventas: 2800, ganancia: 560 },
    { name: 'Sáb', ventas: 3200, ganancia: 640 },
    { name: 'Dom', ventas: 1800, ganancia: 360 },
  ]

  // Datos de productos más vendidos con ganancia estimada (precio_venta - precio_costo)
  const productosConGanancia = productos.slice(0, 6).map(p => {
    const gananciaUnitaria = (p.precio_venta || 0) - (p.precio_costo || 0)
    return {
      name: p.nombre,
      ventas: p.stock_actual,
      ganancia: gananciaUnitaria * (p.stock_vendido || 10),
      grosor: Math.min(gananciaUnitaria > 0 && p.precio_venta > 0 ? (gananciaUnitaria / p.precio_venta) * 100 : 0, 100),
      precio_venta: p.precio_venta || 0,
      ganancia_unitaria: gananciaUnitaria,
      stock_actual: p.stock_actual || 0,
    }
  })

  const handleRefresh = () => {
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-menta border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con refresh */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <BarChart3 size={28} className="text-menta-darkk" />
          Dashboard
        </h2>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-xl hover:opacity-90 transition shadow-sm"
          style={{ backgroundColor: tema.primary }}
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </div>

      {/* ===== TARJETAS RESUMEN ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Ingresos */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200" style={{ borderColor: tema.border }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: tema.primaryTint }}>
              <DollarSign size={24} style={{ color: tema.primaryDark }} />
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: tema.primaryTint, color: tema.primaryDark }}>
              <ArrowUpRight size={16} /> +12%
            </span>
          </div>
          <p className="text-sm text-text-sub">Ingresos totales</p>
          <p className="text-3xl font-bold mt-1 text-text-dark">${data.ingresos?.toLocaleString() || '0'}</p>
        </div>

        {/* Total ventas */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200" style={{ borderColor: tema.border }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: tema.primaryTint }}>
              <ShoppingCart size={24} style={{ color: tema.primaryDark }} />
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: tema.primaryTint, color: tema.primaryDark }}>
              <ArrowUpRight size={16} /> +8%
            </span>
          </div>
          <p className="text-sm text-text-sub">Total ventas</p>
          <p className="text-3xl font-bold mt-1 text-text-dark">{data.total_ventas || 0}</p>
        </div>

        {/* Stock bajo */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200" style={{ borderColor: tema.border }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: tema.warning + '20' }}>
              <AlertTriangle size={24} style={{ color: tema.warning }} />
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: tema.danger + '20', color: tema.danger }}>
              <ArrowDownRight size={16} /> Alerta
            </span>
          </div>
          <p className="text-sm text-text-sub">Productos con stock bajo</p>
          <p className="text-3xl font-bold mt-1" style={{ color: tema.warning }}>{data.productos_bajo_stock || 0}</p>
        </div>

        {/* Pendientes sync */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200" style={{ borderColor: tema.border }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: tema.primaryTint }}>
              <TrendingUp size={24} style={{ color: tema.primaryDark }} />
            </div>
          </div>
          <p className="text-sm text-text-mutedd">Pendientes de sincronizar</p>
          <p className="text-3xl font-bold mt-1 text-text-dark">{data.movimientos_pendientes || 0}</p>
        </div>
      </div>

      {/* ===== GRÁFICAS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfica de barras con grosor (simulando 3D) */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm" style={{ borderColor: tema.border }}>
          <h3 className="text-lg font-bold mb-4 text-text-dark flex items-center gap-2">
            <BarChart3 size={20} style={{ color: tema.primaryDark }} /> 
            Ventas por día (con ganancia)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={ventasData}>
              <CartesianGrid strokeDasharray="3 3" stroke={tema.primaryBorder} />
              <XAxis dataKey="name" stroke={tema.primary} />
              <YAxis stroke={tema.primary} />
              <Tooltip 
                contentStyle={{ background: 'white', border: `2px solid ${tema.primaryBorder}`, borderRadius: '12px' }}
                formatter={(value, name) => [`$${value}`, name === 'ventas' ? 'Ventas' : 'Ganancia']}
              />
              <Bar dataKey="ventas" fill={tema.primary} radius={[8, 8, 0, 0]} barSize={40} />
              <Line type="monotone" dataKey="ganancia" stroke={tema.warning} strokeWidth={3} dot={{ fill: tema.warning, r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-center text-text-muted mt-2">
            El grosor de las barras representa las ventas, la línea naranja es la ganancia estimada
          </p>
        </div>

        {/* Gráfica de pie - Stock por producto */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm" style={{ borderColor: tema.border }}>
          <h3 className="text-lg font-bold mb-4 text-text-dark flex items-center gap-2">
            <Box size={20} style={{ color: tema.primaryDark }} /> 
            Distribución de Stock
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie 
                data={productos.slice(0, 5)} 
                cx="50%" 
                cy="50%" 
                outerRadius={90} 
                dataKey="stock_actual" 
                nameKey="nombre"
                label={({ nombre, percent }) => `${nombre}: ${(percent * 100).toFixed(0)}%`}
              >
                {productos.slice(0, 5).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={tema.primary} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: 'white', border: `2px solid ${tema.primaryBorder}`, borderRadius: '12px' }}
                formatter={(value) => [`${value} unidades`, 'Stock']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== SEGUNDA FILA DE GRÁFICAS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfica de dispersión - Precio venta vs Ganancia */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm" style={{ borderColor: tema.border }}>
          <h3 className="text-lg font-bold mb-4 text-text-dark flex items-center gap-2">
            <Zap size={20} style={{ color: tema.primaryDark }} /> 
            Rentabilidad por Producto
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tema.primaryBorder} />
              <XAxis type="number" dataKey="precio_venta" name="Precio Venta" unit="$" stroke={tema.primary} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="ganancia_unitaria" name="Ganancia" unit="$" stroke={tema.primary} tick={{ fontSize: 11 }} />
              <ZAxis type="number" dataKey="stock_actual" range={[60, 400]} name="Stock" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: 'white', border: `2px solid ${tema.primaryBorder}`, borderRadius: '12px' }}
                formatter={(value, name) => {
                  if (name === 'Precio Venta' || name === 'Ganancia') return [`$${value}`, name]
                  if (name === 'Stock') return [`${value} uds`, name]
                  return [value, name]
                }}
              />
              <Scatter data={productosConGanancia} fill={tema.primary} stroke={tema.primaryDark} strokeWidth={1.5}>
                {productosConGanancia.map((entry, index) => {
                  const margen = entry.ganancia > 0 && entry.precio_venta > 0 ? (entry.ganancia / entry.precio_venta) : 0
                  const color = margen > 0.5 ? tema.success : margen > 0.2 ? tema.warning : tema.danger
                  return <Cell key={index} fill={color} />
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-xs text-text-sub"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tema.success }}></span> Margen alto (&gt;50%)</span>
            <span className="flex items-center gap-1 text-xs text-text-sub"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tema.warning }}></span> Margen medio (&gt;20%)</span>
            <span className="flex items-center gap-1 text-xs text-text-sub"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tema.danger }}></span> Margen bajo (&lt;20%)</span>
          </div>
          <p className="text-xs text-center text-text-muted mt-1">
            Cada punto es un producto • Arriba a la derecha = precio alto y mucha ganancia
          </p>
        </div>

        {/* Productos más vendidos con ganancia */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm" style={{ borderColor: tema.border }}>
          <h3 className="text-lg font-bold mb-4 text-text-dark flex items-center gap-2">
            <Package size={20} style={{ color: tema.primaryDark }} /> 
            Top Productos
          </h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {(data.productos_mas_vendidos?.length ? data.productos_mas_vendidos : productos.slice(0, 5)).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border transition" style={{ backgroundColor: tema.primaryTint, borderColor: tema.primaryBorder }}>
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: tema.primary }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-text-dark">{p.nombre}</p>
                    <p className="text-xs text-text-sub">Margen: {((p.precio_venta - p.precio_costo) / p.precio_venta * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: tema.primaryDark }}>${p.precio_venta}</p>
                  <p className="text-xs text-text-sub">Stock: {p.stock_actual}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {productos.filter(p => p.stock_actual <= (p.stock_minimo || 0)).length > 0 && (
        <div className="border rounded-2xl p-6 shadow-sm" style={{ background: `linear-gradient(to right, ${tema.danger}10, ${tema.warning}10)`, borderColor: tema.danger + '40' }}>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: tema.danger }}>
            <AlertTriangle size={20} /> Productos con stock crítico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {productos.filter(p => p.stock_actual <= (p.stock_minimo || 0)).slice(0, 6).map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-xl border" style={{ borderColor: tema.danger + '40' }}>
                <span className="font-medium" style={{ color: tema.danger }}>{p.nombre}</span>
                <span className="font-bold" style={{ color: tema.danger }}>Stock: {p.stock_actual}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}