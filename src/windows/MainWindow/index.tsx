import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useVoxStore, type AppLocale, type VoxState } from '../../stores/useVoxStore'
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
import onSound from '../../assets/On.mp3'
import offSound from '../../assets/Off.mp3'

const prettyModelName = (id: string): string => {
  const base = id.split('/').pop() || id
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const MainWindow: React.FC = () => {
  const { t, localeTag } = useI18n()
  const {
    activeTab,
    setActiveTab,
    isRecording,
    setIsRecording,
    lastTranscript,
    setLastTranscript,
    apiKey,
    setApiKey,
    sttModel,
    setSttModel,
    llmModel,
    setLlmModel,
    shortcutToggle,
    setShortcutToggle,
    shortcutPushToTalk,
    setShortcutPushToTalk,
    wakeWordEnabled,
    setWakeWordEnabled,
    wakeWordSensitivity,
    setWakeWordSensitivity,
    language,
    setLanguage,
    autoStartEnabled,
    setAutoStartEnabled,
    updateSettings
  } = useVoxStore()

  const [partialTranscript, setPartialTranscript] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Local drafts for Settings modal (so Cancel reverts changes)
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [draftShortcutToggle, setDraftShortcutToggle] = useState(shortcutToggle)
  const [draftShortcutPushToTalk, setDraftShortcutPushToTalk] = useState(shortcutPushToTalk)
  const [draftWakeWordEnabled, setDraftWakeWordEnabled] = useState(wakeWordEnabled)
  const [draftWakeWordSensitivity, setDraftWakeWordSensitivity] = useState(wakeWordSensitivity)
  const [draftLanguage, setDraftLanguage] = useState<AppLocale>(language)
  const [draftAutoStartEnabled, setDraftAutoStartEnabled] = useState(autoStartEnabled)
  const [draftSttModel, setDraftSttModel] = useState(sttModel)
  const [draftLlmModel, setDraftLlmModel] = useState(llmModel)

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



  React.useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'pt-BR'
  }, [language])

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


  const handleOpenSettings = () => {
    setDraftApiKey(apiKey)
    setDraftShortcutToggle(shortcutToggle)
    setDraftShortcutPushToTalk(shortcutPushToTalk)
    setDraftWakeWordEnabled(wakeWordEnabled)
    setDraftWakeWordSensitivity(wakeWordSensitivity)
    setDraftLanguage(language)
    setDraftAutoStartEnabled(autoStartEnabled)
    setDraftSttModel(sttModel)
    setDraftLlmModel(llmModel)
    setIsSettingsOpen(true)
  }

  const loadModels = React.useCallback(async () => {
    if (!window.vox?.listModels) return
    setModelsLoading(true)
    setModelsError(null)
    try {
      const res = await window.vox.listModels()
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
  }, [t])

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

  const handleSaveSettings = () => {
    const trimmedKey = draftApiKey.trim()
    updateSettings({
      apiKey: trimmedKey,
      sttModel: draftSttModel,
      llmModel: draftLlmModel,
      shortcutToggle: draftShortcutToggle,
      shortcutPushToTalk: draftShortcutPushToTalk,
      wakeWordEnabled: draftWakeWordEnabled,
      wakeWordSensitivity: draftWakeWordSensitivity,
      language: draftLanguage,
      autoStartEnabled: draftAutoStartEnabled
    })
    setIsSettingsOpen(false)

    if (window.vox?.saveSettings) {
      window.vox.saveSettings({
        apiKey: trimmedKey,
        sttModel: draftSttModel,
        llmModel: draftLlmModel,
        shortcutToggle: draftShortcutToggle,
        shortcutPushToTalk: draftShortcutPushToTalk,
        wakeWordEnabled: String(draftWakeWordEnabled),
        wakeWordSensitivity: String(draftWakeWordSensitivity),
        language: draftLanguage,
        autoStartEnabled: String(draftAutoStartEnabled)
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
        if (saved.sttModel) settingsToUpdate.sttModel = saved.sttModel
        if (saved.llmModel) settingsToUpdate.llmModel = saved.llmModel
        if (saved.shortcutToggle) settingsToUpdate.shortcutToggle = saved.shortcutToggle
        if (saved.shortcutPushToTalk) settingsToUpdate.shortcutPushToTalk = saved.shortcutPushToTalk
        if (saved.wakeWordEnabled !== undefined) settingsToUpdate.wakeWordEnabled = saved.wakeWordEnabled === 'true'
        if (saved.wakeWordSensitivity) settingsToUpdate.wakeWordSensitivity = parseFloat(saved.wakeWordSensitivity)
        if (saved.autoStartEnabled !== undefined) {
          const hasAutoStart = saved.autoStartEnabled === 'true'
          settingsToUpdate.autoStartEnabled = hasAutoStart
          setDraftAutoStartEnabled(hasAutoStart)
        }

        let initialLang: AppLocale = 'pt-BR'
        const systemLang = (navigator.language || '').toLowerCase()
        const isSystemEn = systemLang.startsWith('en')

        if (isSystemEn) {
          initialLang = 'en'
        } else if (saved.language === 'en' || saved.language === 'pt-BR') {
          initialLang = saved.language
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
        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
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
  }, [setIsRecording])

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
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
  }, [stopWakeWordCapture])

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
      if (e.key === 'F10') {
        if (e.repeat) return
        e.preventDefault()
        handleToggleRecording()
      } else if (e.key === 'F9') {
        e.preventDefault()
        if (!e.repeat) {
          setIsRecording(true)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
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

    const sfxCtx = new AudioContext()
    const sfxGain = sfxCtx.createGain()
    sfxGain.gain.value = 2.0
    sfxGain.connect(sfxCtx.destination)

    const playSound = (url: string) => {
      const audio = new Audio(url)
      const src = sfxCtx.createMediaElementSource(audio)
      src.connect(sfxGain)
      audio.play().catch(console.error)
    }

    let unsubscribeDockShow: (() => void) | undefined
    if (window.vox?.onDockShow) {
      unsubscribeDockShow = window.vox.onDockShow(() => playSound(onSound))
    }

    let unsubscribeDockHide: (() => void) | undefined
    if (window.vox?.onDockHide) {
      unsubscribeDockHide = window.vox.onDockHide(() => playSound(offSound))
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      unsubscribeToggle?.()
      unsubscribeTranscript?.()
      unsubscribePartial?.()
      unsubscribeDockShow?.()
      unsubscribeDockHide?.()
    }
  }, [setIsRecording, setLastTranscript, isRecording])



  const handleCopyTranscript = () => {
    if (lastTranscript) {
      navigator.clipboard.writeText(lastTranscript)
      setIsCopied(true)
    }
  }

  return (
    <div className="flex h-screen w-screen bg-background text-text-primary overflow-hidden font-sans select-none">
      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        <Beams beamWidth={2} beamHeight={15} beamNumber={12} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={0}>


          <div className="flex items-start justify-center px-4 sm:px-6 pt-10 pb-24">
            <div className="w-full max-w-3xl space-y-5">

              {/* Main action card */}
              <AnimatedContent key={`type-card-1-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.05} ease="power3.out">
                <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-8 flex flex-col items-center text-center">
                  {/* Mic button */}
                  <button
                    onClick={handleToggleRecording}
                    className={`mx-auto flex items-center justify-center transition-transform duration-450 ease-spring cursor-pointer focus:outline-none ${isRecording ? 'scale-110' : 'hover:scale-105 active:scale-95'
                      }`}
                  >
                    <img
                      src={logoImg}
                      alt="Vox"
                      className={`w-28 h-28 object-contain transition-all duration-500 ease-smooth filter ${isRecording
                        ? 'drop-shadow-[0_0_28px_rgba(255,255,255,0.75)]'
                        : 'drop-shadow-[0_0_14px_rgba(255,255,255,0.25)] hover:drop-shadow-[0_0_24px_rgba(255,255,255,0.55)]'
                        }`}
                    />
                  </button>

                  <p className="mt-4 text-lg font-semibold font-heading tracking-tight text-text-primary">
                    {isRecording ? t('type.speakNow') : t('type.start')}
                  </p>

                  <div className="mt-5 mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">"Vox"</kbd>
                      <span className="text-xs text-text-secondary font-medium">{t('type.voiceCommand')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">F10</kbd>
                      <span className="text-xs text-text-secondary font-medium">{t('type.toggle')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">F9</kbd>
                      <span className="text-xs text-text-secondary font-medium">{t('type.pushToTalk')}</span>
                    </div>
                  </div>

                  <Badge variant={isRecording ? 'accent' : 'neutral'}>
                    {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />}
                    {isRecording ? t('type.recording') : t('type.waiting')}
                  </Badge>
                </LiquidGlassCard>
              </AnimatedContent>

              {/* Transcript output */}
              <AnimatedContent key={`type-card-2-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.15} ease="power3.out">
                <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6">
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 mb-4">
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
                  <div className="p-4 bg-background/60 border border-border/50 rounded-xl text-sm leading-relaxed text-text-primary min-h-[96px] break-words">
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

              {/* Histórico de Ditado */}
              <AnimatedContent key={`type-history-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.25} ease="power3.out">
                <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6">
                  <button
                    type="button"
                    onClick={() => setIsDictationHistoryOpen(!isDictationHistoryOpen)}
                    className="w-full flex items-center justify-between text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide cursor-pointer hover:text-text-primary transition-colors duration-250 ease-smooth"
                  >
                    <span>{t('type.history')} ({dictationHistory.length})</span>
                    <IconChevronDown
                      className={`w-4 h-4 text-text-muted transition-transform duration-300 ease-smooth ${isDictationHistoryOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isDictationHistoryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-border/40">
                          {dictationHistory.length === 0 ? (
                            <p className="text-xs text-text-disabled text-center py-4">{t('type.historyEmpty')}</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[96px] overflow-y-auto pr-1 custom-scrollbar">
                              {dictationHistory.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => setLastTranscript(item.text)}
                                  className="p-3.5 bg-background/50 border border-border/50 rounded-xl hover:border-accent/40 hover:bg-background/70 transition-[border-color,background-color] duration-250 ease-smooth cursor-pointer flex items-center justify-between gap-3 group"
                                >
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="text-xs text-text-primary line-clamp-2 text-left leading-relaxed">{item.text}</p>
                                    <span className="text-[10px] text-text-muted block mt-1.5 text-left tnum">
                                      {new Date(item.createdAt).toLocaleString(localeTag)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigator.clipboard.writeText(item.text)
                                      }}
                                      className="p-1.5 bg-surface border border-border/70 text-text-secondary rounded-lg hover:text-text-primary hover:border-accent/50 transition-colors duration-200 ease-smooth cursor-pointer"
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
                                      className="p-1.5 bg-surface border border-border/70 text-text-secondary rounded-lg hover:text-text-primary hover:border-accent/50 transition-colors duration-200 ease-smooth cursor-pointer"
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </LiquidGlassCard>
              </AnimatedContent>
            </div>

          </div>
        </Beams>
      </main>

      {/* Bottom-left circular config button */}
      <div className="fixed bottom-6 left-6 z-30">
        <SpecularButton
          size="sm"
          radius={9999}
          onClick={handleOpenSettings}
          className="!w-9 !h-9 !p-0 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
        >
          <img
            src={configImg}
            alt={t('common.settings')}
            className="w-4 h-4 object-contain opacity-80 group-hover:opacity-100 transition-opacity filter drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]"
          />
        </SpecularButton>
      </div>



      {/* Settings Modal (LiquidGlassCard aesthetic) */}
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
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl"
            >
              <LiquidGlassCard glowIntensity="md" blurIntensity="lg" className="p-6 sm:p-7 flex flex-col gap-10 border border-border/80 shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
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

                {/* Form Fields */}
                <div className="space-y-5">
                  {/* API Key */}
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

                  {/* Models (Seleção de modelos ativos) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                        {t('settings.sttModel')}
                      </label>
                      <button
                        type="button"
                        onClick={(e) => toggleModelDropdown('stt', e)}
                        className="w-full flex items-center justify-between gap-2 p-2.5 bg-background/60 border border-border/50 rounded-xl text-xs font-medium text-text-primary hover:border-border hover:bg-background/80 transition-all duration-250 cursor-pointer"
                      >
                        <span className="truncate">{prettyModelName(draftSttModel)}</span>
                        <IconChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-250 ${openModelDropdown === 'stt' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                        {t('settings.llmModel')}
                      </label>
                      <button
                        type="button"
                        onClick={(e) => toggleModelDropdown('llm', e)}
                        className="w-full flex items-center justify-between gap-2 p-2.5 bg-background/60 border border-border/50 rounded-xl text-xs font-medium text-text-primary hover:border-border hover:bg-background/80 transition-all duration-250 cursor-pointer"
                      >
                        <span className="truncate">{prettyModelName(draftLlmModel)}</span>
                        <IconChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-250 ${openModelDropdown === 'llm' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Shortcuts */}
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
                  </div>


                  {/* Language */}
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                      {t('settings.language')}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { id: 'en' as const, label: t('settings.langEn') },
                        { id: 'pt-BR' as const, label: t('settings.langPt') }
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

                  {/* Auto Start (Iniciar com o sistema) */}
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

                  {/* Wake Word (Comando de Voz Offline) */}

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
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-5 border-t border-border/40">
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/50 hover:border-border rounded-xl transition-all duration-250 cursor-pointer"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                    {t('settings.clearHistory')}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer"
                    >
                      {t('settings.cancel')}
                    </button>
                    <SpecularButton
                      size="sm"
                      radius={12}
                      onClick={handleSaveSettings}
                      className="!px-6"
                    >
                      {t('settings.save')}
                    </SpecularButton>
                  </div>
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
            <LiquidGlassCard className="w-full max-w-md p-6 space-y-5 border border-border/60 shadow-2xl text-left">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold font-heading tracking-tight text-text-primary">
                  {t('settings.clearHistory')}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('settings.clearConfirm')}
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
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
