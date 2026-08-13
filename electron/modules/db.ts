import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

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
    wakeWordEnabled: 'true',
    wakeWordSensitivity: '0.5',
    language: systemLanguage,
    autoStartEnabled: 'true'
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
  clearVocabulary
}
