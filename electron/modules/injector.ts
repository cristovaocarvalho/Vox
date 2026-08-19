import { execFile } from 'child_process'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { clipboard } = require('electron')

export interface WindowRef {
  hwnd?: string | number
  title?: string
  processName?: string
}

export interface InjectResult {
  success: boolean
  method: string
  error?: string
}

export async function injectText(
  text: string,
  windowRef?: WindowRef | any,
  _delayMs = 150,
  legacyHwnd?: string
): Promise<InjectResult> {
  if (!text || text.trim().length === 0) {
    return { success: false, method: 'none', error: 'Texto vazio' }
  }

  let ref: WindowRef = {}
  if (typeof windowRef === 'object' && windowRef !== null && ('hwnd' in windowRef || 'title' in windowRef || 'processName' in windowRef)) {
    ref = windowRef
  } else if (typeof windowRef === 'string') {
    ref = { hwnd: windowRef }
  } else if (legacyHwnd) {
    ref = { hwnd: legacyHwnd }
  }

  console.log(`[Injector] Injetando texto no cursor ativo (${text.length} chars)...`)

  // 1. Sempre escreve na área de transferência do sistema
  clipboard.writeText(text)
  await new Promise((resolve) => setTimeout(resolve, 50))

  // 2. macOS (Darwin): Restaura foco e cola via Command+V com AppleScript
  if (process.platform === 'darwin') {
    const processName = ref.processName
    const script = processName
      ? `tell application "${processName.replace(/"/g, '\\"')}" to activate\ndelay 0.05\ntell application "System Events" to keystroke "v" using command down`
      : `tell application "System Events" to keystroke "v" using command down`

    return new Promise((resolve) => {
      execFile('osascript', ['-e', script], (err) => {
        if (err) {
          console.error('[Injector] Erro ao colar texto via AppleScript (macOS):', err)
          resolve({ success: false, method: 'applescript-darwin', error: err.message })
        } else {
          console.log('[Injector] Texto colado no cursor com sucesso (macOS)!')
          resolve({ success: true, method: 'applescript-darwin' })
        }
      })
    })
  }

  // 3. Windows (Win32): Restaura o foco na janela de destino e cola via Ctrl+V com PowerShell
  const targetHwnd = ref.hwnd
  const psCommand = targetHwnd && targetHwnd !== '0' && targetHwnd !== 'null'
    ? `$t=(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -Name SFW -Namespace VOX -PassThru); $t::SetForegroundWindow([IntPtr]${targetHwnd}); Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 30; [System.Windows.Forms.SendKeys]::SendWait('^v')`
    : `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`

  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCommand], (err) => {
      if (err) {
        console.error('[Injector] Erro ao colar texto via PowerShell (Windows):', err)
        resolve({ success: false, method: 'powershell-win32', error: err.message })
      } else {
        console.log('[Injector] Texto colado no cursor com sucesso (Windows)!')
        resolve({ success: true, method: 'powershell-win32' })
      }
    })
  })
}

export default {
  injectText
}
