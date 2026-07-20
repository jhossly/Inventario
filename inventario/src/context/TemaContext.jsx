import { createContext, useContext } from 'react'
import { getTema } from '../services/themeService'

const TemaContext = createContext(null)

export function TemaProvider({ children, rubroId }) {
  const tema = getTema(rubroId)
  return (
    <TemaContext.Provider value={tema}>
      {children}
    </TemaContext.Provider>
  )
}

export function useTema() {
  const tema = useContext(TemaContext)
  if (!tema) {
    return getTema('retail')
  }
  return tema
}
