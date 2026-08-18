// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron')

export const voxApi = {
  // Vox Type (Digitação por voz)
  startRecording: () => ipcRenderer.invoke('vox:start-recording'),
  stopRecording: (audioData?: ArrayBuffer) => ipcRenderer.invoke('vox:stop-recording', audioData),
  sendAudioChunk: (chunk: ArrayBuffer) => ipcRenderer.send('vox:audio-chunk', chunk),
  sendWakeWordAudioChunk: (chunk: ArrayBuffer) => ipcRenderer.send('vox:wakeword-audio-chunk', chunk),
  sendAudioLevel: (level: number) => ipcRenderer.send('vox:audio-level', level),
  transcribeChunk: (audioData: ArrayBuffer) => ipcRenderer.invoke('vox:transcribe-chunk', audioData),
  showDock: () => ipcRenderer.invoke('vox:show-dock'),
  hideDock: () => ipcRenderer.invoke('vox:hide-dock'),
  minimize: () => ipcRenderer.invoke('vox:minimize'),

  // Configurações & Banco de Dados
  getSettings: () => ipcRenderer.invoke('vox:get-settings'),
  saveSettings: (settings: Record<string, string>) => {
    if (!settings || typeof settings !== 'object') {
      return Promise.reject(new TypeError('settings deve ser um objeto'))
    }
    return ipcRenderer.invoke('vox:save-settings', settings)
  },
  setWakeWordEnabled: (enabled: boolean) => {
    if (typeof enabled !== 'boolean') {
      return Promise.reject(new TypeError('enabled deve ser um boolean'))
    }
    return ipcRenderer.invoke('vox:set-wakeword-enabled', enabled)
  },
  setWakeWordSensitivity: (sensitivity: number) => {
    if (typeof sensitivity !== 'number') {
      return Promise.reject(new TypeError('sensitivity deve ser um number'))
    }
    return ipcRenderer.invoke('vox:set-wakeword-sensitivity', sensitivity)
  },
  listModels: (overrides?: { provider?: string; baseUrl?: string; apiKey?: string; azureApiVersion?: string }) => ipcRenderer.invoke('vox:list-models', overrides),
  listOllamaModels: (baseUrl?: string) => ipcRenderer.invoke('vox:ollama-tags', baseUrl),
  pullOllamaModel: (model: string, baseUrl?: string) => {
    if (typeof model !== 'string') {
      return Promise.reject(new TypeError('model deve ser um string'))
    }
    return ipcRenderer.invoke('vox:ollama-pull', model, baseUrl)
  },
  getProviders: () => ipcRenderer.invoke('vox:get-providers'),

  // Histórico de Transcrições (Sessions)
  listSessions: (limit?: number, type?: string) => {
    if (limit !== undefined && typeof limit !== 'number') {
      return Promise.reject(new TypeError('limit deve ser um number'))
    }
    if (type !== undefined && typeof type !== 'string') {
      return Promise.reject(new TypeError('type deve ser um string'))
    }
    return ipcRenderer.invoke('vox:list-sessions', limit, type)
  },
  getSession: (id: string) => {
    if (typeof id !== 'string') {
      return Promise.reject(new TypeError('id deve ser um string'))
    }
    return ipcRenderer.invoke('vox:get-session', id)
  },
  deleteSession: (id: string) => {
    if (typeof id !== 'string') {
      return Promise.reject(new TypeError('id deve ser um string'))
    }
    return ipcRenderer.invoke('vox:delete-session', id)
  },
  clearAllSessions: () => ipcRenderer.invoke('vox:clear-all-sessions'),
  searchSessions: (query: string) => {
    if (typeof query !== 'string') {
      return Promise.reject(new TypeError('query deve ser um string'))
    }
    return ipcRenderer.invoke('vox:search-sessions', query)
  },
  getDictationStats: () => ipcRenderer.invoke('vox:get-dictation-stats'),
  listApiLogs: (limit?: number) => ipcRenderer.invoke('vox:list-api-logs', limit),
  clearApiLogs: () => ipcRenderer.invoke('vox:clear-api-logs'),
  listVocabulary: () => ipcRenderer.invoke('vox:list-vocabulary'),
  addVocabularyTerm: (term: string) => ipcRenderer.invoke('vox:add-vocabulary-term', term),
  removeVocabularyTerm: (term: string) => ipcRenderer.invoke('vox:remove-vocabulary-term', term),
  clearVocabulary: () => ipcRenderer.invoke('vox:clear-vocabulary'),
  insertClipboardItem: (text: string) => ipcRenderer.invoke('vox:insert-clipboard-item', text),
  hideClipboard: () => ipcRenderer.invoke('vox:hide-clipboard'),
  getCommands: () => ipcRenderer.invoke('vox:get-commands'),
  toggleCommand: (id: string, enabled: boolean) => ipcRenderer.invoke('vox:toggle-command', id, enabled),
  setCommandMatchMode: (id: string, mode: 'isolated' | 'inline') => ipcRenderer.invoke('vox:set-command-match-mode', id, mode),
  addCustomCommand: (command: any) => ipcRenderer.invoke('vox:add-custom-command', command),
  updateCustomCommand: (id: string, command: any) => ipcRenderer.invoke('vox:update-custom-command', id, command),
  deleteCustomCommand: (id: string) => ipcRenderer.invoke('vox:delete-custom-command', id),
  getSnippets: () => ipcRenderer.invoke('vox:get-snippets'),
  saveSnippet: (snippet: any) => ipcRenderer.invoke('vox:save-snippet', snippet),
  deleteSnippet: (id: string) => ipcRenderer.invoke('vox:delete-snippet', id),
  setInlineMode: (enabled: boolean) => ipcRenderer.invoke('vox:set-inline-mode', enabled),
  getTemplates: () => ipcRenderer.invoke('vox:get-templates'),
  getActiveTemplate: () => ipcRenderer.invoke('vox:get-active-template'),
  setActiveTemplate: (id: string | null) => ipcRenderer.invoke('vox:set-active-template', id),
  setTemplateEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('vox:set-template-enabled', id, enabled),
  addCustomTemplate: (template: any) => ipcRenderer.invoke('vox:add-custom-template', template),
  updateCustomTemplate: (id: string, template: any) => ipcRenderer.invoke('vox:update-custom-template', id, template),
  deleteCustomTemplate: (id: string) => ipcRenderer.invoke('vox:delete-custom-template', id),

  // Event Listeners
  onDockTextUpdate: (callback: (text: string) => void) => {
    const handler = (_event: unknown, text: string) => callback(text)
    ipcRenderer.on('vox:dock-text-update', handler)
    return () => ipcRenderer.removeListener('vox:dock-text-update', handler)
  },
  onToggleRecording: (callback: (recording: boolean) => void) => {
    const handler = (_event: unknown, recording: boolean) => callback(recording)
    ipcRenderer.on('vox:toggle-recording', handler)
    return () => ipcRenderer.removeListener('vox:toggle-recording', handler)
  },
  onVolumeUpdate: (callback: (data: { energy: number; isSpeech: boolean }) => void) => {
    const handler = (_event: unknown, data: { energy: number; isSpeech: boolean }) => callback(data)
    ipcRenderer.on('vox:volume-update', handler)
    return () => ipcRenderer.removeListener('vox:volume-update', handler)
  },
  onTranscriptResult: (callback: (text: string) => void) => {
    const handler = (_event: unknown, text: string) => callback(text)
    ipcRenderer.on('vox:transcript-result', handler)
    return () => ipcRenderer.removeListener('vox:transcript-result', handler)
  },
  onPartialTranscript: (callback: (text: string) => void) => {
    const handler = (_event: unknown, text: string) => callback(text)
    ipcRenderer.on('vox:partial-transcript', handler)
    return () => ipcRenderer.removeListener('vox:partial-transcript', handler)
  },
  onWakeWordFired: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('vox:wakeword-fired', handler)
    return () => ipcRenderer.removeListener('vox:wakeword-fired', handler)
  },
  onWakeWordModelMissing: (callback: (data: any) => void) => {
    const handler = (_event: unknown, data: any) => callback(data)
    ipcRenderer.on('vox:wakeword-model-missing', handler)
    return () => ipcRenderer.removeListener('vox:wakeword-model-missing', handler)
  },
  onWakeWordError: (callback: (data: any) => void) => {
    const handler = (_event: unknown, data: any) => callback(data)
    ipcRenderer.on('vox:wakeword-error', handler)
    return () => ipcRenderer.removeListener('vox:wakeword-error', handler)
  },
  onDockShow: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('vox:dock-show', handler)
    return () => ipcRenderer.removeListener('vox:dock-show', handler)
  },
  onDockHide: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('vox:dock-hide', handler)
    return () => ipcRenderer.removeListener('vox:dock-hide', handler)
  },
  onWindowVisibility: (callback: (visible: boolean) => void) => {
    const handler = (_event: unknown, visible: boolean) => callback(visible)
    ipcRenderer.on('vox:window-visibility', handler)
    return () => ipcRenderer.removeListener('vox:window-visibility', handler)
  },
  onOllamaPullProgress: (callback: (data: { model: string; status: string; completed?: number; total?: number; error?: string }) => void) => {
    const handler = (_event: unknown, data: { model: string; status: string; completed?: number; total?: number; error?: string }) => callback(data)
    ipcRenderer.on('vox:ollama-pull-progress', handler)
    return () => ipcRenderer.removeListener('vox:ollama-pull-progress', handler)
  },
  onClipboardRefresh: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('vox:clipboard-refresh', handler)
    return () => ipcRenderer.removeListener('vox:clipboard-refresh', handler)
  },
  onSnippetNotConfigured: (callback: (name: string) => void) => {
    const handler = (_event: unknown, name: string) => callback(name)
    ipcRenderer.on('vox:snippet-not-configured', handler)
    return () => ipcRenderer.removeListener('vox:snippet-not-configured', handler)
  },
  onScriptResult: (callback: (result: any) => void) => {
    const handler = (_event: unknown, result: any) => callback(result)
    ipcRenderer.on('vox:script-result', handler)
    return () => ipcRenderer.removeListener('vox:script-result', handler)
  },
  onTranscriptionDone: (callback: (data: any) => void) => {
    const handler = (_event: unknown, data: any) => callback(data)
    ipcRenderer.on('vox:transcription-done', handler)
    return () => ipcRenderer.removeListener('vox:transcription-done', handler)
  },
  onTemplateChanged: (callback: (data: { templateId: string | null; activatedAt: string; activatedBy: string }) => void) => {
    const handler = (_event: unknown, data: { templateId: string | null; activatedAt: string; activatedBy: string }) => callback(data)
    ipcRenderer.on('vox:template-changed', handler)
    return () => ipcRenderer.removeListener('vox:template-changed', handler)
  },

  // Auto Updater
  checkForUpdates: () => ipcRenderer.invoke('vox:check-for-updates'),
  restartAndInstallUpdate: () => ipcRenderer.invoke('vox:restart-and-install-update'),
  onUpdaterStatus: (callback: (data: { status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'; version?: string; percent?: number; error?: string }) => void) => {
    const handler = (_event: unknown, data: any) => callback(data)
    ipcRenderer.on('vox:updater-status', handler)
    return () => ipcRenderer.removeListener('vox:updater-status', handler)
  },

  // Utilities
  openExternal: (url: string) => ipcRenderer.invoke('vox:open-external', url)
}

contextBridge.exposeInMainWorld('vox', voxApi)

declare global {
  interface Window {
    vox: typeof voxApi
  }
}

