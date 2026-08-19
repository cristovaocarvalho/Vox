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

  // 3. Windows (Win32): Restaura o foco na janela de destino e cola via Ctrl+V com keybd_event
  const targetHwnd = ref.hwnd
  const psScript = [
    '$src = @\'',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public static class VOXPaste {',
    '  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);',
    '  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);',
    '  public static void Paste(IntPtr hWnd) {',
    '    if (hWnd != IntPtr.Zero) {',
    '      keybd_event(0x12, 0, 0, UIntPtr.Zero);',
    '      keybd_event(0x12, 0, 2, UIntPtr.Zero);',
    '      SetForegroundWindow(hWnd);',
    '      System.Threading.Thread.Sleep(30);',
    '    }',
    '    keybd_event(0x11, 0, 0, UIntPtr.Zero);',
    '    keybd_event(0x56, 0, 0, UIntPtr.Zero);',
    '    keybd_event(0x56, 0, 2, UIntPtr.Zero);',
    '    keybd_event(0x11, 0, 2, UIntPtr.Zero);',
    '  }',
    '}',
    '\'@',
    'Add-Type -TypeDefinition $src',
    `[VOXPaste]::Paste([IntPtr]${targetHwnd && targetHwnd !== '0' && targetHwnd !== 'null' ? targetHwnd : 0})`
  ].join('\n')

  const encoded = Buffer.from(psScript, 'utf16le').toString('base64')

  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], (err) => {
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
