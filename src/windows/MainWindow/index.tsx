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

  // Vox Media State
  const [downloadProgress, setDownloadProgress] = useState<{ pct: number; speed: string; eta: string } | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [mediaTranscript, setMediaTranscript] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null)
  const [showFileActionPrompt, setShowFileActionPrompt] = useState(false)
  const [fileActionStatus, setFileActionStatus] = useState<string | null>(null)

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
    setApiKey(draftApiKey)
    setShortcutToggle(draftShortcutToggle)
    setShortcutPushToTalk(draftShortcutPushToTalk)
    setBrowserCookies(draftBrowserCookies)
    setWakeWordEnabled(draftWakeWordEnabled)
    setWakeWordSensitivity(draftWakeWordSensitivity)
    setIsSettingsOpen(false)

    if (window.vox?.saveSettings) {
      window.vox.saveSettings({
        apiKey: draftApiKey,
        sttModel,
        llmModel,
        shortcutToggle: draftShortcutToggle,
        shortcutPushToTalk: draftShortcutPushToTalk,
        browserCookies: draftBrowserCookies,
        wakeWordEnabled: String(draftWakeWordEnabled),
        wakeWordSensitivity: String(draftWakeWordSensitivity)
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
        }
      }).catch(console.error)
    }
  }, [setApiKey, setSttModel, setLlmModel, setShortcutToggle, setShortcutPushToTalk, setBrowserCookies, setWakeWordEnabled, setWakeWordSensitivity])



  const handleStartTranscribeUrl = async () => {
    if (!urlInput.trim()) return
    setIsDownloading(true)
    setShowFileActionPrompt(false)
    setFileActionStatus(null)
    setTranscribeStatus('Baixando mídia...')
    setDownloadProgress({ pct: 0, speed: '0 B/s', eta: '--:--' })

    const removeProgressListener = window.vox?.onDownloadProgress?.((data) => {
      setDownloadProgress(data)
      setTranscribeProgress(Math.round(data.pct))
      setTranscribeStatus(`Baixando (${Math.round(data.pct)}%) - ${data.speed} - ETA: ${data.eta}`)
    })

    try {
      const dlResult = await window.vox?.downloadAudio(urlInput, browserCookies)
      if (dlResult?.error) {
        setMediaTranscript(`[${dlResult.error}]`)
        return
      }

      setTranscribeStatus('Transcrevendo áudio via Whisper Large V3 Turbo...')
      setTranscribeProgress(95)

      if (dlResult && dlResult.audioPath) {
        setDownloadedFilePath(dlResult.audioPath)
        const transRes = await window.vox?.transcribeMedia({ audioPath: dlResult.audioPath })
        setMediaTranscript(transRes?.text || 'Transcrição de mídia concluída com sucesso.')
        if (transRes?.text && !transRes.text.startsWith('[Erro')) {
          setShowFileActionPrompt(true)
        }
      } else {
        setMediaTranscript('[Erro: Não foi possível obter o caminho do arquivo baixado]')
      }
    } catch (err: any) {
      console.error('Erro na transcrição de mídia:', err)
      setMediaTranscript(`[Erro: ${err?.message || 'Falha ao processar áudio da mídia'}]`)
    } finally {
      removeProgressListener?.()
      setIsDownloading(false)
      setTranscribeProgress(null)
      setTranscribeStatus('')
    }
  }

  const handleKeepFile = () => {
    setShowFileActionPrompt(false)
    setFileActionStatus('Arquivo salvo na pasta Downloads.')
    setTimeout(() => setFileActionStatus(null), 4000)
  }

  const handleDeleteFile = async () => {
    if (downloadedFilePath && window.vox?.deleteFile) {
      await window.vox.deleteFile(downloadedFilePath)
    }
    setShowFileActionPrompt(false)
    setFileActionStatus('Arquivo excluído do computador.')
    setTimeout(() => setFileActionStatus(null), 4000)
  }

  const handleResetMedia = () => {
    setUrlInput('')
    setMediaTranscript('')
    setIsDownloading(false)
    setShowFileActionPrompt(false)
    setFileActionStatus(null)
    setDownloadedFilePath(null)
  }

  const handleExportFormat = (fmt: string) => {
    if (!mediaTranscript) return
    let content = mediaTranscript
    if (fmt === 'json') {
      content = JSON.stringify({ transcript: mediaTranscript, timestamp: new Date().toISOString() }, null, 2)
    } else if (fmt === 'vtt') {
      content = `WEBVTT\n\n00:00:00.000 --> 00:05:00.000\n${mediaTranscript}`
    } else if (fmt === 'srt') {
      content = `1\n00:00:00,000 --> 00:05:00,000\n${mediaTranscript}`
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vox_transcricao_${Date.now()}.${fmt}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const processLocalFile = async (filePath: string, fileName: string) => {
    setIsDownloading(true)
    setShowFileActionPrompt(false)
    setFileActionStatus(null)
    setTranscribeStatus(`Transcrevendo arquivo: ${fileName}...`)
    setTranscribeProgress(50)
    setDownloadedFilePath(filePath)

    try {
      const transRes = await window.vox?.transcribeMedia({ audioPath: filePath })
      setMediaTranscript(transRes?.text || `Transcrição do arquivo ${fileName} concluída.`)
      if (transRes?.text && !transRes.text.startsWith('[Erro')) {
        setShowFileActionPrompt(true)
      }
    } catch (err: any) {
      console.error('Erro na transcrição de arquivo local:', err)
      setMediaTranscript(`[Erro ao transcrever arquivo local: ${err?.message || 'Falha ao processar'}]`)
    } finally {
      setIsDownloading(false)
      setTranscribeProgress(null)
      setTranscribeStatus('')
    }
  }

  const handleSelectFile = async () => {
    if (!window.vox?.selectFile) return
    const filePath = await window.vox.selectFile()
    if (filePath) {
      const fileName = filePath.split(/[/\\]/).pop() || 'Arquivo Selecionado'
      processLocalFile(filePath, fileName)
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
        processLocalFile(filePath, file.name)
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
                {isDownloading || mediaTranscript ? (
                  /* SINGLE ACTIVE CARD DURING / AFTER TRANSCRIPTION */
                  <AnimatedContent key={`media-process-${activeTab}`} distance={30} direction="vertical" duration={1.1} delay={0.05} ease="power3.out">
                    <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className="p-6 flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-2">
                        <span className="text-sm font-semibold text-text-primary">Transcrição de Mídia</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase font-mono ${isDownloading
                          ? 'bg-warning/15 text-warning'
                          : mediaTranscript.startsWith('[Erro')
                            ? 'bg-error/15 text-error'
                            : 'bg-accent/15 text-accent'
                          }`}>
                          {isDownloading ? '● Processando' : mediaTranscript.startsWith('[Erro') ? 'Erro' : '● Concluído'}
                        </span>
                      </div>

                      {/* Real-time Progress Bar */}
                      {isDownloading && (
                        <div className="w-full py-2">
                          <ProgressBar
                            progress={transcribeProgress ?? 0}
                            label={transcribeStatus}
                            sublabel={downloadProgress ? `${downloadProgress.speed} | ETA: ${downloadProgress.eta}` : undefined}
                          />
                        </div>
                      )}

                      {/* Transcribed Text Output */}
                      {mediaTranscript && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest block">Resultado</span>
                          <div className="p-3 bg-background/60 border border-border/50 rounded-xl font-mono text-sm text-text-primary max-h-48 overflow-y-auto custom-scrollbar break-words">
                            {mediaTranscript}
                          </div>
                        </div>
                      )}

                      {/* Export Options (Shown ONLY after successful completion) */}
                      {mediaTranscript && !mediaTranscript.startsWith('[Erro') && (
                        <div className="pt-4 mt-3 border-t border-border/40 space-y-2">
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest block">Exportar como</span>
                          <div className="flex flex-wrap gap-2">
                            {['srt', 'vtt', 'txt', 'md', 'json'].map((fmt) => (
                              <button
                                key={fmt}
                                type="button"
                                onClick={() => handleExportFormat(fmt)}
                                className="px-3 py-1.5 text-xs font-mono rounded-lg border border-border/60 bg-surface hover:border-accent/50 hover:bg-accent/15 text-text-primary hover:text-accent font-medium transition-all cursor-pointer"
                              >
                                .{fmt.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Keep or Delete Prompt */}
                      {showFileActionPrompt && (
                        <div className="mt-3 p-3 bg-accent/10 border border-accent/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                          <p className="text-xs text-text-primary font-medium text-center sm:text-left">
                            Deseja manter a mídia em <span className="font-mono text-accent">Downloads</span> ou excluí-la?
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleKeepFile}
                              className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Manter Arquivo
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteFile}
                              className="px-3 py-1.5 bg-error/20 hover:bg-error/30 text-error text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Excluir Arquivo
                            </button>
                          </div>
                        </div>
                      )}

                      {fileActionStatus && (
                        <p className="mt-3 text-xs text-accent text-center font-medium animate-in fade-in duration-150">
                          ✓ {fileActionStatus}
                        </p>
                      )}

                      {/* Reset to Transcribe New Media */}
                      {!isDownloading && (
                        <div className="pt-4 mt-3 border-t border-border/40 flex justify-end">
                          <SpecularButton
                            size="sm"
                            onClick={handleResetMedia}
                            className="!px-5"
                          >
                            Transcrever Nova Mídia
                          </SpecularButton>
                        </div>
                      )}
                    </LiquidGlassCard>
                  </AnimatedContent>
                ) : (
                  /* INITIAL STATE: INPUT CARD & DROPZONE */
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
                            className="w-full bg-background/60 border border-border/60 px-3.5 py-2.5 rounded-xl text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors text-center"
                          />

                          <SpecularButton
                            size="sm"
                            className="w-full mt-1"
                            onClick={handleStartTranscribeUrl}
                            disabled={!urlInput.trim()}
                          >
                            Baixar e Transcrever
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
                            {isDragOver ? 'Solte a URL ou arquivo aqui!' : 'Clique para escolher ou arraste um arquivo local'}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">YouTube · TikTok · Instagram · MP4 · MP3 · WAV · MKV · MOV</p>
                        </LiquidGlassCard>
                      </div>
                    </AnimatedContent>
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
