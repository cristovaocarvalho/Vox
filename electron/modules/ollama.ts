export interface OllamaPullProgress {
  status: string
  completed?: number
  total?: number
  error?: string
}

function toOllamaRoot(baseUrl?: string): string {
  const raw = (baseUrl || 'http://localhost:11434').trim()
  return raw.replace(/\/v1\/?$/, '').replace(/\/+$/, '')
}

export async function listOllamaModels(baseUrl?: string): Promise<string[]> {
  const root = toOllamaRoot(baseUrl)
  try {
    const res = await fetch(`${root}/api/tags`, {
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) {
      console.warn(`[Ollama] Erro ao listar modelos (${res.status})`)
      return []
    }
    const data = await res.json()
    const models: Array<{ name?: string }> = Array.isArray(data?.models) ? data.models : []
    return models.map((m) => (m?.name || '').trim()).filter(Boolean).sort()
  } catch (err) {
    console.warn('[Ollama] Não foi possível listar modelos locais:', err)
    return []
  }
}

export async function pullOllamaModel(
  model: string,
  baseUrl: string | undefined,
  onProgress: (progress: OllamaPullProgress) => void
): Promise<boolean> {
  const root = toOllamaRoot(baseUrl)
  try {
    const res = await fetch(`${root}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true })
    })

    if (!res.ok || !res.body) {
      onProgress({ status: 'error', error: `HTTP ${res.status}` })
      return false
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const obj = JSON.parse(trimmed)
          if (obj && typeof obj === 'object') {
            if (obj.error) {
              onProgress({ status: 'error', error: String(obj.error) })
              return false
            }
            onProgress({
              status: typeof obj.status === 'string' ? obj.status : 'downloading',
              completed: typeof obj.completed === 'number' ? obj.completed : undefined,
              total: typeof obj.total === 'number' ? obj.total : undefined
            })
          }
        } catch {
          // ignore malformed progress lines
        }
      }
    }

    onProgress({ status: 'success' })
    return true
  } catch (err) {
    onProgress({ status: 'error', error: (err as Error)?.message || String(err) })
    return false
  }
}