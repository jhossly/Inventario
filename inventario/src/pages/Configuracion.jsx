import { useState, useEffect } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { getMiEmpresa, updateMiEmpresa, updatePlantillas, restaurarDesdeSupabase, respaldarTodoEnSupabase } from '../services/dataService'
import { Save, Building2, Palette, Users, FileText, Settings, CheckCircle2, Receipt, FileEdit, Edit, LayoutTemplate, DatabaseBackup, X } from 'lucide-react'
import DocumentDesigner from '../components/DocumentDesigner'
import VisualDocumentEditor from '../components/VisualDocumentEditor'
import { useTema } from '../context/TemaContext'

export default function Configuracion() {
  const tema = useTema()
  const [empresa, setEmpresa] = useState({
    nombre: '', ruc: '', telefono: '', email: '', admin_nombre: '',
    moneda: 'USD', tasa_impuesto: 18, logo_url: ''
  })
  const [editando, setEditando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null)
  const [restaurando, setRestaurando] = useState(false)
  const [restaurado, setRestaurado] = useState(false)
  const [respaldando, setRespaldando] = useState(false)
  const [respaldado, setRespaldado] = useState(false)
  const dialog = useDialog()
  
  useEffect(() => { loadEmpresa() }, [])

  const loadEmpresa = async () => {
    try {
        const empresa = await getMiEmpresa();
        setEmpresa(empresa);
    } catch (err) {
        console.log('Offline - usando datos por defecto');
        setEmpresa({ nombre: 'Mi Negocio', ruc: '', telefono: '', email: '', moneda: 'USD', tasa_impuesto: 18 });
    }
}

  const handleRestaurar = async () => {
    if (!await dialog.confirm(
        'Se traerán los datos que estén en tu nube (Supabase) a este equipo. ' +
        'No se borra nada de lo que ya tienes localmente. ¿Continuar?'
    )) return;
    setRestaurando(true);
    try {
        await restaurarDesdeSupabase();
        setRestaurado(true);
        setTimeout(() => setRestaurado(false), 3000);
    } catch (e) {
        console.error(e);
        dialog.alert('No se pudo restaurar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
        setRestaurando(false);
    }
}

  const handleRespaldar = async () => {
    if (!await dialog.confirm(
        'Se subirán TODOS los datos que tienes en este equipo a tu nube (Supabase). ' +
        'Usa esto para reconstruir la nube cuando la borraste o está vacía. ¿Continuar?'
    )) return;
    setRespaldando(true);
    try {
        await respaldarTodoEnSupabase();
        setRespaldado(true);
        setTimeout(() => setRespaldado(false), 3000);
    } catch (e) {
        console.error(e);
        dialog.alert('No se pudo subir. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
        setRespaldando(false);
    }
}

  const handleSavePlantilla = async (tipo, contenido) => {
    await updatePlantillas(tipo, contenido);
    dialog.alert(`Plantilla ${tipo} guardada exitosamente`);
}

  const handleSave = async (e) => {
    e.preventDefault();
    await updateMiEmpresa(empresa);
    const actualizada = await getMiEmpresa();
    setEmpresa(actualizada || empresa);
    setEditando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
    window.dispatchEvent(new Event('empresa:updated'))
}

  const handleEditar = () => {
    setEditando(true)
}

  const fieldClass = (extra = '') =>
    `w-full px-4 py-3 bg-white border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta transition disabled:bg-gray-100 disabled:text-gray-500 ${extra}`

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
        <Settings size={28} className="text-menta-dark" /> Configuración
      </h2>

      {/* Datos Empresa */}
      <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-dark">
          <Building2 size={20} className="text-menta-dark" />
          Datos de la Empresa
        </h3>
        <form id="empresa-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nombre</label>
            <input
              type="text"
              value={empresa.nombre || ''}
              onChange={(e) => setEmpresa({...empresa, nombre: e.target.value})}
              disabled={!editando}
              className={fieldClass()}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Nombre del administrador</label>
            <input
              type="text"
              placeholder="Ej. Carlos"
              value={empresa.admin_nombre || ''}
              onChange={(e) => setEmpresa({...empresa, admin_nombre: e.target.value})}
              disabled={!editando}
              className={fieldClass()}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">RUC</label>
            <input
              type="text"
              value={empresa.ruc || ''}
              onChange={(e) => setEmpresa({...empresa, ruc: e.target.value})}
              disabled={!editando}
              className={fieldClass()}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Teléfono</label>
            <input
              type="text"
              value={empresa.telefono || ''}
              onChange={(e) => setEmpresa({...empresa, telefono: e.target.value})}
              disabled={!editando}
              className={fieldClass()}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={empresa.email || ''}
              onChange={(e) => setEmpresa({...empresa, email: e.target.value})}
              disabled={!editando}
              className={fieldClass()}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Logo de la Empresa</label>
            <div className="flex items-center gap-4">
              {empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt="Logo"
                  className="w-20 h-20 object-contain border-2 border-menta-border rounded-xl p-2 bg-white"
                />
              ) : (
                <div className="w-20 h-20 bg-menta-bg border-2 border-menta-border rounded-xl flex items-center justify-center">
                  <Building2 size={32} className="text-menta-dark" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="URL del logo (o sube una imagen)"
                  value={empresa.logo_url || ''}
                  onChange={(e) => setEmpresa({...empresa, logo_url: e.target.value})}
                  disabled={!editando}
                  className={fieldClass()}
                />
                <p className="text-xs text-[#94a3b8] mt-1">
                  Puedes usar una URL de imagen o subirla a un servicio como Imgur
                </p>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('logoInput').click()}
                disabled={!editando}
                className="px-4 py-3 bg-menta-bg border-2 border-menta-border rounded-xl hover:bg-menta-tint transition disabled:opacity-60"
              >
                Subir Imagen
              </button>
              <input
                id="logoInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setEmpresa({...empresa, logo_url: reader.result})
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
            </div>
          </div>
        </form>
        <div className="flex items-center gap-3 mt-4">
          {!editando ? (
              <button
                type="button"
                onClick={handleEditar}
                className="px-6 py-3 text-white rounded-xl font-bold transition disabled:opacity-60"
                style={{ backgroundColor: tema.primary }}
              >
                <Edit size={18} className="inline mr-2" /> Editar
              </button>
          ) : (
            <>
                <button
                  type="submit"
                  form="empresa-form"
                  className="px-6 py-3 text-white rounded-xl font-bold transition disabled:opacity-60"
                  style={{ backgroundColor: tema.primaryDark }}
                >
                  <Save size={18} className="inline mr-2" /> Guardar cambios
                </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false)
                  loadEmpresa()
                }}
                className="px-6 py-3 border-2 border-menta-border rounded-xl font-bold hover:bg-menta-bg transition"
              >
                <X size={18} className="inline mr-2" /> Cancelar
              </button>
            </>
          )}
          {guardado && (
            <span className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 size={18} /> Guardado correctamente
            </span>
          )}
        </div>
      </div>

      {/* Plantillas de Comprobantes */}
      <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-dark">
          <LayoutTemplate size={20} className="text-menta-dark" />
          Plantillas de Comprobantes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['ticket', 'factura', 'nota_credito'].map(tipo => (
            <div key={tipo} className="border-2 border-menta-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {tipo === 'ticket' && <Receipt size={18} className="text-menta-dark" />}
                {tipo === 'factura' && <FileText size={18} className="text-menta-dark" />}
                {tipo === 'nota_credito' && <FileEdit size={18} className="text-menta-dark" />}
                <span className="font-bold capitalize">{tipo.replace('_', ' ')}</span>
              </div>
              <button
                type="button"
                onClick={() => setPlantillaSeleccionada(tipo)}
                className="w-full py-2 rounded-xl font-bold border-2 border-menta-border hover:bg-menta-bg transition text-sm"
              >
                Editar plantilla
              </button>
            </div>
          ))}
        </div>

        {plantillaSeleccionada && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold capitalize">
                Editor: {plantillaSeleccionada.replace('_', ' ')}
              </h4>
              <button
                type="button"
                onClick={() => setPlantillaSeleccionada(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <VisualDocumentEditor
              tipo={plantillaSeleccionada}
              onSave={(contenido) => handleSavePlantilla(plantillaSeleccionada, contenido)}
            />
          </div>
        )}
      </div>

      {/* Sync / Respaldo */}
      <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-dark">
          <DatabaseBackup size={20} className="text-menta-dark" />
          Sincronización y Respaldo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-menta-border rounded-xl p-4">
            <h4 className="font-bold mb-2">Restaurar desde la nube</h4>
            <p className="text-sm text-gray-500 mb-3">
              Trae los datos guardados en Supabase a este equipo sin borrar lo local.
            </p>
            <button
              type="button"
              onClick={handleRestaurar}
              disabled={restaurando}
              className="px-4 py-2 rounded-xl font-bold border-2 border-menta-border hover:bg-menta-bg transition disabled:opacity-60"
            >
              {restaurando ? 'Restaurando...' : 'Restaurar'}
            </button>
            {restaurado && (
              <p className="text-green-600 text-sm font-semibold mt-2">Restauración completada</p>
            )}
          </div>

          <div className="border-2 border-menta-border rounded-xl p-4">
            <h4 className="font-bold mb-2">Respaldar en la nube</h4>
            <p className="text-sm text-gray-500 mb-3">
              Sube todos los datos locales a Supabase para reconstruir la nube.
            </p>
            <button
              type="button"
              onClick={handleRespaldar}
              disabled={respaldando}
              className="px-4 py-2 rounded-xl font-bold border-2 border-menta-border hover:bg-menta-bg transition disabled:opacity-60"
            >
              {respaldando ? 'Subiendo...' : 'Respaldar'}
            </button>
            {respaldado && (
              <p className="text-green-600 text-sm font-semibold mt-2">Respaldo completado</p>
            )}
          </div>
        </div>
      </div>

      {dialog.Dialog}
    </div>
  )
}
