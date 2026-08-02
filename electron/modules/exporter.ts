import fs from 'fs'
import path from 'path'
import { TranscriptionResult } from './stt'

export interface ExportOptions {
  includeTimestamps?: boolean
  title?: string
}

function formatTimestamp(seconds: number, decimalSeparator: ',' | '.' = ','): string {
  const s = Math.max(0, seconds || 0)
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = Math.floor(s % 60)
  const millis = Math.floor((s % 1) * 1000)

  const hh = String(hrs).padStart(2, '0')
  const mm = String(mins).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  const mmm = String(millis).padStart(3, '0')

  return `${hh}:${mm}:${ss}${decimalSeparator}${mmm}`
}

function formatShortTimestamp(seconds: number): string {
  const s = Math.max(0, seconds || 0)
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = Math.floor(s % 60)

  const mm = String(mins).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

export function generateContent(
  result: TranscriptionResult,
  format: 'txt' | 'md' | 'srt' | 'vtt' | 'json' | string,
  options: ExportOptions = {}
): string {
  const title = options.title || 'Transcrição Vox'
  const includeTimestamps = options.includeTimestamps ?? false
  const segments = result.segments || []

  switch (format.toLowerCase()) {
    case 'txt': {
      if (includeTimestamps && segments.length > 0) {
        return segments
          .map((s) => `[${formatShortTimestamp(s.start)}] ${s.text.trim()}`)
          .join('\n')
      }
      return result.text
    }

    case 'md': {
      let content = `# ${title}\n\n`
      if (includeTimestamps && segments.length > 0) {
        content += segments
          .map((s) => `**[${formatShortTimestamp(s.start)}]** ${s.text.trim()}`)
          .join('\n\n')
      } else {
        content += result.text
      }
      return content
    }

    case 'srt': {
      if (segments.length > 0) {
        return segments
          .map((s, idx) => {
            const start = formatTimestamp(s.start, ',')
            const end = formatTimestamp(s.end, ',')
            return `${idx + 1}\n${start} --> ${end}\n${s.text.trim()}\n`
          })
          .join('\n')
      }
      const duration = result.duration || 10
      return `1\n00:00:00,000 --> ${formatTimestamp(duration, ',')}\n${result.text}\n`
    }

    case 'vtt': {
      let content = 'WEBVTT\n\n'
      if (segments.length > 0) {
        content += segments
          .map((s, idx) => {
            const start = formatTimestamp(s.start, '.')
            const end = formatTimestamp(s.end, '.')
            return `${idx + 1}\n${start} --> ${end}\n${s.text.trim()}\n`
          })
          .join('\n')
      } else {
        const duration = result.duration || 10
        content += `1\n00:00:00.000 --> ${formatTimestamp(duration, '.')}\n${result.text}\n`
      }
      return content
    }

    case 'json': {
      return JSON.stringify(
        {
          title,
          duration: result.duration,
          text: result.text,
          segments: result.segments,
          exportedAt: new Date().toISOString()
        },
        null,
        2
      )
    }

    default:
      return result.text
  }
}

export async function exportTranscription(
  result: TranscriptionResult,
  formats: string[],
  outputPath: string,
  options: ExportOptions = {}
): Promise<string[]> {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true })
  }

  const timestamp = Date.now()
  const sanitizedTitle = (options.title || 'vox_transcription')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, '_')
    .slice(0, 30)

  const createdFiles: string[] = []

  for (const fmt of formats) {
    const ext = fmt.toLowerCase().replace(/^\./, '')
    const fileName = `${sanitizedTitle}_${timestamp}.${ext}`
    const filePath = path.join(outputPath, fileName)
    const content = generateContent(result, ext, options)

    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`[Exporter] Arquivo exportado: ${filePath}`)
    createdFiles.push(filePath)
  }

  return createdFiles
}

export default {
  generateContent,
  exportTranscription,
  export: exportTranscription
}
