import { useState } from 'react'
import { CardTitle } from './ui/card'

export default function CardTitle({ children, icon: Icon, className = '' }) {
  return (
    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${className}`}>
      {Icon && <Icon size={20} />}
      {children}
    </h3>
  )
}

