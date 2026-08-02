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
  Drawer,
  SmoothInput,
  ShortcutInput
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

  // Local drafts for Settings modal (so Cancel reverts changes)
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [draftShortcutToggle, setDraftShortcutToggle] = useState(shortcutToggle)
  const [draftShortcutPushToTalk, setDraftShortcutPushToTalk] = useState(shortcutPushToTalk)
  const [draftBrowserCookies, setDraftBrowserCookies] = useState(browserCookies)
  const [draftWakeWordEnabled, setDraftWakeWordEnabled] = useState(wakeWordEnabled)
  const [draftWakeWordSensitivity, setDraftWakeWordSensitivity] = useState(wakeWordSensitivity)

  // Vox Media State Machine
  type MediaStep = 'input' | 'preview' | 'progress' | 'export' | 'post_export'
  const [mediaStep, setMediaStep] = useState<MediaStep>('input')
  const [videoInfo, setVideoInfo] = useState<{ title: string; duration: number; thumbnail: string; platform: string } | null>(null)
  const [localFileInfo, setLocalFileInfo] = useState<{ name: string; size: string; path: string } | null>(null)
  const [isFetchingInfo, setIsFetchingInfo] = useState(false)
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
      <main className="flex-1 flex flex-col min-w-0">
        <Beams beamWidth={2} beamHeight={15} beamNumber={12} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={0}>

          {/* Navbar */}
          <div className="pt-5 flex items-center justify-center sticky top-0 z-20 pointer-events-none">
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

          <div className="flex items-start justify-center px-6 py-6">
            {activeTab === 'type' ? (

              <div className="w-full max-w-lg space-y-4">

                {/* Main action card */}
                <AnimatedContent key={`type-card-1-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.05} ease="power3.out">
                  <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6 flex flex-col items-center text-center">
                    {/* Mic button */}
                    <button
                      onClick={handleToggleRecording}
                      className={`mx-auto flex items-center justify-center transition-all cursor-pointer focus:outline-none mb-5 ${isRecording ? 'animate-pulse scale-110' : 'hover:scale-105 active:scale-95'
                        }`}
                    >
                      <img
                        src={logoImg}
                        alt="Vox"
                        className={`w-28 h-28 object-contain transition-all filter ${isRecording
                          ? 'drop-shadow-[0_0_24px_rgba(248,113,113,0.9)]'
                          : 'drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] hover:drop-shadow-[0_0_22px_rgba(255,255,255,0.55)]'
                          }`}
                      />
                    </button>

                    <p className="text-sm font-medium text-text-primary mb-3">
                      {isRecording ? 'Fale agora...' : 'Para Começar'}
                    </p>

                    <div className="flex flex-col items-center gap-1.5 mb-5">
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border text-accent text-xs font-mono rounded font-semibold">"Vox"</kbd>
                        <span className="text-xs text-text-secondary">Comando por Voz</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border text-accent text-xs font-mono rounded">F10</kbd>
                        <span className="text-xs text-text-secondary">Toggle</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 bg-surface border border-border text-accent text-xs font-mono rounded">F9</kbd>
                        <span className="text-xs text-text-secondary">Push-to-Talk</span>
                      </div>
                    </div>

                    <Badge variant={isRecording ? 'error' : 'neutral'}>
                      {isRecording ? '● Gravando' : 'Aguardando'}
                    </Badge>
                  </LiquidGlassCard>
                </AnimatedContent>

                {/* Transcript output */}
                <AnimatedContent key={`type-card-2-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.15} ease="power3.out">
                  <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Última Transcrição</span>
                      <SpecularButton
                        size="sm"
                        onClick={handleCopyTranscript}
                        disabled={!lastTranscript}
                        tint={isCopied ? '#34d399' : '#ffffff'}
                        tintOpacity={isCopied ? 0.2 : 0}
                        className="transition-all duration-300 active:scale-95"
                      >
                        <span className={`inline-flex items-center gap-1.5 transition-all duration-300 ease-out ${isCopied ? 'text-emerald-400 font-medium scale-105' : ''}`}>
                          {isCopied ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-in fade-in zoom-in duration-200 stroke-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Copiado
                            </>
                          ) : (
                            'Copiar'
                          )}
                        </span>
                      </SpecularButton>
                    </div>
                    <div className="p-3 bg-background/60 border border-border/50 rounded-xl font-mono text-sm text-text-primary min-h-[60px] break-words">
                      {isRecording ? (
                        <span className="text-accent animate-pulse">{partialTranscript || 'Gravando áudio...'}</span>
                      ) : isTranscribing ? (
                        <span className="text-accent animate-pulse">Transcrevendo via Whisper Large V3 Turbo...</span>
                      ) : lastTranscript ? (
                        <span>{lastTranscript}</span>
                      ) : (
                        <span className="text-text-disabled">Pressione F10 para falar.</span>
                      )}
                    </div>
                  </LiquidGlassCard>
                </AnimatedContent>
              </div>

            ) : (

              <div className="w-full max-w-lg space-y-4">
                {/* FASE 1: PREVIEW ANTES DE TRANSCREVER */}
                {mediaStep === 'preview' && videoInfo && (
                  <AnimatedContent key={`media-preview-${activeTab}`} distance={30} direction="vertical" duration={0.8} ease="power3.out">
                    <LiquidGlassCard glowIntensity="md" blurIntensity="md" className="p-6 flex flex-col gap-4 border border-border/60">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Preview da Mídia</span>
                        {videoInfo.platform === 'youtube' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                            YouTube
                          </span>
                        )}
                        {videoInfo.platform === 'tiktok' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                            TikTok
                          </span>
                        )}
                        {videoInfo.platform === 'instagram' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                            Instagram
                          </span>
                        )}
                        {videoInfo.platform === 'unknown' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-accent/20 text-accent border border-accent/30 flex items-center gap-1">
                            🌐 Mídia Web
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                        {videoInfo.thumbnail ? (
                          <img
                            src={videoInfo.thumbnail}
                            alt="Thumbnail"
                            className="w-32 h-24 object-cover rounded-xl border border-border/50 shrink-0 shadow-md"
                          />
                        ) : (
                          <div className="w-32 h-24 bg-surface border border-border/50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                            🎬
                          </div>
                        )}

                        <div className="flex flex-col justify-between flex-1 min-w-0 text-center sm:text-left gap-2">
                          <h3 className="text-sm font-semibold text-text-primary line-clamp-2 leading-tight">
                            {videoInfo.title}
                          </h3>
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-text-secondary">
                            <span>⏱ Duração:</span>
                            <span className="font-mono text-accent font-semibold">{formatMMSS(videoInfo.duration)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 mt-1">
                        <button
                          type="button"
                          onClick={handleResetMedia}
                          className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Processando Mídia</span>
                        <span className="text-xs font-mono font-bold text-accent">{mediaProgress.percent}%</span>
                      </div>

                      {/* 3 Fases Visuais */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          mediaProgress.percent <= 40
                            ? 'bg-accent/15 border-accent/50 text-accent'
                            : 'bg-surface/60 border-border/40 text-text-secondary'
                        }`}>
                          <span className="text-base">{mediaProgress.percent <= 40 ? '📥' : '✓'}</span>
                          <span className="text-[11px] font-semibold">Baixando Áudio</span>
                          <span className="text-[10px] font-mono opacity-80">0–40%</span>
                        </div>

                        <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          mediaProgress.percent > 40 && mediaProgress.percent <= 90
                            ? 'bg-accent/15 border-accent/50 text-accent animate-pulse'
                            : mediaProgress.percent > 90
                            ? 'bg-surface/60 border-border/40 text-text-secondary'
                            : 'bg-surface/30 border-border/30 text-text-disabled'
                        }`}>
                          <span className="text-base">{mediaProgress.percent > 40 && mediaProgress.percent <= 90 ? '🎙️' : mediaProgress.percent > 90 ? '✓' : '⏳'}</span>
                          <span className="text-[11px] font-semibold">Transcrevendo</span>
                          <span className="text-[10px] font-mono opacity-80">40–90%</span>
                        </div>

                        <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          mediaProgress.percent > 90
                            ? 'bg-accent/15 border-accent/50 text-accent animate-pulse'
                            : 'bg-surface/30 border-border/30 text-text-disabled'
                        }`}>
                          <span className="text-base">{mediaProgress.percent > 90 ? '⚙️' : '⏳'}</span>
                          <span className="text-[11px] font-semibold">Exportando</span>
                          <span className="text-[10px] font-mono opacity-80">90–100%</span>
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
                        <div className="p-3 bg-error/15 border border-error/30 rounded-xl text-xs text-error font-medium text-center space-y-2">
                          <p>{mediaError}</p>
                          <SpecularButton size="sm" onClick={handleResetMedia} className="!px-4">
                            Tentar Novamente
                          </SpecularButton>
                        </div>
                      ) : (
                        mediaProgress.percent <= 40 && (
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={handleCancelTranscription}
                              className="px-4 py-1.5 bg-error/20 hover:bg-error/30 text-error text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Opções de Exportação</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ Transcrito
                        </span>
                      </div>

                      {/* Snippet do resultado */}
                      {transcriptionResult?.text && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest block">Snippet da Transcrição</span>
                          <div className="p-3 bg-background/60 border border-border/50 rounded-xl font-mono text-xs text-text-primary max-h-24 overflow-y-auto custom-scrollbar break-words">
                            {transcriptionResult.text.slice(0, 250)}{transcriptionResult.text.length > 250 ? '...' : ''}
                          </div>
                        </div>
                      )}

                      {/* Checkboxes de formatos */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest block">Formatos Desejados</span>
                        <div className="grid grid-cols-5 gap-2">
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
                                className={`py-2 px-2 text-xs font-mono font-semibold rounded-xl border transition-all text-center uppercase cursor-pointer ${
                                  isSelected
                                    ? 'bg-accent/20 border-accent text-accent shadow-[0_0_10px_rgba(255,255,255,0.15)]'
                                    : 'bg-surface/50 border-border/40 text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                .{fmt}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Pasta de Destino */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest block">Pasta de Destino</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={exportFolderPath || 'Pasta Padrão (Downloads)'}
                            className="flex-1 bg-background/60 border border-border/60 px-3 py-2 rounded-xl text-xs font-mono text-text-secondary focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSelectExportFolder}
                            className="px-3.5 py-2 bg-surface hover:bg-surface-elevated border border-border text-xs font-medium text-text-primary rounded-xl transition-colors cursor-pointer shrink-0"
                          >
                            Alterar Pasta
                          </button>
                        </div>
                      </div>

                      {/* Toggle Timestamps */}
                      <div className="flex items-center justify-between p-3 bg-background/40 border border-border/40 rounded-xl">
                        <div>
                          <span className="text-xs font-semibold text-text-primary block">Incluir Timestamps</span>
                          <span className="text-[11px] text-text-secondary">Formatos TXT e MD receberão marcas de tempo [MM:SS]</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={includeTimestamps}
                          onChange={(e) => setIncludeTimestamps(e.target.checked)}
                          className="w-4 h-4 accent-accent cursor-pointer"
                        />
                      </div>

                      {mediaError && (
                        <p className="text-xs text-error font-medium text-center">{mediaError}</p>
                      )}

                      {/* Ação de Exportar */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                        <button
                          type="button"
                          onClick={handleResetMedia}
                          className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Exportação Concluída</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ Pronto
                        </span>
                      </div>

                      {/* Lista de arquivos exportados */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest block">Arquivos Gerados</span>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {exportedFiles.map((file, idx) => {
                            const fileName = file.split(/[/\\]/).pop() || file
                            return (
                              <div key={idx} className="flex items-center justify-between p-2.5 bg-background/60 border border-border/40 rounded-xl text-xs font-mono">
                                <span className="text-text-primary truncate max-w-[280px]" title={file}>📄 {fileName}</span>
                                <button
                                  type="button"
                                  onClick={() => window.vox?.openFolder(file)}
                                  className="px-2.5 py-1 bg-surface hover:bg-surface-elevated text-accent text-[11px] font-sans font-semibold rounded-lg border border-accent/30 transition-colors cursor-pointer shrink-0"
                                >
                                  Abrir Pasta
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Opção de Áudio Temporário */}
                      <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl space-y-3">
                        <p className="text-xs text-text-primary font-medium text-center">
                          O arquivo de áudio temporário foi utilizado no processamento. Deseja mantê-lo ou excluí-lo?
                        </p>

                        {audioDeleted ? (
                          <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-center text-xs text-emerald-400 font-semibold">
                            ✓ Arquivo de áudio excluído com sucesso.
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={handleKeepAudio}
                              className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                              Manter Arquivo de Áudio
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteAudio}
                              className="px-4 py-2 bg-error/20 hover:bg-error/30 text-error text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                              Deletar Arquivo de Áudio
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Reiniciar */}
                      <div className="flex justify-end pt-2 border-t border-border/40">
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
                      <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6 flex flex-col items-center text-center">
                        <img
                          src={logoImg}
                          alt="Vox"
                          className="mx-auto w-28 h-28 object-contain mb-4 drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                        />

                        <p className="text-sm font-medium text-text-primary mb-1">Transcrição de Mídia</p>
                        <p className="text-xs text-text-secondary mb-5">YouTube · TikTok · Instagram · Arquivos Locais</p>

                        <div className="w-full flex flex-col gap-2">
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
                            className="w-full bg-background/60 border border-border/60 px-3.5 py-2.5 rounded-xl text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors text-center"
                          />

                          <SpecularButton
                            size="sm"
                            className="w-full mt-1"
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
                          className={`p-8 text-center cursor-pointer transition-all border border-dashed ${isDragOver
                            ? 'border-accent bg-accent/10 scale-102'
                            : 'border-border/40 hover:border-accent/40'
                            }`}
                        >
                          <div className="text-3xl mb-2">📁</div>
                          <p className="text-sm font-medium text-text-primary">
                            {isDragOver ? 'Solte o arquivo local aqui!' : 'Clique para escolher ou arraste um arquivo local'}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">.mp4 .mp3 .wav .mkv .mov .avi .m4a .webm .ogg</p>
                        </LiquidGlassCard>
                      </div>
                    </AnimatedContent>

                    {mediaError && (
                      <div className="p-3 bg-error/15 border border-error/30 rounded-xl text-xs text-error font-medium text-center animate-in fade-in duration-200">
                        ⚠️ {mediaError}
                      </div>
                    )}
                  </>
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

      {/* Settings Modal (LiquidGlassCard aesthetic) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSettingsOpen(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg"
            >
              <LiquidGlassCard glowIntensity="md" blurIntensity="lg" className="p-6 flex flex-col gap-5 border border-border/80 shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-2">
                  <div className="flex items-center gap-2">
                    <img src={configImg} alt="" className="w-5 h-5 object-contain" />
                    <h2 className="text-base font-semibold text-text-primary">Configurações</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                      Chave de API
                    </label>
                    <SmoothInput
                      type="password"
                      value={draftApiKey}
                      onChange={(e) => setDraftApiKey(e.target.value)}
                      placeholder="gsk_..."
                    />
                    <p className="text-[11px] text-text-secondary/80 mt-1.5 leading-tight">
                      Assegure-se de que o provedor fornece acesso aos modelos abaixo.
                    </p>
                  </div>

                  {/* Models (Exibição dos modelos ativos) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                        Modelo STT (Voz)
                      </label>
                      <div className="p-2.5 bg-background/60 border border-border/50 rounded-xl text-xs font-medium text-text-primary">
                        Whisper Large V3 Turbo
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                        Modelo LLM (Corretor)
                      </label>
                      <div className="p-2.5 bg-background/60 border border-border/50 rounded-xl text-xs font-medium text-text-primary">
                        GPT-OSS-20B
                      </div>
                    </div>
                  </div>

                  {/* Shortcuts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                        Atalho Toggle
                      </label>
                      <ShortcutInput
                        value={draftShortcutToggle}
                        onChange={(val) => setDraftShortcutToggle(val)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
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
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                      Cookies do Navegador (Extração Mídia)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['none', 'chrome', 'edge', 'firefox', 'brave'] as const).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setDraftBrowserCookies(b)}
                          className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center capitalize cursor-pointer ${draftBrowserCookies === b
                            ? 'bg-accent/15 text-accent border-accent/40 font-semibold'
                            : 'bg-transparent text-text-secondary border-border/50 hover:text-text-primary'
                            }`}
                        >
                          {b === 'none' ? 'Nenhum' : b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wake Word (Comando de Voz Offline) */}
                  <div className="p-3.5 bg-background/50 border border-border/60 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-text-primary block">Wake Word (Ativação por Voz)</span>
                        <span className="text-[11px] text-text-secondary">Acione o Vox falando em segundo plano (openWakeWord ONNX)</span>
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

                    {draftWakeWordEnabled && (
                      <div className="pt-2 border-t border-border/30">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-secondary font-medium">Sensibilidade</span>
                          <span className="text-text-primary font-mono">{Math.round(draftWakeWordSensitivity * 100)}%</span>
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
                <div className="flex items-center justify-end gap-2.5 pt-4 mt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <SpecularButton
                    size="sm"
                    radius={12}
                    onClick={handleSaveSettings}
                    className="!px-6"
                  >
                    Salvar Configurações
                  </SpecularButton>
                </div>
              </LiquidGlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MainWindow
