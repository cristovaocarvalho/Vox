import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import logoImg from '../../assets/logo.png'

export const DockWindow: React.FC = () => {
  const bars = 7
  const [energyLevel, setEnergyLevel] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    let unsubVolume: (() => void) | undefined
    let unsubShow: (() => void) | undefined
    let unsubHide: (() => void) | undefined

    if (window.vox?.onVolumeUpdate) {
      unsubVolume = window.vox.onVolumeUpdate(({ energy }) => {
        setEnergyLevel(Math.min(1, energy * 4))
      })
    }

    if (window.vox?.onDockShow) {
      unsubShow = window.vox.onDockShow(() => setIsVisible(true))
    }

    if (window.vox?.onDockHide) {
      unsubHide = window.vox.onDockHide(() => setIsVisible(false))
    }

    return () => {
      unsubVolume?.()
      unsubShow?.()
      unsubHide?.()
    }
  }, [])

  const heights = Array.from({ length: bars }, (_, i) => {
    const factor = Math.sin((i / (bars - 1)) * Math.PI)
    const dynamicOffset = (Math.sin(Date.now() / 150 + i) + 1) * 0.15
    return Math.max(0.1, (energyLevel * factor * 0.85) + dynamicOffset)
  })

  return (
    <div className="w-full h-full flex items-center justify-center select-none drag-region p-1 bg-transparent">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="dock"
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 320, damping: 22 }}
            className="px-4 py-2.5 bg-black/40 backdrop-blur-xl border border-white/15 rounded-full flex items-center justify-center gap-3 text-white shadow-none"
          >
            {/* Logo + Waveform visualization */}
            <div className="flex items-center gap-3 shrink-0">
              <img src={logoImg} alt="Vox" className="w-6 h-6 object-contain" />

              {/* Animated Speech Waveform */}
              <div className="flex h-5 items-center gap-1">
                {heights.map((height, index) => (
                  <motion.div
                    key={index}
                    className="w-[2.5px] bg-white rounded-full"
                    initial={{ height: 4 }}
                    animate={{ height: Math.max(4, height * 18) }}
                    transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DockWindow
