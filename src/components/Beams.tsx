import React, { lazy, Suspense, useEffect, useState } from 'react'
import type { BeamsBackgroundProps } from './BeamsBackground'
import './Beams.css'

const BeamsBackground = lazy(() => import('./BeamsBackground'))

export interface BeamsProps extends BeamsBackgroundProps {
  children?: React.ReactNode
  style?: React.CSSProperties
}

export const Beams: React.FC<BeamsProps> = ({ children, style, ...rest }) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let raf1 = 0
    let raf2 = 0
    let idleId: number | null = null
    let cancelled = false

    const show = () => {
      if (!cancelled) setReady(true)
    }

    const w = window as any
    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(show, { timeout: 1200 })
    } else {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(show)
      })
    }

    return () => {
      cancelled = true
      if (idleId !== null) w.cancelIdleCallback?.(idleId)
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0D0D0F',
        ...style
      }}
    >
      {ready && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <Suspense fallback={null}>
            <BeamsBackground {...rest} />
          </Suspense>
        </div>
      )}

      <div className="relative z-10 w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default Beams
