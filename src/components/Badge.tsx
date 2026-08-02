import React from 'react'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'accent'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = ''
}) => {
  const variantStyles = {
    success: 'bg-success/15 text-success border-success/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    error: 'bg-error/15 text-error border-error/30',
    neutral: 'bg-surface-elevated text-text-secondary border-border',
    accent: 'bg-accent/15 text-accent border-accent/30'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold tracking-label rounded-md border transition-colors duration-250 ease-smooth ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}

export default Badge
