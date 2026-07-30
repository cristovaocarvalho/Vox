import React from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  MotionProps & {
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: React.ReactNode
    children?: React.ReactNode
    as?: any
  }

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  as = 'button',
  ...rest
}) => {
  const Component = (motion as any)[as] || motion.button

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2.5'
  }

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-[#222] text-neutral-900 dark:text-neutral-100 font-medium [--shine:rgba(255,255,255,.66)]',
    secondary:
      'bg-[#16161A] border border-[#2A2A35] text-[#E8E8F0] hover:bg-[#1E1E24] [--shine:rgba(255,255,255,.4)]',
    ghost:
      'bg-transparent border border-transparent text-[#8888A0] hover:text-[#E8E8F0] hover:bg-[#1E1E24] [--shine:rgba(255,255,255,.3)]',
    danger:
      'bg-error/20 border border-error/40 text-error hover:bg-error/30 [--shine:rgba(248,113,113,.6)]',
    icon:
      'p-2 bg-transparent border border-transparent text-[#8888A0] hover:text-[#E8E8F0] hover:bg-[#1E1E24] rounded-md [--shine:rgba(255,255,255,.3)]'
  }

  return (
    <Component
      {...rest}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.5
      }}
      disabled={disabled}
      className={cn(
        'group inline-flex items-center justify-center rounded-md relative overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {/* Text / Children with shine mask */}
      <motion.span
        className="tracking-wide font-medium flex items-center justify-center h-full w-full relative z-10 gap-2"
        style={{
          WebkitMaskImage:
            'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
          maskImage:
            'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))'
        }}
        initial={{ ['--mask-x' as any]: '100%' } as any}
        animate={{ ['--mask-x' as any]: '-100%' } as any}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
          repeatDelay: 1.5
        }}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </motion.span>

      {/* Border shine effect */}
      <motion.span
        className="block absolute inset-0 rounded-md p-px pointer-events-none"
        style={{
          background:
            'linear-gradient(-75deg, transparent 30%, var(--shine) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor'
        }}
        initial={{ backgroundPosition: '100% 0', opacity: 0 }}
        animate={{ backgroundPosition: ['100% 0', '0% 0'], opacity: [0, 1, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 1.5
        }}
      />
    </Component>
  )
}

export default Button
