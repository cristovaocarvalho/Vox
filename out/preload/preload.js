"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const { contextBridge, ipcRenderer } = require("electron");
const voxApi = {
  // Vox Type (Digitação por voz)
  startRecording: () => ipcRenderer.invoke("vox:start-recording"),
  stopRecording: (audioData) => ipcRenderer.invoke("vox:stop-recording", audioData),
  sendAudioChunk: (chunk) => ipcRenderer.send("vox:audio-chunk", chunk),
  sendAudioLevel: (level) => ipcRenderer.send("vox:audio-level", level),
  transcribeChunk: (audioData) => ipcRenderer.invoke("vox:transcribe-chunk", audioData),
  showDock: () => ipcRenderer.invoke("vox:show-dock"),
  hideDock: () => ipcRenderer.invoke("vox:hide-dock"),
  minimize: () => ipcRenderer.invoke("vox:minimize"),
  // Vox Media (Transcrição de mídia)
  getVideoInfo: (url, cookiesFromBrowser) => ipcRenderer.invoke("vox:get-video-info", url, cookiesFromBrowser),
  startMediaTranscription: (payload) => ipcRenderer.invoke("vox:start-media-transcription", payload),
  cancelMediaTranscription: () => ipcRenderer.invoke("vox:cancel-media-transcription"),
  selectExportFolder: () => ipcRenderer.invoke("vox:select-export-folder"),
  exportTranscription: (payload) => ipcRenderer.invoke("vox:export-transcription", payload),
  deleteAudio: (audioPath) => ipcRenderer.invoke("vox:delete-audio", audioPath),
  openFolder: (folderOrFilePath) => ipcRenderer.invoke("vox:open-folder", folderOrFilePath),
  downloadAudio: (url, cookiesFromBrowser) => ipcRenderer.invoke("vox:download-audio", url, cookiesFromBrowser),
  transcribeMedia: (options) => ipcRenderer.invoke("vox:transcribe-media", options),
  deleteFile: (filePath) => ipcRenderer.invoke("vox:delete-file", filePath),
  selectFile: () => ipcRenderer.invoke("vox:select-file"),
  // Configurações & Banco de Dados
  getSettings: () => ipcRenderer.invoke("vox:get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("vox:save-settings", settings),
  setWakeWordEnabled: (enabled) => ipcRenderer.invoke("vox:set-wakeword-enabled", enabled),
  setWakeWordSensitivity: (sensitivity) => ipcRenderer.invoke("vox:set-wakeword-sensitivity", sensitivity),
  openAccessibilityPreferences: () => ipcRenderer.invoke("vox:open-accessibility-preferences"),
  // Histórico de Transcrições (Sessions)
  listSessions: (limit, type) => ipcRenderer.invoke("vox:list-sessions", limit, type),
  getSession: (id) => ipcRenderer.invoke("vox:get-session", id),
  deleteSession: (id) => ipcRenderer.invoke("vox:delete-session", id),
  clearAllSessions: () => ipcRenderer.invoke("vox:clear-all-sessions"),
  searchSessions: (query) => ipcRenderer.invoke("vox:search-sessions", query),
  // Event Listeners
  onDockTextUpdate: (callback) => {
    const handler = (_event, text) => callback(text);
    ipcRenderer.on("vox:dock-text-update", handler);
    return () => ipcRenderer.removeListener("vox:dock-text-update", handler);
  },
  onToggleRecording: (callback) => {
    const handler = (_event, recording) => callback(recording);
    ipcRenderer.on("vox:toggle-recording", handler);
    return () => ipcRenderer.removeListener("vox:toggle-recording", handler);
  },
  onVolumeUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vox:volume-update", handler);
    return () => ipcRenderer.removeListener("vox:volume-update", handler);
  },
  onTranscriptResult: (callback) => {
    const handler = (_event, text) => callback(text);
    ipcRenderer.on("vox:transcript-result", handler);
    return () => ipcRenderer.removeListener("vox:transcript-result", handler);
  },
  onPartialTranscript: (callback) => {
    const handler = (_event, text) => callback(text);
    ipcRenderer.on("vox:partial-transcript", handler);
    return () => ipcRenderer.removeListener("vox:partial-transcript", handler);
  },
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vox:download-progress", handler);
    return () => ipcRenderer.removeListener("vox:download-progress", handler);
  },
  onMediaProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vox:media-progress", handler);
    return () => ipcRenderer.removeListener("vox:media-progress", handler);
  },
  onWakeWordFired: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("vox:wakeword-fired", handler);
    return () => ipcRenderer.removeListener("vox:wakeword-fired", handler);
  },
  onWakeWordModelMissing: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vox:wakeword-model-missing", handler);
    return () => ipcRenderer.removeListener("vox:wakeword-model-missing", handler);
  },
  onWakeWordError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vox:wakeword-error", handler);
    return () => ipcRenderer.removeListener("vox:wakeword-error", handler);
  },
  onAccessibilityRequired: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("vox:accessibility-required", handler);
    return () => ipcRenderer.removeListener("vox:accessibility-required", handler);
  },
  onXdotoolMissing: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vox:xdotool-missing", handler);
    return () => ipcRenderer.removeListener("vox:xdotool-missing", handler);
  }
};
contextBridge.exposeInMainWorld("vox", voxApi);
exports.voxApi = voxApi;
