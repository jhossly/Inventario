import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import AppDialog from '../components/AppDialog'

const DIALOG_CONTAINER_ID = 'app-dialog-container'

function getDialogContainer() {
  if (typeof document === 'undefined') return null
  let container = document.getElementById(DIALOG_CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = DIALOG_CONTAINER_ID
    document.body.appendChild(container)
  }
  return container
}

export default function useDialog() {
  const [state, setState] = useState({
    open: false,
    tipo: 'alert',
    titulo: '',
    mensaje: '',
    inputLabel: '',
    inputValue: '',
    resolver: null,
  })

  const show = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        tipo: opts.tipo || 'alert',
        titulo: opts.titulo || '',
        mensaje: opts.mensaje || '',
        inputLabel: opts.inputLabel || '',
        inputValue: opts.inputValue || '',
        resolver: resolve,
      })
    })
  }, [])

  const alert = useCallback((mensaje, titulo) => {
    return show({ tipo: 'alert', mensaje, titulo: titulo || 'Aviso' })
  }, [show])

  const confirm = useCallback((mensaje, titulo) => {
    return show({ tipo: 'confirm', mensaje, titulo: titulo || 'Confirmar' })
  }, [show])

  const prompt = useCallback((mensaje, titulo, inputLabel) => {
    return show({ tipo: 'prompt', mensaje, titulo: titulo || 'Dato requerido', inputLabel: inputLabel || 'Valor' })
  }, [show])

  const close = useCallback((value) => {
    setState((prev) => {
      prev.resolver?.(value)
      return { ...prev, open: false }
    })
  }, [])

  const container = getDialogContainer()
  const Dialog = state.open && container
    ? createPortal(
        (<AppDialog
          open={state.open}
          onClose={() => close(state.tipo === 'confirm' ? false : undefined)}
          tipo={state.tipo}
          titulo={state.titulo}
          mensaje={state.mensaje}
          inputLabel={state.inputLabel}
          inputValue={state.inputValue}
          onInputChange={(val) => setState((s) => ({ ...s, inputValue: val }))}
          onConfirm={() => {
            if (state.tipo === 'prompt') {
              close(state.inputValue)
            } else if (state.tipo === 'confirm') {
              close(true)
            } else {
              close()
            }
          }}
        />),
        container
      )
    : null

  return { alert, confirm, prompt, Dialog }
}
