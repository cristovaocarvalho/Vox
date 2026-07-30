import React from 'react'
import { cn } from '../lib/utils'

export interface NoiseTextureProps {
  className?: string
  patternAlpha?: number
}

export const NoiseTexture: React.FC<NoiseTextureProps> = ({
  className,
  patternAlpha = 12
}) => {
  return (
    <svg
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        className
      )}
      style={{ opacity: patternAlpha / 100 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="noiseFilter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  )
}

export default NoiseTexture
