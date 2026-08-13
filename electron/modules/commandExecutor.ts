import { execFile } from 'child_process'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { shell } = require('electron')
import type { VoiceCommand, KeystrokeStep, UserSnippet } from '../../src/types/commands'
import { injectText, WindowRef } from './injector'

export interface ExecutionContext {
  windowRef?: WindowRef | null
  snippets?: UserSnippet[]
  onVoxControl?: (action: string) => void
}

function runPowerShell(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', command], (err) => {
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
    .map((m) => (m === 'Ctrl' ? '^' : m === 'Alt' ? '%' : m === 'Shift' ? '+' : ''))
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

function dynamicValue(kind: string): string {
  const now = new Date()
  switch (kind) {
    case 'date':
      return now.toLocaleDateString()
    case 'time':
      return now.toLocaleTimeString()
    case 'datetime':
      return now.toLocaleString()
    default:
      return ''
  }
}

export async function executeCommand(command: VoiceCommand, ctx: ExecutionContext = {}): Promise<void> {
  const action = command.action
  if (!action) return

  try {
    switch (action.type) {
      case 'keystroke':
        await sendKeys([String(action.parameter)])
        break

      case 'keystroke_sequence': {
        const steps = action.keySequence || (Array.isArray(action.parameter) ? action.parameter.map((k) => ({ key: String(k) })) : [])
        await sendKeySequence(steps)
        break
      }

      case 'inject_text':
        await injectText(String(action.parameter), ctx.windowRef || undefined)
        break

      case 'inject_snippet': {
        const snippet = (ctx.snippets || []).find((s) => s.name === action.parameter)
        if (snippet) await injectText(snippet.content, ctx.windowRef || undefined)
        break
      }

      case 'insert_dynamic':
        await injectText(dynamicValue(String(action.parameter)), ctx.windowRef || undefined)
        break

      case 'vox_control':
        ctx.onVoxControl?.(String(action.parameter))
        break

      case 'open_url':
        await shell.openExternal(String(action.parameter))
        break

      case 'open_app':
        await shell.openPath(String(action.parameter))
        break

      case 'run_script':
        await new Promise<void>((resolve) => {
          execFile('powershell', ['-NoProfile', '-Command', String(action.parameter)], () => resolve())
        })
        break

      case 'change_profile':
        console.warn('[CommandExecutor] change_profile ainda não implementado:', action.parameter)
        break

      default:
        console.warn('[CommandExecutor] Tipo de ação desconhecido:', action.type)
    }
  } catch (err) {
    console.error('[CommandExecutor] Falha ao executar comando:', err)
  }
}

export default { executeCommand }
