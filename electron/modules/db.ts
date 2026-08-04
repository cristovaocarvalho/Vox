import path from 'path'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('electron')

let Database: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Database = require('better-sqlite3')
} catch (e) {
  console.warn('[DB] Módulo nativo better-sqlite3 não encontrado, usando fallback seguro:', e)
}

export interface Session {
  id: string
  type: 'dictation' | 'media'
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

let dbInstance: any = null
let fallbackFileSettings: string | null = null
let fallbackFileSessions: string | null = null

export function initDatabase() {
  try {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    const dbPath = path.join(userDataPath, 'vox_settings.db')
    fallbackFileSettings = path.join(userDataPath, 'vox_settings.json')
    fallbackFileSessions = path.join(userDataPath, 'vox_sessions.json')

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
      const stmt = dbInstance.prepare('SELECT value FROM settings WHERE key = ?')
      const row = stmt.get(key)
      return row ? row.value : defaultValue
    }
    if (fallbackFileSettings && fs.existsSync(fallbackFileSettings)) {
      const data = JSON.parse(fs.readFileSync(fallbackFileSettings, 'utf-8'))
      return data[key] !== undefined ? data[key] : defaultValue
    }
  } catch (err) {
    console.error(`[DB] Erro ao obter configuração (${key}):`, err)
  }
  return defaultValue
}

export function setSetting(key: string, value: string) {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `)
      stmt.run(key, value)
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
      data[key] = value
      fs.writeFileSync(fallbackFileSettings, JSON.stringify(data, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error(`[DB] Erro ao salvar configuração (${key}):`, err)
  }
}

export function getAllSettings() {
  const defaults = {
    apiKey: '',
    sttModel: 'whisper-large-v3-turbo',
    llmModel: 'openai/gpt-oss-20b',
    shortcutToggle: 'F10',
    shortcutPushToTalk: 'F9',
    browserCookies: 'chrome',
    wakeWordEnabled: 'true',
    wakeWordSensitivity: '0.5',
    language: 'pt-BR'
  }

  const result: Record<string, string> = { ...defaults }

  for (const k of Object.keys(defaults)) {
    const val = getSetting(k, defaults[k as keyof typeof defaults])
    if (val) result[k] = val
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
  searchSessions
}
