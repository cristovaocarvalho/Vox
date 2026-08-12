import { create } from 'zustand'

export type AppLocale = 'en' | 'pt-BR'

export interface VoxState {
  activeTab: 'type' | 'media'
  setActiveTab: (tab: 'type' | 'media') => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  lastTranscript: string
  setLastTranscript: (transcript: string) => void
  audioEnergy: number
  setAudioEnergy: (energy: number) => void
  isSpeech: boolean
  setIsSpeech: (speech: boolean) => void
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
  browserCookies: 'none' | 'chrome' | 'edge' | 'firefox' | 'brave'
  setBrowserCookies: (cookies: 'none' | 'chrome' | 'edge' | 'firefox' | 'brave') => void
  wakeWordEnabled: boolean
  setWakeWordEnabled: (enabled: boolean) => void
  wakeWordSensitivity: number
  setWakeWordSensitivity: (sensitivity: number) => void
  language: AppLocale
  setLanguage: (language: AppLocale) => void
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
  activeTab: 'type',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  lastTranscript: '',
  setLastTranscript: (transcript) => set({ lastTranscript: transcript }),
  audioEnergy: 0,
  setAudioEnergy: (energy) => set({ audioEnergy: energy }),
  isSpeech: false,
  setIsSpeech: (speech) => set({ isSpeech: speech }),
  apiKey: '',
  setApiKey: (apiKey) => set({ apiKey }),
  sttModel: 'whisper-large-v3-turbo',
  setSttModel: (sttModel) => set({ sttModel }),
  llmModel: 'openai/gpt-oss-20b',
  setLlmModel: (llmModel) => set({ llmModel }),
  shortcutToggle: 'F10',
  setShortcutToggle: (shortcutToggle) => set({ shortcutToggle }),
  shortcutPushToTalk: 'F9',
  setShortcutPushToTalk: (shortcutPushToTalk) => set({ shortcutPushToTalk }),
  browserCookies: 'chrome',
  setBrowserCookies: (browserCookies) => set({ browserCookies }),
  wakeWordEnabled: false,
  setWakeWordEnabled: (wakeWordEnabled) => set({ wakeWordEnabled }),
  wakeWordSensitivity: 0.5,
  setWakeWordSensitivity: (wakeWordSensitivity) => set({ wakeWordSensitivity }),
  language: getInitialLanguage(),
  setLanguage: (language) => set({ language }),
}))
