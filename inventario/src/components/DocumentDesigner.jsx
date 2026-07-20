import { useState, useEffect, useRef } from 'react'
import useDialog from '../hooks/useDialog.jsx'
import { Save, Eye, EyeOff, FileCode2, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Link, Image, List, ListOrdered } from 'lucide-react'

const defaultTemplates = {
  ticket: `<div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="{{logo}}" alt="Logo" style="max-height: 80px; max-width: 150px;" />
      <h2 style="margin: 10px 0; color: #0d9488;">{{nombre_empresa}}</h2>
      <p style="font-size: 12px; color: #64748b;">RUC: {{ruc}}</p>
    </div>
    <hr style="border: 1px dashed #cbd5e1;" />
    <div style="margin: 15px 0;">
      <p><strong>Ticket:</strong> {{numero_ticket}}</p>
      <p><strong>Fecha:</strong> {{fecha}}</p>
    </div>
    <hr style="border: 1px dashed #cbd5e1;" />
    <table style="width: 100%; margin: 15px 0;">
      <thead>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="text-align: left; font-size: 12px;">Producto</th>
          <th style="text-align: right; font-size: 12px;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{items}}
      </tbody>
    </table>
    <hr style="border: 1px dashed #cbd5e1;" />
    <div style="margin: 15px 0; text-align: right;">
      <p>Subtotal: $$ {{subtotal}}</p>
      <p>IVA: $$ {{impuesto}}</p>
      <p style="font-size: 18px; font-weight: bold;">TOTAL: $$ {{total}}</p>
    </div>
    <hr style="border: 1px dashed #cbd5e1;" />
    <p style="text-align: center; font-size: 14px; margin-top: 20px;">{{pie}}</p>
  </div>`,

  factura: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div>
        <img src="{{logo}}" alt="Logo" style="max-height: 100px;" />
      </div>
      <div style="text-align: right;">
        <h1 style="color: #0d9488; margin: 0;">FACTURA</h1>
        <p><strong>N°:</strong> {{numero_factura}}</p>
        <p><strong>Fecha:</strong> {{fecha}}</p>
      </div>
    </div>
    <div style="margin-bottom: 20px;">
      <h2>{{nombre_empresa}}</h2>
      <p>RUC: {{ruc}}</p>
      <p>{{direccion}}</p>
    </div>
    <div style="margin-bottom: 20px;">
      <h3 style="color: #0d9488;">Datos del Cliente:</h3>
      <p><strong>Nombre:</strong> {{cliente_nombre}}</p>
      <p><strong>Documento:</strong> {{cliente_documento}}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f0fdfa;">
          <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left;">Producto</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">Cant</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">Precio</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{items}}
      </tbody>
    </table>
    <div style="text-align: right; margin: 20px 0;">
      <p>Subtotal: $$ {{subtotal}}</p>
      <p>IVA: $$ {{impuesto}}</p>
      <p style="font-size: 20px; font-weight: bold;">TOTAL: $$ {{total}}</p>
    </div>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cbd5e1;">
      <p>{{pie}}</p>
    </div>
  </div>`,

  nota_credito: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; border: 2px dashed #f59e0b;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #f59e0b;">NOTA DE CRÉDITO</h1>
      <p><strong>N°:</strong> {{numero_nota}}</p>
      <p><strong>Fecha:</strong> {{fecha}}</p>
    </div>
    <p>Esta nota de crédito fue emitida por {{nombre_empresa}}</p>
    <p>Motivo: {{motivo}}</p>
    <p>Monto: $$ {{monto}}</p>
  </div>`
}

const variables = {
  ticket: ['logo', 'nombre_empresa', 'ruc', 'numero_ticket', 'fecha', 'items', 'subtotal', 'impuesto', 'total', 'pie'],
  factura: ['logo', 'nombre_empresa', 'ruc', 'direccion', 'numero_factura', 'fecha', 'cliente_nombre', 'cliente_documento', 'items', 'subtotal', 'impuesto', 'total', 'pie'],
  nota_credito: ['logo', 'nombre_empresa', 'ruc', 'numero_nota', 'fecha', 'motivo', 'monto']
}

const execCommand = (command, value = null) => {
  document.execCommand(command, false, value)
}

export default function DocumentDesigner({ tipo, empresa, onSave }) {
  const dialog = useDialog()
  const [contenido, setContenido] = useState('')
  const [preview, setPreview] = useState(false)
  const [insertMode, setInsertMode] = useState('visual')
  const editorRef = useRef(null)

  useEffect(() => {
    const templateGuardada = localStorage.getItem(`plantilla_${tipo}`)
    setContenido(templateGuardada || defaultTemplates[tipo] || '')
  }, [tipo])

  const handleSave = async () => {
    localStorage.setItem(`plantilla_${tipo}`, contenido)
    if (onSave) {
      await onSave(tipo, contenido)
    }
  }

  const insertarVariable = (variable) => {
    const campo = `{{${variable}}}`
    if (insertMode === 'visual') {
      execCommand('insertText', campo)
    } else {
      setContenido(prev => prev + campo)
    }
  }

  const insertarImagen = async () => {
    const url = await dialog.prompt('URL de la imagen:')
    if (url) execCommand('insertImage', url)
  }

  const insertarEnlace = async () => {
    const url = await dialog.prompt('URL del enlace:')
    if (url) execCommand('createLink', url)
  }

  return (
    <>
      <div className="bg-white border-2 border-menta-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-text-dark">
          <FileCode2 size={20} className="text-menta-dark" />
          Diseñador de Plantilla - {tipo === 'ticket' ? 'Ticket de Venta' : tipo === 'factura' ? 'Factura' : 'Nota Crédito'}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setInsertMode(insertMode === 'visual' ? 'html' : 'visual')}
            className="px-3 py-1.5 text-xs bg-menta-bg border-2 border-menta-border rounded-xl hover:bg-menta-tint transition"
          >
            {insertMode === 'visual' ? 'Modo HTML' : 'Modo Visual'}
          </button>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2 bg-menta-bg border-2 border-menta-border rounded-xl hover:bg-menta-tint transition"
          >
            {preview ? <EyeOff size={16} /> : <Eye size={16} />}
            {preview ? 'Editar' : 'Vista Previa'}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 btn-menta rounded-xl font-bold"
          >
            <Save size={16} />
            Guardar Plantilla
          </button>
        </div>
      </div>

      {!preview && (
        <div className="border-2 border-menta-border rounded-xl mb-4 overflow-hidden">
          {insertMode === 'visual' ? (
            <>
              <div className="flex flex-wrap gap-1 p-2 bg-menta-bg border-b border-menta-border">
                <button onClick={() => execCommand('bold')} className="p-1.5 hover:bg-menta-tint rounded" title="Negrita"><Bold size={16} /></button>
                <button onClick={() => execCommand('italic')} className="p-1.5 hover:bg-menta-tint rounded" title="Itálica"><Italic size={16} /></button>
                <button onClick={() => execCommand('underline')} className="p-1.5 hover:bg-menta-tint rounded" title="Subrayado"><Underline size={16} /></button>
                <button onClick={() => execCommand('strikeThrough')} className="p-1.5 hover:bg-menta-tint rounded" title="Tachado"><Strikethrough size={16} /></button>
                <div className="w-px bg-menta-border mx-1"></div>
                <button onClick={() => execCommand('justifyLeft')} className="p-1.5 hover:bg-menta-tint rounded" title="Izquierda"><AlignLeft size={16} /></button>
                <button onClick={() => execCommand('justifyCenter')} className="p-1.5 hover:bg-menta-tint rounded" title="Centrar"><AlignCenter size={16} /></button>
                <button onClick={() => execCommand('justifyRight')} className="p-1.5 hover:bg-menta-tint rounded" title="Derecha"><AlignRight size={16} /></button>
                <div className="w-px bg-menta-border mx-1"></div>
                <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-menta-tint rounded" title="Lista"><List size={16} /></button>
                <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 hover:bg-menta-tint rounded" title="Lista numerada"><ListOrdered size={16} /></button>
                <div className="w-px bg-menta-border mx-1"></div>
                <button onClick={insertarEnlace} className="p-1.5 hover:bg-menta-tint rounded" title="Enlace"><Link size={16} /></button>
                <button onClick={insertarImagen} className="p-1.5 hover:bg-menta-tint rounded" title="Imagen"><Image size={16} /></button>
              </div>
              <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => setContenido(editorRef.current.innerHTML)}
                onBlur={() => setContenido(editorRef.current.innerHTML)}
                className="p-4 min-h-96 overflow-auto bg-white prose prose-sm max-w-none outline-none"
                dangerouslySetInnerHTML={{ __html: contenido }}
              />
            </>
          ) : (
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="w-full h-96 p-4 font-mono text-sm resize-none focus:outline-none"
              placeholder="HTML de la plantilla..."
            />
          )}
        </div>
      )}

      {preview && (
        <div 
          className="border-2 border-menta-border rounded-xl p-6 mb-4 max-h-96 overflow-auto bg-white"
          dangerouslySetInnerHTML={{ __html: contenido.replace(/\{\{logo\}\}/g, empresa?.logo_url || '') }}
        />
      )}

      <div className="mt-4">
        <p className="text-sm font-semibold  text-text-dark mb-2">Variables disponibles (haz clic para insertar):</p>
        <div className="flex flex-wrap gap-2">
          {variables[tipo]?.map(v => (
            <button
              key={v}
              onClick={() => insertarVariable(v)}
              className="px-3 py-1 bg-menta-tint text-[#0d9488] rounded-lg text-xs font-mono hover:bg-menta-dark hover:text-white transition"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#94a3b8] mt-2">
          Usa las variables entre llaves dobles (&#123;&#123;variable&#125;&#125;) para insertar datos dinámicos. 
          El logo se muestra automáticamente si usas &#123;&#123;logo&#125;&#125;.
        </p>
        </div>
      {dialog.Dialog}
    </div></>
  )
}