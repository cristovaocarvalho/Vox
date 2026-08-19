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

  console.log('[STT] Transcrevendo mídia:', {
    provider: provider.id,
    model,
    audioSize: audioBuffer.length,
    mimeType,
    specifiedLanguage: language || 'auto-detect'
  })

  try {
    const file = new File([new Uint8Array(audioBuffer)], fileName, { type: mimeType })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)
    
    // Se language for informado explicitamente (ex: 'pt'), adiciona a flag
    if (language) {
      formData.append('language', language)
    }
    
    formData.append('response_format', 'verbose_json')

    // Usar apenas vocabulário pessoal como prompt de apoio ao Whisper para evitar alucinações
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

    // Filtrar alucinações conhecidas do Whisper em áudios curtos ou com ruído/silêncio
    const lower = text.toLowerCase().replace(/[.!?,:;]/g, '').trim()
    const isHallucination =
      /^a cidade (no|do|de) brasil$/i.test(lower) ||
      /^a cidade de s[aã]o paulo$/i.test(lower) ||
      /^legendas (pela|por|da|para)/i.test(lower) ||
      /^subt[ií]tulos/i.test(lower) ||
      /^sous-titres/i.test(lower) ||
      /^transcri[cç][aã]o/i.test(lower) ||
      /^obrigad[oa]( por assistir)?$/i.test(lower) ||
      /^thank you( for watching)?$/i.test(lower) ||
      /^thanks( for watching)?$/i.test(lower) ||
      /^inscreva-se/i.test(lower) ||
      /^deixe seu (like|joinha)/i.test(lower) ||
      /^amara\.org/i.test(lower) ||
      /^(tchau|bye bye|you|sil[eê]ncio|m[uú]sica|aplausos)$/i.test(lower) ||
      /^\[(música|music|silence|inaudible|aplausos|som de fundo)\]$/i.test(lower) ||
      /^\((música|music|silence|inaudible|aplausos|som de fundo)\)$/i.test(lower)

    if (isHallucination) {
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
      console.log(`[STT] Segmentos descartados por alta probabilidade de silêncio/ruído: "${text}"`)
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
      segments,
      duration
    }
  } catch (error: any) {
    console.error('[STT] Exceção na API:', error)
    return {
      text: `[Erro na transcrição] ${error?.message || 'Ocorreu um erro ao processar o áudio.'}`,
      segments: [],
      duration: 0
    }
  }
}
