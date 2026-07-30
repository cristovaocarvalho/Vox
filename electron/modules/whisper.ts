import { transcribeWithNvidia, TranscriptionResult } from './stt'

export type { TranscriptionResult }

export async function transcribe(audioBuffer: Buffer, language = 'pt'): Promise<TranscriptionResult> {
  return transcribeWithNvidia(audioBuffer, language)
}

export default {
  transcribe
}
