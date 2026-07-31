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

let dbInstance: any = null
let fallbackFile: string | null = null

export function initDatabase() {
  try {
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    const dbPath = path.join(userDataPath, 'vox_settings.db')
    fallbackFile = path.join(userDataPath, 'vox_settings.json')

    if (Database) {
      dbInstance = new Database(dbPath)
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
      console.log('[DB] Banco de dados SQLite pronto em:', dbPath)
    } else {
      console.log('[DB] Usando fallback de dados em:', fallbackFile)
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
    if (fallbackFile && fs.existsSync(fallbackFile)) {
      const data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'))
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
    if (fallbackFile) {
      let data: Record<string, string> = {}
      if (fs.existsSync(fallbackFile)) {
        try {
          data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'))
        } catch {
          data = {}
        }
      }
      data[key] = value
      fs.writeFileSync(fallbackFile, JSON.stringify(data, null, 2), 'utf-8')
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
    wakeWordSensitivity: '0.5'
  }

  const result: Record<string, string> = { ...defaults }

  for (const k of Object.keys(defaults)) {
    const val = getSetting(k, defaults[k as keyof typeof defaults])
    if (val) result[k] = val
  }

  return result
}

export default {
  initDatabase,
  getSetting,
  setSetting,
  getAllSettings
}
