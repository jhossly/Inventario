import { Printer, X } from 'lucide-react'

// Campos por defecto si no hay plantilla guardada.
const CAMPOS_DEFECTO = {
  ticket: ['logo', 'nombre_empresa', 'ruc', 'numero_ticket', 'fecha', 'items', 'subtotal', 'impuesto', 'total'],
  factura: ['logo', 'nombre_empresa', 'ruc', 'direccion', 'numero_factura', 'fecha', 'cliente_nombre', 'cliente_documento', 'items', 'subtotal', 'impuesto', 'total'],
}

const fmt = (n) => `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function ComprobantePreview({ datos, empresa, onCerrar }) {
  // datos: { tipo, numero, fecha, cliente, items, subtotal, impuesto, total, recibido, cambio, esCredito, metodoPago }
  const tipo = datos.tipo || 'ticket'

  let campos = CAMPOS_DEFECTO[tipo]
  try {
    const raw = tipo === 'factura' ? empresa?.plantilla_factura : empresa?.plantilla_ticket
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.campos) && parsed.campos.length) {
        campos = parsed.campos.map(c => c.id)
      }
    }
  } catch { /* usar defecto */ }

  const cliente = datos.cliente || {}
  const items = datos.items || []

  const valorCampo = (id) => {
    switch (id) {
      case 'logo': return empresa?.logo_url
      case 'nombre_empresa': return empresa?.nombre || 'Mi Negocio'
      case 'ruc': return empresa?.ruc ? `RUC: ${empresa.ruc}` : ''
      case 'direccion': return empresa?.direccion || ''
      case 'numero_ticket': return datos.numero
      case 'numero_factura': return datos.numero
      case 'fecha': return datos.fecha
      case 'cliente_nombre': return cliente.nombre ? `Cliente: ${cliente.nombre}` : ''
      case 'cliente_documento': return cliente.documento ? `Doc: ${cliente.documento}` : ''
      case 'subtotal': return fmt(datos.subtotal)
      case 'impuesto': return fmt(datos.impuesto)
      case 'total': return fmt(datos.total)
      default: return ''
    }
  }

  const imprimir = () => {
    const contenido = document.getElementById('comprobante-print')
    if (!contenido) return

    const modal = document.createElement('div')
    modal.id = 'print-overlay-modal'
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px'
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:100%;max-width:420px;max-height:90vh;display:flex;flex-direction:column">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:bold;color:#1e293b;font-size:16px">Vista de impresión</span>
          <span style="font-size:12px;color:#64748b">Ticket 80mm</span>
        </div>
        <div style="padding:20px;overflow-y:auto;flex:1;display:flex;justify-content:center">
          <div id="comprobante-print" style="width:80mm;min-height:120mm;padding:6mm;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;box-sizing:border-box">
            ${contenido.innerHTML}
          </div>
        </div>
        <div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:end">
          <button id="btn-print" style="padding:10px 18px;border-radius:8px;border:0;font-weight:bold;cursor:pointer;background:#0d9488;color:#fff;font-size:14px">Imprimir</button>
          <button id="btn-close" style="padding:10px 18px;border-radius:8px;border:0;font-weight:bold;cursor:pointer;background:#e2e8f0;color:#334155;font-size:14px">Cerrar</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)

    const style = document.createElement('style')
    style.id = 'print-style'
    style.textContent = `@media print { @page { size: 80mm auto; margin: 0; } body > *:not(#print-overlay-modal) { display: none !important; } #print-overlay-modal { position: static !important; background: #fff !important; display: block !important; padding: 0 !important; } #print-overlay-modal > div { max-width: 100% !important; box-shadow: none !important; border-radius: 0 !important; } #print-overlay-modal > div > div:first-child { display: none !important; } #print-overlay-modal > div > div:last-child { display: none !important; } #comprobante-print { width: 100% !important; min-height: auto !important; padding: 4mm !important; } #btn-print, #btn-close { display: none !important; } }`
    document.head.appendChild(style)

    const btnPrint = modal.querySelector('#btn-print')
    const btnClose = modal.querySelector('#btn-close')

    btnPrint.addEventListener('click', () => {
      window.print()
    })
    btnClose.addEventListener('click', () => {
      if (style.parentNode) document.head.removeChild(style)
      if (modal.parentNode) document.body.removeChild(modal)
    })
  }

  return (
    <div id="comprobante-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-menta-border">
          <h3 className="font-bold text-text-dark flex items-center gap-2">
            <Printer size={18} className="text-menta-dark" />
            {tipo === 'factura' ? 'Factura' : 'Ticket'} generado
          </h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        {/* Vista previa del comprobante */}
        <div className="p-4 max-h-[60vh] overflow-auto bg-[#f8fafc]">
          <div id="comprobante-print" className="bg-white border border-[#cbd5e1] rounded-lg p-4 text-text-dark">
            <div className="center">
              {campos.includes('logo') && empresa?.logo_url && (
                <img src={empresa.logo_url} alt="logo" className="h-16 mx-auto mb-1 object-contain" />
              )}
              {campos.includes('nombre_empresa') && (
                <p className="font-bold text-base">{valorCampo('nombre_empresa')}</p>
              )}
              {campos.includes('ruc') && valorCampo('ruc') && <p className="text-xs">{valorCampo('ruc')}</p>}
              {campos.includes('direccion') && valorCampo('direccion') && <p className="text-xs">{valorCampo('direccion')}</p>}
              <p className="text-xs mt-1">{tipo === 'factura' ? 'FACTURA' : 'TICKET'} {datos.numero}</p>
              <p className="text-xs">{datos.fecha}</p>
            </div>

            {(campos.includes('cliente_nombre') && cliente.nombre) && (
              <div className="mt-2 text-xs">
                <p>{valorCampo('cliente_nombre')}</p>
                {valorCampo('cliente_documento') && <p>{valorCampo('cliente_documento')}</p>}
              </div>
            )}

            {campos.includes('items') && (
              <table>
                <thead>
                  <tr><th>Producto</th><th className="r">Cant</th><th className="r">Total</th></tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.nombre}</td>
                      <td className="r">{it.cantidad}</td>
                      <td className="r">{fmt(it.precio * it.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="tot">
              {campos.includes('subtotal') && <div className="flex justify-between"><span>Subtotal</span><span>{valorCampo('subtotal')}</span></div>}
              {campos.includes('impuesto') && <div className="flex justify-between"><span>Impuesto</span><span>{valorCampo('impuesto')}</span></div>}
              {campos.includes('total') && <div className="flex justify-between text-base"><span>TOTAL</span><span>{valorCampo('total')}</span></div>}
            </div>

            {tipo === 'ticket' && datos.metodoPago === 'efectivo' && !datos.esCredito && (
              <div className="mt-2 text-xs">
                <div className="flex justify-between"><span>Recibido</span><span>{fmt(datos.recibido)}</span></div>
                <div className="flex justify-between"><span>Cambio</span><span>{fmt(datos.cambio)}</span></div>
              </div>
            )}
            {datos.esCredito && (
              <p className="mt-2 text-xs center text-orange-600 font-semibold">Venta a crédito - Pendiente de pago</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-menta-border">
          <button onClick={onCerrar} className="flex-1 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold text-[#0f766e] hover:bg-menta-tintt transition">
            Cerrar
          </button>
          <button onClick={imprimir} className="flex-1 py-3 bg-linear-to-r from-menta-dark to-[#0d9488] text-white rounded-xl font-bold hover:from-[#0d9488] transition flex items-center justify-center gap-2">
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
