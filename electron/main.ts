import type { BrowserWindow as BrowserWindowType } from 'electron'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage } = require('electron')
import path from 'path'
import recorder from './modules/recorder'
import { transcribeAudio } from './modules/stt'
import { correctTranscription } from './modules/corrector'
import { injectText, WindowRef } from './modules/injector'

import { initDatabase, getAllSettings, getSetting, setSetting, saveSession, getSession, listSessions, deleteSession, clearAllSessions, searchSessions, listApiLogs, clearApiLogs, Session } from './modules/db'
import wakewordDetector from './modules/wakeword'
import { resolveProvider, getModelsEndpoint, getAuthHeaders, PROVIDER_PRESETS } from './modules/providers'
import { execFile } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

const execFileAsync = promisify(execFile)

let mainWindow: BrowserWindowType | null = null
let dockWindow: BrowserWindowType | null = null
let tray: InstanceType<typeof Tray> | null = null
let targetWindowRef: WindowRef | null = null
let isQuitting = false
let isDockHiding = false

async function captureActiveWindow(): Promise<WindowRef | null> {
  try {
    const psScript = [
      '$src = @\'',
      'using System;',
      'using System.Text;',
      'using System.Runtime.InteropServices;',
      'public static class VOXWin {',
      '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
      '  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);',
      '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);',
      '}',
      '\'@',
      'Add-Type -TypeDefinition $src',
      '$h = [VOXWin]::GetForegroundWindow()',
      'if ($h -eq [IntPtr]::Zero) { Write-Output "||"; exit }',
      '$sb = New-Object System.Text.StringBuilder 512',
      '[void][VOXWin]::GetWindowText($h, $sb, 512)',
      '$pid2 = [uint32]0',
      '[void][VOXWin]::GetWindowThreadProcessId($h, [ref]$pid2)',
      '$p = Get-Process -Id $pid2 -ErrorAction SilentlyContinue',
      'Write-Output ("{0}|{1}|{2}" -f $h, $sb.ToString(), $p.ProcessName)'
    ].join('\n')
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], { timeout: 2500, encoding: 'utf8' })
    const parts = stdout.trim().split('|')
    const hwnd = parts[0]
    const processName = parts[parts.length - 1]
    const title = parts.slice(1, -1).join('|')
    targetWindowRef = hwnd && hwnd !== '0'
      ? { hwnd, title: title?.trim() || undefined, processName: processName?.trim() || undefined }
      : null
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
      sandbox: true,
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
      sandbox: true,
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
  isDockHiding = false
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
  if (!dockWindow.isVisible() || isDockHiding) return
  isDockHiding = true
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:dock-hide')
  }
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send('vox:dock-hide')
  }
  setTimeout(() => {
    dockWindow?.hide()
    isDockHiding = false
  }, 280)
}

const APP_CONTEXT_RULES: { category: string; keywords: string[] }[] = [
  { category: 'a code editor or IDE', keywords: ['code', 'visual studio', 'vscode', 'intellij', 'pycharm', 'webstorm', 'phpstorm', 'goland', 'rider', 'sublime', 'notepad++', 'vim', 'neovim', 'emacs', 'atom', 'eclipse', 'android studio', 'xcode', 'cursor'] },
  { category: 'an email message', keywords: ['outlook', 'gmail', 'thunderbird', 'mail', 'proton', 'postbox'] },
  { category: 'a text document', keywords: ['word', 'winword', 'docs', 'writer', 'libreoffice', 'pages', 'notion', 'onenote', 'obsidian', 'typora', 'scrivener'] },
  { category: 'a chat or messaging app', keywords: ['slack', 'teams', 'discord', 'whatsapp', 'telegram', 'messenger', 'signal', 'skype', 'zoom'] },
  { category: 'a terminal or shell', keywords: ['terminal', 'cmd', 'powershell', 'iterm', 'konsole', 'bash', 'zsh', 'alacritty', 'kitty', 'windows terminal', 'wezterm'] }
]

function buildContextHint(ref: WindowRef | null): string {
  const candidates = [ref?.processName, ref?.title]
    .map((s) => (s || '').trim())
    .filter(Boolean)

  if (candidates.length === 0) return 'the active application'

  const name = candidates[0]
  const searchable = candidates.join(' ').toLowerCase()

  for (const rule of APP_CONTEXT_RULES) {
    if (rule.keywords.some((k) => searchable.includes(k))) {
      return `${rule.category} (${name})`
    }
  }

  return `the "${name}" application`
}

async function processTranscriptionResult(buffer: Buffer): Promise<{ text: string; rawText?: string }> {
  if (!buffer || buffer.length === 0) return { text: '' }

  const result = await transcribeAudio(buffer)
  console.log('[Main] Transcrição bruta:', result.text)

  if (result.text && !result.text.startsWith('[Erro')) {
    result.text = await correctTranscription(result.text, buildContextHint(targetWindowRef))
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
      console.warn('[Main] Falha ao injetar texto:', injectRes.error)
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:transcript-result', result.text)
    }
  }

  return result
}

async function fetchAvailableModels(): Promise<{ stt: string[]; llm: string[]; error?: string }> {
  const provider = resolveProvider()
  if (provider.requiresApiKey && !provider.apiKey) {
    return { stt: [], llm: [], error: 'no-api-key' }
  }

  const response = await fetch(getModelsEndpoint(), {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    console.warn(`[Main] Erro ao listar modelos (${response.status})`)
    return { stt: [], llm: [], error: `http-${response.status}` }
  }

  const data = await response.json()
  const list: { id?: string; active?: boolean }[] = Array.isArray(data?.data) ? data.data : []

  const stt: string[] = []
  const llm: string[] = []
  for (const m of list) {
    const id = (m.id || '').trim()
    if (!id || m.active === false) continue
    if (/whisper|distil-whisper/i.test(id)) {
      stt.push(id)
    } else {
      llm.push(id)
    }
  }

  return { stt: stt.sort(), llm: llm.sort() }
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

    const hadSpeech = recorder.getHasSpoken()

    let buffer: Buffer
    if (audioData && audioData.byteLength > 0) {
      buffer = Buffer.from(audioData)
      recorder.stopRecording()
    } else {
      buffer = recorder.stopRecording()
    }

    if (!hadSpeech) {
      console.log('[Main] Nenhuma fala detectada, ignorando transcrição.')
      return { text: '' }
    }

    return processTranscriptionResult(buffer)
  })

  ipcMain.on('vox:audio-level', (_event: unknown, energy: number) => {
    const data = { energy, isSpeech: energy > 0.02 }
    recorder.reportSpeech(data.isSpeech)
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

  ipcMain.on('vox:wakeword-audio-chunk', (_event: unknown, chunk: ArrayBuffer) => {
    if (chunk && wakewordDetector.isListening()) {
      wakewordDetector.processAudioChunk(Buffer.from(chunk))
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

        if (settings.autoStartEnabled) {
          const autoStart = settings.autoStartEnabled === 'true'
          try {
            app.setLoginItemSettings({
              openAtLogin: autoStart,
              path: process.execPath
            })
          } catch (err) {
            console.warn('[Main] Erro ao salvar configuração de autostart:', err)
          }
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

  ipcMain.handle('vox:list-models', async () => {
    try {
      return await fetchAvailableModels()
    } catch (err) {
      console.error('[Main] Erro ao listar modelos:', err)
      return { stt: [], llm: [], error: 'unknown' }
    }
  })

  ipcMain.handle('vox:get-providers', () => {
    return PROVIDER_PRESETS.map((p) => ({ ...p }))
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

  // Privacy Log Handlers
  ipcMain.handle('vox:list-api-logs', (_event: unknown, limit?: number) => {
    return listApiLogs(limit || 200)
  })

  ipcMain.handle('vox:clear-api-logs', () => {
    clearApiLogs()
    return { success: true }
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
    void captureActiveWindow()
    showDock()
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:toggle-recording', !isVisible)
  }
}

let isPushToTalkActive = false

function startPushToTalk() {
  if (!dockWindow) return
  if (recorder.getIsRecording()) return

  void captureActiveWindow()
  showDock()
  recorder.startRecording({ autoStopOnSilence: process.platform !== 'win32' })
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:toggle-recording', true)
  }
  isPushToTalkActive = true

  if (process.platform === 'win32') {
    const psScript = 'Add-Type -MemberDefinition \'[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);\' -Name KS -Namespace VOX; while (([VOX.KS]::GetAsyncKeyState(0x78) -band 0x8000) -ne 0) { Start-Sleep -Milliseconds 30 }'
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    execFileAsync('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], { timeout: 60000 })
      .then(() => stopPushToTalk())
      .catch(() => stopPushToTalk())
  }
}

function stopPushToTalk() {
  if (!isPushToTalkActive) return
  isPushToTalkActive = false
  hideDock()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:toggle-recording', false)
  }
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
    wakewordDetector.pause()
    recorder.startRecording({ autoStopOnSilence: true })
    void captureActiveWindow()
    showDock()
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
    isPushToTalkActive = false
    hideDock()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:toggle-recording', false)
    }

    const buffer = recorder.stopRecording()
    wakewordDetector.resume()
    await processTranscriptionResult(buffer)
  })

  if (settings.wakeWordEnabled !== 'false') {
    wakewordDetector.start()
  }

  const autoStart = settings.autoStartEnabled !== 'false'
  try {
    app.setLoginItemSettings({
      openAtLogin: autoStart,
      path: process.execPath
    })
  } catch (err) {
    console.warn('[Main] Erro ao configurar autostart:', err)
  }

  // F10: Toggle | F9: Push to Talk (Segurar F9 para falar)
  const toggleRegistered = globalShortcut.register('F10', toggleDockWindow)
  if (!toggleRegistered) {
    console.warn('[Main] Falha ao registrar o atalho F10 (pode estar em uso por outro app ou reservado pelo sistema).')
  }
  const pttRegistered = globalShortcut.register('F9', startPushToTalk)
  if (!pttRegistered) {
    console.warn('[Main] Falha ao registrar o atalho F9 (pode estar em uso por outro app ou reservado pelo sistema).')
  }

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
