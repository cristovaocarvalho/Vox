// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron')

export const voxApi = {
  // Vox Type (Digitação por voz)
  startRecording: () => ipcRenderer.invoke('vox:start-recording'),
  stopRecording: (audioData?: ArrayBuffer) => ipcRenderer.invoke('vox:stop-recording', audioData),
  sendAudioChunk: (chunk: ArrayBuffer) => ipcRenderer.send('vox:audio-chunk', chunk),
  sendAudioLevel: (level: number) => ipcRenderer.send('vox:audio-level', level),
  transcribeChunk: (audioData: ArrayBuffer) => ipcRenderer.invoke('vox:transcribe-chunk', audioData),
  showDock: () => ipcRenderer.invoke('vox:show-dock'),
  hideDock: () => ipcRenderer.invoke('vox:hide-dock'),
  minimize: () => ipcRenderer.invoke('vox:minimize'),
  
  // Vox Media (Transcrição de mídia)
  getVideoInfo: (url: string, cookiesFromBrowser?: string) => ipcRenderer.invoke('vox:get-video-info', url, cookiesFromBrowser),
  startMediaTranscription: (payload: { url?: string; filePath?: string; cookiesFromBrowser?: string }) => ipcRenderer.invoke('vox:start-media-transcription', payload),
  cancelMediaTranscription: () => ipcRenderer.invoke('vox:cancel-media-transcription'),
  selectExportFolder: () => ipcRenderer.invoke('vox:select-export-folder'),
  exportTranscription: (payload: { result: any; formats: string[]; outputPath: string; options?: any }) => ipcRenderer.invoke('vox:export-transcription', payload),
  deleteAudio: (audioPath: string) => ipcRenderer.invoke('vox:delete-audio', audioPath),
  openFolder: (folderOrFilePath: string) => ipcRenderer.invoke('vox:open-folder', folderOrFilePath),
  downloadAudio: (url: string, cookiesFromBrowser?: string) => ipcRenderer.invoke('vox:download-audio', url, cookiesFromBrowser),
  transcribeMedia: (options: { audioPath: string }) => ipcRenderer.invoke('vox:transcribe-media', options),
  deleteFile: (filePath: string) => ipcRenderer.invoke('vox:delete-file', filePath),
  selectFile: () => ipcRenderer.invoke('vox:select-file'),

  // Configurações & Banco de Dados
  getSettings: () => ipcRenderer.invoke('vox:get-settings'),
  saveSettings: (settings: Record<string, string>) => ipcRenderer.invoke('vox:save-settings', settings),
  setWakeWordEnabled: (enabled: boolean) => ipcRenderer.invoke('vox:set-wakeword-enabled', enabled),
  setWakeWordSensitivity: (sensitivity: number) => ipcRenderer.invoke('vox:set-wakeword-sensitivity', sensitivity),

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
  onDownloadProgress: (callback: (data: { pct: number; speed: string; eta: string }) => void) => {
    const handler = (_event: unknown, data: { pct: number; speed: string; eta: string }) => callback(data)
    ipcRenderer.on('vox:download-progress', handler)
    return () => ipcRenderer.removeListener('vox:download-progress', handler)
  },
  onMediaProgress: (callback: (data: { phase: string; percent: number; speed?: string; eta?: string }) => void) => {
    const handler = (_event: unknown, data: { phase: string; percent: number; speed?: string; eta?: string }) => callback(data)
    ipcRenderer.on('vox:media-progress', handler)
    return () => ipcRenderer.removeListener('vox:media-progress', handler)
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
  }
}

contextBridge.exposeInMainWorld('vox', voxApi)

declare global {
  interface Window {
    vox: typeof voxApi
  }
}

