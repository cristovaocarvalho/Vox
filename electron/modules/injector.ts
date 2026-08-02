import { execFile } from 'child_process'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { clipboard, systemPreferences } = require('electron')

export interface WindowRef {
  hwnd?: string | number
  appName?: string
  windowId?: string
}

export interface InjectResult {
  success: boolean
  method: string
  error?: string
}

function checkBinaryExists(binaryName: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('which', [binaryName], (err) => {
      resolve(!err)
    })
  })
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
  if (typeof windowRef === 'object' && windowRef !== null && ('hwnd' in windowRef || 'appName' in windowRef || 'windowId' in windowRef)) {
    ref = windowRef
  } else if (typeof windowRef === 'string') {
    ref = { hwnd: windowRef }
  } else if (legacyHwnd) {
    ref = { hwnd: legacyHwnd }
  }

  const platform = process.platform
  console.log(`[Injector] Injetando texto no cursor ativo (${text.length} chars, plataforma: ${platform})...`)

  // 1. Sempre escreve na área de transferência do sistema
  clipboard.writeText(text)
  await new Promise((resolve) => setTimeout(resolve, 150))

  // 2. Despacho por plataforma
  if (platform === 'win32') {
    const targetHwnd = ref.hwnd
    const psCommand = targetHwnd && targetHwnd !== '0' && targetHwnd !== 'null'
      ? `$t=(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -Name SFW -Namespace VOX -PassThru); $t::SetForegroundWindow([IntPtr]${targetHwnd}); Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^v')`
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

  if (platform === 'darwin') {
    // Verifica permissão de Acessibilidade no macOS
    const isTrusted = systemPreferences ? systemPreferences.isTrustedAccessibilityClient(false) : true
    if (!isTrusted) {
      console.warn('[Injector] Permissão de Acessibilidade não concedida no macOS.')
      return {
        success: false,
        method: 'applescript-macos',
        error: 'accessibility-required'
      }
    }

    const appName = ref.appName
    const script = appName && appName !== 'null'
      ? `tell application "${appName}" to activate\ndelay 0.08\ntell application "System Events" to keystroke "v" using command down`
      : `tell application "System Events" to keystroke "v" using command down`

    return new Promise((resolve) => {
      execFile('osascript', ['-e', script], (err) => {
        if (err) {
          console.error('[Injector] Erro ao colar texto via AppleScript (macOS):', err)
          resolve({ success: false, method: 'applescript-macos', error: err.message })
        } else {
          console.log('[Injector] Texto colado no cursor com sucesso (macOS)!')
          resolve({ success: true, method: 'applescript-macos' })
        }
      })
    })
  }

  if (platform === 'linux') {
    const isWayland = process.env.WAYLAND_DISPLAY !== undefined
    const hasXdotool = await checkBinaryExists('xdotool')
    const hasWtype = await checkBinaryExists('wtype')

    if (!isWayland && hasXdotool) {
      const windowId = ref.windowId
      return new Promise((resolve) => {
        if (windowId && windowId !== '0' && windowId !== 'null') {
          execFile('xdotool', ['windowactivate', '--sync', String(windowId)], () => {
            execFile('xdotool', ['key', 'ctrl+v'], (err) => {
              if (err) {
                console.error('[Injector] Erro xdotool:', err)
                resolve({ success: false, method: 'xdotool-linux', error: err.message })
              } else {
                console.log('[Injector] Texto colado com xdotool (Linux)!')
                resolve({ success: true, method: 'xdotool-linux' })
              }
            })
          })
        } else {
          execFile('xdotool', ['key', 'ctrl+v'], (err) => {
            if (err) {
              resolve({ success: false, method: 'xdotool-linux', error: err.message })
            } else {
              resolve({ success: true, method: 'xdotool-linux' })
            }
          })
        }
      })
    }

    if (isWayland && hasWtype) {
      return new Promise((resolve) => {
        execFile('wtype', ['-M', 'ctrl', '-k', 'v'], (err) => {
          if (err) {
            resolve({ success: false, method: 'wtype-wayland', error: err.message })
          } else {
            resolve({ success: true, method: 'wtype-wayland' })
          }
        })
      })
    }

    // Fallback: clipboard pronto sem auto-paste
    console.warn('[Injector] Auto-paste não disponível no Linux (xdotool/wtype ausentes).')
    return {
      success: false,
      method: 'clipboard-only-linux',
      error: isWayland ? 'wtype-missing' : 'xdotool-missing'
    }
  }

  return { success: true, method: 'clipboard-only' }
}

export default {
  injectText
}
