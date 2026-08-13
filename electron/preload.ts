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
  listModels: () => ipcRenderer.invoke('vox:list-models'),
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
  }
}

contextBridge.exposeInMainWorld('vox', voxApi)

declare global {
  interface Window {
    vox: typeof voxApi
  }
}

