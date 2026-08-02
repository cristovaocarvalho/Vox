import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

interface ComboboxContextType {
  value: string
  onSelect: (val: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  search: string
  setSearch: (search: string) => void
  items: readonly any[]
}

const ComboboxContext = createContext<ComboboxContextType | null>(null)

function useComboboxContext() {
  const ctx = useContext(ComboboxContext)
  if (!ctx) throw new Error('Combobox subcomponents must be used within a Combobox provider')
  return ctx
}

export interface ComboboxProps {
  items: readonly any[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export const Combobox: React.FC<ComboboxProps> = ({
  items,
  value: controlledValue,
  defaultValue = '',
  onChange,
  children,
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const handleSelect = (val: string) => {
    if (!isControlled) setInternalValue(val)
    onChange?.(val)
    setIsOpen(false)
    setSearch('')
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <ComboboxContext.Provider
      value={{
        value,
        onSelect: handleSelect,
        isOpen,
        setIsOpen,
        search,
        setSearch,
        items
      }}
    >
      <div ref={ref} className={cn('relative w-full', className)}>
        {children}
      </div>
    </ComboboxContext.Provider>
  )
}

export interface ComboboxInputProps {
  placeholder?: string
  className?: string
}

export const ComboboxInput: React.FC<ComboboxInputProps> = ({
  placeholder = 'Selecione...',
  className = ''
}) => {
  const { value, isOpen, setIsOpen, search, setSearch, items } = useComboboxContext()

  const getItemLabel = (val: string) => {
    const item = items.find((i) => (typeof i === 'object' && i !== null ? i.value === val : i === val))
    if (!item) return val
    return typeof item === 'object' && item !== null ? item.label || item.value : item
  }

  const displayValue = isOpen ? search : getItemLabel(value)

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'w-full bg-background/70 border border-border/60 hover:border-accent/50 focus-within:border-accent/80 rounded-xl px-3.5 py-2.5 text-xs font-medium tracking-tight text-text-primary flex items-center justify-between cursor-pointer transition-[border-color,box-shadow] duration-250 ease-smooth focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.06)] select-none',
        className
      )}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value)
          if (!isOpen) setIsOpen(true)
        }}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        className="w-full bg-transparent outline-none cursor-pointer placeholder:text-text-disabled"
      />
      <svg
        className={cn('w-4 h-4 text-text-secondary transition-transform duration-250 ease-smooth shrink-0 ml-2', isOpen && 'rotate-180')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export interface ComboboxContentProps {
  children: React.ReactNode
  className?: string
}

export const ComboboxContent: React.FC<ComboboxContentProps> = ({ children, className = '' }) => {
  const { isOpen } = useComboboxContext()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'absolute top-full left-0 right-0 mt-2 z-50 max-h-32 overflow-y-auto rounded-xl bg-background/95 border border-border/80 p-1.5 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] backdrop-blur-xl custom-scrollbar space-y-0.5',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export interface ComboboxEmptyProps {
  children?: React.ReactNode
  className?: string
}

export const ComboboxEmpty: React.FC<ComboboxEmptyProps> = ({
  children = 'Nenhum item encontrado.',
  className = ''
}) => {
  const { items, search } = useComboboxContext()

  const filtered = items.filter((i) => {
    const text = typeof i === 'object' && i !== null ? `${i.label || ''} ${i.value || ''}` : String(i)
    return text.toLowerCase().includes(search.toLowerCase())
  })

  if (filtered.length > 0) return null

  return (
    <div className={cn('p-3 text-xs text-text-disabled text-center font-sans', className)}>
      {children}
    </div>
  )
}

export interface ComboboxListProps {
  children: (item: any) => React.ReactNode
}

export const ComboboxList: React.FC<ComboboxListProps> = ({ children }) => {
  const { items, search } = useComboboxContext()

  const filtered = items.filter((i) => {
    const text = typeof i === 'object' && i !== null ? `${i.label || ''} ${i.value || ''}` : String(i)
    return text.toLowerCase().includes(search.toLowerCase())
  })

  return <div className="space-y-0.5">{filtered.map((item) => children(item))}</div>
}

export interface ComboboxItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export const ComboboxItem: React.FC<ComboboxItemProps> = ({ value: itemValue, children, className = '' }) => {
  const { value: selectedValue, onSelect } = useComboboxContext()
  const isSelected = selectedValue === itemValue

  return (
    <div
      onClick={() => onSelect(itemValue)}
      className={cn(
        'px-3 py-2 text-xs font-medium tracking-tight rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-200 ease-smooth',
        isSelected
          ? 'bg-accent/15 text-accent font-semibold'
          : 'text-text-primary hover:bg-surface-elevated hover:text-text-primary',
        className
      )}
    >
      <span>{children}</span>
      {isSelected && (
        <svg className="w-3.5 h-3.5 stroke-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  )
}

export default Combobox
