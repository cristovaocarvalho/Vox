import { create } from 'zustand'

interface AnimationGateState {
  windowVisible: boolean
  setWindowVisible: (visible: boolean) => void
}

export const useAnimationGate = create<AnimationGateState>((set) => ({
  windowVisible: true,
  setWindowVisible: (windowVisible) => set({ windowVisible })
}))

export const isAnimationActive = (): boolean => {
  return useAnimationGate.getState().windowVisible
}

let initialized = false

export const initAnimationGate = (): void => {
  if (initialized || typeof document === 'undefined') return
  initialized = true

  const sync = (): void => {
    useAnimationGate.getState().setWindowVisible(document.visibilityState !== 'hidden')
  }

  document.addEventListener('visibilitychange', sync)
}
