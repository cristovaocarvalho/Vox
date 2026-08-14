import { create } from 'zustand'
import type { VoiceCommand, UserSnippet } from '../types/commands'
import type { DictationTemplate } from '../types/templates'

export type AppLocale = 'en' | 'pt-BR'

export interface VoxState {
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  lastTranscript: string
  setLastTranscript: (transcript: string) => void
  apiKey: string
  setApiKey: (key: string) => void
  provider: string
  setProvider: (provider: string) => void
  baseUrl: string
  setBaseUrl: (baseUrl: string) => void
  azureApiVersion: string
  setAzureApiVersion: (version: string) => void
  sttModel: string
  setSttModel: (model: string) => void
  llmModel: string
  setLlmModel: (model: string) => void
  shortcutToggle: string
  setShortcutToggle: (shortcut: string) => void
  shortcutPushToTalk: string
  setShortcutPushToTalk: (shortcut: string) => void
  shortcutClipboard: string
  setShortcutClipboard: (shortcut: string) => void
  wakeWordEnabled: boolean
  setWakeWordEnabled: (enabled: boolean) => void
  wakeWordSensitivity: number
  setWakeWordSensitivity: (sensitivity: number) => void
  language: AppLocale
  setLanguage: (language: AppLocale) => void
  autoStartEnabled: boolean
  setAutoStartEnabled: (enabled: boolean) => void
  commands: VoiceCommand[]
  snippets: UserSnippet[]
  commandInlineMode: boolean
  lastCommandExecuted: string | null
  loadCommands: () => Promise<void>
  loadSnippets: () => Promise<void>
  toggleCommand: (id: string, enabled: boolean) => Promise<void>
  setCommandMatchMode: (id: string, mode: 'isolated' | 'inline') => Promise<void>
  addCustomCommand: (cmd: Partial<VoiceCommand>) => Promise<void>
  updateCustomCommand: (id: string, cmd: Partial<VoiceCommand>) => Promise<void>
  deleteCustomCommand: (id: string) => Promise<void>
  saveSnippet: (snippet: Partial<UserSnippet> & { id: string }) => Promise<void>
  deleteSnippet: (id: string) => Promise<void>
  setInlineMode: (enabled: boolean) => Promise<void>
  templates: DictationTemplate[]
  activeTemplateId: string | null
  loadTemplates: () => Promise<void>
  setActiveTemplate: (id: string | null) => Promise<void>
  setTemplateEnabled: (id: string, enabled: boolean) => Promise<void>
  addCustomTemplate: (t: Partial<DictationTemplate>) => Promise<void>
  updateCustomTemplate: (id: string, t: Partial<DictationTemplate>) => Promise<void>
  deleteCustomTemplate: (id: string) => Promise<void>
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
  provider: 'groq',
  setProvider: (provider) => set({ provider }),
  baseUrl: '',
  setBaseUrl: (baseUrl) => set({ baseUrl }),
  azureApiVersion: '',
  setAzureApiVersion: (azureApiVersion) => set({ azureApiVersion }),
  sttModel: 'whisper-large-v3-turbo',
  setSttModel: (sttModel) => set({ sttModel }),
  llmModel: 'llama-3.1-8b-instant',
  setLlmModel: (llmModel) => set({ llmModel }),
  shortcutToggle: 'F10',
  setShortcutToggle: (shortcutToggle) => set({ shortcutToggle }),
  shortcutPushToTalk: 'F9',
  setShortcutPushToTalk: (shortcutPushToTalk) => set({ shortcutPushToTalk }),
  shortcutClipboard: 'F11',
  setShortcutClipboard: (shortcutClipboard) => set({ shortcutClipboard }),
  wakeWordEnabled: false,
  setWakeWordEnabled: (wakeWordEnabled) => set({ wakeWordEnabled }),
  wakeWordSensitivity: 0.5,
  setWakeWordSensitivity: (wakeWordSensitivity) => set({ wakeWordSensitivity }),
  language: getInitialLanguage(),
  setLanguage: (language) => set({ language }),
  autoStartEnabled: true,
  setAutoStartEnabled: (autoStartEnabled) => set({ autoStartEnabled }),
  commands: [],
  snippets: [],
  commandInlineMode: false,
  lastCommandExecuted: null,
  loadCommands: async () => {
    if (typeof window === 'undefined' || !window.vox?.getCommands) return
    const commands = await window.vox.getCommands()
    set({ commands: commands || [] })
  },
  loadSnippets: async () => {
    if (typeof window === 'undefined' || !window.vox?.getSnippets) return
    const snippets = await window.vox.getSnippets()
    set({ snippets: snippets || [] })
  },
  toggleCommand: async (id, enabled) => {
    if (window.vox?.toggleCommand) await window.vox.toggleCommand(id, enabled)
    set((state) => ({ commands: state.commands.map((c) => (c.id === id ? { ...c, isEnabled: enabled } : c)) }))
  },
  setCommandMatchMode: async (id, mode) => {
    if (window.vox?.setCommandMatchMode) await window.vox.setCommandMatchMode(id, mode)
    set((state) => ({ commands: state.commands.map((c) => (c.id === id ? { ...c, matchMode: mode } : c)) }))
  },
  addCustomCommand: async (cmd) => {
    if (!window.vox?.addCustomCommand) return
    await window.vox.addCustomCommand(cmd)
    const commands = await window.vox.getCommands()
    set({ commands: commands || [] })
  },
  updateCustomCommand: async (id, cmd) => {
    if (window.vox?.updateCustomCommand) await window.vox.updateCustomCommand(id, cmd)
    const commands = await window.vox.getCommands()
    set({ commands: commands || [] })
  },
  deleteCustomCommand: async (id) => {
    if (window.vox?.deleteCustomCommand) await window.vox.deleteCustomCommand(id)
    set((state) => ({ commands: state.commands.filter((c) => c.id !== id) }))
  },
  saveSnippet: async (snippet) => {
    if (window.vox?.saveSnippet) await window.vox.saveSnippet(snippet)
    const snippets = await window.vox.getSnippets()
    set({ snippets: snippets || [] })
  },
  deleteSnippet: async (id) => {
    if (window.vox?.deleteSnippet) await window.vox.deleteSnippet(id)
    set((state) => ({ snippets: state.snippets.filter((s) => s.id !== id) }))
  },
  setInlineMode: async (enabled) => {
    if (window.vox?.setInlineMode) await window.vox.setInlineMode(enabled)
    set({ commandInlineMode: enabled })
  },
  templates: [],
  activeTemplateId: null,
  loadTemplates: async () => {
    if (typeof window === 'undefined' || !window.vox?.getTemplates) return
    const templates = await window.vox.getTemplates()
    const active = await window.vox.getActiveTemplate()
    set({ templates: templates || [], activeTemplateId: active?.id || null })
  },
  setActiveTemplate: async (id) => {
    if (window.vox?.setActiveTemplate) await window.vox.setActiveTemplate(id)
    set({ activeTemplateId: id })
  },
  setTemplateEnabled: async (id, enabled) => {
    if (window.vox?.setTemplateEnabled) await window.vox.setTemplateEnabled(id, enabled)
    const templates = await window.vox.getTemplates()
    set({ templates: templates || [] })
  },
  addCustomTemplate: async (t) => {
    if (window.vox?.addCustomTemplate) await window.vox.addCustomTemplate(t)
    const templates = await window.vox.getTemplates()
    set({ templates: templates || [] })
  },
  updateCustomTemplate: async (id, t) => {
    if (window.vox?.updateCustomTemplate) await window.vox.updateCustomTemplate(id, t)
    const templates = await window.vox.getTemplates()
    set({ templates: templates || [] })
  },
  deleteCustomTemplate: async (id) => {
    if (window.vox?.deleteCustomTemplate) await window.vox.deleteCustomTemplate(id)
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
  },
  updateSettings: (settings) => set((state) => ({ ...state, ...settings }))
}))
