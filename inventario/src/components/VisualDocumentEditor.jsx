// VisualDocumentEditor.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { Plus, Trash2, Eye, Save, Image, Calendar, User, Hash, DollarSign, Move, Type, FileText } from 'lucide-react'

export default function VisualDocumentEditor({ tipo, empresa, onSave }) {
  const dialog = useDialog()
  const [camposActivos, setCamposActivos] = useState([])
  const [camposDisponibles, setCamposDisponibles] = useState([])
  const [preview, setPreview] = useState(false)
  const [nombrePlantilla, setNombrePlantilla] = useState('')
  const [modoEdicion, setModoEdicion] = useState('simple') // 'simple' o 'avanzado'

  const CAMPOS_DISPONIBLES = {
    ticket: [
      { id: 'numero_ticket', label: 'Número de ticket', tipo: 'texto', fijo: true },
      { id: 'fecha', label: 'Fecha', tipo: 'texto', fijo: true },
      { id: 'items', label: 'Items', tipo: 'tabla', fijo: true },
      { id: 'subtotal', label: 'Subtotal', tipo: 'moneda', fijo: true },
      { id: 'impuesto', label: 'IVA', tipo: 'moneda', fijo: true },
      { id: 'total', label: 'Total', tipo: 'moneda', fijo: true },
      { id: 'metodo_pago', label: 'Método de pago', tipo: 'texto', fijo: false },
      { id: 'cliente', label: 'Cliente', tipo: 'texto', fijo: false },
      { id: 'mensaje', label: 'Mensaje final', tipo: 'texto', fijo: false },
    ],
    factura: [
      { id: 'numero_factura', label: 'Número de factura', tipo: 'texto', fijo: true },
      { id: 'fecha_emision', label: 'Fecha de emisión', tipo: 'texto', fijo: true },
      { id: 'ruc', label: 'RUC', tipo: 'texto', fijo: true },
      { id: 'razon_social', label: 'Razón social', tipo: 'texto', fijo: true },
      { id: 'items', label: 'Items', tipo: 'tabla', fijo: true },
      { id: 'subtotal_0', label: 'Subtotal 0%', tipo: 'moneda', fijo: false },
      { id: 'subtotal_iva', label: 'Subtotal IVA', tipo: 'moneda', fijo: false },
      { id: 'impuesto', label: 'IVA total', tipo: 'moneda', fijo: true },
      { id: 'total', label: 'Total', tipo: 'moneda', fijo: true },
      { id: 'forma_pago', label: 'Forma de pago', tipo: 'texto', fijo: false },
    ],
    nota_credito: [
      { id: 'numero_nota', label: 'Número nota crédito', tipo: 'texto', fijo: true },
      { id: 'fecha', label: 'Fecha', tipo: 'texto', fijo: true },
      { id: 'motivo', label: 'Motivo', tipo: 'texto', fijo: true },
      { id: 'monto', label: 'Monto', tipo: 'moneda', fijo: true },
      { id: 'cliente', label: 'Cliente', tipo: 'texto', fijo: false },
      { id: 'comprobante_relacionado', label: 'Comprobante relacionado', tipo: 'texto', fijo: false },
    ],
  }

  // Inicializar campos disponibles según el tipo
  useEffect(() => {
    const campos = CAMPOS_DISPONIBLES[tipo] || []
    setCamposDisponibles(campos)
    
    // Cargar plantilla guardada
    const guardada = localStorage.getItem(`plantilla_${tipo}`)
    if (guardada) {
      try {
        const data = JSON.parse(guardada)
        setCamposActivos(data.campos || campos.filter(c => c.fijo))
        setNombrePlantilla(data.nombre || '')
      } catch {
        // Si no es JSON, usar los campos fijos
        setCamposActivos(campos.filter(c => c.fijo))
      }
    } else {
      // Si no hay guardada, usar los campos fijos
      setCamposActivos(campos.filter(c => c.fijo))
    }
  }, [tipo])

  // Agregar campo personalizado
  const agregarCampo = (campoId) => {
    const campo = camposDisponibles.find(c => c.id === campoId)
    if (campo && !camposActivos.find(c => c.id === campoId)) {
      setCamposActivos([...camposActivos, { ...campo, personalizado: true }])
    }
  }

  // Eliminar campo personalizado
  const eliminarCampo = (campoId) => {
    const campo = camposActivos.find(c => c.id === campoId)
    if (campo && !campo.fijo) {
      setCamposActivos(camposActivos.filter(c => c.id !== campoId))
    }
  }

  // Guardar plantilla
  const guardarPlantilla = () => {
    const datos = {
      nombre: nombrePlantilla || `${tipo}_${Date.now()}`,
      tipo: tipo,
      campos: camposActivos,
      fecha_creacion: new Date().toISOString()
    }
    
    localStorage.setItem(`plantilla_${tipo}`, JSON.stringify(datos))
    if (onSave) {
      onSave(tipo, JSON.stringify(datos))
    }
    dialog.alert('✅ Plantilla guardada exitosamente')
  }

  // Renderizar diseño simple (vista de estructura)
  const renderDisenoSimple = () => {
    return (
      <div className="space-y-3">
        {camposActivos.map((campo, idx) => (
          <div key={campo.id} className="flex items-start gap-3 p-3 bg-menta-bg rounded-xl border border-menta-border">
            {/* Icono según tipo */}
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-menta-border">
              {campo.type === 'image' && <Image size={16} className="text-menta-dark" />}
              {campo.type === 'text' && <Type size={16} className="text-menta-dark" />}
              {campo.type === 'table' && <FileText size={16} className="text-menta-dark" />}
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-text-dark">{campo.label}</p>
              <p className="text-xs text-[#94a3b8]">{campo.descripcion || 'Campo personalizado'}</p>
              {campo.fijo && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  Automático
                </span>
              )}
              {!campo.fijo && (
                <div className="mt-1 flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Texto de ejemplo..." 
                    className="text-xs px-2 py-1 border border-menta-border rounded bg-white"
                    disabled
                  />
                  <button
                    onClick={() => eliminarCampo(campo.id)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            
            {campo.fijo && (
              <span className="text-[#94a3b8]">
                <Move size={16} />
              </span>
            )}
          </div>
        ))}
      </div>)
  }

  // Renderizar vista previa (SOLO ESTRUCTURA, sin datos reales)
  const renderVistaPrevia = () => {
    return (
      <div className="border-2 border-menta-border rounded-xl p-6 bg-white max-h-96 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {camposActivos.map((campo) => (
            <div key={campo.id} className="mb-4 p-3 border-2 border-dashed border-menta-border rounded-lg">
              {campo.type === 'image' && (
                <div className="w-20 h-20 bg-menta-bg rounded-lg flex items-center justify-center">
                  <Image size={32} className="text-menta-dark" />
                </div>
              )}
              {campo.type === 'text' && (
                <div>
                  <label className="text-xs font-medium text-[#94a3b8]">{campo.label}</label>
                  <div className="h-8 bg-menta-bg rounded flex items-center px-3 text-[#94a3b8]">
                    {campo.fijo ? '[Valor automático]' : '[Campo personalizado]'}
                  </div>
                </div>
              )}
              {campo.type === 'table' && (
                <div>
                  <label className="text-xs font-medium text-[#94a3b8]">{campo.label}</label>
                  <div className="border border-menta-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 gap-0 bg-menta-bg p-2">
                      <div className="text-xs font-medium">Producto</div>
                      <div className="text-xs font-medium text-center">Cant</div>
                      <div className="text-xs font-medium text-right">Total</div>
                    </div>
                    <div className="p-2 text-[#94a3b8] text-sm text-center">
                      [Datos de la venta]
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
  )
}

  // Campos disponibles para agregar (NO fijos)
  const camposAgregables = camposDisponibles.filter(c => 
    !c.fijo && !camposActivos.find(activo => activo.id === c.id)
  )

  return (
    <>
      <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
            <FileText size={20} className="text-menta-dark" />
            Diseñador de Plantilla - {tipo === 'ticket' ? 'Ticket' : tipo === 'factura' ? 'Factura' : 'Nota Crédito'}
          </h3>
          <p className="text-sm text-[#94a3b8]">Arrastra campos o haz clic para personalizar tu documento</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2 bg-menta-bg border-2 border-menta-border rounded-xl hover:bg-menta-tint transition"
          >
            {preview ? <Eye size={16} /> : <Eye size={16} />}
            {preview ? 'Volver a Editar' : 'Vista Previa'}
          </button>
          <button
            onClick={guardarPlantilla}
            className="flex items-center gap-2 px-4 py-2 btn-menta rounded-xl font-bold"
          >
            <Save size={16} />
            Guardar Diseño
          </button>
        </div>
      </div>

      {/* Contenido */}
      {!preview ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Panel de diseño */}
          <div className="md:col-span-3">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Nombre de la plantilla (opcional)"
                value={nombrePlantilla}
                onChange={(e) => setNombrePlantilla(e.target.value)}
                className="w-full px-4 py-2 border-2 border-menta-border rounded-xl focus:outline-none focus:ring-2 focus:ring-menta"
              />
            </div>
            
            {renderDisenoSimple()}
          </div>

          {/* Panel lateral - Campos disponibles */}
          <div className="md:col-span-1">
            <div className="bg-menta-bg border-2 border-menta-border rounded-xl p-4">
              <h4 className="font-bold text-text-dark mb-3">📝 Agregar Campos</h4>
              
              {camposAgregables.length > 0 ? (
                <div className="space-y-2">
                  {camposAgregables.map((campo) => (
                    <button
                      key={campo.id}
                      onClick={() => agregarCampo(campo.id)}
                      className="w-full text-left p-2 bg-white rounded-lg border border-menta-border hover:border-menta hover:bg-menta-tint transition flex items-center gap-2"
                    >
                      <Plus size={14} className="text-menta-dark" />
                      <div>
                        <p className="text-sm font-medium">{campo.label}</p>
                        <p className="text-xs text-[#94a3b8]">{campo.descripcion}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#94a3b8]">Todos los campos disponibles ya están agregados</p>
              )}

              <div className="mt-4 p-3 bg-white rounded-lg border border-menta-border">
                <p className="text-xs text-center text-[#94a3b8]">
                  💡 Los campos con etiqueta <span className="text-blue-600">"Automático"</span> se llenan con datos de la venta
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        renderVistaPrevia()
      )}
      {dialog.Dialog}
    </div></>
  )
}