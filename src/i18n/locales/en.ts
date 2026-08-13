const en = {
  type: {
    start: 'Start',
    speakNow: 'Speak now...',
    voiceCommand: 'Voice Command',
    toggle: 'Toggle',
    pushToTalk: 'Push-to-Talk',
    recording: 'Recording',
    waiting: 'Waiting',
    lastTranscript: 'Last Transcription',
    copy: 'Copy',
    copied: 'Copied',
    recordingAudio: 'Recording audio...',
    transcribing: 'Transcribing via Whisper Large V3 Turbo...',
    emptyHint: 'Press F10 or say "Vox" to start dictation.',
    history: 'Dictation History',
    historyEmpty: 'No dictations recorded yet.',
    delete: 'Delete'
  },
  setup: {
    title: 'Configure your API Key',
    description: 'Enter your provider key (e.g. Groq). It will be saved locally and will not be asked again.',
    apiKey: 'API Key',
    hint: 'The provider must offer access to the openai/gpt-oss-20b model and Whisper Large V3 Turbo.',
    required: 'Enter your API key to continue.',
    later: 'Set up later',
    save: 'Save and Continue'
  },
  settings: {
    title: 'Settings',
    apiKey: 'API Key',
    apiKeyHint: 'Saved locally in the database. The provider must offer the models below.',
    sttModel: 'STT Model (Voice)',
    llmModel: 'LLM Model (Corrector)',
    selectModel: 'Select Model',
    loadingModels: 'Loading models...',
    modelsError: 'Could not load models from the provider.',
    modelsNeedApiKey: 'Add your API key first to load the available models.',
    noModels: 'No models available.',
    done: 'Done',
    shortcutToggle: 'Toggle Shortcut',
    shortcutPtt: 'Push-to-Talk Shortcut',
    wakeWord: 'Wake Word (Voice Activation)',
    wakeWordHint: 'Trigger Vox by speaking in the background (openWakeWord ONNX)',
    wakeWordMissing: 'ONNX model (vox.onnx) not found in resources/models/wakeword/. Run npm run setup:wakeword to download.',
    micError: 'Background microphone:',
    sensitivity: 'Sensitivity',
    clearHistory: 'Clear History',
    clearConfirm: 'Are you sure you want to delete all transcription and dictation history?',
    cancel: 'Cancel',
    save: 'Save Settings',
    language: 'Language',
    langEn: 'English',
    langPt: 'Português (BR)',
    autoStart: 'Start with System',
    autoStartHint: 'Automatically launch Vox when you log in'
  },
  common: {
    settings: 'Settings'
  }
}

export type TranslationKeys = typeof en
export default en
