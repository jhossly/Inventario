import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function AppDialog({ open, onClose, tipo, titulo, mensaje, inputLabel, inputValue, onInputChange, onConfirm, children }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-menta-border">
          <h3 className="text-lg font-bold text-text-dark">{titulo}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {tipo === 'alert' && (
            <p className="text-sm text-text-muted">{mensaje}</p>
          )}

          {tipo === 'confirm' && (
            <p className="text-sm text-text-muted">{mensaje}</p>
          )}

          {tipo === 'prompt' && (
            <div className="space-y-2">
              <p className="text-sm text-text-muted">{mensaje}</p>
              {inputLabel && (
                <label className="block text-sm font-semibold text-text-dark">{inputLabel}</label>
              )}
              <input
                type="text"
                value={inputValue || ''}
                onChange={(e) => onInputChange?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm?.()}
                className="w-full px-4 py-3 border-2 border-menta-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-menta"
                autoFocus
              />
            </div>
          )}

          {children}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          {(tipo === 'confirm' || tipo === 'prompt') && (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-menta-bg border-2 border-menta-border rounded-xl font-bold text-[#0f766e] hover:bg-menta-tint transition"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-white transition shadow-md hover:shadow-lg btn-menta"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
