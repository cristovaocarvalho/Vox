import { getSetting } from './db'

export interface ProviderPreset {
  id: string
  label: string
  baseUrl: string
  requiresApiKey: boolean
  isAzure: boolean
  defaultApiVersion: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', requiresApiKey: true, isAzure: false, defaultApiVersion: '' },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', requiresApiKey: true, isAzure: false, defaultApiVersion: '' },
  { id: 'azure', label: 'Azure OpenAI', baseUrl: 'https://YOUR_RESOURCE.openai.azure.com', requiresApiKey: true, isAzure: true, defaultApiVersion: '2024-06-01' },
  { id: 'ollama', label: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', requiresApiKey: false, isAzure: false, defaultApiVersion: '' },
  { id: 'lmstudio', label: 'LM Studio (local)', baseUrl: 'http://localhost:1234/v1', requiresApiKey: false, isAzure: false, defaultApiVersion: '' }
]

export interface ResolvedProvider {
  id: string
  baseUrl: string
  apiKey: string
  requiresApiKey: boolean
  isAzure: boolean
  apiVersion: string
}

export function resolveProvider(): ResolvedProvider {
  const id = (getSetting('provider', 'groq').trim() || 'groq').toLowerCase()
  const preset = PROVIDER_PRESETS.find((p) => p.id === id) || PROVIDER_PRESETS[0]

  const baseUrl = (getSetting('baseUrl', '').trim() || preset.baseUrl).replace(/\/+$/, '')
  const apiKey = getSetting('apiKey', '').trim()
  const apiVersion = getSetting('azureApiVersion', preset.defaultApiVersion).trim() || preset.defaultApiVersion

  return {
    id: preset.id,
    baseUrl,
    apiKey,
    requiresApiKey: preset.requiresApiKey,
    isAzure: preset.isAzure,
    apiVersion
  }
}

export function getChatEndpoint(model: string): string {
  const p = resolveProvider()
  if (p.isAzure) return `${p.baseUrl}/openai/deployments/${model}/chat/completions?api-version=${p.apiVersion}`
  return `${p.baseUrl}/chat/completions`
}

export function getSttEndpoint(model: string): string {
  const p = resolveProvider()
  if (p.isAzure) return `${p.baseUrl}/openai/deployments/${model}/audio/transcriptions?api-version=${p.apiVersion}`
  return `${p.baseUrl}/audio/transcriptions`
}

export function getModelsEndpoint(): string {
  const p = resolveProvider()
  if (p.isAzure) return `${p.baseUrl}/openai/deployments?api-version=${p.apiVersion}`
  return `${p.baseUrl}/models`
}

export function getAuthHeaders(): Record<string, string> {
  const p = resolveProvider()
  if (!p.apiKey) return {}
  if (p.isAzure) return { 'api-key': p.apiKey }
  return { 'Authorization': `Bearer ${p.apiKey}` }
}
