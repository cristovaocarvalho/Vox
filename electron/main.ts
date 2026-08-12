import type { BrowserWindow as BrowserWindowType } from 'electron'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, Tray, Menu, nativeImage, shell, systemPreferences } = require('electron')
import path from 'path'
import recorder from './modules/recorder'
import { transcribeAudio } from './modules/stt'
import { correctTranscription } from './modules/corrector'
import { injectText, WindowRef } from './modules/injector'

import { initDatabase, getAllSettings, setSetting, saveSession, getSession, listSessions, deleteSession, clearAllSessions, searchSessions, Session } from './modules/db'
import wakewordDetector from './modules/wakeword'
import fs from 'fs'
import { execFileSync } from 'child_process'
import crypto from 'crypto'

let mainWindow: BrowserWindowType | null = null
let dockWindow: BrowserWindowType | null = null
let tray: InstanceType<typeof Tray> | null = null
let targetWindowRef: WindowRef | null = null
let isQuitting = false

function captureActiveWindow(): WindowRef | null {
  try {
    if (process.platform === 'win32') {
      const result = execFileSync('powershell', [
        '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
        `(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name FGW -Namespace VOX -PassThru)::GetForegroundWindow()`
      ], { timeout: 1500, encoding: 'utf8' }) as string
      const hwnd = result.trim()
      targetWindowRef = hwnd ? { hwnd } : null
    } else if (process.platform === 'darwin') {
      const result = execFileSync('osascript', [
        '-e', 'tell application "System Events" to get name of first process whose frontmost is true'
      ], { timeout: 1500, encoding: 'utf8' }) as string
      const appName = result.trim()
      targetWindowRef = appName ? { appName } : null
    } else if (process.platform === 'linux') {
      const result = execFileSync('xdotool', ['getactivewindow'], { timeout: 1500, encoding: 'utf8' }) as string
      const windowId = result.trim()
      targetWindowRef = windowId ? { windowId } : null
    }
  } catch {
    targetWindowRef = null
  }
  return targetWindowRef
}

const getDevUrl = () => process.env['ELECTRON_RENDERER_URL'] || process.env['VITE_DEV_SERVER_URL']

function getAppIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'Logo-Vox1.ico')
    : path.join(app.getAppPath(), 'src/assets/Logo-Vox1.ico')
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    maximizable: true,
    minimizable: true,
    autoHideMenuBar: true,
    title: 'Vox',
    icon: getAppIconPath(),
    backgroundColor: '#0D0D0F',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow?.setMenu(null)

  mainWindow?.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  const devUrl = getDevUrl()
  if (devUrl) {
    mainWindow?.loadURL(devUrl)
  } else {
    mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function positionDockWindow() {
  if (!dockWindow) return
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const dockWidth = 220
  const dockHeight = 70
  const x = Math.round((width - dockWidth) / 2)
  const y = height - dockHeight - 40
  dockWindow.setBounds({ x, y, width: dockWidth, height: dockHeight })
}

function createDockWindow() {
  dockWindow = new BrowserWindow({
    width: 220,
    height: 70,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const devUrl = getDevUrl()
  if (devUrl) {
    dockWindow?.loadURL(`${devUrl}#/dock`)
  } else {
    dockWindow?.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: 'dock' })
  }

  positionDockWindow()
}

function showDock() {
  if (!dockWindow) return
  if (dockWindow.isVisible()) return
  positionDockWindow()
  if (dockWindow.isMinimized()) dockWindow.restore()
  dockWindow.showInactive()
  dockWindow.setAlwaysOnTop(true, 'screen-saver')
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send('vox:dock-show')
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:dock-show')
  }
}

function hideDock() {
  if (!dockWindow) return
  if (!dockWindow.isVisible()) return
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:dock-hide')
  }
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send('vox:dock-hide')
  }
  setTimeout(() => { dockWindow?.hide() }, 280)
}

function setupIpcHandlers() {
  recorder.on('energy', (data: { energy: number; isSpeech: boolean }) => {
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.webContents.send('vox:volume-update', data)
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:volume-update', data)
    }
  })

  ipcMain.handle('vox:start-recording', () => {
    console.log('[Main] IPC vox:start-recording acionado')
    recorder.startRecording()
    showDock()
    return true
  })

  ipcMain.handle('vox:stop-recording', async (_event: unknown, audioData?: ArrayBuffer) => {
    console.log('[Main] IPC vox:stop-recording acionado')
    hideDock()

    let buffer: Buffer
    if (audioData && audioData.byteLength > 0) {
      buffer = Buffer.from(audioData)
      recorder.stopRecording()
    } else {
      buffer = recorder.stopRecording()
    }

    if (!buffer || buffer.length === 0) {
      return { text: '' }
    }

    const result = await transcribeAudio(buffer)
    console.log('[Main] Transcrição bruta:', result.text)

    if (result.text && !result.text.startsWith('[Erro')) {
      result.text = await correctTranscription(result.text)
      console.log('[Main] Transcrição corrigida:', result.text)
    }

    if (result.text) {
      const sessionData: Session = {
        id: crypto.randomUUID(),
        type: 'dictation',
        title: result.text.slice(0, 60),
        text: result.text,
        rawText: result.rawText || result.text,
        createdAt: new Date().toISOString()
      }
      saveSession(sessionData)

      const injectRes = await injectText(result.text, targetWindowRef || undefined)
      if (!injectRes.success) {
        if (injectRes.error === 'accessibility-required') {
          mainWindow?.webContents.send('vox:accessibility-required')
        } else if (injectRes.error === 'xdotool-missing' || injectRes.error === 'wtype-missing') {
          mainWindow?.webContents.send('vox:xdotool-missing', { isWayland: process.env.WAYLAND_DISPLAY !== undefined })
        }
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vox:transcript-result', result.text)
      }
    }

    return result
  })

  ipcMain.on('vox:audio-level', (_event: unknown, energy: number) => {
    const data = { energy, isSpeech: energy > 0.02 }
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.webContents.send('vox:volume-update', data)
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:volume-update', data)
    }
  })

  ipcMain.on('vox:audio-chunk', (_event: unknown, chunk: ArrayBuffer) => {
    if (chunk) {
      const buf = Buffer.from(chunk)
      recorder.processAudioChunk(buf)
      if (wakewordDetector.isListening()) {
        wakewordDetector.processAudioChunk(buf)
      }
    }
  })

  ipcMain.handle('vox:transcribe-chunk', async (_event: unknown, audioData: ArrayBuffer) => {
    if (!audioData || audioData.byteLength < 1000) return { text: '' }

    try {
      const buffer = Buffer.from(audioData)
      const result = await transcribeAudio(buffer)
      const text = result.text || ''

      if (text && !text.startsWith('[Erro')) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('vox:partial-transcript', text)
        }
        if (dockWindow && !dockWindow.isDestroyed()) {
          dockWindow.webContents.send('vox:partial-transcript', text)
        }
      }

      return { text }
    } catch (error) {
      console.error('[Main] Erro na transcrição parcial:', error)
      return { text: '' }
    }
  })

  ipcMain.handle('vox:show-dock', () => {
    showDock()
    return true
  })

  ipcMain.handle('vox:hide-dock', () => {
    hideDock()
    return true
  })

  ipcMain.handle('vox:minimize', () => {
    mainWindow?.minimize()
    return true
  })

  // Vox Media Handlers


  // Settings & Database Handlers
  ipcMain.handle('vox:get-settings', async () => {
    try {
      return getAllSettings()
    } catch (err) {
      console.error('[Main] Erro ao obter configurações do banco:', err)
      return {}
    }
  })

  ipcMain.handle('vox:save-settings', async (_event: unknown, settings: Record<string, string>) => {
    try {
      if (settings && typeof settings === 'object') {
        for (const [key, value] of Object.entries(settings)) {
          setSetting(key, String(value))
        }

        if (settings.wakeWordSensitivity) {
          wakewordDetector.setSensitivity(parseFloat(settings.wakeWordSensitivity))
        }
        if (settings.wakeWordEnabled === 'true') {
          if (!wakewordDetector.isModelLoaded()) {
            wakewordDetector.init().then((loaded) => {
              if (loaded) wakewordDetector.start()
            })
          } else {
            wakewordDetector.start()
          }
        } else if (settings.wakeWordEnabled === 'false') {
          wakewordDetector.stop()
        }
      }
      return { success: true }
    } catch (err) {
      console.error('[Main] Erro ao salvar configurações no banco:', err)
      return { success: false }
    }
  })

  ipcMain.handle('vox:set-wakeword-enabled', async (_event: unknown, enabled: boolean) => {
    if (enabled) {
      if (!wakewordDetector.isModelLoaded()) {
        const loaded = await wakewordDetector.init()
        if (loaded) wakewordDetector.start()
      } else {
        wakewordDetector.start()
      }
    } else {
      wakewordDetector.stop()
    }
    return { success: true }
  })

  ipcMain.handle('vox:set-wakeword-sensitivity', (_event: unknown, sensitivity: number) => {
    wakewordDetector.setSensitivity(sensitivity)
    return { success: true }
  })

  ipcMain.handle('vox:open-accessibility-preferences', () => {
    if (process.platform === 'darwin') {
      try {
        if (systemPreferences && systemPreferences.isTrustedAccessibilityClient) {
          systemPreferences.isTrustedAccessibilityClient(true)
        } else {
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
        }
      } catch (err) {
        console.error('[Main] Erro ao abrir Preferências de Acessibilidade:', err)
      }
    }
    return { success: true }
  })

  // Transcriptions History Handlers
  ipcMain.handle('vox:list-sessions', (_event: unknown, limit?: number, type?: string) => {
    return listSessions(limit || 50, type)
  })

  ipcMain.handle('vox:get-session', (_event: unknown, id: string) => {
    return getSession(id)
  })

  ipcMain.handle('vox:delete-session', (_event: unknown, id: string) => {
    deleteSession(id)
    return { success: true }
  })

  ipcMain.handle('vox:clear-all-sessions', () => {
    clearAllSessions()
    return { success: true }
  })

  ipcMain.handle('vox:search-sessions', (_event: unknown, query: string) => {
    return searchSessions(query)
  })
}

let lastToggleTime = 0

function toggleDockWindow() {
  const now = Date.now()
  if (now - lastToggleTime < 350) return
  lastToggleTime = now

  if (!dockWindow) return
  const isVisible = dockWindow.isVisible()
  if (isVisible) {
    hideDock()
  } else {
    captureActiveWindow()
    showDock()
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:toggle-recording', !isVisible)
  }
}

let f9ReleaseTimer: NodeJS.Timeout | null = null

function handleGlobalPushToTalk() {
  if (!dockWindow) return

  if (!dockWindow.isVisible()) {
    captureActiveWindow()
    showDock()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:toggle-recording', true)
    }
  }

  if (f9ReleaseTimer) {
    clearTimeout(f9ReleaseTimer)
  }

  f9ReleaseTimer = setTimeout(() => {
    hideDock()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:toggle-recording', false)
    }
    f9ReleaseTimer = null
  }, 180)
}

app.whenReady().then(async () => {
  initDatabase()
  createMainWindow()
  createDockWindow()
  setupIpcHandlers()

  // Inicializa o módulo Wake Word
  const settings = getAllSettings()
  const sensitivity = parseFloat(settings.wakeWordSensitivity || '0.5')
  await wakewordDetector.init(undefined, sensitivity)

  // Acionamento por comando de voz "Vox"
  wakewordDetector.on('detected', () => {
    if (recorder.getIsRecording()) return
    console.log('[Main] 🎙️ Wake Word "Vox" detectada! Capturando janela ativa e iniciando ditado por voz...')
    captureActiveWindow()
    showDock()
    wakewordDetector.pause()
    recorder.startRecording({ autoStopOnSilence: true })
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:toggle-recording', true)
      mainWindow.webContents.send('vox:wakeword-fired')
    }
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.webContents.send('vox:wakeword-fired')
    }
  })

  wakewordDetector.on('wakeword-model-missing', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:wakeword-model-missing', data)
    }
  })

  wakewordDetector.on('wakeword-error', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:wakeword-error', data)
    }
  })

  // Encerramento automático quando o usuário para de falar (silêncio pós-fala)
  recorder.on('auto-stop', async () => {
    console.log('[Main] Finalizando gravação por encerramento de fala...')
    hideDock()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:toggle-recording', false)
    }

    const buffer = recorder.stopRecording()
    wakewordDetector.resume()
    if (!buffer || buffer.length === 0) return

    const result = await transcribeAudio(buffer)
    console.log('[Main] Transcrição bruta:', result.text)

    if (result.text && !result.text.startsWith('[Erro')) {
      result.text = await correctTranscription(result.text)
      console.log('[Main] Transcrição corrigida:', result.text)
    }

    if (result.text) {
      const sessionData: Session = {
        id: crypto.randomUUID(),
        type: 'dictation',
        title: result.text.slice(0, 60),
        text: result.text,
        rawText: result.rawText || result.text,
        createdAt: new Date().toISOString()
      }
      saveSession(sessionData)

      console.log('[Main] Injetando texto no cursor da janela ativa:', targetWindowRef, ')...')
      const injectRes = await injectText(result.text, targetWindowRef || undefined)
      if (!injectRes.success) {
        if (injectRes.error === 'accessibility-required') {
          mainWindow?.webContents.send('vox:accessibility-required')
        } else if (injectRes.error === 'xdotool-missing' || injectRes.error === 'wtype-missing') {
          mainWindow?.webContents.send('vox:xdotool-missing', { isWayland: process.env.WAYLAND_DISPLAY !== undefined })
        }
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vox:transcript-result', result.text)
      }
    }
  })

  if (settings.wakeWordEnabled !== 'false') {
    wakewordDetector.start()
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath
    })
  } catch (err) {
    console.warn('[Main] Erro ao configurar autostart no Windows:', err)
  }

  // F10: Toggle | F9: Push to Talk (Segurar F9 para falar)
  globalShortcut.register('F10', toggleDockWindow)
  globalShortcut.register('F9', handleGlobalPushToTalk)

  // Tray icon para manter o app vivo quando a janela principal é fechada
  const iconPath = getAppIconPath()
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Vox')
  const lang = (settings.language || 'pt-BR').toLowerCase()
  const isEn = lang === 'en' || lang.startsWith('en')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: isEn ? 'Open Vox' : 'Abrir Vox', click: () => { mainWindow?.show() } },
    { type: 'separator' },
    { label: isEn ? 'Quit' : 'Sair', click: () => { tray?.destroy(); wakewordDetector.stop(); app.exit(0) } }
  ]))
  tray.on('double-click', () => { mainWindow?.show() })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createDockWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
  wakewordDetector.stop()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // Não encerra o app para manter os globalShortcuts (F9/F10) ativos na bandeja
})
