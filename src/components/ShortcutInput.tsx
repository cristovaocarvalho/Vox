import React, { useState } from 'react'
import { cn } from '../lib/utils'

export interface ShortcutInputProps {
  value: string
  onChange: (shortcut: string) => void
  placeholder?: string
  className?: string
}

export const ShortcutInput: React.FC<ShortcutInputProps> = ({
  value,
  onChange,
  placeholder = 'Clique e pressione a tecla...',
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setIsRecording(false)
      e.currentTarget.blur()
      return
    }

    // Ignorar quando apenas teclas modificadoras são pressionadas
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return
    }

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Cmd')

    let keyName = e.key
    if (keyName === ' ') keyName = 'Space'
    if (keyName.length === 1) keyName = keyName.toUpperCase()

    parts.push(keyName)
    const formatted = parts.join('+')

    onChange(formatted)
    setIsRecording(false)
    e.currentTarget.blur()
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        readOnly
        value={isRecording ? 'Pressione a tecla...' : value}
        onFocus={() => setIsRecording(true)}
        onBlur={() => setIsRecording(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full bg-background/70 border px-3 py-2 rounded-xl text-xs font-mono text-center transition-all cursor-pointer select-none focus:outline-none',
          isRecording
            ? 'border-accent text-accent animate-pulse bg-accent/15 ring-2 ring-accent/30 font-semibold'
            : 'border-border/60 text-accent hover:border-accent/40',
          className
        )}
      />
      {isRecording && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary animate-pulse pointer-events-none">
          ESC
        </span>
      )}
    </div>
  )
}

export default ShortcutInput
