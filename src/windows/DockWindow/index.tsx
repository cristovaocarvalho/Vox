import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import logoImg from '../../assets/logo.png'

export const DockWindow: React.FC = () => {
  const bars = 7
  const [energyLevel, setEnergyLevel] = useState(0)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    if (window.vox?.onVolumeUpdate) {
      unsubscribe = window.vox.onVolumeUpdate(({ energy }) => {
        setEnergyLevel(Math.min(1, energy * 4))
      })
    }

    return () => {
      unsubscribe?.()
    }
  }, [])

  const heights = Array.from({ length: bars }, (_, i) => {
    const factor = Math.sin((i / (bars - 1)) * Math.PI)
    const dynamicOffset = (Math.sin(Date.now() / 150 + i) + 1) * 0.15
    return Math.max(0.1, (energyLevel * factor * 0.85) + dynamicOffset)
  })

  return (
    <div className="w-full h-full flex items-center justify-center select-none drag-region p-1 bg-transparent">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, type: 'spring' }}
        className="px-4 py-2.5 bg-black/40 backdrop-blur-xl border border-white/15 rounded-full flex items-center justify-center gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] text-white"
      >
        {/* Logo + Waveform visualization */}
        <div className="flex items-center gap-3 shrink-0">
          <img src={logoImg} alt="Vox" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />

          {/* Animated Speech Waveform */}
          <div className="flex h-5 items-center gap-1">
            {heights.map((height, index) => (
              <motion.div
                key={index}
                className="w-[2.5px] bg-white rounded-full"
                initial={{ height: 4 }}
                animate={{
                  height: Math.max(4, height * 18)
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 12
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default DockWindow

