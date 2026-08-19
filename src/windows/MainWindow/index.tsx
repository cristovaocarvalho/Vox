import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useVoxStore, type AppLocale, type VoxState } from '../../stores/useVoxStore'
import { useAnimationGate, initAnimationGate } from '../../lib/animationGate'
import { useI18n } from '../../i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Badge,
  Beams,
  LiquidGlassCard,
  SpecularButton,
  AnimatedContent,
  SmoothInput,
  ShortcutInput,
  CustomSelect,
  DictationStatsCard,
  type DictationStatsData,
  IconCheck,
  IconMic,
  IconTrash,
  IconChevronDown,
  IconAlert,
  IconX,
  IconCopy,
  IconGear
} from '../../components'
import logoImg from '../../assets/logo.png'
import configImg from '../../assets/config.png'
import { CommandsTab } from './tabs/CommandsTab'
import { TemplatesTab } from './tabs/TemplatesTab'
import { ModelsTab } from './tabs/ModelsTab'

const prettyModelName = (id: string): string => {
  const base = id.split('/').pop() || id
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const SPEECH_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
  { value: 'ru', label: 'Русский' }
]

const buildAudioConstraints = (deviceId?: string): MediaTrackConstraints => {
  const base: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
  return deviceId ? { ...base, deviceId: { exact: deviceId } } : base
}

const getUserAudioStream = async (deviceId?: string): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: buildAudioConstraints(deviceId) })
  } catch (err) {
    if (deviceId) {
      console.warn('[MainWindow] Microfone preferido indisponível, usando o padrão:', err)
      return await navigator.mediaDevices.getUserMedia({ audio: buildAudioConstraints() })
    }
    throw err
  }
}

interface ProviderOption {
  id: string
  label: string
  baseUrl: string
  requiresApiKey: boolean
  isAzure: boolean
  defaultApiVersion: string
}

const FALLBACK_PROVIDERS: ProviderOption[] = [
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', requiresApiKey: true, isAzure: false, defaultApiVersion: '' },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', requiresApiKey: true, isAzure: false, defaultApiVersion: '' },
  { id: 'azure', label: 'Azure OpenAI', baseUrl: 'https://YOUR_RESOURCE.openai.azure.com', requiresApiKey: true, isAzure: true, defaultApiVersion: '2024-06-01' },
  { id: 'ollama', label: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', requiresApiKey: false, isAzure: false, defaultApiVersion: '' },
  { id: 'lmstudio', label: 'LM Studio (local)', baseUrl: 'http://localhost:1234/v1', requiresApiKey: false, isAzure: false, defaultApiVersion: '' }
]

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const formatLogTime = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

const matchShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
  if (!shortcut) return false
  const parts = shortcut.split('+').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return false
  const key = parts[parts.length - 1]
  const hasCtrl = parts.includes('Ctrl')
  const hasAlt = parts.includes('Alt')
  const hasShift = parts.includes('Shift')
  const hasCmd = parts.includes('Cmd')

  if (e.ctrlKey !== hasCtrl) return false
  if (e.altKey !== hasAlt) return false
  if (e.shiftKey !== hasShift) return false
  if (e.metaKey !== hasCmd) return false

  if (key.length === 1) {
    return e.key.toUpperCase() === key.toUpperCase()
  }
  if (key === 'Space') {
    return e.key === ' ' || e.code === 'Space'
  }
  return e.key.toLowerCase() === key.toLowerCase() || e.code.toLowerCase() === key.toLowerCase()
}

export const MainWindow: React.FC = () => {
  const { t, localeTag } = useI18n()
  const {
    isRecording,
    setIsRecording,
    lastTranscript,
    setLastTranscript,
    apiKey,
    setApiKey,
    provider,
    setProvider,
    baseUrl,
    setBaseUrl,
    azureApiVersion,
    setAzureApiVersion,
    sttModel,
    setSttModel,
    llmModel,
    setLlmModel,
    shortcutToggle,
    setShortcutToggle,
    shortcutPushToTalk,
    setShortcutPushToTalk,
    shortcutClipboard,
    setShortcutClipboard,
    wakeWordEnabled,
    setWakeWordEnabled,
    wakeWordSensitivity,
    setWakeWordSensitivity,
    language,
    setLanguage,
    autoStartEnabled,
    setAutoStartEnabled,
    muteSystemAudio,
    setMuteSystemAudio,
    autoDetectLanguage,
    setAutoDetectLanguage,
    speechLanguage,
    setSpeechLanguage,
    microphoneDeviceId,
    setMicrophoneDeviceId,
    commandInlineMode,
    setInlineMode,
    updateSettings
  } = useVoxStore()

  const [partialTranscript, setPartialTranscript] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsPage, setSettingsPage] = useState<'provider' | 'models' | 'shortcuts' | 'voice' | 'preferences' | 'privacy' | 'vocabulary' | 'commands' | 'templates'>('provider')
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Local drafts for Settings modal (so Cancel reverts changes)
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [draftProvider, setDraftProvider] = useState(provider)
  const [draftBaseUrl, setDraftBaseUrl] = useState(baseUrl)
  const [draftAzureApiVersion, setDraftAzureApiVersion] = useState(azureApiVersion)
  const [draftShortcutToggle, setDraftShortcutToggle] = useState(shortcutToggle)
  const [draftShortcutPushToTalk, setDraftShortcutPushToTalk] = useState(shortcutPushToTalk)
  const [draftShortcutClipboard, setDraftShortcutClipboard] = useState(shortcutClipboard)
  const [draftWakeWordEnabled, setDraftWakeWordEnabled] = useState(wakeWordEnabled)
  const [draftWakeWordSensitivity, setDraftWakeWordSensitivity] = useState(wakeWordSensitivity)
  const [draftLanguage, setDraftLanguage] = useState<AppLocale>(language)
  const [draftAutoStartEnabled, setDraftAutoStartEnabled] = useState(autoStartEnabled)
  const [draftMuteSystemAudio, setDraftMuteSystemAudio] = useState(muteSystemAudio)
  const [draftAutoDetectLanguage, setDraftAutoDetectLanguage] = useState(autoDetectLanguage)
  const [draftSpeechLanguage, setDraftSpeechLanguage] = useState(speechLanguage)
  const [draftMicrophoneDeviceId, setDraftMicrophoneDeviceId] = useState(microphoneDeviceId)
  const [draftSttModel, setDraftSttModel] = useState(sttModel)
  const [draftLlmModel, setDraftLlmModel] = useState(llmModel)

  const [providers, setProviders] = useState<ProviderOption[]>([])

  const [openModelDropdown, setOpenModelDropdown] = useState<'stt' | 'llm' | null>(null)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null)
  const [availableModels, setAvailableModels] = useState<{ stt: string[]; llm: string[] }>({ stt: [], llm: [] })
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  const [wakeWordModelMissing, setWakeWordModelMissing] = useState(false)
  const [wakeWordError, setWakeWordError] = useState<string | null>(null)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  const [dictationHistory, setDictationHistory] = useState<any[]>([])
  const [isDictationHistoryOpen, setIsDictationHistoryOpen] = useState(false)
  const [dictationStats, setDictationStats] = useState<DictationStatsData>({
    totalWords: 0,
    totalSessions: 0,
    dailyContributions: {}
  })

  const [apiLogs, setApiLogs] = useState<any[]>([])
  const [privacyLoading, setPrivacyLoading] = useState(false)

  const [vocabulary, setVocabulary] = useState<string[]>([])
  const [newTerm, setNewTerm] = useState('')

  const [microphones, setMicrophones] = useState<{ deviceId: string; label: string }[]>([])

  const [updaterState, setUpdaterState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    version?: string
    percent?: number
    error?: string
  }>({ status: 'idle' })

  React.useEffect(() => {
    const unsub = window.vox?.onUpdaterStatus?.((data) => {
      setUpdaterState(data)
    })
    return () => unsub?.()
  }, [])

  const handleCheckUpdates = async () => {
    setUpdaterState({ status: 'checking' })
    const res = await window.vox?.checkForUpdates?.()
    if (!res?.success) {
      setUpdaterState({ status: 'error', error: res?.error || res?.message || 'Erro ao verificar atualizações' })
    }
  }

  const handleInstallUpdate = () => {
    window.vox?.restartAndInstallUpdate?.()
  }

  React.useEffect(() => {
    document.documentElement.lang = localeTag
  }, [localeTag])

  const fetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchHistory = React.useCallback(async () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    fetchTimeoutRef.current = setTimeout(async () => {
      if (window.vox?.listSessions) {
        try {
          const dictations = await window.vox.listSessions(10, 'dictation')
          setDictationHistory(dictations || [])
        } catch (err) {
          console.error('Erro ao carregar histórico de sessões:', err)
        }
      }
      if (window.vox?.getDictationStats) {
        try {
          const stats = await window.vox.getDictationStats()
          if (stats) setDictationStats(stats)
        } catch (err) {
          console.error('Erro ao carregar estatísticas de ditado:', err)
        }
      }
    }, 150)
  }, [])

  React.useEffect(() => {
    fetchHistory()
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [fetchHistory])

  const handleClearHistory = () => {
    setShowClearConfirmModal(true)
  }

  const handleDeleteSession = async (id: string) => {
    if (window.vox?.deleteSession) {
      await window.vox.deleteSession(id)
      fetchHistory()
    }
  }

  const loadApiLogs = React.useCallback(async () => {
    if (!window.vox?.listApiLogs) return
    setPrivacyLoading(true)
    try {
      const logs = await window.vox.listApiLogs(200)
      setApiLogs(logs || [])
    } catch (err) {
      console.error('Erro ao carregar logs de privacidade:', err)
    } finally {
      setPrivacyLoading(false)
    }
  }, [])

  const handleClearApiLogs = async () => {
    if (window.vox?.clearApiLogs) {
      await window.vox.clearApiLogs()
      setApiLogs([])
    }
  }

  const loadVocabulary = React.useCallback(async () => {
    if (!window.vox?.listVocabulary) return
    try {
      const terms = await window.vox.listVocabulary()
      setVocabulary(Array.isArray(terms) ? terms : [])
    } catch (err) {
      console.error('Erro ao carregar vocabulário:', err)
    }
  }, [])

  const loadMicrophones = React.useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      let devices = await navigator.mediaDevices.enumerateDevices()
      let audioInputs = devices.filter((d) => d.kind === 'audioinput')
      if (audioInputs.length > 0 && audioInputs.some((d) => !d.label)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((track) => track.stop())
          devices = await navigator.mediaDevices.enumerateDevices()
          audioInputs = devices.filter((d) => d.kind === 'audioinput')
        } catch {
          // permissão negada — mantém os rótulos vazios
        }
      }
      setMicrophones(
        audioInputs.map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microfone ${i + 1}`
        }))
      )
    } catch (err) {
      console.error('Erro ao listar microfones:', err)
    }
  }, [])

  const handleAddVocabularyTerm = async () => {
    const term = newTerm.trim()
    if (!term || !window.vox?.addVocabularyTerm) return
    const updated = await window.vox.addVocabularyTerm(term)
    setVocabulary(Array.isArray(updated) ? updated : [...vocabulary, term])
    setNewTerm('')
  }

  const handleRemoveVocabularyTerm = async (term: string) => {
    if (!window.vox?.removeVocabularyTerm) return
    const updated = await window.vox.removeVocabularyTerm(term)
    setVocabulary(Array.isArray(updated) ? updated : vocabulary.filter((t) => t !== term))
  }

  const handleClearVocabulary = async () => {
    if (!window.vox?.clearVocabulary) return
    await window.vox.clearVocabulary()
    setVocabulary([])
  }


  const handleOpenSettings = () => {
    setDraftApiKey(apiKey)
    setDraftProvider(provider)
    setDraftBaseUrl(baseUrl)
    setDraftAzureApiVersion(azureApiVersion)
    setDraftShortcutToggle(shortcutToggle)
    setDraftShortcutPushToTalk(shortcutPushToTalk)
    setDraftShortcutClipboard(shortcutClipboard)
    setDraftWakeWordEnabled(wakeWordEnabled)
    setDraftWakeWordSensitivity(wakeWordSensitivity)
    setDraftLanguage(language)
    setDraftAutoStartEnabled(autoStartEnabled)
    setDraftMuteSystemAudio(muteSystemAudio)
    setDraftAutoDetectLanguage(autoDetectLanguage)
    setDraftSpeechLanguage(speechLanguage)
    setDraftMicrophoneDeviceId(microphoneDeviceId)
    setDraftSttModel(sttModel)
    setDraftLlmModel(llmModel)
    setSettingsPage('provider')
    setIsSettingsOpen(true)
  }

  const loadModels = React.useCallback(async () => {
    if (!window.vox?.listModels) return
    setModelsLoading(true)
    setModelsError(null)
    try {
      const res = await window.vox.listModels({
        provider: draftProvider,
        baseUrl: draftBaseUrl,
        apiKey: draftApiKey,
        azureApiVersion: draftAzureApiVersion
      })
      if (res?.error) {
        setModelsError(res.error === 'no-api-key' ? t('settings.modelsNeedApiKey') : t('settings.modelsError'))
        setAvailableModels({ stt: [], llm: [] })
      } else {
        setAvailableModels({ stt: res?.stt || [], llm: res?.llm || [] })
      }
    } catch {
      setModelsError(t('settings.modelsError'))
      setAvailableModels({ stt: [], llm: [] })
    } finally {
      setModelsLoading(false)
    }
  }, [t, draftProvider, draftBaseUrl, draftApiKey, draftAzureApiVersion])

  const closeModelDropdown = () => {
    setOpenModelDropdown(null)
    setDropdownRect(null)
  }

  const toggleModelDropdown = (tab: 'stt' | 'llm', e: React.MouseEvent<HTMLButtonElement>) => {
    if (openModelDropdown === tab) {
      closeModelDropdown()
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const up = spaceBelow < 300
    setDropdownRect({ top: up ? r.top - 8 : r.bottom + 6, left: r.left, width: r.width, up })
    setOpenModelDropdown(tab)
    if (availableModels.stt.length === 0 && availableModels.llm.length === 0) {
      loadModels()
    }
  }

  const selectModel = (tab: 'stt' | 'llm', id: string) => {
    if (tab === 'stt') {
      setDraftSttModel(id)
    } else {
      setDraftLlmModel(id)
    }
    closeModelDropdown()
  }

  const providerList = providers.length ? providers : FALLBACK_PROVIDERS
  const currentProvider = providerList.find((p) => p.id === draftProvider)
  const providerLabel = (id: string) => providerList.find((p) => p.id === id)?.label || id
  const totalApiBytes = apiLogs.reduce((sum, l) => sum + (Number(l.bytesSent) || 0), 0)

  const selectProvider = (p: ProviderOption) => {
    setDraftProvider(p.id)
    setDraftBaseUrl(p.baseUrl)
    if (p.isAzure && !draftAzureApiVersion) {
      setDraftAzureApiVersion(p.defaultApiVersion)
    }
  }

  const settingsNavItems: { id: 'provider' | 'models' | 'shortcuts' | 'voice' | 'preferences' | 'privacy' | 'vocabulary' | 'commands' | 'templates'; label: string }[] = [
    { id: 'provider', label: t('settings.provider') },
    { id: 'models', label: t('settings.models') },
    { id: 'shortcuts', label: t('settings.shortcuts') },
    { id: 'voice', label: t('settings.voice') },
    { id: 'preferences', label: t('settings.preferences') },
    { id: 'vocabulary', label: t('settings.vocabulary') },
    { id: 'commands', label: t('settings.commands') },
    { id: 'templates', label: t('settings.templates') },
    { id: 'privacy', label: t('settings.privacy') }
  ]

  const handleSaveSettings = () => {
    const trimmedKey = draftApiKey.trim()
    updateSettings({
      apiKey: trimmedKey,
      provider: draftProvider,
      baseUrl: draftBaseUrl,
      azureApiVersion: draftAzureApiVersion,
      sttModel: draftSttModel,
      llmModel: draftLlmModel,
      shortcutToggle: draftShortcutToggle,
      shortcutPushToTalk: draftShortcutPushToTalk,
      shortcutClipboard: draftShortcutClipboard,
      wakeWordEnabled: draftWakeWordEnabled,
      wakeWordSensitivity: draftWakeWordSensitivity,
      language: draftLanguage,
      autoStartEnabled: draftAutoStartEnabled,
      muteSystemAudio: draftMuteSystemAudio,
      autoDetectLanguage: draftAutoDetectLanguage,
      speechLanguage: draftSpeechLanguage,
      microphoneDeviceId: draftMicrophoneDeviceId
    })
    setIsSettingsOpen(false)

    if (window.vox?.saveSettings) {
      window.vox.saveSettings({
        apiKey: trimmedKey,
        provider: draftProvider,
        baseUrl: draftBaseUrl,
        azureApiVersion: draftAzureApiVersion,
        sttModel: draftSttModel,
        llmModel: draftLlmModel,
        shortcutToggle: draftShortcutToggle,
        shortcutPushToTalk: draftShortcutPushToTalk,
        shortcutClipboard: draftShortcutClipboard,
        wakeWordEnabled: String(draftWakeWordEnabled),
        wakeWordSensitivity: String(draftWakeWordSensitivity),
        language: draftLanguage,
        autoStartEnabled: String(draftAutoStartEnabled),
        muteSystemAudio: String(draftMuteSystemAudio),
        autoDetectLanguage: String(draftAutoDetectLanguage),
        speechLanguage: draftSpeechLanguage,
        microphoneDeviceId: draftMicrophoneDeviceId
      }).catch(console.error)
    }

    if (window.vox?.setWakeWordEnabled) {
      window.vox.setWakeWordEnabled(draftWakeWordEnabled).catch(console.error)
    }

    if (window.vox?.setWakeWordSensitivity) {
      window.vox.setWakeWordSensitivity(draftWakeWordSensitivity).catch(console.error)
    }
  }

  React.useEffect(() => {
    if (window.vox?.getSettings) {
      window.vox.getSettings().then((saved: Record<string, string>) => {
        const settingsToUpdate: Partial<VoxState> = {}
        if (saved.apiKey) settingsToUpdate.apiKey = saved.apiKey
        if (saved.provider) settingsToUpdate.provider = saved.provider
        if (saved.baseUrl !== undefined) settingsToUpdate.baseUrl = saved.baseUrl
        if (saved.azureApiVersion !== undefined) settingsToUpdate.azureApiVersion = saved.azureApiVersion
        if (saved.sttModel) settingsToUpdate.sttModel = saved.sttModel
        if (saved.llmModel) settingsToUpdate.llmModel = saved.llmModel
        if (saved.shortcutToggle) {
          settingsToUpdate.shortcutToggle = saved.shortcutToggle
          setDraftShortcutToggle(saved.shortcutToggle)
        }
        if (saved.shortcutPushToTalk) {
          settingsToUpdate.shortcutPushToTalk = saved.shortcutPushToTalk
          setDraftShortcutPushToTalk(saved.shortcutPushToTalk)
        }
        if (saved.shortcutClipboard) {
          settingsToUpdate.shortcutClipboard = saved.shortcutClipboard
          setDraftShortcutClipboard(saved.shortcutClipboard)
        }
        if (saved.commandInlineMode !== undefined) settingsToUpdate.commandInlineMode = saved.commandInlineMode === 'true'
        if (saved.wakeWordEnabled !== undefined) settingsToUpdate.wakeWordEnabled = saved.wakeWordEnabled === 'true'
        if (saved.wakeWordSensitivity) settingsToUpdate.wakeWordSensitivity = parseFloat(saved.wakeWordSensitivity)
        if (saved.autoStartEnabled !== undefined) {
          const hasAutoStart = saved.autoStartEnabled === 'true'
          settingsToUpdate.autoStartEnabled = hasAutoStart
          setDraftAutoStartEnabled(hasAutoStart)
        }

        if (saved.muteSystemAudio !== undefined) {
          const muteSystemAudioEnabled = saved.muteSystemAudio === 'true'
          settingsToUpdate.muteSystemAudio = muteSystemAudioEnabled
          setDraftMuteSystemAudio(muteSystemAudioEnabled)
        }

        if (saved.autoDetectLanguage !== undefined) {
          const autoDetectEnabled = saved.autoDetectLanguage === 'true'
          settingsToUpdate.autoDetectLanguage = autoDetectEnabled
          setDraftAutoDetectLanguage(autoDetectEnabled)
        }

        if (saved.speechLanguage !== undefined) {
          settingsToUpdate.speechLanguage = saved.speechLanguage
          setDraftSpeechLanguage(saved.speechLanguage)
        }

        if (saved.microphoneDeviceId !== undefined) {
          settingsToUpdate.microphoneDeviceId = saved.microphoneDeviceId
          setDraftMicrophoneDeviceId(saved.microphoneDeviceId)
        }

        let initialLang: AppLocale = 'pt-BR'
        if (saved.language === 'en' || saved.language === 'pt-BR') {
          initialLang = saved.language
        } else if (saved.language === 'pt') {
          initialLang = 'pt-BR'
        } else {
          const systemLang = (navigator.language || '').toLowerCase()
          if (systemLang.startsWith('en')) {
            initialLang = 'en'
          }
        }

        settingsToUpdate.language = initialLang
        setDraftLanguage(initialLang)

        updateSettings(settingsToUpdate)
        setSettingsLoaded(true)
      }).catch(() => {
        setSettingsLoaded(true)
      })
    } else {
      setSettingsLoaded(true)
    }

    const unsubMissing = window.vox?.onWakeWordModelMissing?.(() => {
      setWakeWordModelMissing(true)
    })

    const unsubError = window.vox?.onWakeWordError?.((data) => {
      setWakeWordError(data?.error || 'mic')
    })

    return () => {
      unsubMissing?.()
      unsubError?.()
    }
  }, [setApiKey, setSttModel, setLlmModel, setShortcutToggle, setShortcutPushToTalk, setWakeWordEnabled, setWakeWordSensitivity, setLanguage])

  React.useEffect(() => {
    if (window.vox?.getProviders) {
      window.vox.getProviders().then((list: ProviderOption[]) => {
        if (Array.isArray(list)) setProviders(list)
      }).catch(() => {})
    }
  }, [])

  React.useEffect(() => {
    if (isSettingsOpen && settingsPage === 'privacy') {
      loadApiLogs()
    }
    if (isSettingsOpen && settingsPage === 'vocabulary') {
      loadVocabulary()
    }
    if (isSettingsOpen && settingsPage === 'voice') {
      loadMicrophones()
    }
  }, [isSettingsOpen, settingsPage, loadApiLogs, loadVocabulary, loadMicrophones])

  const mediaStreamRef = React.useRef<MediaStream | null>(null)
  const audioContextRef = React.useRef<AudioContext | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioChunksRef = React.useRef<Blob[]>([])
  const animFrameRef = React.useRef<number | null>(null)
  const chunkIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const wwAudioContextRef = React.useRef<AudioContext | null>(null)
  const wwStreamRef = React.useRef<MediaStream | null>(null)
  const wwScriptNodeRef = React.useRef<ScriptProcessorNode | null>(null)

  const stopAudioCapture = React.useCallback(async () => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current)
      chunkIntervalRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { })
      audioContextRef.current = null
    }

    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      setIsTranscribing(true)
      const audioDataPromise = new Promise<ArrayBuffer | undefined>((resolve) => {
        rec.onstop = async () => {
          try {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            audioChunksRef.current = []
            const arrayBuffer = await blob.arrayBuffer()
            resolve(arrayBuffer)
          } catch {
            resolve(undefined)
          }
        }
      })

      try {
        if (rec.state === 'recording') {
          rec.requestData()
        }
      } catch {
        // ignore if not recording
      }
      rec.stop()
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      mediaRecorderRef.current = null

      const arrayBuffer = await audioDataPromise
      if (window.vox?.stopRecording) {
        try {
          const res = await window.vox.stopRecording(arrayBuffer)
          if (res && res.text) {
            setLastTranscript(res.text)
            setIsCopied(false)
          }
        } catch (err) {
          console.error('[MainWindow] Erro ao parar gravação/transcrever:', err)
        } finally {
          setIsTranscribing(false)
          setPartialTranscript('')
        }
      }
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      if (window.vox?.stopRecording) {
        window.vox.stopRecording()
      }
    }
  }, [setLastTranscript])

  const startAudioCapture = React.useCallback(async () => {
    try {
      setPartialTranscript('')
      setIsCopied(false)

      const [, stream] = await Promise.all([
        window.vox?.startRecording?.() ?? Promise.resolve(),
        getUserAudioStream(microphoneDeviceId)
      ])
      mediaStreamRef.current = stream

      // AnalyserNode para medir volume real para o VAD / Dock animation
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const avg = sum / dataArray.length
        const normalizedEnergy = avg / 255.0
        if (window.vox?.sendAudioLevel) {
          window.vox.sendAudioLevel(normalizedEnergy)
        }
        animFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      // MediaRecorder com Opus/WebM de altíssima qualidade
      audioChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start(200)

      // Transcrição incremental: a cada 2s, envia áudio acumulado para Whisper
      chunkIntervalRef.current = setInterval(async () => {
        if (audioChunksRef.current.length === 0) return
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const arrayBuffer = await blob.arrayBuffer()
          if (window.vox?.transcribeChunk) {
            window.vox.transcribeChunk(arrayBuffer)
          }
        } catch {
          // ignore chunk errors
        }
      }, 2000)
    } catch (err) {
      console.error('[MainWindow] Erro ao acessar microfone:', err)
      setIsRecording(false)
    }
  }, [setIsRecording, microphoneDeviceId])

  React.useEffect(() => {
    initAnimationGate()
    const unsubVisibility = window.vox?.onWindowVisibility?.((visible: boolean) => {
      useAnimationGate.getState().setWindowVisible(visible)
    })
    return () => unsubVisibility?.()
  }, [])

  const handleToggleRecording = () => {
    const nextState = !isRecording
    setIsRecording(nextState)
  }

  React.useEffect(() => {
    if (isRecording) {
      startAudioCapture()
    } else {
      stopAudioCapture()
    }
  }, [isRecording, startAudioCapture, stopAudioCapture])

  const stopWakeWordCapture = React.useCallback(() => {
    if (wwScriptNodeRef.current) {
      try {
        wwScriptNodeRef.current.disconnect()
      } catch { }
      wwScriptNodeRef.current = null
    }
    if (wwStreamRef.current) {
      try {
        wwStreamRef.current.getTracks().forEach((track) => track.stop())
      } catch { }
      wwStreamRef.current = null
    }
    if (wwAudioContextRef.current) {
      try {
        wwAudioContextRef.current.close().catch(() => {})
      } catch { }
      wwAudioContextRef.current = null
    }
  }, [])

  const startWakeWordCapture = React.useCallback(async () => {
    stopWakeWordCapture()
    try {
      const stream = await getUserAudioStream(microphoneDeviceId)
      wwStreamRef.current = stream

      const AudioCtxConstructor = window.AudioContext || (window as any).webkitAudioContext
      const audioCtx = new AudioCtxConstructor({ sampleRate: 16000 })
      wwAudioContextRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1)
      wwScriptNodeRef.current = scriptNode

      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        const pcmBuffer = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1.0, Math.min(1.0, inputData[i]))
          pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        if (window.vox?.sendWakeWordAudioChunk) {
          window.vox.sendWakeWordAudioChunk(pcmBuffer.buffer)
        }
      }

      source.connect(scriptNode)
      scriptNode.connect(audioCtx.destination)
    } catch (err) {
      console.warn('[MainWindow] Erro ao iniciar captura de wake word:', err)
    }
  }, [stopWakeWordCapture, microphoneDeviceId])

  React.useEffect(() => {
    if (wakeWordEnabled && !isRecording && !isTranscribing) {
      startWakeWordCapture()
    } else {
      stopWakeWordCapture()
    }
    return () => {
      stopWakeWordCapture()
    }
  }, [wakeWordEnabled, isRecording, isTranscribing, startWakeWordCapture, stopWakeWordCapture])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      if (matchShortcut(e, shortcutToggle)) {
        if (e.repeat) return
        e.preventDefault()
        handleToggleRecording()
      } else if (matchShortcut(e, shortcutPushToTalk)) {
        e.preventDefault()
        if (!e.repeat) {
          setIsRecording(true)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      if (matchShortcut(e, shortcutPushToTalk)) {
        e.preventDefault()
        setIsRecording(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let unsubscribeToggle: (() => void) | undefined
    let unsubscribeTranscript: (() => void) | undefined

    if (window.vox?.onToggleRecording) {
      unsubscribeToggle = window.vox.onToggleRecording((recording: boolean) => {
        setIsRecording(recording)
      })
    }

    if (window.vox?.onTranscriptResult) {
      unsubscribeTranscript = window.vox.onTranscriptResult((text: string) => {
        setLastTranscript(text)
        setIsCopied(false)
        fetchHistory()
      })
    }

    let unsubscribePartial: (() => void) | undefined
    if (window.vox?.onPartialTranscript) {
      unsubscribePartial = window.vox.onPartialTranscript((text: string) => {
        setPartialTranscript(text)
      })
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      unsubscribeToggle?.()
      unsubscribeTranscript?.()
      unsubscribePartial?.()
    }
  }, [shortcutToggle, shortcutPushToTalk, handleToggleRecording, setIsRecording, setLastTranscript, fetchHistory])



  const handleCopyTranscript = () => {
    if (lastTranscript) {
      navigator.clipboard.writeText(lastTranscript)
      setIsCopied(true)
    }
  }

  return (
    <div className="flex h-screen w-screen bg-background text-text-primary overflow-hidden font-sans select-none">
      {/* Floating Top Update Banner */}
      <AnimatePresence>
        {updaterState.status === 'downloaded' && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-[#16161A]/95 backdrop-blur-xl border border-accent/40 shadow-2xl"
          >
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-text-primary">
              Nova versão {updaterState.version} pronta para instalar!
            </span>
            <SpecularButton
              size="sm"
              onClick={handleInstallUpdate}
              className="!px-3.5 !py-1 text-xs"
            >
              Reiniciar e Atualizar
            </SpecularButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        <Beams beamWidth={2} beamHeight={15} beamNumber={12} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={0}>

          <div className="min-h-full flex flex-col items-center justify-between px-4 sm:px-6 py-6 sm:py-8">
            <div className="w-full max-w-3xl flex-1 flex flex-col justify-between space-y-4">

              {/* Main action card */}
              <AnimatedContent key="type-card-1" distance={30} direction="vertical" duration={1.1} delay={0.05} ease="power3.out" className="flex-1 flex flex-col min-h-0">
                <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6 sm:p-7 flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    {/* Mic button */}
                    <button
                      onClick={handleToggleRecording}
                      className={`mx-auto flex items-center justify-center transition-transform duration-450 ease-spring cursor-pointer focus:outline-none ${isRecording ? 'scale-110' : 'hover:scale-105 active:scale-95'
                        }`}
                    >
                      <img
                        src={logoImg}
                        alt="Vox"
                        className={`w-24 h-24 object-contain transition-all duration-500 ease-smooth filter ${isRecording
                          ? 'drop-shadow-[0_0_28px_rgba(255,255,255,0.75)]'
                          : 'drop-shadow-[0_0_14px_rgba(255,255,255,0.25)] hover:drop-shadow-[0_0_22px_rgba(255,255,255,0.55)]'
                          }`}
                      />
                    </button>

                    <p className="mt-3 text-lg font-semibold font-heading tracking-tight text-text-primary">
                      {isRecording ? t('type.speakNow') : t('type.start')}
                    </p>

                    <div className="mt-3.5 mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">"Vox"</kbd>
                        <span className="text-xs text-text-secondary font-medium">{t('type.voiceCommand')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">{shortcutToggle || 'F10'}</kbd>
                        <span className="text-xs text-text-secondary font-medium">{t('type.toggle')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">{shortcutPushToTalk || 'F9'}</kbd>
                        <span className="text-xs text-text-secondary font-medium">{t('type.pushToTalk')}</span>
                      </div>
                    </div>

                    <Badge variant={isRecording ? 'accent' : 'neutral'} className="px-2 py-0.5 text-[10px] font-medium tracking-wide mx-auto inline-flex items-center justify-center">
                      {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />}
                      {isRecording ? t('type.recording') : t('type.waiting')}
                    </Badge>
                  </div>
                </LiquidGlassCard>
              </AnimatedContent>

              {/* Transcript output */}
              <AnimatedContent key="type-card-2" distance={30} direction="vertical" duration={1.1} delay={0.15} ease="power3.out" className="flex-1 flex flex-col min-h-0">
                <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 mb-3">
                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide">{t('type.lastTranscript')}</span>
                    <SpecularButton
                      size="sm"
                      onClick={handleCopyTranscript}
                      disabled={!lastTranscript}
                      tint="#ffffff"
                      tintOpacity={isCopied ? 0.12 : 0}
                      className="transition-all duration-300 active:scale-95"
                    >
                      <span className={`inline-flex items-center gap-1.5 transition-colors duration-250 ease-smooth ${isCopied ? 'text-accent font-medium' : ''}`}>
                        {isCopied ? (
                          <>
                            <IconCheck className="w-3.5 h-3.5" strokeWidth={2.4} />
                            {t('type.copied')}
                          </>
                        ) : (
                          t('type.copy')
                        )}
                      </span>
                    </SpecularButton>
                  </div>
                  <div className="p-3.5 bg-background/60 border border-border/50 rounded-xl text-sm leading-relaxed text-text-primary flex-1 min-h-[64px] overflow-y-auto custom-scrollbar break-words">
                    {isRecording || isTranscribing ? (
                      partialTranscript ? (
                        <span>{partialTranscript}</span>
                      ) : isRecording ? (
                        <span className="text-accent animate-pulse">{t('type.recordingAudio')}</span>
                      ) : null
                    ) : lastTranscript ? (
                      <span>{lastTranscript}</span>
                    ) : (
                      <span className="text-text-disabled">{t('type.emptyHint')}</span>
                    )}
                  </div>
                </LiquidGlassCard>
              </AnimatedContent>

              {/* Grid Lado a Lado: Estatísticas (30 dias) e Histórico de Transcrições */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch shrink-0">
                {/* All Time Words Dictated & 30 Days Activity */}
                <AnimatedContent key="type-stats" distance={30} direction="vertical" duration={1.1} delay={0.2} ease="power3.out" className="h-full flex flex-col">
                  <DictationStatsCard stats={dictationStats} className="h-full flex flex-col justify-between" />
                </AnimatedContent>

                {/* Histórico de Ditado */}
                <AnimatedContent key="type-history" distance={30} direction="vertical" duration={1.1} delay={0.25} ease="power3.out" className="h-full flex flex-col">
                  <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-5 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 mb-3">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide">
                          {t('type.history')}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-border/60 text-[11px] font-medium text-text-secondary">
                          {dictationHistory.length}
                        </span>
                      </div>

                      {dictationHistory.length === 0 ? (
                        <div className="flex items-center justify-center min-h-[80px] py-3">
                          <p className="text-xs text-text-disabled text-center">{t('type.historyEmpty')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1 custom-scrollbar">
                          {dictationHistory.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setLastTranscript(item.text)}
                              className="p-2.5 bg-background/50 border border-border/50 rounded-xl hover:border-accent/40 hover:bg-background/70 transition-[border-color,background-color] duration-200 ease-smooth cursor-pointer flex items-center justify-between gap-2.5 group"
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs text-text-primary line-clamp-1 text-left leading-relaxed">{item.text}</p>
                                <span className="text-[10px] text-text-muted block mt-0.5 text-left tnum">
                                  {new Date(item.createdAt).toLocaleString(localeTag)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(item.text)
                                  }}
                                  className="p-1.5 bg-surface border border-border/70 text-text-secondary rounded hover:text-text-primary hover:border-accent/50 transition-colors duration-150 cursor-pointer"
                                  title={t('type.copy')}
                                >
                                  <IconCopy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteSession(item.id)
                                  }}
                                  className="p-1.5 bg-surface border border-border/70 text-text-secondary rounded hover:text-text-primary hover:border-accent/50 transition-colors duration-150 cursor-pointer"
                                  title={t('type.delete')}
                                >
                                  <IconTrash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </LiquidGlassCard>
                </AnimatedContent>
              </div>
            </div>

          </div>
        </Beams>
      </main>

      {/* Bottom-left circular config button */}
      <div className="fixed bottom-6 left-6 z-30">
        <SpecularButton
          size="sm"
          radius={9999}
          followMouse={false}
          autoAnimate={false}
          intensity={0.7}
          onClick={handleOpenSettings}
          className="!w-10 !h-10 !p-0 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group !rounded-full"
        >
          <img
            src={configImg}
            alt={t('common.settings')}
            className="w-4 h-4 object-contain opacity-80 group-hover:opacity-100 transition-transform duration-500 ease-smooth group-hover:rotate-45 filter drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]"
          />
        </SpecularButton>
      </div>



      {/* Settings Modal (sidebar + pages) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSettingsOpen(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-4xl h-[640px] max-h-[85vh] flex flex-col"
            >
              <LiquidGlassCard
                glowIntensity="md"
                blurIntensity="lg"
                className="flex flex-col border border-border/80 shadow-2xl h-full overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <img src={configImg} alt="" className="w-4 h-4 object-contain opacity-90" />
                    <h2 className="text-base font-semibold font-heading tracking-tight text-text-primary">{t('settings.title')}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface transition-colors duration-250 cursor-pointer"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>

                {/* Body: sidebar + content */}
                <div className="flex flex-1 min-h-0">
                  {/* Sidebar */}
                  <aside className="w-44 shrink-0 border-r border-border/40 p-3 overflow-y-auto custom-scrollbar">
                    <nav className="space-y-1">
                      {settingsNavItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSettingsPage(item.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all duration-200 cursor-pointer ${settingsPage === item.id
                            ? 'bg-accent/10 text-accent'
                            : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </nav>
                  </aside>

                  {/* Content */}
                  <div className="flex-1 min-w-0 p-6 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={settingsPage}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {settingsPage === 'provider' && (
                      <div className="space-y-5">
                        {/* Provider */}
                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                            {t('settings.provider')}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {providerList.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => selectProvider(p)}
                                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all duration-250 ease-smooth text-center cursor-pointer ${draftProvider === p.id
                                  ? 'bg-accent/15 text-accent border-accent/40 font-semibold'
                                  : 'bg-transparent text-text-secondary border-border/50 hover:text-text-primary hover:border-border'
                                  }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Base URL */}
                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                            {t('settings.baseUrl')}
                          </label>
                          <SmoothInput
                            value={draftBaseUrl}
                            onChange={(e) => setDraftBaseUrl(e.target.value)}
                            placeholder="https://api.example.com/v1"
                          />
                          {draftProvider === 'azure' && (
                            <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                              {t('settings.baseUrlAzureHint')}
                            </p>
                          )}
                        </div>

                        {/* Azure API Version */}
                        {currentProvider?.isAzure && (
                          <div>
                            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                              {t('settings.azureApiVersion')}
                            </label>
                            <SmoothInput
                              value={draftAzureApiVersion}
                              onChange={(e) => setDraftAzureApiVersion(e.target.value)}
                              placeholder="2024-06-01"
                            />
                          </div>
                        )}

                        {/* API Key */}
                        {(currentProvider ? currentProvider.requiresApiKey : true) && (
                          <div>
                            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                              {t('settings.apiKey')}
                            </label>
                            <SmoothInput
                              type="password"
                              value={draftApiKey}
                              onChange={(e) => setDraftApiKey(e.target.value)}
                              placeholder="gsk_..."
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {settingsPage === 'models' && (
                      <ModelsTab
                        draftSttModel={draftSttModel}
                        setDraftSttModel={setDraftSttModel}
                        draftLlmModel={draftLlmModel}
                        setDraftLlmModel={setDraftLlmModel}
                        draftProvider={draftProvider}
                        draftApiKey={draftApiKey}
                        draftBaseUrl={draftBaseUrl}
                        availableModels={availableModels}
                        modelsLoading={modelsLoading}
                        modelsError={modelsError}
                        onRefreshModels={loadModels}
                      />
                    )}

                    {settingsPage === 'shortcuts' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                            {t('settings.shortcutToggle')}
                          </label>
                          <ShortcutInput
                            value={draftShortcutToggle}
                            onChange={(val) => setDraftShortcutToggle(val)}
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                            {t('settings.shortcutPtt')}
                          </label>
                          <ShortcutInput
                            value={draftShortcutPushToTalk}
                            onChange={(val) => setDraftShortcutPushToTalk(val)}
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                            {t('settings.shortcutClipboard')}
                          </label>
                          <ShortcutInput
                            value={draftShortcutClipboard}
                            onChange={(val) => setDraftShortcutClipboard(val)}
                          />
                        </div>
                      </div>
                    )}

                    {settingsPage === 'voice' && (
                      <div className="space-y-4">
                        {/* Preferred microphone */}
                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                            {t('settings.microphone')}
                          </label>
                          <CustomSelect
                            value={draftMicrophoneDeviceId}
                            options={[
                              { value: '', label: t('settings.microphoneDefault') },
                              ...microphones.map((m) => ({ value: m.deviceId, label: m.label }))
                            ]}
                            onChange={(value) => setDraftMicrophoneDeviceId(value)}
                          />
                        </div>

                        {/* Language detection */}
                        <div className="p-4 bg-background/50 border border-border/60 rounded-xl space-y-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-text-primary block leading-relaxed">{t('settings.autoDetectLanguage')}</span>
                              <span className="text-[11px] text-text-secondary leading-relaxed">{t('settings.autoDetectLanguageHint')}</span>
                            </div>
                            <div className="switch-button">
                              <label className="switch-outer">
                                <input
                                  type="checkbox"
                                  checked={draftAutoDetectLanguage}
                                  onChange={(e) => setDraftAutoDetectLanguage(e.target.checked)}
                                />
                                <div className="button">
                                  <div className="button-toggle"></div>
                                  <div className="button-indicator"></div>
                                </div>
                              </label>
                            </div>
                          </div>

                          {!draftAutoDetectLanguage && (
                            <div className="pt-3 border-t border-border/30">
                              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                                {t('settings.speechLanguage')}
                              </label>
                              <CustomSelect
                                value={draftSpeechLanguage}
                                options={SPEECH_LANGUAGE_OPTIONS}
                                onChange={(value) => setDraftSpeechLanguage(value)}
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-background/50 border border-border/60 rounded-xl space-y-3.5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-text-primary block leading-relaxed">{t('settings.wakeWord')}</span>
                              <span className="text-[11px] text-text-secondary leading-relaxed">{t('settings.wakeWordHint')}</span>
                            </div>
                            <div className="switch-button">
                              <label className="switch-outer">
                                <input
                                  type="checkbox"
                                  checked={draftWakeWordEnabled}
                                  onChange={(e) => setDraftWakeWordEnabled(e.target.checked)}
                                />
                                <div className="button">
                                  <div className="button-toggle"></div>
                                  <div className="button-indicator"></div>
                                </div>
                              </label>
                            </div>
                          </div>

                          {wakeWordModelMissing && (
                            <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-lg text-[11px] text-text-primary font-medium flex items-start gap-1.5 leading-relaxed">
                              <IconAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                              <span>{t('settings.wakeWordMissing')}</span>
                            </div>
                          )}

                          {wakeWordError && (
                            <div className="p-2.5 bg-error/15 border border-error/30 rounded-lg text-[11px] text-error font-medium flex items-start gap-1.5 leading-relaxed">
                              <IconAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                              <span>{t('settings.micError')} {wakeWordError}</span>
                            </div>
                          )}

                          {draftWakeWordEnabled && (
                            <div className="pt-3 border-t border-border/30">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-text-secondary font-medium">{t('settings.sensitivity')}</span>
                                <span className="text-text-primary font-mono tnum">{Math.round(draftWakeWordSensitivity * 100)}%</span>
                              </div>
                              <label className="slider w-full mt-1">
                                <input
                                  type="range"
                                  min="0.1"
                                  max="1.0"
                                  step="0.05"
                                  value={draftWakeWordSensitivity}
                                  onChange={(e) => setDraftWakeWordSensitivity(parseFloat(e.target.value))}
                                  className="level"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Inline Command Mode */}
                        <div className="p-4 bg-background/50 border border-border/60 rounded-xl">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-text-primary block leading-relaxed">{t('commands.inlineMode')}</span>
                              <span className="text-[11px] text-text-secondary leading-relaxed">{t('commands.inlineModeHint')}</span>
                            </div>
                            <div className="switch-button">
                              <label className="switch-outer">
                                <input
                                  type="checkbox"
                                  checked={commandInlineMode}
                                  onChange={(e) => setInlineMode(e.target.checked)}
                                />
                                <div className="button">
                                  <div className="button-toggle"></div>
                                  <div className="button-indicator"></div>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsPage === 'preferences' && (
                      <div className="space-y-4">
                        {/* Language */}
                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                            {t('settings.language')}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {([
                              { id: 'pt-BR' as const, label: t('settings.langPt') },
                              { id: 'en' as const, label: t('settings.langEn') },
                              { id: 'es' as const, label: t('settings.langEs') },
                              { id: 'fr' as const, label: t('settings.langFr') },
                              { id: 'de' as const, label: t('settings.langDe') },
                              { id: 'zh-CN' as const, label: t('settings.langZh') },
                              { id: 'ja' as const, label: t('settings.langJa') },
                              { id: 'it' as const, label: t('settings.langIt') }
                            ]).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setDraftLanguage(opt.id)}
                                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all duration-250 ease-smooth text-center cursor-pointer ${draftLanguage === opt.id
                                  ? 'bg-accent/15 text-accent border-accent/40 font-semibold'
                                  : 'bg-transparent text-text-secondary border-border/50 hover:text-text-primary hover:border-border'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Auto Start */}
                        <div className="p-4 bg-background/50 border border-border/60 rounded-xl">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-text-primary block leading-relaxed">{t('settings.autoStart')}</span>
                              <span className="text-[11px] text-text-secondary leading-relaxed">{t('settings.autoStartHint')}</span>
                            </div>
                            <div className="switch-button">
                              <label className="switch-outer">
                                <input
                                  type="checkbox"
                                  checked={draftAutoStartEnabled}
                                  onChange={(e) => setDraftAutoStartEnabled(e.target.checked)}
                                />
                                <div className="button">
                                  <div className="button-toggle"></div>
                                  <div className="button-indicator"></div>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Mute System Audio */}
                        <div className="p-4 bg-background/50 border border-border/60 rounded-xl">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-text-primary block leading-relaxed">{t('settings.muteSystemAudio')}</span>
                              <span className="text-[11px] text-text-secondary leading-relaxed">{t('settings.muteSystemAudioHint')}</span>
                            </div>
                            <div className="switch-button">
                              <label className="switch-outer">
                                <input
                                  type="checkbox"
                                  checked={draftMuteSystemAudio}
                                  onChange={(e) => setDraftMuteSystemAudio(e.target.checked)}
                                />
                                <div className="button">
                                  <div className="button-toggle"></div>
                                  <div className="button-indicator"></div>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Clear History */}
                        <div className="p-4 bg-background/50 border border-border/60 rounded-xl">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-text-primary block leading-relaxed">{t('settings.clearHistory')}</span>
                              <span className="text-[11px] text-text-secondary leading-relaxed">{t('settings.clearConfirm')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleClearHistory}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-error hover:bg-error/10 border border-border/50 hover:border-error/30 rounded-xl transition-all duration-250 cursor-pointer shrink-0"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                              {t('settings.clearHistory')}
                            </button>
                          </div>
                        </div>

                        {/* Updates / Versão */}
                        <div className="p-4 bg-background/50 border border-border/60 rounded-xl space-y-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-text-primary block leading-relaxed">Atualizações de Versão</span>
                              <span className="text-[11px] text-text-secondary leading-relaxed">
                                {updaterState.status === 'checking' && 'Verificando novas versões no GitHub...'}
                                {updaterState.status === 'available' && `Nova versão ${updaterState.version} encontrada! Baixando...`}
                                {updaterState.status === 'downloading' && `Baixando atualização: ${updaterState.percent || 0}%`}
                                {updaterState.status === 'downloaded' && `Versão ${updaterState.version} pronta para instalar!`}
                                {updaterState.status === 'not-available' && 'Você está na versão mais recente.'}
                                {updaterState.status === 'error' && (updaterState.error || 'Erro ao verificar atualizações')}
                                {updaterState.status === 'idle' && 'Vox v1.5.0 • Atualizações automáticas ativas'}
                              </span>
                            </div>
                            {updaterState.status === 'downloaded' ? (
                              <SpecularButton
                                size="sm"
                                onClick={handleInstallUpdate}
                                className="!px-4 shrink-0"
                              >
                                Reiniciar e Atualizar
                              </SpecularButton>
                            ) : (
                              <button
                                type="button"
                                onClick={handleCheckUpdates}
                                disabled={updaterState.status === 'checking' || updaterState.status === 'downloading'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/60 hover:border-border rounded-lg transition-all duration-250 cursor-pointer shrink-0 disabled:opacity-50"
                              >
                                {updaterState.status === 'checking' ? 'Verificando...' : 'Verificar Agora'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsPage === 'privacy' && (
                      <div className="space-y-4">
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          {t('settings.privacyHint')}
                        </p>

                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-background/50 border border-border/60 rounded-xl">
                            <span className="text-[11px] text-text-muted block mb-1">{t('settings.privacyTotalCalls')}</span>
                            <span className="text-lg font-semibold font-heading text-text-primary">{apiLogs.length}</span>
                          </div>
                          <div className="p-4 bg-background/50 border border-border/60 rounded-xl">
                            <span className="text-[11px] text-text-muted block mb-1">{t('settings.privacyTotalBytes')}</span>
                            <span className="text-lg font-semibold font-heading text-text-primary">{formatBytes(totalApiBytes)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide">
                            {t('settings.privacyEntries')}
                          </span>
                          {apiLogs.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearApiLogs}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-error hover:bg-error/10 border border-border/50 hover:border-error/30 rounded-xl transition-all duration-250 cursor-pointer"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                              {t('settings.privacyClear')}
                            </button>
                          )}
                        </div>

                        {/* Entries */}
                        {privacyLoading ? (
                          <p className="text-xs text-text-secondary py-8 text-center">{t('settings.loadingModels')}</p>
                        ) : apiLogs.length === 0 ? (
                          <p className="text-xs text-text-muted py-8 text-center">{t('settings.privacyEmpty')}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {apiLogs.map((log) => (
                              <div key={log.id} className="flex items-center justify-between gap-3 p-3 bg-background/40 border border-border/50 rounded-xl">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-text-primary">{providerLabel(log.provider)}</span>
                                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{log.operation}</span>
                                  </div>
                                  <p className="text-[11px] text-text-muted truncate mt-0.5">{log.endpoint}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-mono text-text-primary block">{formatBytes(log.bytesSent)}</span>
                                  <span className="text-[10px] text-text-muted">{formatLogTime(log.createdAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {settingsPage === 'vocabulary' && (
                      <div className="space-y-4">
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          {t('settings.vocabularyHint')}
                        </p>

                        <div className="flex gap-2">
                          <SmoothInput
                            type="text"
                            value={newTerm}
                            onChange={(e) => setNewTerm(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddVocabularyTerm()
                            }}
                            placeholder={t('settings.vocabularyPlaceholder')}
                          />
                          <SpecularButton
                            size="sm"
                            onClick={handleAddVocabularyTerm}
                            disabled={!newTerm.trim()}
                            className="shrink-0 !px-4"
                          >
                            {t('settings.vocabularyAdd')}
                          </SpecularButton>
                        </div>

                        {vocabulary.length === 0 ? (
                          <p className="text-xs text-text-muted py-8 text-center">{t('settings.vocabularyEmpty')}</p>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-1.5">
                              {vocabulary.map((term) => (
                                <span
                                  key={term}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/50 border border-border/50 text-xs font-medium text-text-primary"
                                >
                                  {term}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVocabularyTerm(term)}
                                    className="text-text-muted hover:text-error transition-colors cursor-pointer"
                                  >
                                    <IconX className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleClearVocabulary}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-error hover:bg-error/10 border border-border/50 hover:border-error/30 rounded-xl transition-all duration-250 cursor-pointer"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                                {t('settings.vocabularyClear')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {settingsPage === 'commands' && (
                      <CommandsTab />
                    )}

                        {settingsPage === 'templates' && (
                          <TemplatesTab />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer"
                  >
                    {t('settings.cancel')}
                  </button>
                  <SpecularButton
                    size="sm"
                    onClick={handleSaveSettings}
                    className="!px-6"
                  >
                    {t('settings.save')}
                  </SpecularButton>
                </div>
              </LiquidGlassCard>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Confirmação de Limpeza de Histórico */}
        {showClearConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <LiquidGlassCard className="w-full max-w-md p-6 border border-border/60 shadow-2xl text-left">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold font-heading tracking-tight text-text-primary">
                  {t('settings.clearHistory')}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('settings.clearConfirm')}
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer"
                >
                  {t('settings.cancel')}
                </button>
                <SpecularButton
                  size="sm"
                  onClick={async () => {
                    setShowClearConfirmModal(false)
                    if (window.vox?.clearAllSessions) {
                      await window.vox.clearAllSessions()
                      fetchHistory()
                    }
                  }}
                >
                  {t('settings.clearHistory')}
                </SpecularButton>
              </div>
            </LiquidGlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {openModelDropdown && dropdownRect && createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={closeModelDropdown} />
          <div
            className="fixed z-[81]"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              transform: dropdownRect.up ? 'translateY(-100%)' : undefined
            }}
          >
            <div className="bg-[#16161A]/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-[0_16px_48px_0_rgba(0,0,0,0.65)] p-1.5">
              {modelsLoading ? (
                <p className="text-xs text-text-secondary py-6 px-3 text-center">{t('settings.loadingModels')}</p>
              ) : modelsError ? (
                <p className="text-xs text-error py-6 px-3 text-center leading-relaxed">{modelsError}</p>
              ) : (openModelDropdown === 'stt' ? availableModels.stt : availableModels.llm).length === 0 ? (
                <p className="text-xs text-text-muted py-6 px-3 text-center">{t('settings.noModels')}</p>
              ) : (
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1.5">
                  {(openModelDropdown === 'stt' ? availableModels.stt : availableModels.llm).map((id) => {
                    const isSelected = (openModelDropdown === 'stt' ? draftSttModel : draftLlmModel) === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => selectModel(openModelDropdown, id)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors duration-150 cursor-pointer ${isSelected
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-primary hover:bg-surface hover:text-text-primary'
                          }`}
                      >
                        <span className="truncate">{prettyModelName(id)}</span>
                        {isSelected && <IconCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default MainWindow
