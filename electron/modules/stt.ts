import { getSetting, logApiCall, listVocabulary } from './db'
import { resolveProvider, getSttEndpoint, getAuthHeaders } from './providers'

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  text: string
  rawText?: string
  segments: TranscriptionSegment[]
  duration: number
}

const DEFAULT_MODEL = 'whisper-large-v3-turbo'

const KNOWN_HALLUCINATIONS = [
  /^a cidade (no|do|de) brasil$/i,
  /^a cidade de s[aã]o paulo$/i,
  /^legendas (pela|por|da|para)/i,
  /^subt[ií]tulos/i,
  /^sous-titres/i,
  /^transcri[cç][aã]o/i,
  /^obrigad[oa]( por assistir)?$/i,
  /^thank you( for watching)?$/i,
  /^thanks( for watching)?$/i,
  /^inscreva-se/i,
  /^deixe seu (like|joinha)/i,
  /^amara\.org/i,
  /^(tchau|bye bye|you|sil[eê]ncio|m[uú]sica|aplausos|amado|rivoak)$/i,
  /^\[(música|music|silence|inaudible|aplausos|som de fundo)\]$/i,
  /^\((música|music|silence|inaudible|aplausos|som de fundo)\)$/i
]

export function isWhisperHallucination(text: string): boolean {
  if (!text) return true
  const lower = text.toLowerCase().replace(/[.!?,:;]/g, '').trim()
  if (!lower) return true
  return KNOWN_HALLUCINATIONS.some((regex) => regex.test(lower))
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  language?: string
): Promise<TranscriptionResult> {
  if (!audioBuffer || audioBuffer.length < 1000) {
    console.log('[STT] Áudio muito curto ou vazio, ignorando transcrição.')
    return { text: '', segments: [], duration: 0 }
  }

  const provider = resolveProvider()
  if (provider.requiresApiKey && !provider.apiKey) {
    console.warn('[STT] API Key não configurada.')
    const lang = getSetting('language', 'pt-BR')
    const msg = lang === 'en'
      ? '[Error: Configure your API Key in Vox settings]'
      : '[Erro: Configure sua API Key nas configurações do Vox]'
    return {
      text: msg,
      segments: [],
      duration: 0
    }
  }

  const model = getSetting('sttModel') || process.env.WHISPER_MODEL || DEFAULT_MODEL
  const endpoint = getSttEndpoint(model)

  const isWebm = audioBuffer.length >= 4 && audioBuffer[0] === 0x1a && audioBuffer[1] === 0x45 && audioBuffer[2] === 0xdf && audioBuffer[3] === 0xa3
  const mimeType = isWebm ? 'audio/webm' : 'audio/wav'
  const fileName = isWebm ? 'audio.webm' : 'audio.wav'

  // Normalização do código de idioma (ex: 'pt-BR' -> 'pt', 'en-US' -> 'en')
  let cleanLang = language
  if (cleanLang) {
    if (cleanLang.includes('-')) {
      cleanLang = cleanLang.split('-')[0]
    }
    if (cleanLang === 'auto' || cleanLang === 'auto-detect') {
      cleanLang = undefined
    }
  }

  console.log('[STT] Transcrevendo mídia:', {
    provider: provider.id,
    model,
    audioSize: audioBuffer.length,
    mimeType,
    specifiedLanguage: cleanLang || 'auto-detect'
  })

  try {
    const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: mimeType })
    const formData = new FormData()
    formData.append('file', blob, fileName)
    formData.append('model', model)
    
    if (cleanLang) {
      formData.append('language', cleanLang)
    }
    
    formData.append('response_format', 'verbose_json')

    // Vocabulário pessoal para suporte ao Whisper
    const customVocab = listVocabulary()
    if (customVocab && customVocab.length > 0) {
      formData.append('prompt', customVocab.slice(0, 50).join(', '))
    }

    formData.append('temperature', '0')

    logApiCall({
      provider: provider.id,
      endpoint,
      operation: 'stt',
      model,
      bytesSent: audioBuffer.length
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.warn(`[STT] Erro da API (${response.status}):`, errText)
      return {
        text: `[Erro ${response.status}] ${errText || 'Falha na comunicação'}`,
        segments: [],
        duration: 0
      }
    }

    const data = await response.json()
    let text = (data.text || '').trim()

    // Filtrar alucinações conhecidas do Whisper
    if (isWhisperHallucination(text)) {
      console.log(`[STT] Alucinação ignorada: "${text}"`)
      text = ''
    }

    const rawSegments = Array.isArray(data.segments) ? data.segments : []
    const validSegments = rawSegments.filter((s: any) => {
      if (typeof s.no_speech_prob === 'number' && s.no_speech_prob > 0.65) return false
      if (typeof s.avg_logprob === 'number' && s.avg_logprob < -1.1) return false
      return true
    })

    if (rawSegments.length > 0 && validSegments.length === 0) {
      console.log(`[STT] Segmentos descartados por alta probabilidade de ruído: "${text}"`)
      text = ''
    }

    const segments: TranscriptionSegment[] = validSegments.map((s: any) => ({
      start: s.start || 0,
      end: s.end || 0,
      text: s.text || ''
    }))

    const duration = data.duration || (segments.length > 0 ? segments[segments.length - 1].end : 0)

    return {
      text: text.trim(),
      rawText: data.text || '',
      segments,
      duration
    }
  } catch (err: any) {
    console.error('[STT] Falha na transcrição:', err)
    return {
      text: `[Erro de conexão: ${err?.message || 'Falha de rede'}]`,
      segments: [],
      duration: 0
    }
  }
}

export default {
  transcribeAudio
}
