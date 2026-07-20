import { useState } from 'react'
import { restaurarDesdeSupabase } from '../services/dataService'
import { DatabaseBackup, Check, AlertTriangle } from 'lucide-react'

export default function RestorePrompt({ onDone }) {
  const [restaurando, setRestaurando] = useState(false)
  const [error, setError] = useState('')

  const restaurar = async () => {
    setRestaurando(true)
    setError('')
    try {
      await restaurarDesdeSupabase()
      onDone?.()
    } catch (e) {
      console.error(e)
      setError('No se pudo restaurar. Revisa tu conexión e inténtalo de nuevo.')
      setRestaurando(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-text-dark via-[#134e4a] to-[#052e2b] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-menta-bg flex items-center justify-center mx-auto mb-4">
          <DatabaseBackup size={32} className="text-menta-dark" />
        </div>
        <h1 className="text-2xl font-bold text-text-dark">Esta base ya tiene datos</h1>
        <p className="text-text-muted mt-2">
          Detectamos información en tu nube (productos, ventas, movimientos, etc.).
          Para que todos trabajen con los mismos datos, vamos a restaurarla en este equipo.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 justify-center text-red-600 text-sm">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <button
          onClick={restaurar}
          disabled={restaurando}
          className="btn-menta mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold disabled:opacity-60"
        >
          {restaurando ? (
            <>Restaurando datos...</>
          ) : (
            <><Check size={18} /> Restaurar y continuar</>
          )}
        </button>

        <p className="text-xs text-[#94a3b8] mt-4">
          Esto puede tardar unos segundos según la cantidad de información.
        </p>
      </div>
    </div>
  )
}
