import { create } from 'zustand'

interface AnimationGateState {
  micActive: boolean
  windowVisible: boolean
  setMicActive: (active: boolean) => void
  setWindowVisible: (visible: boolean) => void
}

export const useAnimationGate = create<AnimationGateState>((set) => ({
  micActive: false,
  windowVisible: typeof document === 'undefined' || document.visibilityState !== 'hidden',
  setMicActive: (micActive) => set({ micActive }),
  setWindowVisible: (windowVisible) => set({ windowVisible })
}))

export const isAnimationActive = (): boolean => {
  const { micActive, windowVisible } = useAnimationGate.getState()
  return micActive && windowVisible
}

let initialized = false

export const initAnimationGate = (): void => {
  if (initialized || typeof document === 'undefined') return
  initialized = true

  const onVisibilityChange = (): void => {
    useAnimationGate.getState().setWindowVisible(document.visibilityState !== 'hidden')
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
}
