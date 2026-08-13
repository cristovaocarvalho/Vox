import { create } from 'zustand'

export type AppLocale = 'en' | 'pt-BR'

export interface VoxState {
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  lastTranscript: string
  setLastTranscript: (transcript: string) => void
  apiKey: string
  setApiKey: (key: string) => void
  sttModel: string
  setSttModel: (model: string) => void
  llmModel: string
  setLlmModel: (model: string) => void
  shortcutToggle: string
  setShortcutToggle: (shortcut: string) => void
  shortcutPushToTalk: string
  setShortcutPushToTalk: (shortcut: string) => void
  wakeWordEnabled: boolean
  setWakeWordEnabled: (enabled: boolean) => void
  wakeWordSensitivity: number
  setWakeWordSensitivity: (sensitivity: number) => void
  language: AppLocale
  setLanguage: (language: AppLocale) => void
  autoStartEnabled: boolean
  setAutoStartEnabled: (enabled: boolean) => void
  updateSettings: (settings: Partial<Omit<VoxState, 'isRecording' | 'setIsRecording' | 'lastTranscript' | 'setLastTranscript' | 'updateSettings'>>) => void
}

const getInitialLanguage = (): AppLocale => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    if (navigator.language.toLowerCase().startsWith('en')) {
      return 'en'
    }
  }
  return 'pt-BR'
}

export const useVoxStore = create<VoxState>((set) => ({
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  lastTranscript: '',
  setLastTranscript: (transcript) => set({ lastTranscript: transcript }),
  apiKey: '',
  setApiKey: (apiKey) => set({ apiKey }),
  sttModel: 'whisper-large-v3-turbo',
  setSttModel: (sttModel) => set({ sttModel }),
  llmModel: 'llama-3.1-8b-instant',
  setLlmModel: (llmModel) => set({ llmModel }),
  shortcutToggle: 'F10',
  setShortcutToggle: (shortcutToggle) => set({ shortcutToggle }),
  shortcutPushToTalk: 'F9',
  setShortcutPushToTalk: (shortcutPushToTalk) => set({ shortcutPushToTalk }),
  wakeWordEnabled: false,
  setWakeWordEnabled: (wakeWordEnabled) => set({ wakeWordEnabled }),
  wakeWordSensitivity: 0.5,
  setWakeWordSensitivity: (wakeWordSensitivity) => set({ wakeWordSensitivity }),
  language: getInitialLanguage(),
  setLanguage: (language) => set({ language }),
  autoStartEnabled: true,
  setAutoStartEnabled: (autoStartEnabled) => set({ autoStartEnabled }),
  updateSettings: (settings) => set((state) => ({ ...state, ...settings }))
}))
