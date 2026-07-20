import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Lock, Mail } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    localStorage.setItem('token', 'fake-token-123')
    localStorage.setItem('user', JSON.stringify({ nombre: 'Juan Pérez', rol: 'dueño' }))
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-menta-tint rounded-full blur-3xl opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-menta-bg rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="relative bg-white border-2 border-menta-border rounded-3xl p-10 w-full max-w-md shadow-[0_8px_40px_rgba(45,212,191,0.12)]">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 btn-menta rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-dark">Mi Inventario</h1>
          <p className="mt-2">Sistema Profesional de Gestión</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-menta-border rounded-xl text-text-dark placeholder:text-[#99f6e4] focus:outline-none focus:ring-2 focus:ring-menta focus:border-transparent transition text-sm"
                placeholder="juan@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-menta-border rounded-xl text-text-dark placeholder:text-[#99f6e4] focus:outline-none focus:ring-2 focus:ring-menta focus:border-transparent transition text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 btn-menta rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center text-sm mt-6">
          ¿Primera vez? Configura tu empresa desde Ajustes
        </p>
      </div>
    </div>
  )
}
