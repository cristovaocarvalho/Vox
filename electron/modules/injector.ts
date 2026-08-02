import { execFile } from 'child_process'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { clipboard } = require('electron')

export type InjectionMode = 'type' | 'clipboard'

export async function injectText(text: string, _mode: InjectionMode = 'clipboard', delayMs = 100, hwnd?: string): Promise<void> {
  if (!text || text.trim().length === 0) return

  try {
    console.log(`[Injector] Injetando texto no cursor ativo (${text.length} chars)...`)

    // 1. Copia o texto para a área de transferência do sistema
    clipboard.writeText(text)

    // 2. Pequeno delay para garantir que a área de transferência foi atualizada
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    // 3. Executa a colagem de acordo com o Sistema Operacional
    const platform = process.platform

    if (platform === 'win32') {
      const psCommand = hwnd && hwnd !== '0'
        ? `$t=(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -Name SFW -Namespace VOX -PassThru); $t::SetForegroundWindow([IntPtr]${hwnd}); Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^v')`
        : `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`

      execFile('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCommand], (err) => {
        if (err) {
          console.error('[Injector] Erro ao colar texto via PowerShell (Windows):', err)
        } else {
          console.log('[Injector] Texto colado no cursor com sucesso (Windows)!')
        }
      })
    } else if (platform === 'darwin') {
      // macOS: Ativa a aplicação original via AppleScript e cola com Cmd + V (⌘V)
      const script = hwnd && hwnd !== '0' && hwnd !== 'null'
        ? `tell application "${hwnd}" to activate\ndelay 0.08\ntell application "System Events" to keystroke "v" using command down`
        : `tell application "System Events" to keystroke "v" using command down`

      execFile('osascript', ['-e', script], (err) => {
        if (err) {
          console.error('[Injector] Erro ao colar texto via AppleScript (macOS):', err)
        } else {
          console.log('[Injector] Texto colado no cursor com sucesso (macOS)!')
        }
      })
    } else if (platform === 'linux') {
      // Linux: Restaura foco via xdotool e cola com Ctrl + V
      if (hwnd && hwnd !== '0' && hwnd !== 'null') {
        execFile('xdotool', ['windowactivate', '--sync', hwnd], () => {
          execFile('xdotool', ['key', 'ctrl+v'], (err) => {
            if (err) console.error('[Injector] Erro ao colar texto via xdotool (Linux):', err)
            else console.log('[Injector] Texto colado no cursor com sucesso (Linux)!')
          })
        })
      } else {
        execFile('xdotool', ['key', 'ctrl+v'], (err) => {
          if (err) console.error('[Injector] Erro ao colar texto via xdotool (Linux):', err)
          else console.log('[Injector] Texto colado no cursor com sucesso (Linux)!')
        })
      }
    }
  } catch (err) {
    console.error('[Injector] Erro no processo de injeção:', err)
  }
}

export default {
  injectText
}
