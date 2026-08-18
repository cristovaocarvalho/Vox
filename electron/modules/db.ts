import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import type { VoiceCommand, UserSnippet } from '../../src/types/commands'
import type { DictationTemplate } from '../../src/types/templates'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, safeStorage } = require('electron')

let Database: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Database = require('better-sqlite3')
} catch (e) {
  console.warn('[DB] Módulo nativo better-sqlite3 não encontrado, usando fallback seguro:', e)
}

export interface Session {
  id: string
  type: 'dictation'
  title?: string
  source?: string
  platform?: string
  model?: string
  language?: string
  duration?: number
  text: string
  rawText?: string
  segments?: string | any[]
  exportPaths?: string | string[]
  audioKept?: number
  createdAt: string
}

export interface ApiLogEntry {
  id: string
  createdAt: string
  provider: string
  endpoint: string
  operation: string
  model?: string
  bytesSent: number
}

export interface CorrectionEntry {
  raw: string
  corrected: string
  count: number
}

let dbInstance: any = null
let fallbackFileSettings: string | null = null
let fallbackFileSessions: string | null = null
let fallbackFileApiLogs: string | null = null
let fallbackFileCorrections: string | null = null
let fallbackFileVocabulary: string | null = null
let fallbackFileCommands: string | null = null
let fallbackFileSnippets: string | null = null
let fallbackFileOverrides: string | null = null
let fallbackFileTemplates: string | null = null
const stmtCache = new Map<string, any>()

function encryptValue(plainText: string): string {
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plainText)
      return 'scrypt:' + encrypted.toString('hex')
    }
  } catch (e) {
    console.warn('[DB] Falha ao encriptar com safeStorage:', e)
  }
  return 'plaintext:' + plainText
}

function decryptValue(storedValue: string): string {
  if (storedValue.startsWith('scrypt:')) {
    try {
      const hex = storedValue.substring(7)
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(Buffer.from(hex, 'hex'))
        return decrypted
      }
    } catch (e) {
      console.error('[DB] Falha ao decriptar valor do safeStorage:', e)
    }
    return ''
  }
  if (storedValue.startsWith('plaintext:')) {
    return storedValue.substring(10)
  }
  return storedValue
}

function cachedStmt(sql: string) {
  if (!dbInstance) return null
  let stmt = stmtCache.get(sql)
  if (!stmt) {
    stmt = dbInstance.prepare(sql)
    stmtCache.set(sql, stmt)
  }
  return stmt
}

export function initDatabase() {
  try {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    const dbPath = path.join(userDataPath, 'vox_settings.db')
    fallbackFileSettings = path.join(userDataPath, 'vox_settings.json')
    fallbackFileSessions = path.join(userDataPath, 'vox_sessions.json')
    fallbackFileApiLogs = path.join(userDataPath, 'vox_api_logs.json')
    fallbackFileCorrections = path.join(userDataPath, 'vox_corrections.json')
    fallbackFileVocabulary = path.join(userDataPath, 'vox_vocabulary.json')
    fallbackFileCommands = path.join(userDataPath, 'vox_commands.json')
    fallbackFileSnippets = path.join(userDataPath, 'vox_snippets.json')
    fallbackFileOverrides = path.join(userDataPath, 'vox_command_overrides.json')
    fallbackFileTemplates = path.join(userDataPath, 'vox_templates.json')

    if (Database) {
      dbInstance = new Database(dbPath)
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id          TEXT PRIMARY KEY,
          type        TEXT NOT NULL,
          title       TEXT,
          source      TEXT,
          platform    TEXT,
          model       TEXT,
          language    TEXT,
          duration    REAL,
          text        TEXT,
          rawText     TEXT,
          segments    TEXT,
          exportPaths TEXT,
          audioKept   INTEGER DEFAULT 0,
          createdAt   TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS api_logs (
          id         TEXT PRIMARY KEY,
          createdAt  TEXT NOT NULL,
          provider   TEXT,
          endpoint   TEXT,
          operation  TEXT,
          model      TEXT,
          bytesSent  INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS corrections (
          raw       TEXT NOT NULL,
          corrected TEXT NOT NULL,
          count     INTEGER DEFAULT 0,
          PRIMARY KEY (raw, corrected)
        );

        CREATE TABLE IF NOT EXISTS vocabulary (
          term      TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS custom_commands (
          id          TEXT PRIMARY KEY,
          label       TEXT NOT NULL,
          description TEXT,
          category    TEXT DEFAULT 'custom',
          trigger_pt  TEXT NOT NULL,
          trigger_en  TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_param TEXT NOT NULL,
          match_mode  TEXT DEFAULT 'isolated',
          is_enabled  INTEGER DEFAULT 1,
          created_at  TEXT NOT NULL,
          updated_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS default_command_overrides (
          command_id TEXT PRIMARY KEY,
          is_enabled INTEGER NOT NULL,
          match_mode TEXT
        );

        CREATE TABLE IF NOT EXISTS snippets (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL,
          trigger_pt TEXT NOT NULL,
          trigger_en TEXT NOT NULL,
          content    TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS custom_templates (
          id            TEXT PRIMARY KEY,
          label_pt      TEXT NOT NULL,
          label_en      TEXT NOT NULL,
          description   TEXT,
          icon          TEXT DEFAULT 'file-text',
          category      TEXT DEFAULT 'custom',
          system_prompt TEXT NOT NULL,
          voice_pt      TEXT,
          voice_en      TEXT,
          output_preview TEXT,
          is_enabled    INTEGER DEFAULT 1,
          created_at    TEXT NOT NULL,
          updated_at    TEXT NOT NULL
        );
      `)
      console.log('[DB] Banco de dados SQLite pronto em:', dbPath)
    } else {
      console.log('[DB] Usando fallback de arquivos de dados em:', userDataPath)
    }
  } catch (err) {
    console.error('[DB] Erro ao inicializar banco de dados:', err)
  }
}

export function getSetting(key: string, defaultValue = ''): string {
  try {
    if (dbInstance) {
      const stmt = cachedStmt('SELECT value FROM settings WHERE key = ?')
      const row = stmt.get(key)
      let val = row ? row.value : defaultValue
      if (key === 'apiKey' && val) {
        val = decryptValue(val)
      }
      return val
    }
    if (fallbackFileSettings && fs.existsSync(fallbackFileSettings)) {
      const data = JSON.parse(fs.readFileSync(fallbackFileSettings, 'utf-8'))
      let val = data[key] !== undefined ? data[key] : defaultValue
      if (key === 'apiKey' && val) {
        val = decryptValue(val)
      }
      return val
    }
  } catch (err) {
    console.error(`[DB] Erro ao obter configuração (${key}):`, err)
  }
  return defaultValue
}

export function setSetting(key: string, value: string) {
  try {
    let valToStore = value
    if (key === 'apiKey' && value) {
      valToStore = encryptValue(value)
    }
    if (dbInstance) {
      const stmt = cachedStmt(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `)
      stmt.run(key, valToStore)
      return
    }
    if (fallbackFileSettings) {
      let data: Record<string, string> = {}
      if (fs.existsSync(fallbackFileSettings)) {
        try {
          data = JSON.parse(fs.readFileSync(fallbackFileSettings, 'utf-8'))
        } catch {
          data = {}
        }
      }
      data[key] = valToStore
      fs.writeFileSync(fallbackFileSettings, JSON.stringify(data, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error(`[DB] Erro ao salvar configuração (${key}):`, err)
  }
}

export function getAllSettings() {
  let systemLanguage = 'pt-BR'
  try {
    const locale = app.getLocale() || 'pt-BR'
    if (locale.toLowerCase().startsWith('en')) {
      systemLanguage = 'en'
    }
  } catch (err) {
    console.error('[DB] Erro ao obter locale do sistema:', err)
  }

  const defaults = {
    apiKey: '',
    provider: 'groq',
    baseUrl: '',
    azureApiVersion: '',
    sttModel: 'whisper-large-v3-turbo',
    llmModel: 'llama-3.1-8b-instant',
    shortcutToggle: 'F10',
    shortcutPushToTalk: 'F9',
    shortcutClipboard: 'F11',
    commandInlineMode: 'false',
    activeTemplateId: '',
    wakeWordEnabled: 'true',
    wakeWordSensitivity: '0.5',
    language: systemLanguage,
    autoStartEnabled: 'true',
    muteSystemAudio: 'false',
    autoDetectLanguage: 'true',
    speechLanguage: 'pt',
    microphoneDeviceId: ''
  }

  const result: Record<string, string> = { ...defaults }

  for (const k of Object.keys(defaults)) {
    const val = getSetting(k, defaults[k as keyof typeof defaults])
    if (val) result[k] = val
  }

  if (result.llmModel === 'openai/gpt-oss-20b' && getSetting('llmModelMigrated', 'false') !== 'true') {
    result.llmModel = 'llama-3.1-8b-instant'
    setSetting('llmModel', 'llama-3.1-8b-instant')
    setSetting('llmModelMigrated', 'true')
  }

  return result
}

// ================= Sessions CRUD =================

export function saveSession(session: Session): void {
  try {
    const segmentsJson = typeof session.segments === 'object' ? JSON.stringify(session.segments) : (session.segments || null)
    const exportPathsJson = typeof session.exportPaths === 'object' ? JSON.stringify(session.exportPaths) : (session.exportPaths || null)

    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        INSERT INTO sessions (
          id, type, title, source, platform, model, language, duration,
          text, rawText, segments, exportPaths, audioKept, createdAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          title = excluded.title,
          source = excluded.source,
          platform = excluded.platform,
          model = excluded.model,
          language = excluded.language,
          duration = excluded.duration,
          text = excluded.text,
          rawText = excluded.rawText,
          segments = excluded.segments,
          exportPaths = excluded.exportPaths,
          audioKept = excluded.audioKept,
          createdAt = excluded.createdAt
      `)
      stmt.run(
        session.id,
        session.type,
        session.title || null,
        session.source || null,
        session.platform || null,
        session.model || null,
        session.language || null,
        session.duration || null,
        session.text || '',
        session.rawText || null,
        segmentsJson,
        exportPathsJson,
        session.audioKept ? 1 : 0,
        session.createdAt || new Date().toISOString()
      )
      return
    }

    if (fallbackFileSessions) {
      let sessions: Session[] = []
      if (fs.existsSync(fallbackFileSessions)) {
        try {
          sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, 'utf-8'))
        } catch {
          sessions = []
        }
      }
      const existingIdx = sessions.findIndex((s) => s.id === session.id)
      if (existingIdx >= 0) {
        sessions[existingIdx] = session
      } else {
        sessions.unshift(session)
      }
      fs.writeFileSync(fallbackFileSessions, JSON.stringify(sessions, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao salvar sessão:', err)
  }
}

function parseSessionRow(row: any): Session {
  let segments = row.segments
  if (typeof segments === 'string') {
    try {
      segments = JSON.parse(segments)
    } catch {
      // keep raw string
    }
  }
  let exportPaths = row.exportPaths
  if (typeof exportPaths === 'string') {
    try {
      exportPaths = JSON.parse(exportPaths)
    } catch {
      // keep raw string
    }
  }
  return {
    ...row,
    segments,
    exportPaths,
    audioKept: row.audioKept === 1 ? 1 : 0
  }
}

export function getSession(id: string): Session | null {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare('SELECT * FROM sessions WHERE id = ?')
      const row = stmt.get(id)
      return row ? parseSessionRow(row) : null
    }

    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      const sessions: Session[] = JSON.parse(fs.readFileSync(fallbackFileSessions, 'utf-8'))
      const found = sessions.find((s) => s.id === id)
      return found || null
    }
  } catch (err) {
    console.error(`[DB] Erro ao buscar sessão (${id}):`, err)
  }
  return null
}

export function listSessions(limit = 50, type?: string): Session[] {
  try {
    if (dbInstance) {
      let query = 'SELECT * FROM sessions'
      const params: any[] = []
      if (type) {
        query += ' WHERE type = ?'
        params.push(type)
      }
      query += ' ORDER BY datetime(createdAt) DESC LIMIT ?'
      params.push(limit)

      const stmt = dbInstance.prepare(query)
      const rows = stmt.all(...params)
      return rows.map(parseSessionRow)
    }

    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      let sessions: Session[] = JSON.parse(fs.readFileSync(fallbackFileSessions, 'utf-8'))
      if (type) {
        sessions = sessions.filter((s) => s.type === type)
      }
      return sessions.slice(0, limit)
    }
  } catch (err) {
    console.error('[DB] Erro ao listar sessões:', err)
  }
  return []
}

export function deleteSession(id: string): void {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare('DELETE FROM sessions WHERE id = ?')
      stmt.run(id)
      return
    }
    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      let sessions: Session[] = JSON.parse(fs.readFileSync(fallbackFileSessions, 'utf-8'))
      sessions = sessions.filter((s) => s.id !== id)
      fs.writeFileSync(fallbackFileSessions, JSON.stringify(sessions, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error(`[DB] Erro ao excluir sessão (${id}):`, err)
  }
}

export function clearAllSessions(): void {
  try {
    if (dbInstance) {
      dbInstance.exec('DELETE FROM sessions;')
      console.log('[DB] Todas as sessões foram excluídas do SQLite.')
      return
    }
    if (fallbackFileSessions) {
      fs.writeFileSync(fallbackFileSessions, JSON.stringify([], null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao limpar histórico de sessões:', err)
  }
}

export function searchSessions(query: string): Session[] {
  if (!query || !query.trim()) return listSessions(50)
  try {
    const term = `%${query.trim()}%`
    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        SELECT * FROM sessions
        WHERE text LIKE ? OR title LIKE ? OR source LIKE ?
        ORDER BY datetime(createdAt) DESC
        LIMIT 50
      `)
      const rows = stmt.all(term, term, term)
      return rows.map(parseSessionRow)
    }

    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      const sessions: Session[] = JSON.parse(fs.readFileSync(fallbackFileSessions, 'utf-8'))
      const q = query.toLowerCase()
      return sessions.filter((s) =>
        s.text.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.source && s.source.toLowerCase().includes(q))
      )
    }
  } catch (err) {
    console.error(`[DB] Erro ao pesquisar sessões (${query}):`, err)
  }
  return []
}

export interface DictationStats {
  totalWords: number
  totalSessions: number
  dailyContributions: Record<string, { count: number; words: number }>
}

export function getDictationStats(): DictationStats {
  try {
    let rows: { text: string; createdAt: string }[] = []
    if (dbInstance) {
      const stmt = dbInstance.prepare("SELECT text, createdAt FROM sessions WHERE type = 'dictation'")
      rows = stmt.all() as { text: string; createdAt: string }[]
    } else if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      const sessions: Session[] = JSON.parse(fs.readFileSync(fallbackFileSessions, 'utf-8'))
      rows = sessions.filter((s) => s.type === 'dictation').map((s) => ({ text: s.text, createdAt: s.createdAt }))
    }

    let totalWords = 0
    const dailyContributions: Record<string, { count: number; words: number }> = {}

    for (const row of rows) {
      if (!row.text) continue
      const words = row.text.trim().split(/\s+/).filter(Boolean).length
      totalWords += words

      if (row.createdAt) {
        const dateKey = row.createdAt.slice(0, 10)
        if (!dailyContributions[dateKey]) {
          dailyContributions[dateKey] = { count: 0, words: 0 }
        }
        dailyContributions[dateKey].count += 1
        dailyContributions[dateKey].words += words
      }
    }

    return {
      totalWords,
      totalSessions: rows.length,
      dailyContributions
    }
  } catch (err) {
    console.error('[DB] Erro ao obter estatísticas de ditado:', err)
    return { totalWords: 0, totalSessions: 0, dailyContributions: {} }
  }
}

// ================= API Logs (Privacy) =================

export function logApiCall(entry: Omit<ApiLogEntry, 'id' | 'createdAt'>): void {
  try {
    const record: ApiLogEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      provider: entry.provider || '',
      endpoint: entry.endpoint || '',
      operation: entry.operation || '',
      model: entry.model || null as any,
      bytesSent: entry.bytesSent || 0
    }

    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO api_logs (id, createdAt, provider, endpoint, operation, model, bytesSent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.createdAt,
        record.provider,
        record.endpoint,
        record.operation,
        record.model,
        record.bytesSent
      )
      return
    }

    if (fallbackFileApiLogs) {
      let logs: ApiLogEntry[] = []
      if (fs.existsSync(fallbackFileApiLogs)) {
        try {
          logs = JSON.parse(fs.readFileSync(fallbackFileApiLogs, 'utf-8'))
        } catch {
          logs = []
        }
      }
      logs.unshift(record)
      fs.writeFileSync(fallbackFileApiLogs, JSON.stringify(logs, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao registrar chamada de API:', err)
  }
}

export function listApiLogs(limit = 200): ApiLogEntry[] {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        SELECT * FROM api_logs
        ORDER BY datetime(createdAt) DESC
        LIMIT ?
      `)
      return stmt.all(limit)
    }

    if (fallbackFileApiLogs && fs.existsSync(fallbackFileApiLogs)) {
      const logs: ApiLogEntry[] = JSON.parse(fs.readFileSync(fallbackFileApiLogs, 'utf-8'))
      return logs.slice(0, limit)
    }
  } catch (err) {
    console.error('[DB] Erro ao listar logs de API:', err)
  }
  return []
}

export function clearApiLogs(): void {
  try {
    if (dbInstance) {
      dbInstance.exec('DELETE FROM api_logs;')
      return
    }
    if (fallbackFileApiLogs) {
      fs.writeFileSync(fallbackFileApiLogs, JSON.stringify([], null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao limpar logs de API:', err)
  }
}

// ================= Corrections (Pattern History) =================

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function extractCorrections(rawText: string, correctedText: string): Array<[string, string]> {
  const a = tokenize(rawText)
  const b = tokenize(correctedText)
  if (a.length === 0 || b.length === 0) return []

  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const matched: Array<[number, number]> = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matched.push([i, j])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }

  const corrections: Array<[string, string]> = []
  let prevI = -1
  let prevJ = -1
  const consumeGap = (fromI: number, toI: number, fromJ: number, toJ: number) => {
    const rawGap = a.slice(fromI, toI)
    const corrGap = b.slice(fromJ, toJ)
    const minLen = Math.min(rawGap.length, corrGap.length)
    for (let k = 0; k < minLen; k++) {
      if (rawGap[k] !== corrGap[k]) corrections.push([rawGap[k], corrGap[k]])
    }
  }

  for (const [mi, mj] of matched) {
    consumeGap(prevI + 1, mi, prevJ + 1, mj)
    prevI = mi
    prevJ = mj
  }
  consumeGap(prevI + 1, n, prevJ + 1, m)

  return corrections
}

export function recordCorrections(rawText: string, correctedText: string): void {
  if (!rawText || !correctedText) return

  const pairs = extractCorrections(rawText, correctedText).filter(
    ([r, c]) => r.length >= 3 && c.length >= 3 && r !== c
  )
  if (pairs.length === 0) return

  try {
    if (dbInstance) {
      const upsert = dbInstance.prepare(`
        INSERT INTO corrections (raw, corrected, count)
        VALUES (?, ?, 1)
        ON CONFLICT(raw, corrected) DO UPDATE SET count = count + 1
      `)
      for (const [r, c] of pairs) {
        upsert.run(r, c)
      }
      return
    }

    if (fallbackFileCorrections) {
      let corrections: Array<{ raw: string; corrected: string; count: number }> = []
      if (fs.existsSync(fallbackFileCorrections)) {
        try {
          corrections = JSON.parse(fs.readFileSync(fallbackFileCorrections, 'utf-8'))
        } catch {
          corrections = []
        }
      }
      for (const [r, c] of pairs) {
        const existing = corrections.find((e) => e.raw === r && e.corrected === c)
        if (existing) existing.count += 1
        else corrections.push({ raw: r, corrected: c, count: 1 })
      }
      fs.writeFileSync(fallbackFileCorrections, JSON.stringify(corrections, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao registrar correções:', err)
  }
}

export function getCorrectionDictionary(minCount = 2, limit = 50): CorrectionEntry[] {
  try {
    const rows: Array<{ raw: string; corrected: string; count: number }> = []
    if (dbInstance) {
      const stmt = dbInstance.prepare('SELECT raw, corrected, count FROM corrections')
      rows.push(...stmt.all())
    } else if (fallbackFileCorrections && fs.existsSync(fallbackFileCorrections)) {
      rows.push(...JSON.parse(fs.readFileSync(fallbackFileCorrections, 'utf-8')))
    }

    const map = new Map<string, { corrected: string; count: number; bestCount: number }>()
    for (const row of rows) {
      const cur = map.get(row.raw)
      if (!cur) {
        map.set(row.raw, { corrected: row.corrected, count: row.count, bestCount: row.count })
      } else {
        cur.count += row.count
        if (row.count > cur.bestCount) {
          cur.bestCount = row.count
          cur.corrected = row.corrected
        }
      }
    }

    return Array.from(map.entries())
      .map(([raw, v]) => ({ raw, corrected: v.corrected, count: v.count }))
      .filter((e) => e.count >= minCount && e.raw !== e.corrected)
      .sort((x, y) => y.count - x.count)
      .slice(0, limit)
  } catch (err) {
    console.error('[DB] Erro ao obter dicionário de correções:', err)
  }
  return []
}

export function getSessionCount(): number {
  try {
    if (dbInstance) {
      const row = dbInstance.prepare('SELECT COUNT(*) AS c FROM sessions').get()
      return row?.c || 0
    }
    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      const sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, 'utf-8'))
      return Array.isArray(sessions) ? sessions.length : 0
    }
  } catch (err) {
    console.error('[DB] Erro ao contar sessões:', err)
  }
  return 0
}

// ================= Personal Vocabulary =================

export function addVocabularyTerm(term: string): void {
  const cleaned = (term || '').trim()
  if (!cleaned) return

  try {
    const record = { term: cleaned, createdAt: new Date().toISOString() }
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO vocabulary (term, createdAt)
        VALUES (?, ?)
        ON CONFLICT(term) DO NOTHING
      `).run(record.term, record.createdAt)
      return
    }

    if (fallbackFileVocabulary) {
      let terms: Array<{ term: string; createdAt: string }> = []
      if (fs.existsSync(fallbackFileVocabulary)) {
        try {
          terms = JSON.parse(fs.readFileSync(fallbackFileVocabulary, 'utf-8'))
        } catch {
          terms = []
        }
      }
      if (!terms.some((t) => t.term.toLowerCase() === cleaned.toLowerCase())) {
        terms.unshift(record)
        fs.writeFileSync(fallbackFileVocabulary, JSON.stringify(terms, null, 2), 'utf-8')
      }
    }
  } catch (err) {
    console.error('[DB] Erro ao adicionar termo ao vocabulário:', err)
  }
}

export function listVocabulary(): string[] {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare('SELECT term FROM vocabulary ORDER BY datetime(createdAt) ASC').all()
      return rows.map((r: any) => r.term)
    }
    if (fallbackFileVocabulary && fs.existsSync(fallbackFileVocabulary)) {
      const terms = JSON.parse(fs.readFileSync(fallbackFileVocabulary, 'utf-8'))
      return (terms || []).map((t: any) => t.term)
    }
  } catch (err) {
    console.error('[DB] Erro ao listar vocabulário:', err)
  }
  return []
}

export function removeVocabularyTerm(term: string): void {
  try {
    if (dbInstance) {
      dbInstance.prepare('DELETE FROM vocabulary WHERE term = ?').run(term)
      return
    }
    if (fallbackFileVocabulary && fs.existsSync(fallbackFileVocabulary)) {
      const terms = JSON.parse(fs.readFileSync(fallbackFileVocabulary, 'utf-8'))
      const filtered = (terms || []).filter((t: any) => t.term !== term)
      fs.writeFileSync(fallbackFileVocabulary, JSON.stringify(filtered, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao remover termo do vocabulário:', err)
  }
}

export function clearVocabulary(): void {
  try {
    if (dbInstance) {
      dbInstance.exec('DELETE FROM vocabulary;')
      return
    }
    if (fallbackFileVocabulary) {
      fs.writeFileSync(fallbackFileVocabulary, JSON.stringify([], null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao limpar vocabulário:', err)
  }
}

// ================= Voice Commands =================

export interface DefaultCommandOverride {
  commandId: string
  isEnabled: boolean
  matchMode?: 'isolated' | 'inline'
}

function parseCustomCommandRow(row: any): VoiceCommand {
  let pt: string[] = []
  let en: string[] = []
  let param: any = ''
  try { pt = JSON.parse(row.trigger_pt || '[]') } catch { /* ignore */ }
  try { en = JSON.parse(row.trigger_en || '[]') } catch { /* ignore */ }
  try { param = JSON.parse(row.action_param || '""') } catch { param = row.action_param || '' }
  return {
    id: row.id,
    isDefault: false,
    isEnabled: !!row.is_enabled,
    category: row.category || 'custom',
    label: row.label || '',
    description: row.description || '',
    triggers: { pt: Array.isArray(pt) ? pt : [], en: Array.isArray(en) ? en : [] },
    action: { type: row.action_type || 'inject_text', parameter: param },
    matchMode: row.match_mode === 'inline' ? 'inline' : 'isolated',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listCustomCommands(): VoiceCommand[] {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare('SELECT * FROM custom_commands ORDER BY datetime(created_at) ASC').all()
      return rows.map(parseCustomCommandRow)
    }
    if (fallbackFileCommands && fs.existsSync(fallbackFileCommands)) {
      return JSON.parse(fs.readFileSync(fallbackFileCommands, 'utf-8'))
    }
  } catch (err) {
    console.error('[DB] Erro ao listar comandos personalizados:', err)
  }
  return []
}

export function saveCustomCommand(cmd: VoiceCommand): void {
  try {
    const record = {
      id: cmd.id,
      label: cmd.label,
      description: cmd.description || '',
      category: cmd.category || 'custom',
      trigger_pt: JSON.stringify(cmd.triggers.pt || []),
      trigger_en: JSON.stringify(cmd.triggers.en || []),
      action_type: cmd.action.type,
      action_param: JSON.stringify(cmd.action.parameter ?? ''),
      match_mode: cmd.matchMode,
      is_enabled: cmd.isEnabled ? 1 : 0,
      created_at: cmd.createdAt || new Date().toISOString(),
      updated_at: cmd.updatedAt || new Date().toISOString()
    }
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO custom_commands (id, label, description, category, trigger_pt, trigger_en, action_type, action_param, match_mode, is_enabled, created_at, updated_at)
        VALUES (@id, @label, @description, @category, @trigger_pt, @trigger_en, @action_type, @action_param, @match_mode, @is_enabled, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          label = excluded.label,
          description = excluded.description,
          category = excluded.category,
          trigger_pt = excluded.trigger_pt,
          trigger_en = excluded.trigger_en,
          action_type = excluded.action_type,
          action_param = excluded.action_param,
          match_mode = excluded.match_mode,
          is_enabled = excluded.is_enabled,
          updated_at = excluded.updated_at
      `).run(record)
      return
    }
    if (fallbackFileCommands) {
      let commands: VoiceCommand[] = []
      if (fs.existsSync(fallbackFileCommands)) {
        try { commands = JSON.parse(fs.readFileSync(fallbackFileCommands, 'utf-8')) } catch { commands = [] }
      }
      const idx = commands.findIndex((c) => c.id === cmd.id)
      const parsed = parseCustomCommandRow(record)
      if (idx >= 0) commands[idx] = parsed
      else commands.push(parsed)
      fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao salvar comando personalizado:', err)
  }
}

export function deleteCustomCommand(id: string): void {
  try {
    if (dbInstance) {
      dbInstance.prepare('DELETE FROM custom_commands WHERE id = ?').run(id)
      return
    }
    if (fallbackFileCommands && fs.existsSync(fallbackFileCommands)) {
      const commands = JSON.parse(fs.readFileSync(fallbackFileCommands, 'utf-8'))
      fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands.filter((c: VoiceCommand) => c.id !== id), null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao excluir comando personalizado:', err)
  }
}

export function listDefaultOverrides(): DefaultCommandOverride[] {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare('SELECT command_id, is_enabled, match_mode FROM default_command_overrides').all() as Array<{ command_id: string; is_enabled: number; match_mode: string | null }>
      return rows.map((r) => ({ commandId: r.command_id, isEnabled: !!r.is_enabled, matchMode: r.match_mode === 'inline' ? 'inline' : 'isolated' }))
    }
    if (fallbackFileOverrides && fs.existsSync(fallbackFileOverrides)) {
      return JSON.parse(fs.readFileSync(fallbackFileOverrides, 'utf-8'))
    }
  } catch (err) {
    console.error('[DB] Erro ao listar overrides:', err)
  }
  return []
}

export function setDefaultOverride(commandId: string, isEnabled: boolean, matchMode?: 'isolated' | 'inline'): void {
  try {
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO default_command_overrides (command_id, is_enabled, match_mode)
        VALUES (?, ?, ?)
        ON CONFLICT(command_id) DO UPDATE SET is_enabled = excluded.is_enabled, match_mode = excluded.match_mode
      `).run(commandId, isEnabled ? 1 : 0, matchMode || null)
      return
    }
    if (fallbackFileOverrides) {
      let overrides: DefaultCommandOverride[] = []
      if (fs.existsSync(fallbackFileOverrides)) {
        try { overrides = JSON.parse(fs.readFileSync(fallbackFileOverrides, 'utf-8')) } catch { overrides = [] }
      }
      const idx = overrides.findIndex((o) => o.commandId === commandId)
      const entry = { commandId, isEnabled, matchMode }
      if (idx >= 0) overrides[idx] = entry
      else overrides.push(entry)
      fs.writeFileSync(fallbackFileOverrides, JSON.stringify(overrides, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao definir override de comando:', err)
  }
}

// ================= Snippets =================

function parseSnippetRow(row: any): UserSnippet {
  return {
    id: row.id,
    name: row.name || '',
    triggerPt: row.trigger_pt || '',
    triggerEn: row.trigger_en || '',
    content: row.content || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function cleanupDuplicateSnippets(): void {
  try {
    if (dbInstance) {
      const allRows = dbInstance.prepare(`
        SELECT * FROM snippets 
        ORDER BY CASE WHEN content IS NOT NULL AND content != '' THEN 0 ELSE 1 END,
                 datetime(updated_at) DESC,
                 datetime(created_at) DESC
      `).all()
      
      const seen = new Set<string>()
      const idsToDelete: string[] = []
      
      for (const row of allRows) {
        const key = (row.name || '').trim().toLowerCase()
        if (seen.has(key)) {
          idsToDelete.push(row.id)
        } else {
          seen.add(key)
        }
      }
      
      if (idsToDelete.length > 0) {
        const deleteStmt = dbInstance.prepare('DELETE FROM snippets WHERE id = ?')
        for (const id of idsToDelete) {
          deleteStmt.run(id)
        }
        console.log(`[DB] Limpeza de snippets: ${idsToDelete.length} duplicados removidos com sucesso.`)
      }
      return
    }

    if (fallbackFileSnippets && fs.existsSync(fallbackFileSnippets)) {
      let snippets: UserSnippet[] = []
      try { snippets = JSON.parse(fs.readFileSync(fallbackFileSnippets, 'utf-8')) } catch { snippets = [] }
      const seen = new Set<string>()
      const uniqueSnippets: UserSnippet[] = []
      for (const s of snippets) {
        const key = (s.name || '').trim().toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          uniqueSnippets.push(s)
        }
      }
      if (uniqueSnippets.length !== snippets.length) {
        fs.writeFileSync(fallbackFileSnippets, JSON.stringify(uniqueSnippets, null, 2), 'utf-8')
      }
    }
  } catch (err) {
    console.error('[DB] Erro ao limpar snippets duplicados:', err)
  }
}

export function seedSnippets(placeholders: Array<{ name: string; triggerPt: string; triggerEn: string }>): void {
  try {
    cleanupDuplicateSnippets()
    const now = new Date().toISOString()
    for (const p of placeholders) {
      if (dbInstance) {
        const existing = dbInstance.prepare('SELECT id FROM snippets WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(p.name)
        if (!existing) {
          dbInstance.prepare(`
            INSERT INTO snippets (id, name, trigger_pt, trigger_en, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, '', ?, ?)
          `).run(crypto.randomUUID(), p.name, p.triggerPt, p.triggerEn, now, now)
        }
      } else if (fallbackFileSnippets) {
        let snippets: UserSnippet[] = []
        if (fs.existsSync(fallbackFileSnippets)) {
          try { snippets = JSON.parse(fs.readFileSync(fallbackFileSnippets, 'utf-8')) } catch { snippets = [] }
        }
        if (!snippets.some((s) => s.name.trim().toLowerCase() === p.name.trim().toLowerCase())) {
          snippets.push({ id: crypto.randomUUID(), name: p.name, triggerPt: p.triggerPt, triggerEn: p.triggerEn, content: '', createdAt: now, updatedAt: now })
          fs.writeFileSync(fallbackFileSnippets, JSON.stringify(snippets, null, 2), 'utf-8')
        }
      }
    }
  } catch (err) {
    console.error('[DB] Erro ao semear snippets:', err)
  }
}

export function listSnippets(): UserSnippet[] {
  try {
    cleanupDuplicateSnippets()
    if (dbInstance) {
      const rows = dbInstance.prepare('SELECT * FROM snippets ORDER BY datetime(created_at) ASC').all()
      return rows.map(parseSnippetRow)
    }
    if (fallbackFileSnippets && fs.existsSync(fallbackFileSnippets)) {
      return JSON.parse(fs.readFileSync(fallbackFileSnippets, 'utf-8'))
    }
  } catch (err) {
    console.error('[DB] Erro ao listar snippets:', err)
  }
  return []
}

export function saveSnippet(snippet: UserSnippet): void {
  try {
    const record = {
      id: snippet.id,
      name: snippet.name,
      trigger_pt: snippet.triggerPt,
      trigger_en: snippet.triggerEn,
      content: snippet.content,
      created_at: snippet.createdAt || new Date().toISOString(),
      updated_at: snippet.updatedAt || new Date().toISOString()
    }
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO snippets (id, name, trigger_pt, trigger_en, content, created_at, updated_at)
        VALUES (@id, @name, @trigger_pt, @trigger_en, @content, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          trigger_pt = excluded.trigger_pt,
          trigger_en = excluded.trigger_en,
          content = excluded.content,
          updated_at = excluded.updated_at
      `).run(record)
      return
    }
    if (fallbackFileSnippets) {
      let snippets: UserSnippet[] = []
      if (fs.existsSync(fallbackFileSnippets)) {
        try { snippets = JSON.parse(fs.readFileSync(fallbackFileSnippets, 'utf-8')) } catch { snippets = [] }
      }
      const idx = snippets.findIndex((s) => s.id === snippet.id)
      if (idx >= 0) snippets[idx] = parseSnippetRow(record)
      else snippets.push(parseSnippetRow(record))
      fs.writeFileSync(fallbackFileSnippets, JSON.stringify(snippets, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao salvar snippet:', err)
  }
}

export function deleteSnippet(id: string): void {
  try {
    if (dbInstance) {
      dbInstance.prepare('DELETE FROM snippets WHERE id = ?').run(id)
      return
    }
    if (fallbackFileSnippets && fs.existsSync(fallbackFileSnippets)) {
      const snippets = JSON.parse(fs.readFileSync(fallbackFileSnippets, 'utf-8'))
      fs.writeFileSync(fallbackFileSnippets, JSON.stringify(snippets.filter((s: UserSnippet) => s.id !== id), null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao excluir snippet:', err)
  }
}

// ================= Custom Templates =================

function parseTemplateRow(row: any): DictationTemplate {
  let voicePt: string[] = []
  let voiceEn: string[] = []
  try { voicePt = JSON.parse(row.voice_pt || '[]') } catch { /* ignore */ }
  try { voiceEn = JSON.parse(row.voice_en || '[]') } catch { /* ignore */ }
  return {
    id: row.id,
    isDefault: false,
    isEnabled: !!row.is_enabled,
    label: row.label_pt || row.label_en || '',
    labelPt: row.label_pt || '',
    labelEn: row.label_en || '',
    description: row.description || '',
    icon: row.icon || 'file-text',
    category: row.category || 'custom',
    systemPrompt: row.system_prompt || '',
    voiceTriggerPt: Array.isArray(voicePt) ? voicePt : [],
    voiceTriggerEn: Array.isArray(voiceEn) ? voiceEn : [],
    outputPreview: row.output_preview || '',
    supportsStreaming: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listCustomTemplates(): DictationTemplate[] {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare('SELECT * FROM custom_templates ORDER BY datetime(created_at) ASC').all()
      return rows.map(parseTemplateRow)
    }
    if (fallbackFileTemplates && fs.existsSync(fallbackFileTemplates)) {
      return JSON.parse(fs.readFileSync(fallbackFileTemplates, 'utf-8'))
    }
  } catch (err) {
    console.error('[DB] Erro ao listar templates personalizados:', err)
  }
  return []
}

export function saveCustomTemplate(template: DictationTemplate): void {
  try {
    const record = {
      id: template.id,
      label_pt: template.labelPt || template.label,
      label_en: template.labelEn || template.label,
      description: template.description || '',
      icon: template.icon || 'file-text',
      category: template.category || 'custom',
      system_prompt: template.systemPrompt || '',
      voice_pt: JSON.stringify(template.voiceTriggerPt || []),
      voice_en: JSON.stringify(template.voiceTriggerEn || []),
      output_preview: template.outputPreview || '',
      is_enabled: template.isEnabled ? 1 : 0,
      created_at: template.createdAt || new Date().toISOString(),
      updated_at: template.updatedAt || new Date().toISOString()
    }
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO custom_templates (id, label_pt, label_en, description, icon, category, system_prompt, voice_pt, voice_en, output_preview, is_enabled, created_at, updated_at)
        VALUES (@id, @label_pt, @label_en, @description, @icon, @category, @system_prompt, @voice_pt, @voice_en, @output_preview, @is_enabled, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          label_pt = excluded.label_pt,
          label_en = excluded.label_en,
          description = excluded.description,
          icon = excluded.icon,
          category = excluded.category,
          system_prompt = excluded.system_prompt,
          voice_pt = excluded.voice_pt,
          voice_en = excluded.voice_en,
          output_preview = excluded.output_preview,
          is_enabled = excluded.is_enabled,
          updated_at = excluded.updated_at
      `).run(record)
      return
    }
    if (fallbackFileTemplates) {
      let templates: DictationTemplate[] = []
      if (fs.existsSync(fallbackFileTemplates)) {
        try { templates = JSON.parse(fs.readFileSync(fallbackFileTemplates, 'utf-8')) } catch { templates = [] }
      }
      const idx = templates.findIndex((t) => t.id === template.id)
      const parsed = parseTemplateRow(record)
      if (idx >= 0) templates[idx] = parsed
      else templates.push(parsed)
      fs.writeFileSync(fallbackFileTemplates, JSON.stringify(templates, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao salvar template personalizado:', err)
  }
}

export function deleteCustomTemplate(id: string): void {
  try {
    if (dbInstance) {
      dbInstance.prepare('DELETE FROM custom_templates WHERE id = ?').run(id)
      return
    }
    if (fallbackFileTemplates && fs.existsSync(fallbackFileTemplates)) {
      const templates = JSON.parse(fs.readFileSync(fallbackFileTemplates, 'utf-8'))
      fs.writeFileSync(fallbackFileTemplates, JSON.stringify(templates.filter((t: DictationTemplate) => t.id !== id), null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[DB] Erro ao excluir template personalizado:', err)
  }
}


export default {
  initDatabase,
  getSetting,
  setSetting,
  getAllSettings,
  saveSession,
  getSession,
  listSessions,
  deleteSession,
  clearAllSessions,
  searchSessions,
  logApiCall,
  listApiLogs,
  clearApiLogs,
  recordCorrections,
  getCorrectionDictionary,
  getSessionCount,
  addVocabularyTerm,
  listVocabulary,
  removeVocabularyTerm,
  clearVocabulary,
  listCustomCommands,
  saveCustomCommand,
  deleteCustomCommand,
  listDefaultOverrides,
  setDefaultOverride,
  cleanupDuplicateSnippets,
  seedSnippets,
  listSnippets,
  saveSnippet,
  deleteSnippet,
  listCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  getDictationStats
}
