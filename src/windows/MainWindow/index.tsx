import React, { useState } from 'react'
import { useVoxStore } from '../../stores/useVoxStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Badge,
  ProgressBar,
  Beams,
  SpotlightNavbar,
  LiquidGlassCard,
  SpecularButton,
  AnimatedContent,
  SmoothInput,
  ShortcutInput,
  IconCheck,
  IconClock,
  IconDownload,
  IconMic,
  IconFile,
  IconFolder,
  IconGlobe,
  IconFilm,
  IconUpload,
  IconTrash,
  IconChevronDown,
  IconAlert,
  IconX,
  IconCopy,
  IconShield,
  IconTerminal,
  IconGear
} from '../../components'
import logoImg from '../../assets/logo.png'
import configImg from '../../assets/config.png'

export const MainWindow: React.FC = () => {
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
    browserCookies,
    setBrowserCookies,
    wakeWordEnabled,
    setWakeWordEnabled,
    wakeWordSensitivity,
    setWakeWordSensitivity
  } = useVoxStore()

  const [urlInput, setUrlInput] = useState('')
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['srt', 'txt', 'md'])
  const [transcribeProgress, setTranscribeProgress] = useState<number | null>(null)
  const [transcribeStatus, setTranscribeStatus] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showApiKeySetup, setShowApiKeySetup] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [setupApiKey, setSetupApiKey] = useState('')
  const [setupError, setSetupError] = useState('')

  // Local drafts for Settings modal (so Cancel reverts changes)
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [draftShortcutToggle, setDraftShortcutToggle] = useState(shortcutToggle)
  const [draftShortcutPushToTalk, setDraftShortcutPushToTalk] = useState(shortcutPushToTalk)
  const [draftBrowserCookies, setDraftBrowserCookies] = useState(browserCookies)
  const [draftWakeWordEnabled, setDraftWakeWordEnabled] = useState(wakeWordEnabled)
  const [draftWakeWordSensitivity, setDraftWakeWordSensitivity] = useState(wakeWordSensitivity)

  const [wakeWordModelMissing, setWakeWordModelMissing] = useState(false)
  const [wakeWordError, setWakeWordError] = useState<string | null>(null)
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false)
  const [showXdotoolModal, setShowXdotoolModal] = useState(false)
  const [xdotoolData, setXdotoolData] = useState<{ isWayland?: boolean } | null>(null)

  const [dictationHistory, setDictationHistory] = useState<any[]>([])
  const [mediaHistory, setMediaHistory] = useState<any[]>([])
  const [isDictationHistoryOpen, setIsDictationHistoryOpen] = useState(true)
  const [isMediaHistoryOpen, setIsMediaHistoryOpen] = useState(true)

  const fetchHistory = React.useCallback(async () => {
    if (window.vox?.listSessions) {
      try {
        const dictations = await window.vox.listSessions(10, 'dictation')
        setDictationHistory(dictations || [])
        const medias = await window.vox.listSessions(10, 'media')
        setMediaHistory(medias || [])
      } catch (err) {
        console.error('Erro ao carregar histórico de sessões:', err)
      }
    }
  }, [])

  const handleClearHistory = async () => {
    if (window.confirm('Tem certeza que deseja apagar todo o histórico de transcrições e ditados?')) {
      if (window.vox?.clearAllSessions) {
        await window.vox.clearAllSessions()
        fetchHistory()
      }
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (window.vox?.deleteSession) {
      await window.vox.deleteSession(id)
      fetchHistory()
    }
  }

  const handleReExport = (session: any) => {
    setTranscriptionResult({
      text: session.text,
      rawText: session.rawText,
      segments: session.segments || []
    })
    setMediaStep('export')
  }

  const handleOpenSettings = () => {
    setDraftApiKey(apiKey)
    setDraftShortcutToggle(shortcutToggle)
    setDraftShortcutPushToTalk(shortcutPushToTalk)
    setDraftBrowserCookies(browserCookies)
    setDraftWakeWordEnabled(wakeWordEnabled)
    setDraftWakeWordSensitivity(wakeWordSensitivity)
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = () => {
    const trimmedKey = draftApiKey.trim()
    if (!trimmedKey) {
      return
    }

    setApiKey(trimmedKey)
    setShortcutToggle(draftShortcutToggle)
    setShortcutPushToTalk(draftShortcutPushToTalk)
    setBrowserCookies(draftBrowserCookies)
    setWakeWordEnabled(draftWakeWordEnabled)
    setWakeWordSensitivity(draftWakeWordSensitivity)
    setIsSettingsOpen(false)
    setShowApiKeySetup(false)

    if (window.vox?.saveSettings) {
      window.vox.saveSettings({
        apiKey: trimmedKey,
        sttModel,
        llmModel,
        shortcutToggle: draftShortcutToggle,
        shortcutPushToTalk: draftShortcutPushToTalk,
        browserCookies: draftBrowserCookies,
        wakeWordEnabled: String(draftWakeWordEnabled),
        wakeWordSensitivity: String(draftWakeWordSensitivity)
      }).catch(console.error)
    }

    if (window.vox?.setWakeWordEnabled) {
      window.vox.setWakeWordEnabled(draftWakeWordEnabled).catch(console.error)
    }

    if (window.vox?.setWakeWordSensitivity) {
      window.vox.setWakeWordSensitivity(draftWakeWordSensitivity).catch(console.error)
    }
  }

  const handleSaveApiKeySetup = () => {
    const trimmedKey = setupApiKey.trim()
    if (!trimmedKey) {
      setSetupError('Informe sua chave de API para continuar.')
      return
    }

    setSetupError('')
    setApiKey(trimmedKey)
    setDraftApiKey(trimmedKey)
    setShowApiKeySetup(false)

    if (window.vox?.saveSettings) {
      window.vox.saveSettings({
        apiKey: trimmedKey,
        sttModel,
        llmModel,
        shortcutToggle,
        shortcutPushToTalk,
        browserCookies,
        wakeWordEnabled: String(wakeWordEnabled),
        wakeWordSensitivity: String(wakeWordSensitivity)
      }).catch(console.error)
    }
  }

  React.useEffect(() => {
    if (window.vox?.getSettings) {
      window.vox.getSettings().then((saved: Record<string, string>) => {
        if (saved && typeof saved === 'object') {
          if (saved.apiKey) setApiKey(saved.apiKey)
          if (saved.sttModel) setSttModel(saved.sttModel)
          if (saved.llmModel) setLlmModel(saved.llmModel)
          if (saved.shortcutToggle) setShortcutToggle(saved.shortcutToggle)
          if (saved.shortcutPushToTalk) setShortcutPushToTalk(saved.shortcutPushToTalk)
          if (saved.browserCookies) setBrowserCookies(saved.browserCookies as any)
          if (saved.wakeWordEnabled !== undefined) setWakeWordEnabled(saved.wakeWordEnabled === 'true')
          if (saved.wakeWordSensitivity) setWakeWordSensitivity(parseFloat(saved.wakeWordSensitivity))

          if (!saved.apiKey?.trim()) {
            setShowApiKeySetup(true)
          }
        } else {
          setShowApiKeySetup(true)
        }
        setSettingsLoaded(true)
      }).catch(() => {
        setShowApiKeySetup(true)
        setSettingsLoaded(true)
      })
    } else {
      setShowApiKeySetup(true)
      setSettingsLoaded(true)
    }

    fetchHistory()

    const unsubMissing = window.vox?.onWakeWordModelMissing?.(() => {
      setWakeWordModelMissing(true)
    })

    const unsubError = window.vox?.onWakeWordError?.((data) => {
      setWakeWordError(data?.error || 'Erro no microfone de segundo plano')
    })

    const unsubAccess = window.vox?.onAccessibilityRequired?.(() => {
      setShowAccessibilityModal(true)
    })

    const unsubXdo = window.vox?.onXdotoolMissing?.((data) => {
      setXdotoolData(data)
      setShowXdotoolModal(true)
    })

    return () => {
      unsubMissing?.()
      unsubError?.()
      unsubAccess?.()
      unsubXdo?.()
    }
  }, [setApiKey, setSttModel, setLlmModel, setShortcutToggle, setShortcutPushToTalk, setBrowserCookies, setWakeWordEnabled, setWakeWordSensitivity])

  // Vox Media State Machine
  type MediaStep = 'input' | 'preview' | 'progress' | 'export' | 'post_export'
  const [mediaStep, setMediaStep] = useState<MediaStep>('input')
  const [videoInfo, setVideoInfo] = useState<{ title: string; duration: number; thumbnail: string; platform: string } | null>(null)
  const [localFileInfo, setLocalFileInfo] = useState<{ name: string; size: string; path: string } | null>(null)
  const [isFetchingInfo, setIsFetchingInfo] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [mediaProgress, setMediaProgress] = useState<{ phase: string; percent: number; speed?: string; eta?: string }>({
    phase: 'Baixando áudio',
    percent: 0
  })
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null)
  const [mediaAudioPath, setMediaAudioPath] = useState<string | null>(null)
  const [exportFolderPath, setExportFolderPath] = useState<string>('')
  const [includeTimestamps, setIncludeTimestamps] = useState<boolean>(true)
  const [exportedFiles, setExportedFiles] = useState<string[]>([])
  const [audioDeleted, setAudioDeleted] = useState<boolean>(false)
  const [mediaError, setMediaError] = useState<string | null>(null)

  const formatMMSS = (totalSeconds: number) => {
    if (!totalSeconds || isNaN(totalSeconds)) return '00:00'
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const handleFetchVideoInfo = async () => {
    if (!urlInput.trim()) return
    setIsFetchingInfo(true)
    setMediaError(null)
    try {
      const info = await window.vox?.getVideoInfo(urlInput, browserCookies)
      setVideoInfo(info || { title: 'Vídeo Sem Título', duration: 0, thumbnail: '', platform: 'unknown' })
      setMediaStep('preview')
    } catch (err: any) {
      console.error('Erro ao obter vídeo:', err)
      setMediaError(err?.message || 'Não foi possível obter informações do vídeo.')
    } finally {
      setIsFetchingInfo(false)
    }
  }

  const handleStartTranscription = async (payload: { url?: string; filePath?: string }) => {
    setMediaStep('progress')
    setMediaError(null)
    setMediaProgress({ phase: payload.url ? 'Baixando áudio' : 'Extraindo áudio', percent: 5 })

    const removeProgressListener = window.vox?.onMediaProgress?.((data) => {
      setMediaProgress(data)
    })

    try {
      const res = await window.vox?.startMediaTranscription({
        url: payload.url,
        filePath: payload.filePath,
        cookiesFromBrowser: browserCookies
      })

      if (res?.error) {
        setMediaError(res.error)
        return
      }

      if (res && res.result) {
        setMediaAudioPath(res.audioPath)
        setTranscriptionResult(res.result)
        setMediaStep('export')
      } else {
        setMediaError('Falha ao obter o resultado da transcrição.')
      }
    } catch (err: any) {
      console.error('Erro na transcrição de mídia:', err)
      setMediaError(err?.message || 'Erro inesperado na transcrição.')
    } finally {
      removeProgressListener?.()
    }
  }

  const handleCancelTranscription = async () => {
    await window.vox?.cancelMediaTranscription()
    handleResetMedia()
  }

  const handleSelectExportFolder = async () => {
    const folder = await window.vox?.selectExportFolder()
    if (folder) {
      setExportFolderPath(folder)
    }
  }

  const handleExecuteExport = async () => {
    if (!transcriptionResult || selectedFormats.length === 0) return
    setMediaError(null)
    const targetFolder = exportFolderPath || 'Downloads'
    try {
      const res = await window.vox?.exportTranscription({
        result: transcriptionResult,
        formats: selectedFormats,
        outputPath: targetFolder,
        options: {
          includeTimestamps,
          title: videoInfo?.title || localFileInfo?.name || 'transcricao_vox'
        }
      })

      if (res && res.files) {
        setExportedFiles(res.files)
        setMediaStep('post_export')
      } else {
        setMediaError(res?.error || 'Falha ao exportar os arquivos.')
      }
    } catch (err: any) {
      console.error('Erro ao exportar:', err)
      setMediaError(err?.message || 'Erro ao exportar transcrição.')
    }
  }

  const handleKeepAudio = () => {
    setAudioDeleted(false)
  }

  const handleDeleteAudio = async () => {
    if (mediaAudioPath) {
      await window.vox?.deleteAudio(mediaAudioPath)
      setAudioDeleted(true)
    }
  }

  const handleResetMedia = () => {
    setMediaStep('input')
    setUrlInput('')
    setVideoInfo(null)
    setLocalFileInfo(null)
    setTranscriptionResult(null)
    setMediaAudioPath(null)
    setExportedFiles([])
    setAudioDeleted(false)
    setMediaError(null)
    setMediaProgress({ phase: 'Baixando áudio', percent: 0 })
  }

  const allowedExtensions = ['.mp4', '.mp3', '.wav', '.mkv', '.mov', '.avi', '.m4a', '.webm', '.ogg']

  const handleProcessLocalFilePath = (filePath: string, fileName: string, fileSize?: number) => {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      setMediaError('Formato não suportado. Aceitos: .mp4, .mp3, .wav, .mkv, .mov, .avi, .m4a, .webm, .ogg')
      return
    }
    setMediaError(null)
    const formattedSize = fileSize ? formatBytes(fileSize) : 'Arquivo local'
    setLocalFileInfo({ name: fileName, size: formattedSize, path: filePath })
    handleStartTranscription({ filePath })
  }

  const handleSelectFile = async () => {
    if (!window.vox?.selectFile) return
    const filePath = await window.vox.selectFile()
    if (filePath) {
      const fileName = filePath.split(/[/\\]/).pop() || 'Arquivo Selecionado'
      handleProcessLocalFilePath(filePath, fileName)
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      const filePath = (file as any).path || file.name
      if (filePath) {
        handleProcessLocalFilePath(filePath, file.name, file.size)
      }
      return
    }

    const droppedText = e.dataTransfer.getData('text') || e.dataTransfer.getData('text/plain')
    if (droppedText && droppedText.startsWith('http')) {
      setUrlInput(droppedText.trim())
    }
  }

  const mediaStreamRef = React.useRef<MediaStream | null>(null)
  const audioContextRef = React.useRef<AudioContext | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioChunksRef = React.useRef<Blob[]>([])
  const animFrameRef = React.useRef<number | null>(null)
  const chunkIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

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
      if (window.vox?.startRecording) {
        await window.vox.startRecording()
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
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

      // Transcrição incremental: a cada 3s, envia áudio acumulado para Whisper
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
      }, 3000)
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
  }, [setIsRecording, setLastTranscript, isRecording])

  const toggleFormat = (fmt: string) => {
    setSelectedFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    )
  }



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

          {/* Navbar */}
          <div className="pt-6 flex items-center justify-center sticky top-0 z-20 pointer-events-none">
            <div className="pointer-events-auto">
              <SpotlightNavbar
                activeId={activeTab}
                items={[
                  { label: 'Vox Type', id: 'type' },
                  { label: 'Vox Media', id: 'media' }
                ]}
                onItemClick={(item) => setActiveTab(item.id as 'type' | 'media')}
              />
            </div>
          </div>

          <div className="flex items-start justify-center px-4 sm:px-6 pt-10 pb-24">
            {activeTab === 'type' ? (

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
                      {isRecording ? 'Fale agora...' : 'Iniciar'}
                    </p>

                    <div className="mt-5 mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">"Vox"</kbd>
                        <span className="text-xs text-text-secondary font-medium">Comando por Voz</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">F10</kbd>
                        <span className="text-xs text-text-secondary font-medium">Toggle</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border/80 text-accent text-[11px] font-mono font-semibold rounded-md">F9</kbd>
                        <span className="text-xs text-text-secondary font-medium">Push-to-Talk</span>
                      </div>
                    </div>

                    <Badge variant={isRecording ? 'accent' : 'neutral'}>
                      {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />}
                      {isRecording ? 'Gravando' : 'Aguardando'}
                    </Badge>
                  </LiquidGlassCard>
                </AnimatedContent>

                {/* Transcript output */}
                <AnimatedContent key={`type-card-2-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.15} ease="power3.out">
                  <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6">
                    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 mb-4">
                      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide">Última Transcrição</span>
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
                              Copiado
                            </>
                          ) : (
                            'Copiar'
                          )}
                        </span>
                      </SpecularButton>
                    </div>
                    <div className="p-4 bg-background/60 border border-border/50 rounded-xl text-sm leading-relaxed text-text-primary min-h-[96px] break-words">
                      {isRecording ? (
                        <span className="text-accent animate-pulse">{partialTranscript || 'Gravando áudio...'}</span>
                      ) : isTranscribing ? (
                        <span className="text-accent animate-pulse">Transcrevendo via Whisper Large V3 Turbo...</span>
                      ) : lastTranscript ? (
                        <span>{lastTranscript}</span>
                      ) : (
                        <span className="text-text-disabled">Pressione F10 ou fale "Vox" para iniciar o ditado.</span>
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
                      <span>Histórico de Ditado ({dictationHistory.length})</span>
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
                              <p className="text-xs text-text-disabled text-center py-4">Nenhum ditado gravado ainda.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                {dictationHistory.map((item) => (
                                  <div
                                    key={item.id}
                                    onClick={() => setLastTranscript(item.text)}
                                    className="p-3.5 bg-background/50 border border-border/50 rounded-xl hover:border-accent/40 hover:bg-background/70 transition-[border-color,background-color] duration-250 ease-smooth cursor-pointer flex items-center justify-between gap-3 group"
                                  >
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-xs text-text-primary line-clamp-2 text-left leading-relaxed">{item.text}</p>
                                      <span className="text-[10px] text-text-muted block mt-1.5 text-left tnum">
                                        {new Date(item.createdAt).toLocaleString('pt-BR')}
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
                                        title="Copiar"
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
                                        title="Excluir"
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

            ) : (

              <div className="w-full max-w-3xl space-y-5">
                {/* FASE 1: PREVIEW ANTES DE TRANSCREVER */}
                {mediaStep === 'preview' && videoInfo && (
                  <AnimatedContent key={`media-preview-${activeTab}`} distance={30} direction="vertical" duration={0.8} ease="power3.out">
                    <LiquidGlassCard glowIntensity="md" blurIntensity="md" className="p-6 flex flex-col gap-5 border border-border/60">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-label-wide text-text-secondary">Preview da Mídia</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20 capitalize">
                          {videoInfo.platform === 'unknown' ? (
                            <>
                              <IconGlobe className="w-3 h-3" />
                              Mídia Web
                            </>
                          ) : (
                            videoInfo.platform
                          )}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                        {videoInfo.thumbnail ? (
                          <img
                            src={videoInfo.thumbnail}
                            alt="Thumbnail"
                            className="w-32 h-24 object-cover rounded-xl border border-border/50 shrink-0 shadow-md"
                          />
                        ) : (
                          <div className="w-32 h-24 bg-surface border border-border/50 rounded-xl flex items-center justify-center shrink-0">
                            <IconFilm className="w-7 h-7 text-text-muted" strokeWidth={1.5} />
                          </div>
                        )}

                        <div className="flex flex-col justify-between flex-1 min-w-0 text-center sm:text-left gap-2">
                          <h3 className="text-sm font-semibold font-heading tracking-tight text-text-primary line-clamp-2 leading-snug">
                            {videoInfo.title}
                          </h3>
                          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-text-secondary">
                            <IconClock className="w-3.5 h-3.5 text-text-muted" />
                            <span>Duração:</span>
                            <span className="font-mono text-accent font-semibold tnum">{formatMMSS(videoInfo.duration)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                        <button
                          type="button"
                          onClick={handleResetMedia}
                          className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-250 ease-smooth cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <SpecularButton
                          size="sm"
                          onClick={() => handleStartTranscription({ url: urlInput })}
                          className="!px-6"
                        >
                          Confirmar e Transcrever
                        </SpecularButton>
                      </div>
                    </LiquidGlassCard>
                  </AnimatedContent>
                )}

                {/* FASE 2: PROGRESSO EM TEMPO REAL */}
                {mediaStep === 'progress' && (
                  <AnimatedContent key={`media-progress-${activeTab}`} distance={30} direction="vertical" duration={0.8} ease="power3.out">
                    <LiquidGlassCard glowIntensity="md" blurIntensity="md" className="p-6 flex flex-col gap-5 border border-border/60">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-label-wide text-text-secondary">Processando Mídia</span>
                        <span className="text-xs font-mono font-bold text-accent tnum">{mediaProgress.percent}%</span>
                      </div>

                      {/* 3 Fases Visuais */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all duration-300 ${mediaProgress.percent <= 40
                          ? 'bg-accent/15 border-accent/50 text-accent'
                          : 'bg-surface/60 border-border/40 text-text-secondary'
                          }`}>
                          {mediaProgress.percent <= 40
                            ? <IconDownload className="w-4 h-4" />
                            : <IconCheck className="w-4 h-4" strokeWidth={2.2} />}
                          <span className="text-[11px] font-semibold">Baixando Áudio</span>
                          <span className="text-[10px] font-mono opacity-70 tnum">0–40%</span>
                        </div>

                        <div className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all duration-300 ${mediaProgress.percent > 40 && mediaProgress.percent <= 90
                          ? 'bg-accent/15 border-accent/50 text-accent'
                          : mediaProgress.percent > 90
                            ? 'bg-surface/60 border-border/40 text-text-secondary'
                            : 'bg-surface/30 border-border/30 text-text-disabled'
                          }`}>
                          {mediaProgress.percent > 90
                            ? <IconCheck className="w-4 h-4" strokeWidth={2.2} />
                            : <IconMic className={`w-4 h-4 ${mediaProgress.percent > 40 ? 'animate-pulse' : ''}`} />}
                          <span className="text-[11px] font-semibold">Transcrevendo</span>
                          <span className="text-[10px] font-mono opacity-70 tnum">40–90%</span>
                        </div>

                        <div className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all duration-300 ${mediaProgress.percent > 90
                          ? 'bg-accent/15 border-accent/50 text-accent'
                          : 'bg-surface/30 border-border/30 text-text-disabled'
                          }`}>
                          <IconGear className={`w-4 h-4 ${mediaProgress.percent > 90 ? 'animate-spin [animation-duration:3s]' : ''}`} />
                          <span className="text-[11px] font-semibold">Exportando</span>
                          <span className="text-[10px] font-mono opacity-70 tnum">90–100%</span>
                        </div>
                      </div>

                      <div className="w-full py-1">
                        <ProgressBar
                          progress={mediaProgress.percent}
                          label={mediaProgress.phase}
                          sublabel={mediaProgress.speed ? `${mediaProgress.speed} | ETA: ${mediaProgress.eta}` : undefined}
                        />
                      </div>

                      {mediaError ? (
                        <div className="p-3.5 bg-error/15 border border-error/30 rounded-xl text-xs text-error font-medium text-center space-y-2.5">
                          <p className="flex items-center justify-center gap-1.5">
                            <IconAlert className="w-3.5 h-3.5 shrink-0" />
                            {mediaError}
                          </p>
                          <SpecularButton size="sm" onClick={handleResetMedia} className="!px-4">
                            Tentar Novamente
                          </SpecularButton>
                        </div>
                      ) : (
                        mediaProgress.percent <= 40 && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleCancelTranscription}
                              className="px-4 py-1.5 bg-surface hover:bg-surface-elevated border border-border text-text-secondary hover:text-text-primary text-xs font-semibold rounded-lg transition-colors duration-250 cursor-pointer"
                            >
                              Cancelar Processo
                            </button>
                          </div>
                        )
                      )}
                    </LiquidGlassCard>
                  </AnimatedContent>
                )}

                {/* FASE 3: SELEÇÃO DE FORMATOS ANTES DE EXPORTAR */}
                {mediaStep === 'export' && (
                  <AnimatedContent key={`media-export-${activeTab}`} distance={30} direction="vertical" duration={0.8} ease="power3.out">
                    <LiquidGlassCard glowIntensity="md" blurIntensity="md" className="p-6 flex flex-col gap-5 border border-border/60">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-label-wide text-text-secondary">Opções de Exportação</span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                          <IconCheck className="w-3 h-3" strokeWidth={2.4} />
                          Transcrito
                        </span>
                      </div>

                      {/* Snippet do resultado */}
                      {transcriptionResult?.text && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block">Snippet da Transcrição</span>
                          <div className="p-3.5 bg-background/60 border border-border/50 rounded-xl font-mono text-xs leading-relaxed text-text-secondary max-h-24 overflow-y-auto custom-scrollbar break-words">
                            {transcriptionResult.text.slice(0, 250)}{transcriptionResult.text.length > 250 ? '...' : ''}
                          </div>
                        </div>
                      )}

                      {/* Checkboxes de formatos */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block">Formatos Desejados</span>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {['txt', 'md', 'srt', 'vtt', 'json'].map((fmt) => {
                            const isSelected = selectedFormats.includes(fmt)
                            return (
                              <button
                                key={fmt}
                                type="button"
                                onClick={() => {
                                  setSelectedFormats((prev) =>
                                    isSelected ? prev.filter((f) => f !== fmt) : [...prev, fmt]
                                  )
                                }}
                                className={`py-2 px-2 text-xs font-mono font-semibold rounded-xl border transition-all duration-250 ease-smooth text-center uppercase cursor-pointer ${isSelected
                                  ? 'bg-accent/15 border-accent/60 text-accent'
                                  : 'bg-surface/50 border-border/40 text-text-secondary hover:text-text-primary hover:border-border'
                                  }`}
                              >
                                .{fmt}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Pasta de Destino */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block">Pasta de Destino</span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            readOnly
                            value={exportFolderPath || 'Pasta Padrão (Downloads)'}
                            className="flex-1 min-w-0 bg-background/60 border border-border/60 px-3 py-2 rounded-xl text-xs font-mono text-text-secondary focus:outline-none truncate"
                          />
                          <button
                            type="button"
                            onClick={handleSelectExportFolder}
                            className="px-3.5 py-2 bg-surface hover:bg-surface-elevated border border-border text-xs font-medium text-text-primary rounded-xl transition-colors duration-250 cursor-pointer shrink-0"
                          >
                            Alterar Pasta
                          </button>
                        </div>
                      </div>

                      {/* Toggle Timestamps */}
                      <label className="flex items-center justify-between gap-4 p-3.5 bg-background/40 border border-border/40 rounded-xl cursor-pointer hover:border-border/70 transition-colors duration-250">
                        <div>
                          <span className="text-xs font-semibold text-text-primary block">Incluir Timestamps</span>
                          <span className="text-[11px] text-text-secondary">Formatos TXT e MD receberão marcas de tempo [MM:SS]</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={includeTimestamps}
                          onChange={(e) => setIncludeTimestamps(e.target.checked)}
                          className="vox-checkbox"
                        />
                      </label>

                      {mediaError && (
                        <p className="flex items-center justify-center gap-1.5 text-xs text-error font-medium text-center">
                          <IconAlert className="w-3.5 h-3.5 shrink-0" />
                          {mediaError}
                        </p>
                      )}

                      {/* Ação de Exportar */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                        <button
                          type="button"
                          onClick={handleResetMedia}
                          className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <SpecularButton
                          size="sm"
                          onClick={handleExecuteExport}
                          disabled={selectedFormats.length === 0}
                          className="!px-6"
                        >
                          Exportar Selecionados ({selectedFormats.length})
                        </SpecularButton>
                      </div>
                    </LiquidGlassCard>
                  </AnimatedContent>
                )}

                {/* FASE 4: MODAL PÓS-EXPORTAÇÃO */}
                {mediaStep === 'post_export' && (
                  <AnimatedContent key={`media-post-${activeTab}`} distance={30} direction="vertical" duration={0.8} ease="power3.out">
                    <LiquidGlassCard glowIntensity="md" blurIntensity="md" className="p-6 flex flex-col gap-5 border border-border/60">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-label-wide text-text-secondary">Exportação Concluída</span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                          <IconCheck className="w-3 h-3" strokeWidth={2.4} />
                          Pronto
                        </span>
                      </div>

                      {/* Lista de arquivos exportados */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block">Arquivos Gerados</span>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                          {exportedFiles.map((file, idx) => {
                            const fileName = file.split(/[/\\]/).pop() || file
                            return (
                              <div key={idx} className="flex items-center justify-between gap-3 p-2.5 pl-3.5 bg-background/60 border border-border/40 rounded-xl text-xs font-mono">
                                <span className="flex items-center gap-2 min-w-0 text-text-primary" title={file}>
                                  <IconFile className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                                  <span className="truncate">{fileName}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => window.vox?.openFolder(file)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-surface-elevated text-accent text-[11px] font-sans font-semibold rounded-lg border border-accent/30 transition-colors duration-250 cursor-pointer shrink-0"
                                >
                                  <IconFolder className="w-3 h-3" />
                                  Abrir Pasta
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Opção de Áudio Temporário */}
                      <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl space-y-3">
                        <p className="text-xs text-text-primary font-medium text-center leading-relaxed">
                          O arquivo de áudio temporário foi utilizado no processamento. Deseja mantê-lo ou excluí-lo?
                        </p>

                        {audioDeleted ? (
                          <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center gap-1.5 text-xs text-text-primary font-medium">
                            <IconCheck className="w-3.5 h-3.5" strokeWidth={2.4} />
                            Arquivo de áudio excluído com sucesso.
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                            <button
                              type="button"
                              onClick={handleKeepAudio}
                              className="w-full sm:w-auto px-4 py-2 bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-xs font-semibold rounded-xl transition-colors duration-250 cursor-pointer"
                            >
                              Manter Arquivo de Áudio
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteAudio}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-elevated border border-border text-text-secondary hover:text-text-primary text-xs font-semibold rounded-xl transition-colors duration-250 cursor-pointer"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                              Deletar Arquivo
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Reiniciar */}
                      <div className="flex justify-end pt-4 border-t border-border/40">
                        <SpecularButton
                          size="sm"
                          onClick={handleResetMedia}
                          className="!px-6"
                        >
                          Transcrever Nova Mídia
                        </SpecularButton>
                      </div>
                    </LiquidGlassCard>
                  </AnimatedContent>
                )}

                {/* ESTADO INICIAL / FASE 5: INPUT & DRAG-AND-DROP */}
                {mediaStep === 'input' && (
                  <>
                    <AnimatedContent key={`media-card-1-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.05} ease="power3.out">
                      <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-8 flex flex-col items-center text-center">
                        <img
                          src={logoImg}
                          alt="Vox"
                          className="mx-auto w-24 h-24 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                        />

                        <p className="mt-4 text-base font-semibold font-heading tracking-tight text-text-primary">Transcrição de Mídia</p>
                        <p className="mt-1 mb-6 text-xs text-text-secondary">YouTube · TikTok · Instagram · Arquivos Locais</p>

                        <div className="w-full flex flex-col gap-2.5">
                          <input
                            type="text"
                            placeholder="Cole a URL do vídeo (YouTube, TikTok, Instagram)..."
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && urlInput.trim()) {
                                handleFetchVideoInfo()
                              }
                            }}
                            className="w-full bg-background/60 border border-border/60 px-4 py-2.5 rounded-xl text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent/70 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] transition-[border-color,box-shadow] duration-250 ease-smooth text-center"
                          />

                          <SpecularButton
                            size="sm"
                            className="w-full"
                            onClick={handleFetchVideoInfo}
                            disabled={!urlInput.trim() || isFetchingInfo}
                          >
                            {isFetchingInfo ? 'Obtendo informações...' : 'Baixar e Transcrever'}
                          </SpecularButton>
                        </div>
                      </LiquidGlassCard>
                    </AnimatedContent>

                    <AnimatedContent key={`media-card-2-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.15} ease="power3.out">
                      <div
                        onClick={handleSelectFile}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false) }}
                        onDrop={handleDrop}
                      >
                        <LiquidGlassCard
                          glowIntensity={isDragOver ? 'md' : 'sm'}
                          blurIntensity="sm"
                          className={`p-8 text-center cursor-pointer transition-all duration-300 ease-smooth border border-dashed ${isDragOver
                            ? 'border-accent bg-accent/10 scale-102'
                            : 'border-border/40 hover:border-accent/40'
                            }`}
                        >
                          <div className={`mx-auto mb-3 w-10 h-10 rounded-full border flex items-center justify-center transition-colors duration-300 ${isDragOver ? 'border-accent/50 text-accent' : 'border-border/60 text-text-muted'}`}>
                            <IconUpload className="w-[18px] h-[18px]" />
                          </div>
                          <p className="text-sm font-medium text-text-primary">
                            {isDragOver ? 'Solte o arquivo local aqui!' : 'Clique para escolher ou arraste um arquivo local'}
                          </p>
                          <p className="text-[11px] font-mono text-text-muted mt-1.5">.mp4 .mp3 .wav .mkv .mov .avi .m4a .webm .ogg</p>
                        </LiquidGlassCard>
                      </div>
                    </AnimatedContent>

                    {mediaError && (
                      <div className="p-3.5 bg-error/15 border border-error/30 rounded-xl text-xs text-error font-medium text-center animate-fade-in flex items-center justify-center gap-1.5">
                        <IconAlert className="w-3.5 h-3.5 shrink-0" />
                        {mediaError}
                      </div>
                    )}
                  </>
                )}

                {/* Histórico de Mídias (Transcrições Anteriores) */}
                {mediaStep === 'input' && (
                  <AnimatedContent key={`media-history-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.25} ease="power3.out">
                    <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6">
                      <button
                        type="button"
                        onClick={() => setIsMediaHistoryOpen(!isMediaHistoryOpen)}
                        className="w-full flex items-center justify-between text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide cursor-pointer hover:text-text-primary transition-colors duration-250 ease-smooth"
                      >
                        <span>Transcrições Anteriores ({mediaHistory.length})</span>
                        <IconChevronDown
                          className={`w-4 h-4 text-text-muted transition-transform duration-300 ease-smooth ${isMediaHistoryOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isMediaHistoryOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-border/40">
                              {mediaHistory.length === 0 ? (
                                <p className="text-xs text-text-disabled text-center py-4">Nenhuma transcrição de mídia salva ainda.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                  {mediaHistory.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3.5 bg-background/50 border border-border/50 rounded-xl flex items-center justify-between gap-3 group hover:border-accent/40 hover:bg-background/70 transition-[border-color,background-color] duration-250 ease-smooth text-left"
                                    >
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-semibold text-text-primary line-clamp-1 text-left">{item.title || item.source}</p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-1.5 text-left tnum">
                                          <IconClock className="w-3 h-3 shrink-0" />
                                          <span>{formatMMSS(item.duration || 0)}</span>
                                          <span>·</span>
                                          <span>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSession(item.id)}
                                          className="p-1.5 bg-surface border border-border/70 text-text-secondary rounded-lg hover:text-text-primary hover:border-accent/50 transition-colors duration-200 ease-smooth cursor-pointer opacity-0 group-hover:opacity-100"
                                          title="Excluir"
                                        >
                                          <IconTrash className="w-3.5 h-3.5" />
                                        </button>
                                        <SpecularButton
                                          size="sm"
                                          onClick={() => handleReExport(item)}
                                          className="text-xs"
                                        >
                                          Re-exportar
                                        </SpecularButton>
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
                )}
              </div>
            )}
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
            alt="Configurações"
            className="w-4 h-4 object-contain opacity-80 group-hover:opacity-100 transition-opacity filter drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]"
          />
        </SpecularButton>
      </div>

      {/* First-run API Key setup (blocking) */}
      <AnimatePresence>
        {settingsLoaded && showApiKeySetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md"
            >
              <LiquidGlassCard glowIntensity="md" blurIntensity="lg" className="p-6 sm:p-7 flex flex-col gap-5 border border-border/80 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <IconGear className="w-4 h-4 text-text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold font-heading tracking-tight text-text-primary">
                      Configure sua API Key
                    </h2>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Necessária para transcrição e correção de texto
                    </p>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  Informe a chave do seu provedor (ex.: Groq). Ela será salva localmente no banco de dados e não será solicitada novamente.
                </p>

                <div>
                  <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                    Chave de API
                  </label>
                  <SmoothInput
                    type="password"
                    value={setupApiKey}
                    onChange={(e) => {
                      setSetupApiKey(e.target.value)
                      if (setupError) setSetupError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveApiKeySetup()
                    }}
                    placeholder="gsk_..."
                    autoFocus
                  />
                  {setupError ? (
                    <p className="text-[11px] text-error mt-2 flex items-center gap-1.5">
                      <IconAlert className="w-3.5 h-3.5 shrink-0" />
                      {setupError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                      O provedor deve oferecer Whisper Large V3 Turbo e um modelo de chat compatível.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <SpecularButton
                    size="sm"
                    radius={12}
                    onClick={handleSaveApiKeySetup}
                    className="!px-6"
                  >
                    Salvar e Continuar
                  </SpecularButton>
                </div>
              </LiquidGlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              if (e.target === e.currentTarget && apiKey.trim()) setIsSettingsOpen(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl"
            >
              <LiquidGlassCard glowIntensity="md" blurIntensity="lg" className="p-6 sm:p-7 flex flex-col gap-6 border border-border/80 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <div className="flex items-center gap-2.5">
                    <img src={configImg} alt="" className="w-4 h-4 object-contain opacity-90" />
                    <h2 className="text-base font-semibold font-heading tracking-tight text-text-primary">Configurações</h2>
                  </div>
                  {apiKey.trim() && (
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface transition-colors duration-250 cursor-pointer"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                  {/* API Key */}
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                      Chave de API
                    </label>
                    <SmoothInput
                      type="password"
                      value={draftApiKey}
                      onChange={(e) => setDraftApiKey(e.target.value)}
                      placeholder="gsk_..."
                    />
                    <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                      Salva localmente no banco de dados. O provedor deve oferecer os modelos abaixo.
                    </p>
                  </div>

                  {/* Models (Exibição dos modelos ativos) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                        Modelo STT (Voz)
                      </label>
                      <div className="p-2.5 bg-background/60 border border-border/50 rounded-xl text-xs font-medium text-text-primary">
                        Whisper Large V3 Turbo
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                        Modelo LLM (Corretor)
                      </label>
                      <div className="p-2.5 bg-background/60 border border-border/50 rounded-xl text-xs font-medium text-text-primary">
                        GPT-OSS-20B
                      </div>
                    </div>
                  </div>

                  {/* Shortcuts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                        Atalho Toggle
                      </label>
                      <ShortcutInput
                        value={draftShortcutToggle}
                        onChange={(val) => setDraftShortcutToggle(val)}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                        Atalho Push-to-Talk
                      </label>
                      <ShortcutInput
                        value={draftShortcutPushToTalk}
                        onChange={(val) => setDraftShortcutPushToTalk(val)}
                      />
                    </div>
                  </div>

                  {/* Browser Cookies for yt-dlp */}
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2">
                      Cookies do Navegador (Extração Mídia)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {(['none', 'chrome', 'edge', 'firefox', 'brave'] as const).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setDraftBrowserCookies(b)}
                          className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all duration-250 ease-smooth text-center capitalize cursor-pointer ${draftBrowserCookies === b
                            ? 'bg-accent/15 text-accent border-accent/40 font-semibold'
                            : 'bg-transparent text-text-secondary border-border/50 hover:text-text-primary hover:border-border'
                            }`}
                        >
                          {b === 'none' ? 'Nenhum' : b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wake Word (Comando de Voz Offline) */}
                  <div className="p-4 bg-background/50 border border-border/60 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-text-primary block leading-relaxed">Wake Word (Ativação por Voz)</span>
                        <span className="text-[11px] text-text-secondary leading-relaxed">Acione o Vox falando em segundo plano (openWakeWord ONNX)</span>
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
                        <span>Modelo ONNX (vox.onnx) não encontrado em <span className="font-mono">resources/models/wakeword/</span>. Execute <span className="font-mono">npm run setup:wakeword</span> para baixar.</span>
                      </div>
                    )}

                    {wakeWordError && (
                      <div className="p-2.5 bg-error/15 border border-error/30 rounded-lg text-[11px] text-error font-medium flex items-start gap-1.5 leading-relaxed">
                        <IconAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                        <span>Microfone de segundo plano: {wakeWordError}</span>
                      </div>
                    )}

                    {draftWakeWordEnabled && (
                      <div className="pt-3 border-t border-border/30">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-text-secondary font-medium">Sensibilidade</span>
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
                    Limpar Histórico
                  </button>
                  <div className="flex items-center gap-2">
                    {apiKey.trim() && (
                      <button
                        type="button"
                        onClick={() => setIsSettingsOpen(false)}
                        className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <SpecularButton
                      size="sm"
                      radius={12}
                      onClick={handleSaveSettings}
                      className="!px-6"
                      disabled={!draftApiKey.trim()}
                    >
                      Salvar Configurações
                    </SpecularButton>
                  </div>
                </div>
              </LiquidGlassCard>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Permissão de Acessibilidade no macOS */}
        {showAccessibilityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <LiquidGlassCard className="w-full max-w-md p-6 space-y-4 border border-border/60 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <IconShield className="w-4 h-4 text-text-primary" />
                </div>
                <h3 className="text-sm font-semibold font-heading tracking-tight text-text-primary">Permissão de Acessibilidade Necessária</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                No macOS, o Vox precisa de permissão em <strong className="text-text-primary">Acessibilidade</strong> para injetar texto automaticamente no cursor da aplicação ativa.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccessibilityModal(false)}
                  className="px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer"
                >
                  Entendi
                </button>
                <SpecularButton
                  size="sm"
                  onClick={() => {
                    window.vox?.openAccessibilityPreferences?.()
                    setShowAccessibilityModal(false)
                  }}
                >
                  Abrir Preferências do Sistema
                </SpecularButton>
              </div>
            </LiquidGlassCard>
          </motion.div>
        )}

        {/* Modal de Dependência Ausente no Linux (xdotool / wtype) */}
        {showXdotoolModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <LiquidGlassCard className="w-full max-w-md p-6 space-y-4 border border-border/60 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <IconTerminal className="w-4 h-4 text-text-primary" />
                </div>
                <h3 className="text-sm font-semibold font-heading tracking-tight text-text-primary">
                  {xdotoolData?.isWayland ? 'Utilitário wtype Necessário' : 'Utilitário xdotool Necessário'}
                </h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Para colagem automática no Linux ({xdotoolData?.isWayland ? 'Wayland' : 'X11'}), instale o utilitário {xdotoolData?.isWayland ? 'wtype' : 'xdotool'} no seu sistema:
              </p>
              <div className="p-3 bg-background/80 border border-border/60 rounded-lg font-mono text-[11px] text-accent select-all">
                {xdotoolData?.isWayland ? 'sudo apt install wtype' : 'sudo apt install xdotool'}
                <br />
                <span className="text-text-muted">{xdotoolData?.isWayland ? 'ou sudo pacman -S wtype' : 'ou sudo pacman -S xdotool'}</span>
              </div>
              <p className="text-[11px] text-text-muted">
                O texto foi copiado para a Área de Transferência. Cole manualmente com Ctrl+V.
              </p>
              <div className="flex items-center justify-end pt-2">
                <SpecularButton
                  size="sm"
                  onClick={() => setShowXdotoolModal(false)}
                >
                  Entendi
                </SpecularButton>
              </div>
            </LiquidGlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MainWindow
