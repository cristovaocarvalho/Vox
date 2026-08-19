import React, { useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import { IconCheck, IconTrash } from '../../../components'

// ─── Data ───────────────────────────────────────────────────────────────────

interface WhisperModelInfo {
  id: string
  name: string
  speed: number      // 1–5
  accuracy: number   // 1–5
  size: string
  recommended?: boolean
}

// Models available via API (Groq / OpenAI / Azure)
const API_MODELS: WhisperModelInfo[] = [
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo',
    speed: 3.5, accuracy: 4.6, size: '—',
    recommended: true
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large v3',
    speed: 1.5, accuracy: 4.7, size: '—'
  },
  {
    id: 'whisper-medium',
    name: 'Whisper Medium',
    speed: 2.0, accuracy: 4.3, size: '—'
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    speed: 3.0, accuracy: 3.8, size: '—'
  }
]

// Models that can be installed locally (whisper.cpp GGML format)
const LOCAL_MODELS: WhisperModelInfo[] = [
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo',
    speed: 3.5, accuracy: 4.6, size: '~1.5 GB',
    recommended: true
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large v3',
    speed: 1.5, accuracy: 4.7, size: '~3.1 GB'
  },
  {
    id: 'whisper-medium',
    name: 'Whisper Medium',
    speed: 2.0, accuracy: 4.3, size: '~1.5 GB'
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    speed: 3.0, accuracy: 3.8, size: '~488 MB'
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    speed: 4.0, accuracy: 3.0, size: '~148 MB'
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    speed: 5.0, accuracy: 2.5, size: '~78 MB'
  }
]

interface OllamaCatalogModel {
  id: string
  name: string
  params: string
  size: string
  tags: string[]
  description: string
}

const OLLAMA_CATALOG: OllamaCatalogModel[] = [
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B', params: '8B', size: '~4.9 GB', tags: ['General', 'Fast'], description: 'Versatile general-purpose model for reliable correction.' },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', params: '3B', size: '~2.0 GB', tags: ['Lightweight', 'Fast'], description: 'Small and efficient for quick, low-latency correction.' },
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B', params: '1B', size: '~1.3 GB', tags: ['Tiny', 'Fast'], description: 'Minimal footprint for low-memory machines.' },
  { id: 'mistral:7b', name: 'Mistral 7B', params: '7B', size: '~4.1 GB', tags: ['General'], description: 'Strong open-weight model with excellent text quality.' },
  { id: 'mistral-nemo:12b', name: 'Mistral Nemo 12B', params: '12B', size: '~7.1 GB', tags: ['General'], description: 'Higher capacity general-purpose model.' },
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B', params: '7B', size: '~4.7 GB', tags: ['General', 'Multilingual'], description: 'Great multilingual performance across many languages.' },
  { id: 'qwen2.5:14b', name: 'Qwen 2.5 14B', params: '14B', size: '~9.0 GB', tags: ['General', 'Multilingual'], description: 'Higher capacity multilingual model.' },
  { id: 'gemma2:9b', name: 'Gemma 2 9B', params: '9B', size: '~5.4 GB', tags: ['General'], description: "Google's open model, balanced quality and speed." },
  { id: 'phi3:mini', name: 'Phi-3 Mini', params: '3.8B', size: '~2.3 GB', tags: ['Lightweight'], description: 'Compact yet capable for everyday correction.' },
  { id: 'codellama:7b', name: 'Code Llama 7B', params: '7B', size: '~3.8 GB', tags: ['Code'], description: 'Specialized for code and technical content.' },
  { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B', params: '8B', size: '~4.9 GB', tags: ['Reasoning'], description: 'Reasoning model for complex rewrites and edits.' }
]

const PROVIDER_LABELS = [
  { id: 'groq', label: 'Groq', requiresKey: true },
  { id: 'openai', label: 'OpenAI', requiresKey: true },
  { id: 'azure', label: 'Azure OpenAI', requiresKey: true },
  { id: 'ollama', label: 'Ollama (local)', requiresKey: false },
  { id: 'lmstudio', label: 'LM Studio (local)', requiresKey: false }
]

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ModelsTabProps {
  draftSttModel: string
  setDraftSttModel: (model: string) => void
  draftLlmModel: string
  setDraftLlmModel: (model: string) => void
  draftProvider: string
  draftApiKey: string
  draftBaseUrl: string
  availableModels: { stt: string[]; llm: string[] }
  modelsLoading: boolean
  modelsError: string | null
  onRefreshModels: () => Promise<void>
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CollapsibleSection({
  label,
  defaultOpen = true,
  children
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border/40 overflow-hidden bg-background/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-surface/20 hover:bg-surface/30 transition-colors cursor-pointer"
      >
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-label-wide">
          {label}
        </span>
        <span
          className={`text-[10px] text-text-muted transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        >
          ▾
        </span>
      </button>
      {open && <div className="p-1.5 space-y-1">{children}</div>}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ModelsTab: React.FC<ModelsTabProps> = ({
  draftSttModel,
  setDraftSttModel,
  draftLlmModel,
  setDraftLlmModel,
  draftProvider,
  draftApiKey,
  draftBaseUrl,
  availableModels,
  modelsLoading,
  modelsError,
  onRefreshModels
}) => {
  const { t } = useI18n()
  const [subTab, setSubTab] = useState<'speech' | 'language'>('speech')

  // Local Whisper downloaded models state
  const [downloadedWhisperModels, setDownloadedWhisperModels] = useState<string[]>([])
  const [whisperPullingModel, setWhisperPullingModel] = useState<string | null>(null)
  const [whisperProgress, setWhisperProgress] = useState<Record<string, number>>({})
  const [whisperError, setWhisperError] = useState<string | null>(null)

  // Ollama models state
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [installedLoading, setInstalledLoading] = useState(false)
  const [pullingModel, setPullingModel] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [pullError, setPullError] = useState<string | null>(null)

  const isOllama = draftProvider === 'ollama'
  const ollamaBaseUrl = draftBaseUrl.trim() || 'http://localhost:11434/v1'

  const prettyModelName = (id: string): string => {
    const base = id.split('/').pop() || id
    return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // Load downloaded Whisper local models from disk
  const loadDownloadedWhisperModels = React.useCallback(async () => {
    if (window.vox?.listDownloadedWhisperModels) {
      try {
        const list = await window.vox.listDownloadedWhisperModels()
        setDownloadedWhisperModels(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Erro ao listar modelos Whisper baixados:', err)
      }
    }
  }, [])

  useEffect(() => {
    loadDownloadedWhisperModels()
  }, [loadDownloadedWhisperModels])

  // Listen to Whisper model download progress
  useEffect(() => {
    const unsub = window.vox?.onWhisperDownloadProgress?.((data) => {
      const { modelId, status, progress: pct, error } = data
      if (status === 'completed') {
        setDownloadedWhisperModels((prev) => (prev.includes(modelId) ? prev : [...prev, modelId]))
        setWhisperPullingModel(null)
        setWhisperProgress((prev) => {
          const n = { ...prev }
          delete n[modelId]
          return n
        })
        // Auto-select downloaded model
        setDraftSttModel(modelId)
      } else if (status === 'error') {
        setWhisperError(error || t('modelsTab.downloadFailed') || 'Download failed')
        setWhisperPullingModel(null)
        setWhisperProgress((prev) => {
          const n = { ...prev }
          delete n[modelId]
          return n
        })
      } else {
        setWhisperProgress((prev) => ({ ...prev, [modelId]: pct }))
      }
    })
    return () => unsub?.()
  }, [t, setDraftSttModel])

  const handleDownloadWhisperModel = async (modelId: string) => {
    if (whisperPullingModel || !window.vox?.downloadWhisperModel) return
    setWhisperPullingModel(modelId)
    setWhisperError(null)
    setWhisperProgress((prev) => ({ ...prev, [modelId]: 0 }))

    try {
      const res = await window.vox.downloadWhisperModel(modelId)
      if (!res?.success) {
        setWhisperError(res?.error || t('modelsTab.downloadFailed') || 'Download failed')
        setWhisperPullingModel(null)
      }
    } catch (err: any) {
      setWhisperError(err?.message || t('modelsTab.downloadFailed') || 'Download failed')
      setWhisperPullingModel(null)
    }
  }

  const handleDeleteWhisperModel = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.vox?.deleteWhisperModel) return
    try {
      const res = await window.vox.deleteWhisperModel(modelId)
      if (res?.success) {
        setDownloadedWhisperModels((prev) => prev.filter((id) => id !== modelId))
        if (draftSttModel === modelId || draftSttModel.endsWith(`/${modelId}`)) {
          setDraftSttModel('whisper-large-v3-turbo')
        }
      }
    } catch (err) {
      console.error('Erro ao deletar modelo Whisper:', err)
    }
  }

  // Load Ollama installed models
  const loadInstalledModels = React.useCallback(async () => {
    if (!isOllama || !window.vox?.listOllamaModels) {
      setInstalledModels([])
      return
    }
    setInstalledLoading(true)
    try {
      const models = await window.vox.listOllamaModels(ollamaBaseUrl)
      setInstalledModels(Array.isArray(models) ? models : [])
    } catch {
      setInstalledModels([])
    } finally {
      setInstalledLoading(false)
    }
  }, [isOllama, ollamaBaseUrl])

  useEffect(() => { loadInstalledModels() }, [loadInstalledModels])

  useEffect(() => {
    const unsub = window.vox?.onOllamaPullProgress?.((data) => {
      const { model, status, completed, total, error } = data
      if (status === 'success') {
        setInstalledModels((prev) => prev.includes(model) ? prev : [...prev, model])
        setProgress((prev) => { const n = { ...prev }; delete n[model]; return n })
      } else if (status === 'error') {
        setPullError(error || t('modelsTab.downloadFailed'))
        setProgress((prev) => { const n = { ...prev }; delete n[model]; return n })
      } else {
        const percent =
          typeof completed === 'number' && typeof total === 'number' && total > 0
            ? Math.min(100, Math.round((completed / total) * 100))
            : 0
        setProgress((prev) => ({ ...prev, [model]: percent }))
      }
    })
    return () => unsub?.()
  }, [t])

  const handlePullModel = async (modelId: string) => {
    if (pullingModel || !window.vox?.pullOllamaModel) return
    setPullingModel(modelId)
    setPullError(null)
    setProgress((prev) => ({ ...prev, [modelId]: 0 }))
    try {
      const res = await window.vox.pullOllamaModel(modelId, ollamaBaseUrl)
      if (!res?.success) setPullError(t('modelsTab.downloadFailed'))
    } catch {
      setPullError(t('modelsTab.downloadFailed'))
    } finally {
      setPullingModel(null)
      setProgress((prev) => { const n = { ...prev }; delete n[modelId]; return n })
    }
  }

  const isProviderConnected = (id: string) => {
    const preset = PROVIDER_LABELS.find((p) => p.id === id)
    if (!preset || draftProvider !== id) return false
    return preset.requiresKey ? Boolean(draftApiKey.trim()) : true
  }

  const isModelInstalled = (modelId: string) => {
    const base = modelId.split(':')[0]
    return installedModels.some((m) => m === modelId || m.startsWith(`${base}:`))
  }

  // ── Whisper model card ─────────────────────────────────────────────────────
  const renderModelCard = (model: WhisperModelInfo, isLocalList: boolean) => {
    const isSelected = draftSttModel === model.id || draftSttModel.endsWith(`/${model.id}`)
    const isInstalled = downloadedWhisperModels.includes(model.id)
    const isPulling = whisperPullingModel === model.id
    const currentProgress = whisperProgress[model.id] ?? 0

    return (
      <div
        key={`${model.id}-${isLocalList ? 'local' : 'api'}`}
        onClick={() => {
          if (!isLocalList || isInstalled) {
            setDraftSttModel(model.id)
          }
        }}
        className={`group flex items-center justify-between gap-4 sm:gap-6 px-4 py-3 cursor-pointer transition-colors duration-150 border-l-2 ${
          isSelected
            ? 'bg-accent/[0.08] border-accent pl-3.5'
            : 'border-transparent hover:bg-surface/20'
        }`}
      >
        {/* Left: Indicator dot + Model Name + Recommended Badge */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`shrink-0 w-1.5 h-1.5 rounded-full transition-colors ${
              isSelected ? 'bg-accent' : 'bg-border/50 group-hover:bg-border/80'
            }`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold leading-none ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                {model.name}
              </span>
              {model.recommended && (
                <span className="text-[8px] font-semibold text-accent/90 uppercase tracking-wider bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 shrink-0">
                  {t('modelsTab.recommended')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Speed & Accuracy Metrics (Stacked header + bar to avoid text collisions) */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* Speed Metric */}
          <div className="flex flex-col gap-1 w-20 sm:w-28">
            <div className="flex items-center justify-between text-[9px] text-text-muted">
              <span className="uppercase tracking-wider truncate">{t('modelsTab.speed')}</span>
              <span className="font-mono text-[9px] opacity-70">{model.speed.toFixed(1)}</span>
            </div>
            <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/40 rounded-full transition-all duration-300"
                style={{ width: `${(model.speed / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Accuracy Metric */}
          <div className="flex flex-col gap-1 w-20 sm:w-28">
            <div className="flex items-center justify-between text-[9px] text-text-muted">
              <span className="uppercase tracking-wider truncate">{t('modelsTab.accuracy')}</span>
              <span className="font-mono text-[9px] opacity-70">{model.accuracy.toFixed(1)}</span>
            </div>
            <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/40 rounded-full transition-all duration-300"
                style={{ width: `${(model.accuracy / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: File Size + In-App Download / Select Action Button */}
        <div
          className="flex items-center justify-end gap-3 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 text-right">
            {model.size !== '—' && (
              <span className="text-[10px] font-mono text-text-muted">{model.size}</span>
            )}
          </div>

          <div className="w-24 flex justify-end">
            {isLocalList ? (
              // Local Models: In-app download with live progress, delete, and automatic activation
              isInstalled ? (
                <div className="flex items-center gap-1 w-full justify-end">
                  <button
                    type="button"
                    onClick={() => setDraftSttModel(model.id)}
                    className={`flex-1 py-1 px-1 text-[10px] font-medium border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    <IconCheck className="w-2.5 h-2.5 shrink-0" strokeWidth={2.6} />
                    <span className="truncate">{isSelected ? t('modelsTab.selected') : t('modelsTab.installed')}</span>
                  </button>
                  <button
                    type="button"
                    title={t('common.delete') || 'Deletar'}
                    onClick={(e) => handleDeleteWhisperModel(model.id, e)}
                    className="p-1 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer shrink-0"
                  >
                    <IconTrash className="w-3 h-3" />
                  </button>
                </div>
              ) : isPulling ? (
                <div className="w-full flex flex-col items-center gap-1">
                  <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-accent">{currentProgress}%</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDownloadWhisperModel(model.id)}
                  className="w-full py-1 text-[10px] font-medium border border-border/50 text-text-secondary hover:border-border/80 hover:text-text-primary text-center transition-colors cursor-pointer"
                >
                  {t('modelsTab.download')}
                </button>
              )
            ) : (
              // Provider Models (API): Select
              <span
                className={`w-full py-1 text-[10px] font-medium border text-center transition-colors ${
                  isSelected
                    ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                    : 'border-border/30 text-text-muted'
                }`}
              >
                {isSelected ? t('modelsTab.selected') : t('modelsTab.select')}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex items-center border-b border-border/40">
        <button
          type="button"
          onClick={() => setSubTab('speech')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
            subTab === 'speech'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          {t('modelsTab.speech')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('language')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
            subTab === 'language'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          {t('modelsTab.language')}
        </button>
      </div>

      {/* ── SPEECH TAB ── */}
      {subTab === 'speech' && (
        <div className="space-y-2.5">
          {modelsError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
              {modelsError}
            </div>
          )}

          {whisperError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
              {whisperError}
            </div>
          )}

          <CollapsibleSection label={t('modelsTab.providerModels')} defaultOpen={true}>
            {API_MODELS.map((m) => renderModelCard(m, false))}
          </CollapsibleSection>

          <CollapsibleSection label={t('modelsTab.localModels')} defaultOpen={false}>
            <p className="px-3 pb-1 text-[10px] text-text-muted leading-relaxed">
              {t('modelsTab.localModelsHint')}
            </p>
            {LOCAL_MODELS.map((m) => renderModelCard(m, true))}
          </CollapsibleSection>
        </div>
      )}

      {/* ── LANGUAGE TAB ── */}
      {subTab === 'language' && (
        <div className="space-y-5">
          {/* Provider status */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-label-wide">
              {t('modelsTab.providerStatus')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PROVIDER_LABELS.map((p) => {
                const connected = isProviderConnected(p.id)
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-background/20 border border-border/40 text-xs"
                  >
                    <span className="font-medium text-text-secondary">{p.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500/50'}`} />
                      <span className={`text-[10px] font-medium ${connected ? 'text-emerald-400' : 'text-text-muted'}`}>
                        {connected ? t('modelsTab.connected') : t('modelsTab.disconnected')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Synced models */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-label-wide">
                {t('modelsTab.syncedModels')}
              </p>
              <button
                type="button"
                onClick={onRefreshModels}
                disabled={modelsLoading}
                className="px-2.5 py-1 text-[11px] font-medium border border-border/50 text-text-muted hover:text-text-secondary hover:border-border/80 transition-colors cursor-pointer disabled:opacity-40"
              >
                {modelsLoading ? t('modelsTab.syncing') : t('modelsTab.syncModels')}
              </button>
            </div>

            {modelsError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                {modelsError}
              </div>
            )}

            {availableModels.llm.length === 0 ? (
              <div className="py-8 text-center border border-border/30 bg-background/10">
                <p className="text-[11px] text-text-muted">{t('modelsTab.noModelsSynced')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                {availableModels.llm.map((modelId) => {
                  const isSelected = draftLlmModel === modelId
                  return (
                    <button
                      key={modelId}
                      type="button"
                      onClick={() => setDraftLlmModel(modelId)}
                      className={`px-3 py-2.5 text-xs text-left border transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'bg-accent/[0.07] border-accent/25 text-accent font-semibold'
                          : 'bg-background/20 border-border/40 text-text-muted hover:text-text-secondary hover:border-border/60'
                      }`}
                    >
                      {prettyModelName(modelId)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ollama catalog */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-label-wide">
                  {t('modelsTab.downloadModels')}
                </p>
                <p className="text-[11px] text-text-muted/70 mt-0.5">
                  {isOllama ? t('modelsTab.downloadHint') : t('modelsTab.cloudProviderHint')}
                </p>
              </div>
              {isOllama && (
                <button
                  type="button"
                  onClick={loadInstalledModels}
                  disabled={installedLoading}
                  className="px-2.5 py-1 text-[11px] font-medium border border-border/50 text-text-muted hover:text-text-secondary hover:border-border/80 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {installedLoading ? t('modelsTab.checking') : t('modelsTab.installedModels')}
                </button>
              )}
            </div>

            {pullError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                {pullError}
              </div>
            )}

            {!isOllama ? (
              <div className="py-8 text-center border border-border/30 bg-background/10">
                <p className="text-[11px] text-text-muted">{t('modelsTab.cloudProviderHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OLLAMA_CATALOG.map((model) => {
                  const installed = isModelInstalled(model.id)
                  const isPulling = pullingModel === model.id
                  const percent = progress[model.id] ?? 0

                  return (
                    <div
                      key={model.id}
                      className="flex flex-col justify-between gap-3 p-3.5 bg-background/20 border border-border/40"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-text-secondary">{model.name}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">{model.params} · {model.size}</div>
                          </div>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">{model.description}</p>
                      </div>

                      {isPulling ? (
                        <div className="space-y-1.5">
                          <div className="h-px bg-surface overflow-hidden">
                            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${percent}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-text-muted">
                            <span>{t('modelsTab.downloadingProgress')}</span>
                            <span className="font-mono">{percent}%</span>
                          </div>
                        </div>
                      ) : installed ? (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
                          <IconCheck className="w-3.5 h-3.5" strokeWidth={2.6} />
                          {t('modelsTab.installed')}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePullModel(model.id)}
                          className="w-full py-1.5 border border-accent/25 text-accent text-[11px] font-semibold hover:bg-accent/10 transition-colors cursor-pointer"
                        >
                          {t('modelsTab.download')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelsTab
