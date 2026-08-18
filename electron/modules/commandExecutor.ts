import { exec } from 'child_process'
import { EventEmitter } from 'events'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { shell, clipboard } = require('electron')
import type { VoiceCommand, KeystrokeStep, UserSnippet } from '../../src/types/commands'
import { injectText, WindowRef } from './injector'

export interface ExecutionContext {
  windowRef: WindowRef
  lastTranscription: string
  language: 'pt' | 'en'
  snippets?: UserSnippet[]
  params?: string[]
}

interface ScriptResult {
  stdout: string
  stderr: string
  error?: string
}

function runPowerShell(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`powershell -NoProfile -WindowStyle Hidden -Command ${command}`, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

const SEND_KEYS_MAP: Record<string, string> = {
  Enter: '{ENTER}',
  Backspace: '{BACKSPACE}',
  Tab: '{TAB}',
  Delete: '{DELETE}',
  Escape: '{ESC}',
  Esc: '{ESC}',
  Home: '{HOME}',
  End: '{END}',
  PageUp: '{PGUP}',
  PageDown: '{PGDN}',
  Insert: '{INSERT}',
  Up: '{UP}',
  Down: '{DOWN}',
  Left: '{LEFT}',
  Right: '{RIGHT}',
  Space: ' ',
  PrintScreen: '{PRTSC}',
  F1: '{F1}', F2: '{F2}', F3: '{F3}', F4: '{F4}', F5: '{F5}', F6: '{F6}',
  F7: '{F7}', F8: '{F8}', F9: '{F9}', F10: '{F10}', F11: '{F11}', F12: '{F12}'
}

function toSendKeys(combo: string): string {
  const parts = combo.split('+').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return ''
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  const keyStr = SEND_KEYS_MAP[key] || (key.length === 1 ? key.toLowerCase() : `{${key.toUpperCase()}}`)
  const prefix = mods
    .map((m) => (m === 'Ctrl' ? '^' : m === 'Alt' ? '%' : m === 'Shift' ? '+' : m === 'Meta' || m === 'Cmd' || m === 'Win' ? '^' : ''))
    .join('')
  return prefix + keyStr
}

async function sendKeys(combos: string[]): Promise<void> {
  const keys = combos.map(toSendKeys).join('')
  if (!keys) return
  await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}')`)
}

async function sendKeySequence(steps: KeystrokeStep[]): Promise<void> {
  if (!steps || steps.length === 0) return
  const body = steps
    .map((s) => {
      const key = toSendKeys(s.key)
      const delay = Math.max(0, s.delayAfter || 0)
      return `[System.Windows.Forms.SendKeys]::SendWait('${key}'); Start-Sleep -Milliseconds ${delay}`
    })
    .join('; ')
  await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; ${body}`)
}

function dynamicValue(kind: string, language: 'pt' | 'en'): string {
  const now = new Date()
  const pt = language === 'pt'
  switch (kind) {
    case 'date':
      return pt
        ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(now)
        : new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(now)
    case 'time':
      return pt
        ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
        : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(now)
    case 'datetime':
      return `${dynamicValue('date', language)}, ${dynamicValue('time', language)}`
    default:
      return ''
  }
}

const APP_LAUNCH_MAP: Record<string, string[] | string> = {
  chrome: ['chrome.exe', 'chrome'],
  'google chrome': ['chrome.exe', 'chrome'],
  chromium: ['chrome.exe', 'chrome'],
  edge: ['msedge.exe'],
  'microsoft edge': ['msedge.exe'],
  firefox: ['firefox.exe'],
  brave: ['brave.exe'],
  opera: ['opera.exe'],
  vscode: ['code', 'Code.exe'],
  'visual studio code': ['code', 'Code.exe'],
  'vs code': ['code', 'Code.exe'],
  code: ['code', 'Code.exe'],
  notepad: ['notepad.exe'],
  'bloco de notas': ['notepad.exe'],
  calculator: ['calc.exe'],
  calculadora: ['calc.exe'],
  paint: ['mspaint.exe'],
  cmd: ['cmd.exe'],
  'prompt de comando': ['cmd.exe'],
  powershell: ['powershell.exe'],
  terminal: ['wt.exe', 'cmd.exe'],
  explorer: ['explorer.exe'],
  'file explorer': ['explorer.exe'],
  'explorador de arquivos': ['explorer.exe'],
  files: ['explorer.exe'],
  google: 'https://www.google.com',
  drive: 'https://drive.google.com',
  gmail: 'https://mail.google.com',
  'google mail': 'https://mail.google.com',
  email: 'https://mail.google.com',
  youtube: 'https://www.youtube.com',
  maps: 'https://www.google.com/maps',
  'google maps': 'https://www.google.com/maps',
  github: 'https://github.com',
  whatsapp: 'https://web.whatsapp.com',
  telegram: 'https://web.telegram.org',
  slack: 'https://app.slack.com',
  discord: 'https://discord.com/app',
  spotify: 'https://open.spotify.com',
  netflix: 'https://www.netflix.com',
  linkedin: 'https://www.linkedin.com',
  instagram: 'https://www.instagram.com',
  x: 'https://x.com',
  twitter: 'https://x.com',
  reddit: 'https://www.reddit.com',
  browser: 'browser',
  navegador: 'browser'
}

const SEARCH_ENGINES: Record<string, string> = {
  google: 'https://www.google.com/search?q=',
  youtube: 'https://www.youtube.com/results?search_query=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  ddg: 'https://duckduckgo.com/?q='
}

const BROWSER_EXE: Record<string, string> = {
  chrome: 'chrome.exe',
  'google chrome': 'chrome.exe',
  edge: 'msedge.exe',
  'microsoft edge': 'msedge.exe',
  firefox: 'firefox.exe',
  brave: 'brave.exe',
  browser: '',
  navegador: ''
}

function cleanAppName(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/[.!?,]+$/, '')
    .replace(/^(the|o|a|os|as|um|uma|my|meu|minha|meus|minhas)\s+/i, '')
    .trim()
}

function parseOpenSearch(input: string): { app: string; query: string } | null {
  const m = /^(.+?)\s+(?:and|e|y)\s+(?:search|pesquisar|pesquise|pesquisa|buscar|busque|procura|procurar)\b\s*(.*)$/i.exec(input)
  if (!m || !m[2] || !m[2].trim()) return null
  return { app: m[1].trim(), query: m[2].trim() }
}

async function openApp(name: string): Promise<void> {
  const rawName = cleanAppName(name).toLowerCase()
  if (!rawName) return

  // "chrome and search X" / "chrome e pesquisar X"
  const searchIntent = parseOpenSearch(rawName)
  if (searchIntent) {
    await openAppWithSearch(searchIntent.app, searchIntent.query)
    return
  }

  await openPlainApp(rawName)
}

async function openPlainApp(name: string): Promise<void> {
  const target = APP_LAUNCH_MAP[name]

  if (Array.isArray(target)) {
    for (const candidate of target) {
      try {
        await runPowerShell(`Start-Process '${candidate.replace(/'/g, "''")}'`)
        return
      } catch {
        // tenta o próximo candidato
      }
    }
    return
  }

  if (typeof target === 'string') {
    if (/^https?:\/\//i.test(target)) {
      await shell.openExternal(target)
      return
    }
    if (target === 'browser') {
      await shell.openExternal('https://')
      return
    }
  }

  // Smart fallback: exe literal → .exe → URL.
  try {
    await runPowerShell(`Start-Process '${name.replace(/'/g, "''")}'`)
  } catch {
    try {
      await runPowerShell(`Start-Process '${name.replace(/'/g, "''")}.exe'`)
    } catch {
      await shell.openExternal(`https://${name}`).catch(() => {})
    }
  }
}

async function openAppWithSearch(app: string, query: string): Promise<void> {
  const url = SEARCH_ENGINES.google + encodeURIComponent(query)
  const appKey = cleanAppName(app).toLowerCase()
  const exe = BROWSER_EXE[appKey]
  if (exe) {
    await runPowerShell(`Start-Process '${exe}' '${url}'`).catch(() => shell.openExternal(url).catch(() => {}))
  } else {
    await shell.openExternal(url)
  }
}

function parseSearchIntent(query: string, defaultEngine: string): { engine: string; query: string } {
  const q = (query || '').trim()
  const engineMap: Array<[RegExp, string]> = [
    [/(?:on|in|no|em|na|para)\s+youtube$/i, 'youtube'],
    [/(?:on|in|no|em|na|para)\s+(google)/i, 'google'],
    [/(?:on|in|no|em|na|para)\s+(bing)$/i, 'bing'],
    [/(?:on|in|no|em|na|para)\s+(duckduckgo|ddg)$/i, 'duckduckgo']
  ]
  for (const [re, engine] of engineMap) {
    if (re.test(q)) {
      return { engine, query: q.replace(re, '').trim() }
    }
  }
  return { engine: defaultEngine, query: q }
}

async function openSearch(defaultEngine: string, query: string): Promise<void> {
  const cleanedQuery = (query || '').replace(/^(the|o|a|os|as|um|uma|my|meu|minha|meus|minhas)\s+/i, '').trim()
  const { engine, query: finalQuery } = parseSearchIntent(cleanedQuery, defaultEngine)
  if (!finalQuery) {
    await shell.openExternal(SEARCH_ENGINES[engine || defaultEngine].replace(/=.*$/, ''))
    return
  }
  const base = SEARCH_ENGINES[engine] || SEARCH_ENGINES.google
  await shell.openExternal(base + encodeURIComponent(finalQuery))
}

function findLastSentenceBoundary(text: string): number {
  for (let i = text.length - 2; i >= 0; i--) {
    if ((text[i] === '.' || text[i] === '!' || text[i] === '?') && text[i + 1] === ' ') {
      return i + 2
    }
  }
  return -1
}

async function deleteLastSentence(windowRef?: WindowRef | null): Promise<void> {
  const text = clipboard.readText()
  const boundary = text ? findLastSentenceBoundary(text) : -1
  if (!text || boundary <= 0) {
    // Fallback: select from caret to start and delete.
    await sendKeySequence([{ key: 'Ctrl+Shift+Home', delayAfter: 30 }, { key: 'Delete', delayAfter: 0 }])
    return
  }
  const newText = text.slice(0, boundary)
  clipboard.writeText(newText)
  await sendKeySequence([{ key: 'Ctrl+A', delayAfter: 30 }, { key: 'Ctrl+V', delayAfter: 0 }])
}

export class CommandExecutor extends EventEmitter {
  async execute(command: VoiceCommand, context: ExecutionContext): Promise<void> {
    const action = command.action
    if (!action) return

    try {
      switch (action.type) {
        case 'keystroke':
          await sendKeys([String(action.parameter)])
          break

        case 'keystroke_sequence': {
          const raw = action.parameter
          const steps: KeystrokeStep[] = Array.isArray(raw)
            ? raw.map((s: any) => (typeof s === 'string' ? { key: s, delayAfter: 0 } : s))
            : []
          await sendKeySequence(steps)
          break
        }

        case 'inject_text':
          await injectText(String(action.parameter), context.windowRef)
          break

        case 'inject_snippet': {
          const snippet = (context.snippets || []).find((s) => s.name === action.parameter)
          if (snippet && snippet.content) {
            await injectText(snippet.content, context.windowRef)
          } else {
            this.emit('snippet_not_configured', String(action.parameter))
          }
          break
        }

        case 'insert_dynamic':
          await injectText(dynamicValue(String(action.parameter), context.language), context.windowRef)
          break

        case 'vox_control':
          if (action.parameter === 'delete_last_sentence') {
            await deleteLastSentence(context.windowRef)
          } else if (action.parameter === 'repeat') {
            if (context.lastTranscription) {
              await injectText(context.lastTranscription, context.windowRef)
            }
          } else {
            this.emit('vox_control', String(action.parameter))
          }
          break

        case 'change_profile':
          this.emit('change_profile', String(action.parameter))
          break

        case 'open_url':
          await shell.openExternal(String(action.parameter))
          break

        case 'open_search':
          await openSearch(String(action.parameter || 'google'), context.params?.[0] || '')
          break

        case 'open_app':
          await openApp(String(action.parameter || context.params?.[0] || ''))
          break

        case 'run_script':
          await this.runScript(String(action.parameter))
          break

        default:
          console.warn('[CommandExecutor] Tipo de ação desconhecido:', action.type)
      }
    } catch (err) {
      console.error('[CommandExecutor] Falha ao executar comando:', err)
    }
  }

  private runScript(command: string): Promise<void> {
    return new Promise((resolve) => {
      exec(command, { timeout: 10000 }, (err, stdout, stderr) => {
        const result: ScriptResult = {
          stdout: stdout || '',
          stderr: stderr || '',
          error: err ? (err.killed ? 'Timeout' : err.message) : undefined
        }
        this.emit('script_result', result)
        resolve()
      })
    })
  }
}

export const commandExecutor = new CommandExecutor()

export default commandExecutor
