import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronDown, IconCheck } from './icons'

export interface SelectOption {
  value: string
  label?: string
}

export interface CustomSelectProps {
  value: string
  options: (string | SelectOption)[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  placeholder,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null)

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )

  const selectedOption = normalizedOptions.find((o) => o.value === value)

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - r.bottom
      const up = spaceBelow < 200 && r.top > 200
      setRect({
        top: up ? r.top - 6 : r.bottom + 6,
        left: r.left,
        width: r.width,
        up
      })
      setIsOpen(true)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleScrollOrResize = () => setIsOpen(false)
    window.addEventListener('resize', handleScrollOrResize)
    return () => window.removeEventListener('resize', handleScrollOrResize)
  }, [isOpen])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-background/60 border border-border/50 rounded-xl text-xs font-medium text-text-primary hover:border-border hover:bg-background/80 transition-all duration-250 cursor-pointer ${className}`}
      >
        <span className="truncate">{selectedOption?.label || placeholder || value}</span>
        <IconChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-250 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && rect && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[101]"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              transform: rect.up ? 'translateY(-100%)' : undefined
            }}
          >
            <div className="bg-[#16161A]/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-[0_16px_48px_0_rgba(0,0,0,0.65)] p-1.5 max-h-60 overflow-y-auto custom-scrollbar space-y-1">
              {normalizedOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-accent/10 text-accent font-semibold'
                        : 'text-text-primary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    <span className="truncate">{opt.label || opt.value}</span>
                    {isSelected && <IconCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />}
                  </button>
                )
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

export default CustomSelect
