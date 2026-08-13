import type { VoiceCommand, ParseResult, ParsedSegment } from '../../src/types/commands'

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function getTriggers(cmd: VoiceCommand, language: string): string[] {
  const lang = language === 'en' ? 'en' : 'pt'
  const list = cmd.triggers[lang] && cmd.triggers[lang].length > 0 ? cmd.triggers[lang] : cmd.triggers.en
  return list || []
}

function matchWhole(text: string, pattern: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`, 'i').test(text)
  } catch {
    return false
  }
}

/**
 * Parses a raw transcription segment and classifies it into content and command
 * segments. Isolated commands must appear alone; inline commands can be embedded
 * inside content text.
 */
export function parseCommandText(
  rawText: string,
  commands: VoiceCommand[],
  language = 'pt-BR'
): ParseResult {
  const normalized = normalize(rawText)
  if (!normalized) {
    return { segments: [], hasCommands: false, hasContent: false, isMixed: false }
  }

  // 1. Isolated commands: the entire segment must be a command.
  for (const cmd of commands) {
    if (!cmd.isEnabled || cmd.matchMode !== 'isolated') continue
    for (const pattern of getTriggers(cmd, language)) {
      if (matchWhole(normalized, pattern)) {
        return {
          segments: [{ type: 'command', value: cmd.id, command: cmd }],
          hasCommands: true,
          hasContent: false,
          isMixed: false
        }
      }
    }
  }

  // 2. Inline commands: find all occurrences inside the text.
  const spans: Array<{ start: number; end: number; cmd: VoiceCommand }> = []
  for (const cmd of commands) {
    if (!cmd.isEnabled || cmd.matchMode !== 'inline') continue
    for (const pattern of getTriggers(cmd, language)) {
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
        // ignore invalid regex
      }
    }
  }

  if (spans.length === 0) {
    return {
      segments: [{ type: 'content', value: rawText, contentText: rawText }],
      hasCommands: false,
      hasContent: true,
      isMixed: false
    }
  }

  // 3. Resolve overlaps: earliest start wins; then longest match.
  spans.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
  const kept: typeof spans = []
  let lastEnd = -1
  for (const s of spans) {
    if (s.start < lastEnd) continue
    kept.push(s)
    lastEnd = s.end
  }

  // 4. Build the ordered segment list.
  const segments: ParsedSegment[] = []
  let cursor = 0
  for (const s of kept) {
    if (s.start > cursor) {
      const contentText = normalized.slice(cursor, s.start).trim()
      if (contentText) segments.push({ type: 'content', value: contentText, contentText })
    }
    segments.push({ type: 'command', value: s.cmd.id, command: s.cmd })
    cursor = s.end
  }
  if (cursor < normalized.length) {
    const contentText = normalized.slice(cursor).trim()
    if (contentText) segments.push({ type: 'content', value: contentText, contentText })
  }

  const hasCommands = segments.some((s) => s.type === 'command')
  const hasContent = segments.some((s) => s.type === 'content')
  return { segments, hasCommands, hasContent, isMixed: hasCommands && hasContent }
}

export default { parseCommandText }
