import type { VoiceCommand, ParseResult, ParsedSegment } from '../../src/types/commands'
import { COMMAND_TRANSLATIONS } from '../../src/data/commandTranslations'

interface CommandSpan {
  start: number
  end: number
  cmd: VoiceCommand
}

const PT_FUNCTION_WORDS = new Set(['de', 'do', 'da', 'em', 'para', 'que', 'com', 'uma', 'por'])

export class CommandParser {
  private registry: VoiceCommand[]
  private inlineModeEnabled: boolean
  private detectedLanguage: 'pt' | 'en' = 'en'

  constructor(registry: VoiceCommand[], inlineModeEnabled = true) {
    this.registry = registry
    this.inlineModeEnabled = inlineModeEnabled
  }

  parse(rawText: string, language: 'pt' | 'en' | 'auto' = 'auto'): ParseResult {
    const normalized = this.normalize(rawText)
    if (!normalized) {
      return { segments: [], hasCommands: false, hasContent: false, isMixed: false }
    }

    this.detectedLanguage = language === 'auto' ? this.detectLanguage(normalized) : language

    // a) Full-text command match (isolated or inline) + dynamic prefix capture.
    let dynamicMatch: { cmd: VoiceCommand; rest: string } | null = null
    for (const cmd of this.registry) {
      if (!cmd.isEnabled) continue
      for (const pattern of this.patterns(cmd)) {
        if (!cmd.dynamic && this.fullMatch(normalized, pattern)) {
          return {
            segments: [{ type: 'command', value: cmd.id, command: cmd }],
            hasCommands: true,
            hasContent: false,
            isMixed: false
          }
        }
        if (cmd.dynamic && !dynamicMatch) {
          const rest = this.prefixMatch(normalized, pattern)
          if (rest) {
            dynamicMatch = { cmd, rest }
          }
        }
      }
    }

    if (dynamicMatch) {
      return {
        segments: [{ type: 'command', value: dynamicMatch.cmd.id, command: dynamicMatch.cmd, params: [dynamicMatch.rest] }],
        hasCommands: true,
        hasContent: false,
        isMixed: false
      }
    }

    // c) Embedded inline commands → mixed.
    if (this.inlineModeEnabled) {
      const spans: CommandSpan[] = []
      for (const cmd of this.registry) {
        if (!cmd.isEnabled || cmd.matchMode !== 'inline') continue
        for (const pattern of this.patterns(cmd)) {
          try {
            const regex = new RegExp(pattern, 'gi')
            let m: RegExpExecArray | null
            while ((m = regex.exec(normalized)) !== null) {
              if (m[0].length === 0) {
                regex.lastIndex++
                continue
              }
              spans.push({ start: m.index, end: m.index + m[0].length, cmd })
            }
          } catch {
            // invalid regex → skip
          }
        }
      }

      if (spans.length > 0) {
        return this.buildMixed(normalized, spans)
      }
    }

    // b) Pure content.
    return {
      segments: [{ type: 'content', value: rawText, contentText: rawText }],
      hasCommands: false,
      hasContent: true,
      isMixed: false
    }
  }

  getDetectedLanguage(): 'pt' | 'en' {
    return this.detectedLanguage
  }

  private normalize(raw: string): string {
    let s = raw.toLowerCase()
    s = s.replace(/^\s+|\s+$/g, '')
    s = s.replace(/^[.,!?;:]+|[.,!?;:]+$/g, '')
    s = s.replace(/\s+/g, ' ')
    return s.trim()
  }

  private detectLanguage(text: string): 'pt' | 'en' {
    const words = text.split(/\s+/)
    let matches = 0
    for (const w of words) {
      if (PT_FUNCTION_WORDS.has(w)) matches++
    }
    return matches >= 3 ? 'pt' : 'en'
  }

  private patterns(cmd: VoiceCommand): string[] {
    const list: string[] = []
    if (cmd.triggers) {
      for (const langKey of Object.keys(cmd.triggers)) {
        const arr = (cmd.triggers as any)[langKey]
        if (Array.isArray(arr)) list.push(...arr)
      }
    }
    const tr = (COMMAND_TRANSLATIONS as any)[cmd.id]
    if (tr) {
      for (const langKey of Object.keys(tr)) {
        if (Array.isArray(tr[langKey]?.triggers)) {
          list.push(...tr[langKey].triggers)
        }
      }
    }
    return Array.from(new Set(list))
  }

  private prefixMatch(text: string, pattern: string): string | null {
    try {
      const m = new RegExp(`^(?:${pattern})(?:\\s+|$)`, 'i').exec(text)
      if (!m) return null
      return text.slice(m[0].length).trim()
    } catch {
      return null
    }
  }

  private fullMatch(text: string, pattern: string): boolean {
    try {
      const m = new RegExp(pattern, 'i').exec(text)
      return !!m && m[0].length === text.length
    } catch {
      return false
    }
  }

  private cleanContent(text: string): string {
    return text
      .replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '')
      .trim()
  }

  private buildMixed(normalized: string, spans: CommandSpan[]): ParseResult {
    spans.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))

    const kept: CommandSpan[] = []
    let lastEnd = -1
    for (const s of spans) {
      if (s.start < lastEnd) continue
      kept.push(s)
      lastEnd = s.end
    }

    const segments: ParsedSegment[] = []
    let cursor = 0
    for (const s of kept) {
      if (s.start > cursor) {
        const contentText = this.cleanContent(normalized.slice(cursor, s.start))
        if (contentText) segments.push({ type: 'content', value: contentText, contentText })
      }
      segments.push({ type: 'command', value: s.cmd.id, command: s.cmd })
      cursor = s.end
    }
    if (cursor < normalized.length) {
      const contentText = this.cleanContent(normalized.slice(cursor))
      if (contentText) segments.push({ type: 'content', value: contentText, contentText })
    }

    const hasCommands = segments.some((s) => s.type === 'command')
    const hasContent = segments.some((s) => s.type === 'content')
    return { segments, hasCommands, hasContent, isMixed: hasCommands && hasContent }
  }
}

export default CommandParser
