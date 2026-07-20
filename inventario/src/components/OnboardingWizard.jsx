import { useState } from 'react'
import { RUBROS } from '../db/schemaRubros'
import { completarOnboarding } from '../services/onboarding'
import useDialog from '../hooks/useDialog.jsx'
import { Store, Users, ArrowRight, ArrowLeft, Check, Database, Wifi, Image } from 'lucide-react'

const ROLES = [
    { id: 'dueño', nombre: 'Dueño / Administrador', desc: 'Control total: configura, ve reportes y vende.' },
    { id: 'cajero', nombre: 'Cajero', desc: 'Solo ventas y caja.' },
    { id: 'almacen', nombre: 'Almacén / Inventario', desc: 'Solo entradas, salidas y stock.' },
]

const MONEDAS = [
    { id: 'USD', nombre: 'USD ($)' },
    { id: 'EUR', nombre: 'EUR (€)' },
    { id: 'PEN', nombre: 'PEN (S/)' },
    { id: 'MXN', nombre: 'MXN ($)' },
    { id: 'COP', nombre: 'COP ($)' },
    { id: 'ARS', nombre: 'ARS ($)' },
]

export default function OnboardingWizard({ onComplete }) {
    const dialog = useDialog()
    const [paso, setPaso] = useState(0)
    const [config, setConfig] = useState({
        rubro: 'retail',
        numPersonas: '1',
        rol: 'dueño',
        admin_nombre: '',
        nombre: '',
        ruc: '',
        telefono: '',
        email: '',
        moneda: 'USD',
        tasa_impuesto: 18,
        logo_url: '',
        usarSupabase: false,
        supabaseUrl: '',
        supabaseKey: '',
    })
    const [guardando, setGuardando] = useState(false)

    const set = (k, v) => setConfig({ ...config, [k]: v })
    const rubro = RUBROS[config.rubro]

    const pasos = [
        <PasoRubro key="r" config={config} set={set} />,
        <PasoEquipo key="e" config={config} set={set} />,
        <PasoEmpresa key="em" config={config} set={set} />,
        <PasoNube key="n" config={config} set={set} />,
    ]

    const siguiente = () => setPaso(Math.min(paso + 1, pasos.length - 1))
    const anterior = () => setPaso(Math.max(paso - 1, 0))

    const finalizar = async () => {
        setGuardando(true)
        try {
            await completarOnboarding(config)
            onComplete?.()
        } catch (e) {
            console.error(e)
            dialog.alert('Ocurrió un error al guardar. Intenta de nuevo.')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-text-dark via-[#134e4a] to-[#052e2b] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Barra de progreso */}
                <div className="flex gap-1 p-4 bg-menta-bg">
                    {pasos.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 flex-1 rounded-full transition-all ${
                                i <= paso ? 'bg-menta' : 'bg-menta-border'
                            }`}
                        />
                    ))}
                </div>

                <div className="p-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-text-dark">
                            {['¿Qué tipo de negocio tienes?', '¿Quién usará la app?', 'Datos de tu negocio', 'Conexión a la nube'][paso]}
                        </h1>
                        <p className="text-text-muted mt-1">
                            {[
                                'Adaptaremos el sistema a tu rubro. Podrás cambiarlo después.',
                                'Esto define qué pantallas y roles se activan.',
                                'Usaremos esto en tus tickets y facturas.',
                                'Opcional: sincroniza tus datos en tu propia nube.',
                            ][paso]}
                        </p>
                    </div>

                    <div className="min-h-65">{pasos[paso]}</div>

                    {/* Navegación */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={anterior}
                            disabled={paso === 0}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition ${
                                paso === 0 ? 'opacity-0' : 'bg-menta-bg text-text-dark hover:bg-menta-tint'
                            }`}
                        >
                            <ArrowLeft size={18} /> Atrás
                        </button>

                        {paso < pasos.length - 1 ? (
                            <button onClick={siguiente} className="btn-menta btn-menta-dark-text flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold">
                                Siguiente <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={finalizar}
                                disabled={guardando}
                                className="btn-menta btn-menta-dark-text flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold"
                                
                            >
                                <Check size={18} /> {guardando ? 'Guardando...' : 'Empezar a usar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function PasoRubro({ config, set }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(RUBROS).map(r => (
                <button
                    key={r.id}
                    onClick={() => set('rubro', r.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition ${
                        config.rubro === r.id
                            ? 'border-menta bg-menta-tint shadow-sm'
                            : 'border-menta-border hover:border-menta'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-3xl"><r.icono /></span>
                        <div>
                            <p className="font-bold text-text-dark">{r.nombre}</p>
                            <p className="text-sm text-text-muted">{r.descripcion}</p>
                        </div>
                    </div>
                </button>
            ))}
        </div>)
}

function PasoEquipo({ config, set }) {
    return (
        <div className="space-y-6">
            <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-2 text-text-dark">
                    <Users size={18} className="text-menta-dark" /> ¿Cuántas personas usarán la app?
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {[['1', 'Solo yo'], ['2-5', 'Equipo pequeño'], ['6+', 'Varios']].map(([v, l]) => (
                        <button
                            key={v}
                            onClick={() => set('numPersonas', v)}
                            className={`py-3 rounded-xl border-2 font-semibold transition ${
                                config.numPersonas === v ? 'border-menta bg-menta-tint' : 'border-menta-border'
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-2 text-text-dark">
                    <Store size={18} className="text-menta-dark" /> ¿Qué rol vas a tomar tú?
                </label>
                <div className="space-y-2">
                    {ROLES.map(r => (
                        <button
                            key={r.id}
                            onClick={() => set('rol', r.id)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition ${
                                config.rol === r.id ? 'border-menta bg-menta-tint' : 'border-menta-border'
                            }`}
                        >
                            <p className="font-semibold text-text-dark">{r.nombre}</p>
                            <p className="text-sm text-text-muted">{r.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-2 text-text-dark">
                    <Users size={18} className="text-menta-dark" /> ¿Cómo te llamas? (quién administra)
                </label>
                <input
                    type="text"
                    placeholder="Ej. Carlos"
                    value={config.admin_nombre}
                    onChange={e => set('admin_nombre', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
                />
                <p className="text-xs text-[#94a3b8] mt-1">
                    Aparecerá en la pantalla como el administrador de este inventario.
                </p>
            </div>
        </div>)
}

function PasoEmpresa({ config, set }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Nombre del negocio" value={config.nombre} onChange={v => set('nombre', v)} />
            <Campo label="RUC / NIF" value={config.ruc} onChange={v => set('ruc', v)} />
            <Campo label="Teléfono" value={config.telefono} onChange={v => set('telefono', v)} />
            <Campo label="Email" value={config.email} onChange={v => set('email', v)} type="email" />
            <div>
                <label className="block text-sm font-semibold mb-1">Logo del negocio</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-menta-bg border-2 border-menta-border rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <Image size={24} className="text-menta-dark" />
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <input
                            type="text"
                            placeholder="URL del logo o pégalo aquí..."
                            value={config.logo_url}
                            onChange={e => set('logo_url', e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
                        />
                        <button
                            type="button"
                            onClick={() => document.getElementById('logoFileOnboarding').click()}
                            className="w-full px-4 py-2.5 bg-menta-bg border-2 border-menta-border rounded-xl hover:bg-menta-tint transition text-sm font-semibold"
                        >
                            Subir imagen desde PC
                        </button>
                        <input
                            id="logoFileOnboarding"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files[0]
                                if (!file) return
                                const reader = new FileReader()
                                reader.onloadend = () => set('logo_url', reader.result)
                                reader.readAsDataURL(file)
                            }}
                        />
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1">Moneda</label>
                <select
                    value={config.moneda}
                    onChange={e => set('moneda', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta"
                >
                    {MONEDAS.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
            </div>
            <Campo label="Impuesto % (ej. 15)" value={config.tasa_impuesto} onChange={v => set('tasa_impuesto', parseFloat(v) || 0)} type="number" />
        </div>)
}

function PasoNube({ config, set }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-menta-bg rounded-2xl border border-menta-tint">
                <Wifi size={22} className="text-menta-dark mt-0.5" />
                <p className="text-sm text-text-dark">
                    La app funciona <b>sin internet</b>. Si quieres respaldo y usarla en varias PCs,
                    conecta tu propio Supabase (gratis). Si no, tus datos quedan solo en esta computadora.
                </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={config.usarSupabase}
                    onChange={e => set('usarSupabase', e.target.checked)}
                    className="w-5 h-5 accent-menta"
                />
                <span className="font-semibold text-text-dark flex items-center gap-2">
                    <Database size={18} /> Quiero conectar mi nube (Supabase)
                </span>
            </label>

            {config.usarSupabase && (
                <div className="space-y-3 p-4 border-2 border-menta-border rounded-2xl">
                    <Campo label="URL de Supabase" value={config.supabaseUrl} onChange={v => set('supabaseUrl', v)} placeholder="https://xxxx.supabase.co" />
                    <Campo label="Anon Key" value={config.supabaseKey} onChange={v => set('supabaseKey', v)} placeholder="eyJ..." />
                    <p className="text-xs text-[#94a3b8]">
                        Lo encuentras en tu proyecto de Supabase → Project Settings → API.
                        Se guarda solo en esta computadora.
                    </p>
                </div>
            )}
        </div>)
}

function Campo({ label, value, onChange, type = 'text', placeholder = '' }) {
    return (
        <div>
            <label className="block text-sm font-semibold mb-1">{label}</label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition"
            />
        </div>
    )}