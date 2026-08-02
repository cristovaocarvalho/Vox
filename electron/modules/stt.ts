export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  duration: number
}

const GROQ_API_KEY = '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'
const GROQ_STT_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
const DEFAULT_MODEL = 'whisper-large-v3-turbo'

export async function transcribeAudio(
  audioBuffer: Buffer,
  language?: string
): Promise<TranscriptionResult> {
  if (!audioBuffer || audioBuffer.length < 1000) {
    console.log('[STT] Áudio muito curto ou vazio, ignorando transcrição.')
    return { text: '', segments: [], duration: 0 }
  }

  const apiKey = process.env.GROQ_API_KEY || GROQ_API_KEY
  const endpoint = GROQ_STT_ENDPOINT
  const model = process.env.WHISPER_MODEL || DEFAULT_MODEL

  const isWebm = audioBuffer.length >= 4 && audioBuffer[0] === 0x1a && audioBuffer[1] === 0x45 && audioBuffer[2] === 0xdf && audioBuffer[3] === 0xa3
  const mimeType = isWebm ? 'audio/webm' : 'audio/wav'
  const fileName = isWebm ? 'audio.webm' : 'audio.wav'

  console.log('[STT] Transcrevendo mídia:', {
    model,
    audioSize: audioBuffer.length,
    mimeType,
    specifiedLanguage: language || 'auto-detect (sem tradução)'
  })

  try {
    const file = new File([Uint8Array.from(audioBuffer)], fileName, { type: mimeType })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)
    
    // Se language for informado explicitamente (ex: 'pt'), adiciona a flag. Caso contrário, permite detecção automática
    if (language) {
      formData.append('language', language)
    }
    
    formData.append('response_format', 'verbose_json')
    formData.append('prompt', 'Transcrição direta e exata da fala no seu idioma original (sem traduzir para outro idioma).')
    formData.append('temperature', '0')

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.warn(`[STT] Erro da API Groq (${response.status}):`, errText)
      return {
        text: `[Erro Groq ${response.status}] ${errText || 'Falha na comunicação'}`,
        segments: [],
        duration: 0
      }
    }

    const data = await response.json()
    let text = (data.text || '').trim()

    // Filtrar alucinações comuns do Whisper em áudios curtos ou com silêncio
    const lower = text.toLowerCase().replace(/[.!?,]/g, '').trim()
    const hallucinations = [
      'obrigado',
      'obrigada',
      'obrigado por assistir',
      'legendas pela comunidade amara.org',
      'subtitles by',
      'transcrição',
      'tchau',
      'thank you',
      'thanks for watching'
    ]
    if (hallucinations.includes(lower)) {
      console.log(`[STT] Alucinação ignorada: "${text}"`)
      text = ''
    }
    const segments: TranscriptionSegment[] = Array.isArray(data.segments)
      ? data.segments.map((s: any) => ({
          start: s.start || 0,
          end: s.end || 0,
          text: s.text || ''
        }))
      : []

    const duration = data.duration || (segments.length > 0 ? segments[segments.length - 1].end : 0)

    return {
      text: text.trim(),
      segments,
      duration
    }
  } catch (error: any) {
    console.error('[STT] Exceção na API Groq:', error)
    return {
      text: `[Erro na transcrição] ${error?.message || 'Ocorreu um erro ao processar o áudio.'}`,
      segments: [],
      duration: 0
    }
  }
}

export const transcribeWithNvidia = transcribeAudio

export default {
  transcribeAudio,
  transcribeWithNvidia
}
