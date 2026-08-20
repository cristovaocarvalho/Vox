/**
 * Win32 Native API helper using koffi for zero-latency execution.
 * Handles active window capture, foreground focus restoration, and reliable text/keystroke injection.
 */

export interface Win32WindowInfo {
  hwnd: string
  title: string
  processName: string
}

let isWin = process.platform === 'win32'
let GetForegroundWindow: any = null
let GetWindowTextW: any = null
let GetWindowThreadProcessId: any = null
let SetForegroundWindow: any = null
let BringWindowToTop: any = null
let AttachThreadInput: any = null
let GetCurrentThreadId: any = null
let keybd_event: any = null
let OpenProcess: any = null
let CloseHandle: any = null
let GetModuleBaseNameW: any = null

if (isWin) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi')
    const user32 = koffi.load('user32.dll')
    const kernel32 = koffi.load('kernel32.dll')
    const psapi = koffi.load('psapi.dll')

    GetForegroundWindow = user32.func('intptr_t __stdcall GetForegroundWindow()')
    GetWindowTextW = user32.func('int __stdcall GetWindowTextW(intptr_t hWnd, _Out_ char16_t *lpString, int nMaxCount)')
    GetWindowThreadProcessId = user32.func('uint32_t __stdcall GetWindowThreadProcessId(intptr_t hWnd, _Out_ uint32_t *lpdwProcessId)')
    SetForegroundWindow = user32.func('bool __stdcall SetForegroundWindow(intptr_t hWnd)')
    BringWindowToTop = user32.func('bool __stdcall BringWindowToTop(intptr_t hWnd)')
    AttachThreadInput = user32.func('bool __stdcall AttachThreadInput(uint32_t idAttach, uint32_t idAttachTo, bool fAttach)')
    GetCurrentThreadId = kernel32.func('uint32_t __stdcall GetCurrentThreadId()')
    keybd_event = user32.func('void __stdcall keybd_event(uint8_t bVk, uint8_t bScan, uint32_t dwFlags, uintptr_t dwExtraInfo)')
    OpenProcess = kernel32.func('intptr_t __stdcall OpenProcess(uint32_t dwDesiredAccess, bool bInheritHandle, uint32_t dwProcessId)')
    CloseHandle = kernel32.func('bool __stdcall CloseHandle(intptr_t hObject)')
    GetModuleBaseNameW = psapi.func('uint32_t __stdcall GetModuleBaseNameW(intptr_t hProcess, intptr_t hModule, _Out_ char16_t *lpBaseName, uint32_t nSize)')
  } catch (err) {
    console.warn('[Win32] Falha ao carregar bindings do koffi:', err)
  }
}

export function getActiveWindowWin32(): Win32WindowInfo | null {
  if (!isWin || !GetForegroundWindow) return null

  try {
    const hwnd = GetForegroundWindow()
    if (!hwnd || hwnd === 0) return null

    // Get Window Title
    const titleBuffer = Buffer.alloc(1024)
    GetWindowTextW(hwnd, titleBuffer, 512)
    const title = titleBuffer.toString('utf16le').replace(/\0.*$/g, '').trim()

    // Get Process ID
    const pidBuf = Buffer.alloc(4)
    GetWindowThreadProcessId(hwnd, pidBuf)
    const pid = pidBuf.readUInt32LE(0)

    // Get Process Name
    let processName = ''
    if (pid && OpenProcess && GetModuleBaseNameW && CloseHandle) {
      const PROCESS_QUERY_INFORMATION = 0x0400
      const PROCESS_VM_READ = 0x0010
      const hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid)
      if (hProcess && hProcess !== 0) {
        const nameBuf = Buffer.alloc(512)
        GetModuleBaseNameW(hProcess, 0, nameBuf, 256)
        processName = nameBuf.toString('utf16le').replace(/\0.*$/g, '').trim()
        CloseHandle(hProcess)
      }
    }

    return {
      hwnd: String(hwnd),
      title,
      processName: processName.replace(/\.exe$/i, '')
    }
  } catch (err) {
    console.warn('[Win32] Erro ao obter janela ativa:', err)
    return null
  }
}

const VK_MAP: Record<string, number> = {
  Enter: 0x0D,
  Return: 0x0D,
  Backspace: 0x08,
  Tab: 0x09,
  Delete: 0x2E,
  Del: 0x2E,
  Escape: 0x1B,
  Esc: 0x1B,
  Space: 0x20,
  Home: 0x24,
  End: 0x23,
  PageUp: 0x21,
  PageDown: 0x22,
  Up: 0x26,
  Down: 0x28,
  Left: 0x25,
  Right: 0x27,
  Insert: 0x2D,
  PrintScreen: 0x2C,
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74, F6: 0x75,
  F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B
}

async function restoreWindowFocus(hwndNum: number): Promise<void> {
  if (hwndNum <= 0 || !SetForegroundWindow) return

  const currentThreadId = GetCurrentThreadId ? GetCurrentThreadId() : 0
  let targetThreadId = 0
  if (GetWindowThreadProcessId) {
    const pidBuf = Buffer.alloc(4)
    targetThreadId = GetWindowThreadProcessId(hwndNum, pidBuf)
  }

  if (AttachThreadInput && currentThreadId && targetThreadId && currentThreadId !== targetThreadId) {
    AttachThreadInput(currentThreadId, targetThreadId, true)
  }

  const VK_MENU = 0x12
  const KEYEVENTF_KEYUP = 0x0002
  keybd_event(VK_MENU, 0, 0, 0)
  keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0)

  if (BringWindowToTop) BringWindowToTop(hwndNum)
  SetForegroundWindow(hwndNum)

  if (AttachThreadInput && currentThreadId && targetThreadId && currentThreadId !== targetThreadId) {
    AttachThreadInput(currentThreadId, targetThreadId, false)
  }

  await new Promise((r) => setTimeout(r, 50))
}

export async function focusAndPasteWin32(targetHwndStr?: string | number): Promise<boolean> {
  if (!isWin || !keybd_event) return false

  try {
    let hwndNum = 0
    if (targetHwndStr && targetHwndStr !== '0' && targetHwndStr !== 'null') {
      hwndNum = typeof targetHwndStr === 'string' ? parseInt(targetHwndStr, 10) : Number(targetHwndStr)
    }

    // 1. Libera teclas modificadoras residuais para evitar conflitos (ex: Alt, Shift, Win)
    const KEYEVENTF_KEYUP = 0x0002
    keybd_event(0x12, 0x38, KEYEVENTF_KEYUP, 0) // Alt Up
    keybd_event(0x10, 0x2A, KEYEVENTF_KEYUP, 0) // Shift Up
    keybd_event(0x5B, 0x5B, KEYEVENTF_KEYUP, 0) // Win Up
    keybd_event(0x11, 0x1D, KEYEVENTF_KEYUP, 0) // Ctrl Up

    // 2. Restaura o foco na janela de destino se um HWND válido foi informado
    if (hwndNum > 0) {
      await restoreWindowFocus(hwndNum)
    } else {
      await new Promise((r) => setTimeout(r, 20))
    }

    // 3. Envia Ctrl + V com Scancodes de hardware
    const VK_CONTROL = 0x11
    const VK_V = 0x56

    keybd_event(VK_CONTROL, 0x1D, 0, 0)
    await new Promise((r) => setTimeout(r, 20))
    keybd_event(VK_V, 0x2F, 0, 0)
    await new Promise((r) => setTimeout(r, 30))
    keybd_event(VK_V, 0x2F, KEYEVENTF_KEYUP, 0)
    await new Promise((r) => setTimeout(r, 20))
    keybd_event(VK_CONTROL, 0x1D, KEYEVENTF_KEYUP, 0)

    return true
  } catch (err) {
    console.error('[Win32] Erro ao focar e colar:', err)
    return false
  }
}

export async function sendComboWin32(combo: string, targetHwndStr?: string | number): Promise<boolean> {
  if (!isWin || !keybd_event) return false
  try {
    let hwndNum = 0
    if (targetHwndStr && targetHwndStr !== '0' && targetHwndStr !== 'null') {
      hwndNum = typeof targetHwndStr === 'string' ? parseInt(targetHwndStr, 10) : Number(targetHwndStr)
    }

    if (hwndNum > 0) {
      await restoreWindowFocus(hwndNum)
    }

    const parts = combo.split('+').map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) return false

    const mainKeyStr = parts[parts.length - 1]
    const modStrs = parts.slice(0, -1)

    // Determine Virtual Key Code for main key
    let mainVk = VK_MAP[mainKeyStr] || 0
    if (!mainVk && mainKeyStr.length === 1) {
      mainVk = mainKeyStr.toUpperCase().charCodeAt(0)
    }
    if (!mainVk) return false

    const KEYEVENTF_KEYUP = 0x0002

    // Press modifier keys
    const pressedMods: number[] = []
    for (const m of modStrs) {
      const lower = m.toLowerCase()
      if (lower === 'ctrl' || lower === 'control') {
        keybd_event(0x11, 0x1D, 0, 0)
        pressedMods.push(0x11)
      } else if (lower === 'shift') {
        keybd_event(0x10, 0x2A, 0, 0)
        pressedMods.push(0x10)
      } else if (lower === 'alt' || lower === 'option') {
        keybd_event(0x12, 0x38, 0, 0)
        pressedMods.push(0x12)
      } else if (lower === 'win' || lower === 'meta' || lower === 'cmd') {
        keybd_event(0x5B, 0x5B, 0, 0)
        pressedMods.push(0x5B)
      }
    }

    await new Promise((r) => setTimeout(r, 15))

    // Press & release main key
    keybd_event(mainVk, 0, 0, 0)
    await new Promise((r) => setTimeout(r, 25))
    keybd_event(mainVk, 0, KEYEVENTF_KEYUP, 0)
    await new Promise((r) => setTimeout(r, 15))

    // Release modifier keys in reverse order
    for (const modVk of pressedMods.reverse()) {
      keybd_event(modVk, 0, KEYEVENTF_KEYUP, 0)
    }

    return true
  } catch (err) {
    console.error('[Win32] Erro ao enviar atalho nativo:', err)
    return false
  }
}

export async function sendKeySequenceWin32(steps: { key: string; delayAfter?: number }[], targetHwndStr?: string | number): Promise<boolean> {
  if (!isWin || !keybd_event || !steps || steps.length === 0) return false
  try {
    for (const step of steps) {
      await sendComboWin32(step.key, targetHwndStr)
      if (step.delayAfter && step.delayAfter > 0) {
        await new Promise((r) => setTimeout(r, step.delayAfter))
      }
    }
    return true
  } catch (err) {
    console.error('[Win32] Erro ao enviar sequência de teclas:', err)
    return false
  }
}

export function sendKeyWin32(vkCode: number): void {
  if (!isWin || !keybd_event) return
  const KEYEVENTF_KEYUP = 0x0002
  keybd_event(vkCode, 0, 0, 0)
  keybd_event(vkCode, 0, KEYEVENTF_KEYUP, 0)
}
