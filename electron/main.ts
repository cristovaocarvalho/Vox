import type { BrowserWindow as BrowserWindowType } from 'electron'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, Tray, Menu, nativeImage } = require('electron')
import path from 'path'
import recorder from './modules/recorder'
import { transcribeAudio } from './modules/stt'
import { correctTranscription } from './modules/corrector'
import { injectText } from './modules/injector'
import downloader from './modules/downloader'
import { initDatabase, getAllSettings, setSetting } from './modules/db'
import wakewordDetector from './modules/wakeword'
import fs from 'fs'
import { execFileSync } from 'child_process'

let mainWindow: BrowserWindowType | null = null
let dockWindow: BrowserWindowType | null = null
let tray: InstanceType<typeof Tray> | null = null
let targetWindowHwnd: string | null = null

function captureActiveWindow(): void {
  try {
    const result = execFileSync('powershell', [
      '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
      `(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name FGW -Namespace VOX -PassThru)::GetForegroundWindow()`
    ], { timeout: 1500, encoding: 'utf8' }) as string
    targetWindowHwnd = result.trim() || null
  } catch {
    targetWindowHwnd = null
  }
}

const getDevUrl = () => process.env['ELECTRON_RENDERER_URL'] || process.env['VITE_DEV_SERVER_URL']

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 820,
    minWidth: 1040,
    maxWidth: 1040,
    minHeight: 820,
    maxHeight: 820,
    resizable: false,
    maximizable: false,
    minimizable: true,
    title: 'Vox',
    backgroundColor: '#0D0D0F',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
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
}

function hideDock() {
  if (!dockWindow) return
  if (!dockWindow.isVisible()) return
  dockWindow.hide()
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
      await injectText(result.text, 'clipboard', 100, targetWindowHwnd ?? undefined)
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
  ipcMain.handle('vox:get-video-info', async (_event: unknown, url: string, cookiesFromBrowser?: string) => {
    try {
      const info = await downloader.getVideoInfo(url, cookiesFromBrowser)
      return info
    } catch (err) {
      console.error('[Main] Erro ao obter info do vídeo:', err)
      return { title: 'Vídeo Desconhecido', duration: 0, thumbnail: '', platform: 'unknown' }
    }
  })

  ipcMain.handle('vox:download-audio', async (_event: unknown, url: string, cookiesFromBrowser?: string) => {
    try {
      const downloadsDir = app.getPath('downloads')
      const result = await downloader.downloadAudio({
        url,
        outputDir: downloadsDir,
        cookiesFromBrowser: cookiesFromBrowser as any,
        onProgress: (pct, speed, eta) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('vox:download-progress', { pct, speed, eta })
          }
        }
      })
      return result
    } catch (err: any) {
      console.error('[Main] Erro ao baixar áudio:', err)
      return { error: err?.message || 'Erro ao baixar áudio via yt-dlp' }
    }
  })

  ipcMain.handle('vox:transcribe-media', async (_event: unknown, options: { audioPath: string }) => {
    try {
      if (!options.audioPath || !fs.existsSync(options.audioPath)) {
        return { text: '[Erro: Arquivo de áudio não encontrado]' }
      }
      const buffer = fs.readFileSync(options.audioPath)
      const sttRes = await transcribeAudio(buffer)
      let text = sttRes.text || ''
      if (text && !text.startsWith('[Erro')) {
        text = await correctTranscription(text)
      }
      return { text }
    } catch (err) {
      console.error('[Main] Erro na transcrição de mídia:', err)
      return { text: '[Erro na transcrição de mídia]' }
    }
  })

  ipcMain.handle('vox:delete-file', async (_event: unknown, filePath: string) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log('[Main] Arquivo excluído com sucesso:', filePath)
        return { success: true }
      }
      return { success: false }
    } catch (err) {
      console.error('[Main] Erro ao excluir arquivo:', err)
      return { success: false }
    }
  })

  ipcMain.handle('vox:select-file', async () => {
    try {
      if (!mainWindow) return null
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecionar Vídeo ou Áudio',
        buttonLabel: 'Selecionar Mídia',
        properties: ['openFile'],
        filters: [
          { name: 'Mídias de Áudio e Vídeo', extensions: ['mp4', 'mp3', 'wav', 'mkv', 'mov', 'm4a', 'webm', 'aac', 'flac', 'ogg', 'avi'] },
          { name: 'Todos os Arquivos', extensions: ['*'] }
        ]
      })
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (err) {
      console.error('[Main] Erro ao selecionar arquivo:', err)
      return null
    }
  })

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
          wakewordDetector.start()
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
    console.log('[Main] 🎙️ Wake Word "Vox" detectada! Capturando janela ativa e iniciando ditado por voz...')
    captureActiveWindow()
    showDock()
    recorder.startRecording({ autoStopOnSilence: true })
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:toggle-recording', true)
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
    if (!buffer || buffer.length === 0) return

    const result = await transcribeAudio(buffer)
    console.log('[Main] Transcrição bruta:', result.text)

    if (result.text && !result.text.startsWith('[Erro')) {
      result.text = await correctTranscription(result.text)
      console.log('[Main] Transcrição corrigida:', result.text)
    }

    if (result.text) {
      console.log('[Main] Injetando texto no cursor da janela ativa (HWND:', targetWindowHwnd, ')...')
      await injectText(result.text, 'clipboard', 100, targetWindowHwnd ?? undefined)
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
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'favicon.png')
    : path.join(app.getAppPath(), 'src/favicon.png')
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Vox')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Vox', click: () => { mainWindow?.show() } },
    { type: 'separator' },
    { label: 'Sair', click: () => { tray?.destroy(); app.exit(0) } }
  ]))
  tray.on('double-click', () => { mainWindow?.show() })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createDockWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // Não encerra o app para manter os globalShortcuts (F9/F10) ativos na bandeja
})
