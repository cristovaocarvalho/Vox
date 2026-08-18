import React, { useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import { IconChevronDown, IconCheck } from '../../../components'

export interface WhisperModelInfo {
  id: string
  name: string
  type: string
  features: string[]
  speed: number
  accuracy: number
  size: string
}

export const WHISPER_MODELS: WhisperModelInfo[] = [
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo',
    type: 'Cloud / Local',
    features: ['Recommended', 'Turbo Speed', 'High Precision'],
    speed: 3.5,
    accuracy: 4.6,
    size: '~1.5 GB'
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large v3',
    type: 'Cloud / Local',
    features: ['Max Accuracy', 'Multilingual'],
    speed: 1.5,
    accuracy: 4.7,
    size: '~3.1 GB'
  },
  {
    id: 'whisper-medium',
    name: 'Whisper Medium',
    type: 'Cloud / Local',
    features: ['High Precision', 'Balanced'],
    speed: 2.0,
    accuracy: 4.3,
    size: '~1.5 GB'
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    type: 'Cloud / Local',
    features: ['Multilingual', 'Lightweight'],
    speed: 3.0,
    accuracy: 3.8,
    size: '~488 MB'
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    type: 'Cloud / Local',
    features: ['Fast', 'Low Memory'],
    speed: 4.0,
    accuracy: 3.0,
    size: '~148 MB'
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    type: 'Cloud / Local',
    features: ['Ultra Fast', 'Minimal RAM'],
    speed: 5.0,
    accuracy: 2.5,
    size: '~78 MB'
  }
]

export interface OllamaCatalogModel {
  id: string
  name: string
  params: string
  size: string
  tags: string[]
  description: string
}

export const OLLAMA_CATALOG: OllamaCatalogModel[] = [
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B', params: '8B', size: '~4.9 GB', tags: ['General', 'Fast'], description: 'Versatile general-purpose model for reliable correction.' },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', params: '3B', size: '~2.0 GB', tags: ['Lightweight', 'Fast'], description: 'Small and efficient for quick, low-latency correction.' },
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B', params: '1B', size: '~1.3 GB', tags: ['Tiny', 'Fast'], description: 'Minimal footprint for low-memory machines.' },
  { id: 'mistral:7b', name: 'Mistral 7B', params: '7B', size: '~4.1 GB', tags: ['General'], description: 'Strong open-weight model with excellent text quality.' },
  { id: 'mistral-nemo:12b', name: 'Mistral Nemo 12B', params: '12B', size: '~7.1 GB', tags: ['General'], description: 'Higher capacity general-purpose model.' },
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B', params: '7B', size: '~4.7 GB', tags: ['General', 'Multilingual'], description: 'Great multilingual performance across many languages.' },
  { id: 'qwen2.5:14b', name: 'Qwen 2.5 14B', params: '14B', size: '~9.0 GB', tags: ['General', 'Multilingual'], description: 'Higher capacity multilingual model.' },
  { id: 'gemma2:9b', name: 'Gemma 2 9B', params: '9B', size: '~5.4 GB', tags: ['General'], description: 'Google’s open model, balanced quality and speed.' },
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

  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [installedLoading, setInstalledLoading] = useState(false)
  const [pullingModel, setPullingModel] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [pullError, setPullError] = useState<string | null>(null)

  const isOllama = draftProvider === 'ollama'
  const ollamaBaseUrl = draftBaseUrl.trim() || 'http://localhost:11434/v1'

  const prettyModelName = (id: string): string => {
    const base = id.split('/').pop() || id
    return base
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

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

  useEffect(() => {
    loadInstalledModels()
  }, [loadInstalledModels])

  useEffect(() => {
    const unsub = window.vox?.onOllamaPullProgress?.((data) => {
      const { model, status, completed, total, error } = data
      if (status === 'success') {
        setInstalledModels((prev) => (prev.includes(model) ? prev : [...prev, model]))
        setProgress((prev) => {
          const next = { ...prev }
          delete next[model]
          return next
        })
      } else if (status === 'error') {
        setPullError(error || t('modelsTab.downloadFailed'))
        setProgress((prev) => {
          const next = { ...prev }
          delete next[model]
          return next
        })
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
      if (!res?.success) {
        setPullError(t('modelsTab.downloadFailed'))
      }
    } catch {
      setPullError(t('modelsTab.downloadFailed'))
    } finally {
      setPullingModel(null)
      setProgress((prev) => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
    }
  }

  const isProviderConnected = (id: string) => {
    const preset = PROVIDER_LABELS.find((p) => p.id === id)
    if (!preset) return false
    if (draftProvider !== id) return false
    return preset.requiresKey ? Boolean(draftApiKey.trim()) : true
  }

  const isModelInstalled = (modelId: string) => {
    const base = modelId.split(':')[0]
    return installedModels.some((m) => m === modelId || m.startsWith(`${base}:`))
  }

  const renderScore = (score: number, max = 5, colorClass = 'bg-accent') => {
    const filled = Math.round(score)
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          {Array.from({ length: max }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < filled ? colorClass : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-mono text-text-secondary ml-1">{score.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation Pills: Speech / Language */}
      <div className="flex items-center gap-1.5 p-1 bg-surface/50 border border-border/50 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setSubTab('speech')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            subTab === 'speech'
              ? 'bg-accent/20 text-accent shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t('modelsTab.speech')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('language')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            subTab === 'language'
              ? 'bg-accent/20 text-accent shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t('modelsTab.language')}
        </button>
      </div>

      {subTab === 'speech' && (
        <div className="space-y-5">
          {/* Available Models Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block">
                {t('modelsTab.availableModels')}
              </label>
              <button
                type="button"
                onClick={onRefreshModels}
                disabled={modelsLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/60 bg-surface/50 text-text-secondary hover:text-text-primary hover:border-border transition-colors cursor-pointer disabled:opacity-50"
              >
                {modelsLoading ? t('modelsTab.syncing') : t('modelsTab.syncModels')}
              </button>
            </div>

            {modelsError && (
              <div className="p-2.5 mb-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {modelsError}
              </div>
            )}

            <div className="border border-border/50 rounded-xl overflow-hidden bg-background/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-surface/40 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">{t('modelsTab.model')}</th>
                    <th className="py-2.5 px-3">{t('modelsTab.features')}</th>
                    <th className="py-2.5 px-3">{t('modelsTab.speed')}</th>
                    <th className="py-2.5 px-3">{t('modelsTab.accuracy')}</th>
                    <th className="py-2.5 px-3.5 text-right">{t('modelsTab.size')}</th>
                    <th className="py-2.5 px-3.5 text-right">{t('modelsTab.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {WHISPER_MODELS.map((model) => {
                    const isSelected = draftSttModel === model.id || draftSttModel.endsWith(`/${model.id}`)
                    return (
                      <tr
                        key={model.id}
                        onClick={() => setDraftSttModel(model.id)}
                        className={`transition-colors duration-150 cursor-pointer ${
                          isSelected ? 'bg-accent/[0.08] hover:bg-accent/[0.12]' : 'hover:bg-surface/30'
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-accent' : 'bg-transparent'
                              }`}
                            />
                            <div>
                              <div className="font-semibold text-text-primary leading-tight">{model.name}</div>
                              <div className="text-[10px] text-text-muted mt-0.5">{model.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {model.features.map((feat) => (
                              <span
                                key={feat}
                                className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-white/[0.04] border border-border/50 text-text-secondary"
                              >
                                {feat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3">{renderScore(model.speed, 5, 'bg-amber-400')}</td>
                        <td className="py-3 px-3">{renderScore(model.accuracy, 5, 'bg-emerald-400')}</td>
                        <td className="py-3 px-3.5 text-right">
                          <span className="text-[11px] font-mono text-text-muted">{model.size}</span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {isOllama ? (
                            isModelInstalled(model.id) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                                <IconCheck className="w-3 h-3" strokeWidth={2.6} />
                                {t('modelsTab.installed')}
                              </span>
                            ) : pullingModel === model.id ? (
                              <div className="inline-flex flex-col items-end gap-1 w-24">
                                <div className="w-full h-1 rounded-full bg-surface overflow-hidden">
                                  <div
                                    className="h-full bg-accent transition-all duration-300"
                                    style={{ width: `${progress[model.id] ?? 0}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-text-muted">{progress[model.id] ?? 0}%</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePullModel(model.id)
                                }}
                                className="px-2.5 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent text-[10px] font-semibold hover:bg-accent/20 transition-colors cursor-pointer"
                              >
                                {t('modelsTab.download')}
                              </button>
                            )
                          ) : (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-colors ${
                                isSelected
                                  ? 'bg-accent/15 border-accent/40 text-accent'
                                  : 'bg-surface/40 border-border/50 text-text-muted'
                              }`}
                            >
                              {isSelected ? t('modelsTab.selected') : t('modelsTab.select')}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'language' && (
        <div className="space-y-5">
          {/* Provider Connection Status */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block">
              {t('modelsTab.providerStatus')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROVIDER_LABELS.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-background/40 border border-border/50 rounded-xl text-xs"
                >
                  <span className="font-medium text-text-primary">{p.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isProviderConnected(p.id) ? 'bg-emerald-500' : 'bg-rose-500/70'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        isProviderConnected(p.id) ? 'text-emerald-400' : 'text-rose-400/80'
                      }`}
                    >
                      {isProviderConnected(p.id) ? t('modelsTab.connected') : t('modelsTab.disconnected')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Synced Models from connected provider */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide">
                {t('modelsTab.syncedModels')}
              </label>
              <button
                type="button"
                onClick={onRefreshModels}
                disabled={modelsLoading}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/60 bg-surface/50 text-text-secondary hover:text-text-primary hover:border-border transition-colors cursor-pointer disabled:opacity-50"
              >
                {modelsLoading ? t('modelsTab.syncing') : t('modelsTab.syncModels')}
              </button>
            </div>

            {modelsError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {modelsError}
              </div>
            )}

            {availableModels.llm.length === 0 ? (
              <div className="p-6 text-center border border-border/40 rounded-xl bg-background/20">
                <p className="text-xs text-text-muted">{t('modelsTab.noModelsSynced')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {availableModels.llm.map((modelId) => {
                  const isSelected = draftLlmModel === modelId
                  return (
                    <button
                      key={modelId}
                      type="button"
                      onClick={() => setDraftLlmModel(modelId)}
                      className={`p-2.5 text-xs text-left rounded-xl border transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'bg-accent/15 border-accent/40 text-accent font-semibold'
                          : 'bg-background/40 border-border/50 text-text-secondary hover:text-text-primary hover:border-border'
                      }`}
                    >
                      {prettyModelName(modelId)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Download Models */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block">
                  {t('modelsTab.downloadModels')}
                </label>
                <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">
                  {isOllama ? t('modelsTab.downloadHint') : t('modelsTab.cloudProviderHint')}
                </p>
              </div>
              {isOllama && (
                <button
                  type="button"
                  onClick={loadInstalledModels}
                  disabled={installedLoading}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/60 bg-surface/50 text-text-secondary hover:text-text-primary hover:border-border transition-colors cursor-pointer disabled:opacity-50"
                >
                  {installedLoading ? t('modelsTab.checking') : t('modelsTab.installedModels')}
                </button>
              )}
            </div>

            {pullError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {pullError}
              </div>
            )}

            {!isOllama ? (
              <div className="p-6 text-center border border-border/40 rounded-xl bg-background/20">
                <p className="text-xs text-text-muted">{t('modelsTab.cloudProviderHint')}</p>
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
                      className="flex flex-col justify-between gap-3 p-3.5 bg-background/40 border border-border/50 rounded-xl"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-text-primary">{model.name}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {model.params} · {model.size}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 shrink-0">
                            {model.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-white/[0.04] border border-border/50 text-text-secondary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">{model.description}</p>
                      </div>

                      {isPulling ? (
                        <div className="space-y-1.5">
                          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                            <div
                              className="h-full bg-accent transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-text-muted">
                            <span>{t('modelsTab.downloadingProgress')}</span>
                            <span className="font-mono">{percent}%</span>
                          </div>
                        </div>
                      ) : installed ? (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                          <IconCheck className="w-3.5 h-3.5" strokeWidth={2.6} />
                          {t('modelsTab.installed')}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePullModel(model.id)}
                          className="w-full py-1.5 rounded-lg border border-accent/40 bg-accent/10 text-accent text-[11px] font-semibold hover:bg-accent/20 transition-colors cursor-pointer"
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
