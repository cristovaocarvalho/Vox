import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { NoiseTexture } from './NoiseTexture'

export interface LiquidGlassCardProps {
  glowIntensity?: 'none' | 'sm' | 'md' | 'lg'
  shadowIntensity?: 'none' | 'sm' | 'md' | 'lg'
  blurIntensity?: 'none' | 'sm' | 'md' | 'lg'
  borderRadius?: string
  draggable?: boolean
  layout?: boolean | 'position' | 'size'
  transition?: any
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  glowIntensity = 'sm',
  shadowIntensity = 'sm',
  blurIntensity = 'sm',
  borderRadius = '0px',
  draggable = false,
  layout,
  transition,
  className = '',
  children,
  style = {}
}) => {
  const blurClasses = {
    none: 'backdrop-blur-none',
    sm: 'backdrop-blur-md',
    md: 'backdrop-blur-xl',
    lg: 'backdrop-blur-2xl'
  }

  const shadowClasses = {
    none: 'shadow-none',
    sm: 'shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]',
    md: 'shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]',
    lg: 'shadow-[0_16px_48px_0_rgba(0,0,0,0.65)]'
  }

  const glowClasses = {
    none: 'border-white/5',
    sm: 'border-white/[0.08] hover:border-white/20',
    md: 'border-white/15 hover:border-white/30',
    lg: 'border-white/25 hover:border-white/50'
  }

  const Component = (draggable || layout !== undefined) ? motion.div : 'div'

  return (
    <Component
      {...((layout !== undefined) ? { layout, transition } : {})}
      {...(draggable ? { drag: true, dragConstraints: { left: -50, right: 50, top: -50, bottom: 50 } } : {})}
      className={cn(
        'relative overflow-hidden transition-[border-color,box-shadow,transform] duration-450 ease-glass',
        'bg-[#16161A]/50 backdrop-saturate-150 border',
        blurClasses[blurIntensity],
        shadowClasses[shadowIntensity],
        glowClasses[glowIntensity],
        className
      )}
      style={{
        borderRadius,
        ...style
      } as React.CSSProperties}
    >
      {/* Noise Texture com Radial Gradient Mask */}
      <NoiseTexture
        className="absolute inset-0 [mask-image:radial-gradient(420px_circle_at_center,white,transparent)] [-webkit-mask-image:radial-gradient(420px_circle_at_center,white,transparent)]"
      />

      {/* Liquid Glass Highlight Reflection Line */}
      <div
        className="pointer-events-none absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)'
        }}
      />

      {/* Inner Content */}
      <div className="relative z-10">{children}</div>
    </Component>
  )
}

export default LiquidGlassCard
