import { TranscriptionResult } from './stt'

export interface ExportOptions {
  format: 'srt' | 'vtt' | 'txt' | 'md' | 'json'
  outputPath: string
  includeTimestamps: boolean
  title?: string
}

export async function exportTranscription(result: TranscriptionResult, options: ExportOptions): Promise<string> {
  console.log(`[Exporter] Exportando transcrição no formato '${options.format}' para ${options.outputPath}`)
  return options.outputPath
}

export default {
  exportTranscription
}
