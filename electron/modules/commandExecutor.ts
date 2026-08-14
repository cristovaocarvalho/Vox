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

async function openApp(name: string): Promise<void> {
  switch (name) {
    case 'terminal':
      await runPowerShell("Start-Process 'wt.exe'").catch(() => runPowerShell("Start-Process 'cmd.exe'"))
      break
    case 'explorer':
      await runPowerShell("Start-Process 'explorer.exe'")
      break
    case 'browser':
      await shell.openExternal('https://')
      break
    default:
      await runPowerShell(`Start-Process '${name}'`)
  }
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

        case 'open_app':
          await openApp(String(action.parameter))
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
