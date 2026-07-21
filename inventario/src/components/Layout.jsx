import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { isOnline } from '../utils/network'
import { getMiEmpresa } from '../services/dataService'
import { getProductos, evaluarRiegoStock } from '../services/domain/productoService'
import { getContactos } from '../services/dataService'
import { useTema } from '../context/TemaContext'
import { 
  Menu, X, Search, Bell, User, ChevronDown,
  Package, DollarSign, CreditCard, Users, 
  BarChart3, BookOpen, Wallet, Tag, Truck, Wifi, WifiOff, Printer, ClipboardList, Calculator
} from 'lucide-react'
import { moduloActivo, moduloPermitido } from '../db/schemaRubros'

const ROL_LABEL = {
  'dueño': 'Administrador',
  cajero: 'Cajero',
  almacen: 'Almacén',
}

const menuGroups = [
  {
    title: 'Principal',
    defaultOpen: true,
    items: [
      { path: '/', label: 'Dashboard', icon: Package, modulo: 'dashboard' },
    ]
  },
  {
    title: 'Inventario',
    defaultOpen: true,
    items: [
      { path: '/inventario', label: 'Inventario', icon: Package, modulo: 'inventario' },
      { path: '/productos', label: 'Productos', icon: Package, modulo: 'productos' },
      { path: '/ajuste', label: 'Ajuste de Stock', icon: ClipboardList, modulo: 'ajuste' },
      { path: '/kardex', label: 'Libro de Inventario', icon: BookOpen, modulo: 'kardex' },
      { path: '/categorias', label: 'Categorías', icon: Tag, modulo: 'categorias' },
    ]
  },
  {
    title: 'Compras',
    defaultOpen: true,
    items: [
      { path: '/proveedores', label: 'Proveedores', icon: Truck, modulo: 'proveedores' },
      { path: '/FacturasProveedores', label: 'Facturas Proveedores', icon: CreditCard, modulo: 'compras' },
    ]
  },
  {
    title: 'Ventas',
    defaultOpen: true,
    items: [
      { path: '/POS', label: 'Punto de Venta', icon: CreditCard, modulo: 'pos' },
      { path: '/tickets', label: 'Tickets', icon: Printer, modulo: 'pos' },
      { path: '/caja', label: 'Caja', icon: Wallet, modulo: 'caja' },
    ]
  },
  {
    title: 'Finanzas',
    defaultOpen: false,
    items: [
      { path: '/gastos-ingresos', label: 'Gastos & Ingresos', icon: CreditCard, modulo: 'gastos' },
      { path: '/reportes', label: 'Reportes', icon: BarChart3, modulo: 'reportes' },
      { path: '/cierre-caja', label: 'Cierre de Caja', icon: Calculator, modulo: 'reportes' },
    ]
  },
  {
    title: 'General',
    defaultOpen: false,
    items: [
      { path: '/contactos', label: 'Contactos', icon: Users, modulo: 'contactos' },
      { path: '/configuracion', label: 'Configuración', icon: User, modulo: 'configuracion' },
    ]
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const temaContext = useTema()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [online, setOnline] = useState(true)
  const [empresaNombre, setEmpresaNombre] = useState('MiInventario')
  const [empresaLogo, setEmpresaLogo] = useState('')
  const [rubroId, setRubroId] = useState('retail')
  const [adminNombre, setAdminNombre] = useState('')
  const [rol, setRol] = useState('dueño')
  const [notificaciones, setNotificaciones] = useState([])
  const [mostrarNotif, setMostrarNotif] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [todosProductos, setTodosProductos] = useState([])
  const [todosContactos, setTodosContactos] = useState([])
  const [gruposAbiertos, setGruposAbiertos] = useState(() => {
    const initial = {}
    menuGroups.forEach(g => { initial[g.title] = g.defaultOpen })
    return initial
  })

  const toggleGrupo = (titulo) => {
    setGruposAbiertos(prev => ({ ...prev, [titulo]: !prev[titulo] }))
  }

  const colores = temaContext || {
    primary: '#10b981',
    primaryDark: '#059669',
    primaryLight: '#34d399',
    primaryTint: '#d1fae5',
    primaryBorder: '#a7f3d0',
    accent: '#f59e0b',
    background: '#f0fdf4',
    card: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#d1fae5',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  }

  useEffect(() => {
    if (!busqueda.trim()) {
      setResultadosBusqueda([])
      setMostrarResultados(false)
      return
    }
    const q = busqueda.toLowerCase()
    const productos = todosProductos.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.codigo?.toLowerCase().includes(q)
    ).slice(0, 8).map(p => ({ tipo: 'producto', id: p.id, nombre: p.nombre, subtitulo: p.codigo || '' }))
    const contactos = todosContactos.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.documento?.toLowerCase().includes(q)
    ).slice(0, 5).map(c => ({ tipo: 'cliente', id: c.id, nombre: c.nombre, subtitulo: c.documento || c.email || '' }))
    setResultadosBusqueda([...productos, ...contactos])
    setMostrarResultados(true)
  }, [busqueda, todosProductos, todosContactos])

  const irAResultado = (item) => {
    setMostrarResultados(false)
    setBusqueda('')
    if (item.tipo === 'producto') {
      navigate('/productos')
    } else {
      navigate('/contactos')
    }
  }

  const verificarAlertasStock = async () => {
    try {
      const productos = await getProductos()
      const evaluaciones = []
      for (const producto of productos) {
        const resultado = await evaluarRiegoStock(producto.id)
        if (resultado && resultado.probabilidadAgotamiento > 0) {
          evaluaciones.push(resultado)
        }
      }
      evaluaciones.sort((a, b) => b.probabilidadAgotamiento - a.probabilidadAgotamiento)
      setNotificaciones(evaluaciones)
    } catch (err) {
      console.log('Error verificando alertas de stock:', err)
    }
  }

  const cargarEmpresa = async () => {
    try {
        const empresa = await getMiEmpresa();  // Ahora devuelve el objeto directamente
        if (empresa) {
            if (empresa.nombre) setEmpresaNombre(empresa.nombre);
            if (empresa.logo_url) setEmpresaLogo(empresa.logo_url);
            if (empresa.rubro) setRubroId(empresa.rubro);
            if (empresa.admin_nombre) setAdminNombre(empresa.admin_nombre);
            if (empresa.rol) setRol(empresa.rol);
        }
    } catch (err) {
        console.log('Error cargando empresa:', err);
    }
  }

  useEffect(() => {
    const checkOnline = () => isOnline().then(setOnline)
    checkOnline()
    const id = setInterval(checkOnline, 10000)
    window.addEventListener('online', () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
    cargarEmpresa()
    window.addEventListener('focus', cargarEmpresa)
    window.addEventListener('empresa:updated', cargarEmpresa)
    verificarAlertasStock()
    const id2 = setInterval(verificarAlertasStock, 30000)

    getProductos().then(setTodosProductos).catch(() => {})
    getContactos().then(res => setTodosContactos(Array.isArray(res) ? res : [] )).catch(() => {})
    
    return () => {
      clearInterval(id)
      clearInterval(id2)
      window.removeEventListener('online', () => setOnline(true))
      window.removeEventListener('offline', () => setOnline(false))
      window.removeEventListener('focus', cargarEmpresa)
      window.removeEventListener('empresa:updated', cargarEmpresa)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colores.background }}>
      
      {/* ===== HEADER ===== */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm shrink-0 z-50" style={{ borderColor: colores.border }}>
        
        {/* Izquierda: Hamburger + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl transition"
            style={{ backgroundColor: colores.primary, color: 'white' }}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200">
              {empresaLogo ? (
                <img src={empresaLogo} alt="Logo" className="w-7 h-7 object-contain rounded" />
              ) : (
                <Package size={20} className="text-gray-700" />
              )}
            </div>
            <span className="text-xl font-bold hidden sm:block" style={{ color: colores.text }}>
              {empresaNombre}
            </span>
          </div>
        </div>

        {/* Centro: Buscador */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-x-1/2" style={{ color: colores.textSecondary }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos, clientes..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ 
                borderColor: colores.border, 
                color: colores.text,
                focusRingColor: colores.primary 
              }}
            />
            {mostrarResultados && resultadosBusqueda.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
                {resultadosBusqueda.map((item, index) => (
                  <button
                    key={`${item.tipo}-${item.id}-${index}`}
                    onClick={() => irAResultado(item)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
                  >
                    <p className="font-medium text-sm text-gray-800">{item.nombre}</p>
                    <p className="text-xs text-gray-500">{item.subtitulo}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

         {/* Derecha: Notificaciones + Usuario */}
         <div className="flex items-center gap-3">
           <div className="relative">
             <button 
               onClick={() => setMostrarNotif(!mostrarNotif)}
               className="p-2 rounded-xl transition hover:bg-gray-100 relative"
               style={{ color: colores.text }}
             >
               <Bell size={20} />
               {notificaciones.length > 0 && (
                 <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: colores.danger }}>
                   {notificaciones.length}
                 </span>
               )}
             </button>
              {mostrarNotif && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto" style={{ borderColor: colores.border }}>
                  <div className="p-3 border-b font-semibold text-sm flex items-center justify-between" style={{ borderColor: colores.border }}>
                    <span>Predicción de Stock</span>
                    <span className="text-xs font-normal" style={{ color: colores.textSecondary }}>
                      {notificaciones.length} producto{notificaciones.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {notificaciones.length === 0 ? (
                    <div className="p-4 text-sm text-center" style={{ color: colores.textSecondary }}>
                      Sin alertas de stock
                    </div>
                  ) : (
                    notificaciones.map((n) => {
                      const prob = Math.round(n.probabilidadAgotamiento * 100)
                      const colorBg = prob > 80 ? colores.danger : prob > 50 ? '#f97316' : '#f59e0b'
                      const colorText = prob > 80 ? colores.danger : prob > 50 ? '#c2410c' : '#92400e'
                      const dias = n.diasInventarioRestante
                      const diasTexto = dias === Infinity ? 'Sin datos' : `${dias} día${dias !== 1 ? 's' : ''}`
                      return (
                        <div key={n.productoId} className="p-3 border-b last:border-b-0 hover:bg-gray-50" style={{ borderColor: colores.border }}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm" style={{ color: colores.text }}>{n.nombre}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: colorBg }}>
                              {prob}%
                            </span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: colores.textSecondary }}>
                            Stock: {n.stockActual} | Sugerido: {n.stockSugerido} | Quedan: {diasTexto}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: colores.textSecondary }}>
                            Demanda: {n.mediaDiaria ?? '—'} un/día | σ: {n.desviacionDiaria ?? '—'}
                          </p>
                          <p className="text-xs font-medium mt-1" style={{ color: colorText }}>
                            {n.recomendacion}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
           </div>
           <div className="flex items-center gap-3 pl-3 border-l" style={{ borderColor: colores.border }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: colores.primary }}>
              {adminNombre ? adminNombre.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() : 'AD'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: colores.text }}>{adminNombre || 'Usuario'}</p>
              <p className="text-xs" style={{ color: colores.textSecondary }}>{ROL_LABEL[rol] || 'Administrador'}</p>
            </div>
          </div>
        </div>

      </header>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ===== SIDEBAR ===== */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden shrink-0 flex flex-col shadow-sm`} style={{ borderColor: colores.border }}>
          
          <nav className="p-3 space-y-1 mt-2 flex-1 overflow-y-auto">
            {menuGroups.map((grupo) => {
              const itemsVisibles = grupo.items.filter(item => moduloActivo(rubroId, item.modulo) && moduloPermitido(rol, item.modulo))
              if (itemsVisibles.length === 0) return null

              const abierto = gruposAbiertos[grupo.title]

              return (
                <div key={grupo.title} className="mb-1">
                  <button
                    onClick={() => toggleGrupo(grupo.title)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition hover:bg-gray-50"
                    style={{ color: colores.textSecondary }}
                  >
                    <span>{grupo.title}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                  </button>
                  {abierto && (
                    <div className="space-y-1 mt-1">
                      {itemsVisibles.map((item) => {
                        const Icon = item.icon
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200`
                            }
                            style={({ isActive }) => ({
                              backgroundColor: isActive ? colores.primary : 'transparent',
                              color: isActive ? 'white' : colores.text,
                              fontWeight: isActive ? '600' : '500',
                            })}
                          >
                            <Icon size={18} />
                            <span className="font-medium text-sm">{item.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
          
          <div className="p-4 border-t" style={{ borderColor: colores.border }}>
            <div className="flex items-center gap-3">
              {online ? <Wifi size={20} style={{ color: colores.success }} /> : <WifiOff size={20} style={{ color: colores.danger }} />}
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: colores.text }}>{online ? 'Conectado' : 'Sin conexión'}</p>
                <p className="text-xs" style={{ color: colores.textSecondary }}>{online ? 'Supabase Online' : 'Trabajando offline'}</p>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${online ? 'animate-pulse' : ''}`} style={{ backgroundColor: online ? colores.success : colores.danger }}></div>
            </div>
          </div>

        </aside>

        <main className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: colores.background }}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}