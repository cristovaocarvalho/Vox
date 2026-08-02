Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region electron/preload.ts
var { contextBridge, ipcRenderer } = require("electron");
var voxApi = {
	startRecording: () => ipcRenderer.invoke("vox:start-recording"),
	stopRecording: (audioData) => ipcRenderer.invoke("vox:stop-recording", audioData),
	sendAudioChunk: (chunk) => ipcRenderer.send("vox:audio-chunk", chunk),
	sendAudioLevel: (level) => ipcRenderer.send("vox:audio-level", level),
	transcribeChunk: (audioData) => ipcRenderer.invoke("vox:transcribe-chunk", audioData),
	showDock: () => ipcRenderer.invoke("vox:show-dock"),
	hideDock: () => ipcRenderer.invoke("vox:hide-dock"),
	minimize: () => ipcRenderer.invoke("vox:minimize"),
	getVideoInfo: (url, cookiesFromBrowser) => ipcRenderer.invoke("vox:get-video-info", url, cookiesFromBrowser),
	downloadAudio: (url, cookiesFromBrowser) => ipcRenderer.invoke("vox:download-audio", url, cookiesFromBrowser),
	transcribeMedia: (options) => ipcRenderer.invoke("vox:transcribe-media", options),
	deleteFile: (filePath) => ipcRenderer.invoke("vox:delete-file", filePath),
	selectFile: () => ipcRenderer.invoke("vox:select-file"),
	getSettings: () => ipcRenderer.invoke("vox:get-settings"),
	saveSettings: (settings) => ipcRenderer.invoke("vox:save-settings", settings),
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
	}
};
contextBridge.exposeInMainWorld("vox", voxApi);
//#endregion
exports.voxApi = voxApi;
