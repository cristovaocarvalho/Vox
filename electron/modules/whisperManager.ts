import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('electron')

export interface WhisperModelDefinition {
  id: string
  name: string
  filename: string
  downloadUrl: string
  size: number
  sizeFormatted: string
  speed: number
  accuracy: number
  recommended?: boolean
}

export const WHISPER_LOCAL_CATALOG: WhisperModelDefinition[] = [
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo',
    filename: 'ggml-large-v3-turbo.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    size: 1.5 * 1024 * 1024 * 1024,
    sizeFormatted: '~1.5 GB',
    speed: 3.5,
    accuracy: 4.6,
    recommended: true
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large v3',
    filename: 'ggml-large-v3.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    size: 3.1 * 1024 * 1024 * 1024,
    sizeFormatted: '~3.1 GB',
    speed: 1.5,
    accuracy: 4.7
  },
  {
    id: 'whisper-medium',
    name: 'Whisper Medium',
    filename: 'ggml-medium.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    size: 1.5 * 1024 * 1024 * 1024,
    sizeFormatted: '~1.5 GB',
    speed: 2.0,
    accuracy: 4.3
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    filename: 'ggml-small.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    size: 488 * 1024 * 1024,
    sizeFormatted: '~488 MB',
    speed: 3.0,
    accuracy: 3.8
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    filename: 'ggml-base.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    size: 148 * 1024 * 1024,
    sizeFormatted: '~148 MB',
    speed: 4.0,
    accuracy: 3.0
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    filename: 'ggml-tiny.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    size: 78 * 1024 * 1024,
    sizeFormatted: '~78 MB',
    speed: 5.0,
    accuracy: 2.5
  }
]

export interface WhisperDownloadProgress {
  modelId: string
  status: 'downloading' | 'completed' | 'error' | 'cancelled'
  progress: number
  bytesDownloaded: number
  totalBytes: number
  error?: string
}

const activeDownloads = new Map<string, { abort: () => void }>()

export function getModelsDirectory(): string {
  const modelsDir = path.join(app.getPath('userData'), 'models')
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
  }
  return modelsDir
}

export function listDownloadedWhisperModels(): string[] {
  const modelsDir = getModelsDirectory()
  const downloaded: string[] = []

  for (const model of WHISPER_LOCAL_CATALOG) {
    const filePath = path.join(modelsDir, model.filename)
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        // Minimum size check (must be at least 1MB to avoid corrupted empty files)
        if (stats.size > 1024 * 1024) {
          downloaded.push(model.id)
        }
      }
    } catch {
      // ignore
    }
  }

  return downloaded
}

export function getDownloadedWhisperModelPath(modelId: string): string | null {
  const model = WHISPER_LOCAL_CATALOG.find((m) => m.id === modelId)
  if (!model) return null

  const filePath = path.join(getModelsDirectory(), model.filename)
  if (fs.existsSync(filePath)) {
    return filePath
  }
  return null
}

export function deleteWhisperModel(modelId: string): boolean {
  const model = WHISPER_LOCAL_CATALOG.find((m) => m.id === modelId)
  if (!model) return false

  const filePath = path.join(getModelsDirectory(), model.filename)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
  } catch (err) {
    console.error('[WhisperManager] Erro ao deletar modelo:', err)
  }
  return false
}

export function cancelWhisperDownload(modelId: string): boolean {
  const active = activeDownloads.get(modelId)
  if (active) {
    active.abort()
    activeDownloads.delete(modelId)
    const model = WHISPER_LOCAL_CATALOG.find((m) => m.id === modelId)
    if (model) {
      const tempPath = path.join(getModelsDirectory(), `${model.filename}.tmp`)
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
      } catch {
        // ignore
      }
    }
    return true
  }
  return false
}

function fetchWithRedirects(
  url: string,
  onResponse: (res: http.IncomingMessage) => void,
  onError: (err: Error) => void,
  maxRedirects = 5
): { abort: () => void } {
  let currentReq: http.ClientRequest | null = null
  let aborted = false

  const handleRequest = (currentUrl: string, redirectsLeft: number) => {
    if (aborted) return
    if (redirectsLeft < 0) {
      onError(new Error('Too many redirects'))
      return
    }

    const client = currentUrl.startsWith('https:') ? https : http
    const parsedUrl = new URL(currentUrl)

    currentReq = client.get(
      parsedUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Vox/2.0'
        }
      },
      (res) => {
        if (aborted) {
          res.resume()
          return
        }

        // Handle redirects (301, 302, 303, 307, 308)
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume()
          const nextUrl = new URL(res.headers.location, currentUrl).href
          handleRequest(nextUrl, redirectsLeft - 1)
          return
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume()
          onError(new Error(`HTTP error: ${res.statusCode} ${res.statusMessage || ''}`))
          return
        }

        onResponse(res)
      }
    )

    currentReq.on('error', (err) => {
      if (!aborted) onError(err)
    })
  }

  handleRequest(url, maxRedirects)

  return {
    abort: () => {
      aborted = true
      currentReq?.destroy()
    }
  }
}

export async function downloadWhisperModel(
  modelId: string,
  onProgress: (progress: WhisperDownloadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  const model = WHISPER_LOCAL_CATALOG.find((m) => m.id === modelId)
  if (!model) {
    return { success: false, error: 'Modelo não encontrado no catálogo' }
  }

  if (activeDownloads.has(modelId)) {
    return { success: false, error: 'Download já em andamento' }
  }

  const modelsDir = getModelsDirectory()
  const finalPath = path.join(modelsDir, model.filename)
  const tempPath = path.join(modelsDir, `${model.filename}.tmp`)

  return new Promise((resolve) => {
    let bytesDownloaded = 0
    let totalBytes = model.size
    let lastProgressTime = 0

    const fileStream = fs.createWriteStream(tempPath)

    const handle = fetchWithRedirects(
      model.downloadUrl,
      (res) => {
        const headerLen = parseInt(res.headers['content-length'] || '0', 10)
        if (headerLen > 0) {
          totalBytes = headerLen
        }

        res.on('data', (chunk: Buffer) => {
          fileStream.write(chunk)
          bytesDownloaded += chunk.length

          const now = Date.now()
          if (now - lastProgressTime > 100 || bytesDownloaded === totalBytes) {
            lastProgressTime = now
            const percent = totalBytes > 0 ? Math.min(100, Math.round((bytesDownloaded / totalBytes) * 100)) : 0
            onProgress({
              modelId,
              status: 'downloading',
              progress: percent,
              bytesDownloaded,
              totalBytes
            })
          }
        })

        res.on('end', () => {
          fileStream.end(() => {
            activeDownloads.delete(modelId)
            try {
              if (fs.existsSync(finalPath)) {
                fs.unlinkSync(finalPath)
              }
              fs.renameSync(tempPath, finalPath)

              onProgress({
                modelId,
                status: 'completed',
                progress: 100,
                bytesDownloaded: totalBytes,
                totalBytes
              })
              resolve({ success: true })
            } catch (err: any) {
              const errMsg = err?.message || 'Falha ao salvar arquivo final'
              onProgress({
                modelId,
                status: 'error',
                progress: 0,
                bytesDownloaded,
                totalBytes,
                error: errMsg
              })
              resolve({ success: false, error: errMsg })
            }
          })
        })

        res.on('error', (err) => {
          fileStream.close()
          activeDownloads.delete(modelId)
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
          } catch {
            // ignore
          }
          onProgress({
            modelId,
            status: 'error',
            progress: 0,
            bytesDownloaded,
            totalBytes,
            error: err.message
          })
          resolve({ success: false, error: err.message })
        })
      },
      (err) => {
        fileStream.close()
        activeDownloads.delete(modelId)
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
        } catch {
          // ignore
        }
        onProgress({
          modelId,
          status: 'error',
          progress: 0,
          bytesDownloaded,
          totalBytes,
          error: err.message
        })
        resolve({ success: false, error: err.message })
      }
    )

    activeDownloads.set(modelId, {
      abort: () => {
        handle.abort()
        fileStream.close()
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
        } catch {
          // ignore
        }
      }
    })
  })
}
