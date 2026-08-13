"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const { contextBridge, ipcRenderer } = require("electron");
const voxApi = {
  // Vox Type (Digitação por voz)
  startRecording: () => ipcRenderer.invoke("vox:start-recording"),
  stopRecording: (audioData) => ipcRenderer.invoke("vox:stop-recording", audioData),
  sendAudioChunk: (chunk) => ipcRenderer.send("vox:audio-chunk", chunk),
  sendWakeWordAudioChunk: (chunk) => ipcRenderer.send("vox:wakeword-audio-chunk", chunk),
  sendAudioLevel: (level) => ipcRenderer.send("vox:audio-level", level),
  transcribeChunk: (audioData) => ipcRenderer.invoke("vox:transcribe-chunk", audioData),
  showDock: () => ipcRenderer.invoke("vox:show-dock"),
  hideDock: () => ipcRenderer.invoke("vox:hide-dock"),
  minimize: () => ipcRenderer.invoke("vox:minimize"),
  // Configurações & Banco de Dados
  getSettings: () => ipcRenderer.invoke("vox:get-settings"),
  saveSettings: (settings) => {
    if (!settings || typeof settings !== "object") {
      return Promise.reject(new TypeError("settings deve ser um objeto"));
    }
    return ipcRenderer.invoke("vox:save-settings", settings);
  },
  setWakeWordEnabled: (enabled) => {
    if (typeof enabled !== "boolean") {
      return Promise.reject(new TypeError("enabled deve ser um boolean"));
    }
    return ipcRenderer.invoke("vox:set-wakeword-enabled", enabled);
  },
  setWakeWordSensitivity: (sensitivity) => {
    if (typeof sensitivity !== "number") {
      return Promise.reject(new TypeError("sensitivity deve ser um number"));
    }
    return ipcRenderer.invoke("vox:set-wakeword-sensitivity", sensitivity);
  },
  listModels: () => ipcRenderer.invoke("vox:list-models"),
  getProviders: () => ipcRenderer.invoke("vox:get-providers"),
  // Histórico de Transcrições (Sessions)
  listSessions: (limit, type) => {
    if (limit !== void 0 && typeof limit !== "number") {
      return Promise.reject(new TypeError("limit deve ser um number"));
    }
    if (type !== void 0 && typeof type !== "string") {
      return Promise.reject(new TypeError("type deve ser um string"));
    }
    return ipcRenderer.invoke("vox:list-sessions", limit, type);
  },
  getSession: (id) => {
    if (typeof id !== "string") {
      return Promise.reject(new TypeError("id deve ser um string"));
    }
    return ipcRenderer.invoke("vox:get-session", id);
  },
  deleteSession: (id) => {
    if (typeof id !== "string") {
      return Promise.reject(new TypeError("id deve ser um string"));
    }
    return ipcRenderer.invoke("vox:delete-session", id);
  },
  clearAllSessions: () => ipcRenderer.invoke("vox:clear-all-sessions"),
  searchSessions: (query) => {
    if (typeof query !== "string") {
      return Promise.reject(new TypeError("query deve ser um string"));
    }
    return ipcRenderer.invoke("vox:search-sessions", query);
  },
  listApiLogs: (limit) => ipcRenderer.invoke("vox:list-api-logs", limit),
  clearApiLogs: () => ipcRenderer.invoke("vox:clear-api-logs"),
  listVocabulary: () => ipcRenderer.invoke("vox:list-vocabulary"),
  addVocabularyTerm: (term) => ipcRenderer.invoke("vox:add-vocabulary-term", term),
  removeVocabularyTerm: (term) => ipcRenderer.invoke("vox:remove-vocabulary-term", term),
  clearVocabulary: () => ipcRenderer.invoke("vox:clear-vocabulary"),
  insertClipboardItem: (text) => ipcRenderer.invoke("vox:insert-clipboard-item", text),
  hideClipboard: () => ipcRenderer.invoke("vox:hide-clipboard"),
  listCommands: () => ipcRenderer.invoke("vox:list-commands"),
  saveCommand: (cmd) => ipcRenderer.invoke("vox:save-command", cmd),
  deleteCommand: (id) => ipcRenderer.invoke("vox:delete-command", id),
  setCommandEnabled: (id, enabled) => ipcRenderer.invoke("vox:set-command-enabled", id, enabled),
  listSnippets: () => ipcRenderer.invoke("vox:list-snippets"),
  saveSnippet: (snippet) => ipcRenderer.invoke("vox:save-snippet", snippet),
  deleteSnippet: (id) => ipcRenderer.invoke("vox:delete-snippet", id),
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
  onDockShow: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("vox:dock-show", handler);
    return () => ipcRenderer.removeListener("vox:dock-show", handler);
  },
  onDockHide: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("vox:dock-hide", handler);
    return () => ipcRenderer.removeListener("vox:dock-hide", handler);
  },
  onClipboardRefresh: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("vox:clipboard-refresh", handler);
    return () => ipcRenderer.removeListener("vox:clipboard-refresh", handler);
  }
};
contextBridge.exposeInMainWorld("vox", voxApi);
exports.voxApi = voxApi;
