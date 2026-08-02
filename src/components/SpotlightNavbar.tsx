import React, { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { cn } from '../lib/utils'

export interface NavItem {
  label: string
  id: string
}

export interface SpotlightNavbarProps {
  items?: NavItem[]
  className?: string
  onItemClick?: (item: NavItem, index: number) => void
  activeId?: string
  defaultActiveIndex?: number
}

export const SpotlightNavbar: React.FC<SpotlightNavbarProps> = ({
  items = [
    { label: 'Vox Type', id: 'type' },
    { label: 'Vox Media', id: 'media' }
  ],
  className,
  onItemClick,
  activeId,
  defaultActiveIndex = 0
}) => {
  const navRef = useRef<HTMLDivElement>(null)
  const initialIndex = activeId ? items.findIndex((item) => item.id === activeId) : defaultActiveIndex
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0)
  const [hoverX, setHoverX] = useState<number | null>(null)

  useEffect(() => {
    if (activeId) {
      const idx = items.findIndex((item) => item.id === activeId)
      if (idx >= 0) setActiveIndex(idx)
    }
  }, [activeId, items])

  // Refs for the "light" positions so we can animate them imperatively
  const spotlightX = useRef(0)
  const ambienceX = useRef(0)

  useEffect(() => {
    if (!navRef.current) return
    const nav = navRef.current

    const handleMouseMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect()
      const x = e.clientX - rect.left
      setHoverX(x)
      spotlightX.current = x
      nav.style.setProperty('--spotlight-x', `${x}px`)
    }

    const handleMouseLeave = () => {
      setHoverX(null)
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`)
      if (activeItem) {
        const navRect = nav.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        const targetX = itemRect.left - navRect.left + itemRect.width / 2

        animate(spotlightX.current, targetX, {
          type: 'spring',
          stiffness: 170,
          damping: 22,
          mass: 0.8,
          onUpdate: (v) => {
            spotlightX.current = v
            nav.style.setProperty('--spotlight-x', `${v}px`)
          }
        })
      }
    }

    nav.addEventListener('mousemove', handleMouseMove)
    nav.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      nav.removeEventListener('mousemove', handleMouseMove)
      nav.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [activeIndex])

  // Handle the "Ambience" (Active Item) Movement
  useEffect(() => {
    if (!navRef.current) return
    const nav = navRef.current
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`)

    if (activeItem) {
      const navRect = nav.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()
      const targetX = itemRect.left - navRect.left + itemRect.width / 2

      animate(ambienceX.current, targetX, {
        type: 'spring',
        stiffness: 170,
        damping: 22,
        mass: 0.8,
        onUpdate: (v) => {
          ambienceX.current = v
          nav.style.setProperty('--ambience-x', `${v}px`)
        }
      })
    }
  }, [activeIndex])

  const handleItemClick = (item: NavItem, index: number) => {
    setActiveIndex(index)
    onItemClick?.(item, index)
  }

  return (
    <div className={cn('relative flex justify-center', className)}>
      <nav
        ref={navRef}
        className={cn(
          'relative h-11 rounded-full transition-[border-color,box-shadow] duration-450 ease-glass overflow-hidden',
          'bg-surface/80 border border-border/80 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45)]'
        )}
        style={
          {
            '--spotlight-color': 'rgba(255, 255, 255, 0.15)',
            '--ambience-color': 'rgba(255, 255, 255, 1)'
          } as React.CSSProperties
        }
      >
        {/* Content */}
        <ul className="relative flex items-center h-full px-2.5 gap-1 z-[10]">
          {items.map((item, idx) => (
            <li key={item.id || idx} className="relative h-full flex items-center justify-center">
              <button
                data-index={idx}
                onClick={(e) => {
                  e.preventDefault()
                  handleItemClick(item, idx)
                }}
                className={cn(
                  "px-5 py-1.5 text-sm font-medium transition-colors duration-250 ease-smooth rounded-full cursor-pointer focus-visible:outline-none font-heading tracking-tight",
                  activeIndex === idx
                    ? 'text-white font-semibold'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* 1. The Moving Spotlight (Follows Mouse) */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full h-full z-[1] opacity-0 transition-opacity duration-350 ease-smooth"
          style={{
            opacity: hoverX !== null ? 1 : 0,
            background: `
              radial-gradient(
                120px circle at var(--spotlight-x) 100%, 
                var(--spotlight-color) 0%, 
                transparent 50%
              )
            `
          }}
        />

        {/* 2. The Active State Ambience (Stays on Active) */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full h-[2px] z-[2]"
          style={{
            background: `
              radial-gradient(
                60px circle at var(--ambience-x) 0%, 
                var(--ambience-color) 0%, 
                transparent 100%
              )
            `
          }}
        />
      </nav>
    </div>
  )
}

export default SpotlightNavbar
