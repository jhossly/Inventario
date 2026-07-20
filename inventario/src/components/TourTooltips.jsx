import React, { useState, useEffect } from 'react'
import { X, ArrowRight, Lightbulb } from 'lucide-react'

// Tour guiado tipo "juego" que aparece tras terminar el onboarding.
// Muestra burbujas flotantes una a una explicando la app.
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
} from 'lucide-react'

const PASOS = [
  {
    icono: LayoutDashboard,
    titulo: '¡Bienvenido!',
    texto: 'Este es tu panel principal. Aquí ves ventas, stock bajo y lo que falta sincronizar.',
    lado: 'bottom',
  },
  {
    icono: ShoppingCart,
    titulo: 'Vende rápido',
    texto: 'En "POS" haces ventas con un clic. El stock se descuenta solo al vender.',
    lado: 'right',
  },
  {
    icono: Package,
    titulo: 'Tu catálogo',
    texto: 'En "Productos" agregas artículos. Los campos extras se adaptan a tu rubro.',
    lado: 'right',
  },
  {
    icono: Users,
    titulo: 'Clientes y proveedores',
    texto: 'Registra quién te compra y de quién compras para facturar y controlar compras.',
    lado: 'right',
  },
  {
    icono: Settings,
    titulo: 'Configúralo todo',
    texto: 'En "Configuración" cambias datos, impuestos, plantillas de ticket y tu rubro.',
    lado: 'right',
  },
]

export default function TourTooltips({ onFinish }) {
    const [paso, setPaso] = useState(0)
    const [cerrado, setCerrado] = useState(false)
    const actual = PASOS[paso]

    useEffect(() => {
        // Cierra solo tras el último paso.
        if (paso >= PASOS.length - 1) {
            const t = setTimeout(() => { setCerrado(true); onFinish?.() }, 4000)
            return () => clearTimeout(t)
        }
    }, [paso])

    if (cerrado) return null

    const esUltimo = paso === PASOS.length - 1

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Capa oscura salvo la tarjeta */}
            <div className="absolute inset-0 bg-black/40" />

            <div className="absolute left-1/2 top-24 -translate-x-1/2 pointer-events-auto">
                <div className="w-85 bg-white rounded-2xl shadow-2xl border-2 border-menta p-5 animate-[fadeIn_0.3s_ease]">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-menta-dark">
                            {React.createElement(actual.icono, { size: 20 })}
                            <span className="font-bold text-text-dark">{actual.titulo}</span>
                        </div>
                        <button onClick={() => { setCerrado(true); onFinish?.() }} className="text-[#94a3b8] hover:text-text-dark">
                            <X size={18} />
                        </button>
                    </div>
                    <p className="text-sm text-[#475569] mb-4">{actual.texto}</p>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            {PASOS.map((_, i) => (
                                <span key={i} className={`w-2 h-2 rounded-full ${i === paso ? 'bg-menta' : 'bg-menta-border'}`} />
                            ))}
                        </div>
                        {esUltimo ? (
                            <button
                                onClick={() => { setCerrado(true); onFinish?.() }}
                                className="btn-menta px-4 py-1.5 rounded-lg text-sm font-bold"
                            >
                                ¡Listo!
                            </button>
                        ) : (
                            <button
                                onClick={() => setPaso(p => p + 1)}
                                className="flex items-center gap-1 btn-menta px-4 py-1.5 rounded-lg text-sm font-bold"
                            >
                                Siguiente <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
