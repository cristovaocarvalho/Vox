import type { BrowserWindow as BrowserWindowType } from 'electron'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage, shell, systemPreferences } = require('electron')
import path from 'path'
import fs from 'fs'
import recorder from './modules/recorder'
import { transcribeAudio } from './modules/stt'
import { correctTranscription } from './modules/corrector'
import { injectText, WindowRef } from './modules/injector'

import { initDatabase, getAllSettings, getSetting, setSetting, saveSession, getSession, listSessions, deleteSession, clearAllSessions, searchSessions, getDictationStats, listApiLogs, clearApiLogs, recordCorrections, addVocabularyTerm, listVocabulary, removeVocabularyTerm, clearVocabulary, seedSnippets, listSnippets, saveSnippet, deleteSnippet, Session } from './modules/db'
import { CommandParser } from './modules/commandParser'
import { commandExecutor } from './modules/commandExecutor'
import { getEnabledCommands, getAllCommands, setEnabled, setMatchMode, addCustomCommand, updateCustomCommand, deleteCustomCommand } from './modules/commandRegistry'
import * as snippetManager from './modules/snippetManager'
import { templateManager } from './modules/templateManager'
import type { ParseResult, VoiceCommand } from '../src/types/commands'
import wakewordDetector from './modules/wakeword'
import { muteSystemAudio, unmuteSystemAudio, unmuteSystemAudioSync } from './modules/audioMute'
import { listOllamaModels, pullOllamaModel } from './modules/ollama'
import { resolveProvider, PROVIDER_PRESETS, type ResolvedProvider } from './modules/providers'
import {
  listDownloadedWhisperModels,
  downloadWhisperModel,
  cancelWhisperDownload,
  deleteWhisperModel,
  getDownloadedWhisperModelPath
} from './modules/whisperManager'
import { initAutoUpdater } from './modules/updater'
import { execFile } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

const execFileAsync = promisify(execFile)

let mainWindow: BrowserWindowType | null = null
let dockWindow: BrowserWindowType | null = null
let clipboardWindow: BrowserWindowType | null = null
let tray: InstanceType<typeof Tray> | null = null
let targetWindowRef: WindowRef | null = null
let isQuitting = false
let isDockHiding = false
let systemMutedByVox = false

async function captureActiveWindow(): Promise<WindowRef | null> {
  // macOS (Darwin): query frontmost app name and window title via AppleScript
  if (process.platform === 'darwin') {
    try {
      const script = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set appName to name of frontApp
          set winTitle to ""
          try
            set winTitle to name of front window of frontApp
          end try
          return appName & "|" & winTitle
        end tell
      `
      const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 2500, encoding: 'utf8' })
      const parts = stdout.trim().split('|')
      const processName = parts[0]
      const title = parts.slice(1).join('|')
      targetWindowRef = processName
        ? { processName: processName.trim(), title: title?.trim() || undefined }
        : null
    } catch {
      targetWindowRef = null
    }
    return targetWindowRef
  }

  // Windows (Win32): query user32.dll via PowerShell
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
    const isVoxApp = /^vox|electron$/i.test((processName || '').trim())
    if (hwnd && hwnd !== '0' && !isVoxApp) {
      targetWindowRef = { hwnd, title: title?.trim() || undefined, processName: processName?.trim() || undefined }
    }
  } catch {
    // Keep existing targetWindowRef if error occurs
  }
  return targetWindowRef
}

const getDevUrl = () => process.env['ELECTRON_RENDERER_URL'] || process.env['VITE_DEV_SERVER_URL']

function getAppIconPath() {
  const isMac = process.platform === 'darwin'
  const iconFile = isMac ? 'logo.png' : 'Logo-Vox1.ico'
  const fallbackFile = 'logo.png'

  if (app.isPackaged) {
    const packagedPath = path.join(process.resourcesPath, iconFile)
    if (fs.existsSync(packagedPath)) return packagedPath
    return path.join(process.resourcesPath, fallbackFile)
  }

  const appPath = app.getAppPath()
  const devPath = path.join(appPath, 'src/assets', iconFile)
  if (fs.existsSync(devPath)) return devPath

  const fallbackDevPath = path.join(appPath, 'src/assets', fallbackFile)
  if (fs.existsSync(fallbackDevPath)) return fallbackDevPath

  return path.join(__dirname, '../../src/assets', iconFile)
}

async function disableWindowsShadow(win: BrowserWindowType | null): Promise<void> {
  if (process.platform !== 'win32' || !win) return
  try {
    const handle = win.getNativeWindowHandle()
    const hwnd = handle.length >= 8 ? handle.readBigUInt64LE(0).toString() : handle.readUInt32LE(0).toString()
    const psScript = [
      '$src = @\'',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public static class VoxDwm {',
      '  [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int val, int size);',
      '}',
      '\'@',
      'Add-Type -TypeDefinition $src',
      '$policy = 1',
      `[void][VoxDwm]::DwmSetWindowAttribute([IntPtr]${hwnd}, 2, [ref]$policy, 4)`
    ].join('\n')
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    await execFileAsync('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], { timeout: 2000, encoding: 'utf8' })
  } catch (err) {
    console.warn('[Main] Falha ao remover sombra da janela:', err)
  }
}

async function checkAndRequestMacPermissions() {
  if (process.platform !== 'darwin') return
  try {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    if (micStatus !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      console.log('[Main] Acesso ao microfone no macOS:', granted ? 'Concedido' : 'Negado')
    }
  } catch (err) {
    console.warn('[Main] Falha ao verificar permissão do microfone:', err)
  }
  try {
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(false)
    if (!isTrusted) {
      console.log('[Main] Solicitando permissão de Acessibilidade no macOS...')
      systemPreferences.isTrustedAccessibilityClient(true)
    }
  } catch (err) {
    console.warn('[Main] Falha ao verificar permissão de acessibilidade:', err)
  }
}

async function muteSystemAudioIfEnabled() {
  if (systemMutedByVox) return
  if (getSetting('muteSystemAudio', 'false') !== 'true') return
  systemMutedByVox = true
  try {
    await muteSystemAudio()
  } catch {
    systemMutedByVox = false
  }
}

async function unmuteSystemAudioIfNeeded() {
  if (!systemMutedByVox) return
  systemMutedByVox = false
  await unmuteSystemAudio()
}

function unmuteSystemAudioOnQuit() {
  if (!systemMutedByVox) return
  systemMutedByVox = false
  unmuteSystemAudioSync()
}

function getSttLanguage(): string | undefined {
  if (getSetting('autoDetectLanguage', 'true') !== 'false') return undefined
  const lang = getSetting('speechLanguage', '').trim()
  return lang || undefined
}

function getParserLanguage(): 'pt' | 'en' | 'auto' {
  if (getSetting('autoDetectLanguage', 'true') !== 'false') return 'auto'
  const lang = getSetting('speechLanguage', 'pt').trim().toLowerCase()
  if (lang === 'pt' || lang.startsWith('pt-')) return 'pt'
  return 'en'
}

function hideMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('vox:window-visibility', false)
  mainWindow.hide()
}

function showMainWindow() {
  if (mainWindow && mainWindow.isDestroyed()) {
    mainWindow = null
  }
  if (!mainWindow) {
    createMainWindow()
  }
  if (!mainWindow) return

  mainWindow.webContents.send('vox:window-visibility', true)
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
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
    show: false,
    title: 'Vox',
    icon: getAppIconPath(),
    backgroundColor: '#0D0D0F',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true
    }
  })

  mainWindow?.setMenu(null)

  mainWindow?.once('ready-to-show', () => {
    if (isQuitting || !mainWindow || mainWindow.isDestroyed()) return
    mainWindow.show()
    mainWindow.focus()
  })

  // Fallback: garante que a janela apareça mesmo se 'ready-to-show' não disparar
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible() && !isQuitting) {
      mainWindow.show()
    }
  }, 3000)

  mainWindow?.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      hideMainWindow()
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
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  void disableWindowsShadow(dockWindow)

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
  }, 120)
}

function positionClipboardWindow() {
  if (!clipboardWindow) return
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const winWidth = 420
  const winHeight = 480
  const x = Math.round((width - winWidth) / 2)
  const y = Math.round((height - winHeight) / 2)
  clipboardWindow.setBounds({ x, y, width: winWidth, height: winHeight })
}

function createClipboardWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 480,
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

  win.setMenu(null)

  void disableWindowsShadow(win)

  win.on('close', (e: Electron.Event) => {
    e.preventDefault()
    win.hide()
  })

  win.on('blur', () => {
    hideClipboardHistory()
  })

  const devUrl = getDevUrl()
  if (devUrl) {
    win.loadURL(`${devUrl}#/clipboard`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: 'clipboard' })
  }

  clipboardWindow = win
  positionClipboardWindow()
}

function showClipboardHistory() {
  if (!clipboardWindow) return
  void captureActiveWindow()
  positionClipboardWindow()
  if (clipboardWindow.isMinimized()) clipboardWindow.restore()
  clipboardWindow.show()
  clipboardWindow.setAlwaysOnTop(true, 'screen-saver')
  clipboardWindow.focus()
  if (!clipboardWindow.isDestroyed()) {
    clipboardWindow.webContents.send('vox:clipboard-refresh')
  }
}

function hideClipboardHistory() {
  if (clipboardWindow && clipboardWindow.isVisible()) {
    clipboardWindow.hide()
  }
}

function toggleClipboardHistory() {
  if (clipboardWindow && clipboardWindow.isVisible()) {
    hideClipboardHistory()
  } else {
    showClipboardHistory()
  }
}

const APP_CONTEXT_RULES: { category: string; keywords: string[] }[] = [
  { category: 'a code editor or IDE', keywords: ['code', 'visual studio', 'vscode', 'intellij', 'pycharm', 'webstorm', 'phpstorm', 'goland', 'rider', 'sublime', 'notepad++', 'vim', 'neovim', 'emacs', 'atom', 'eclipse', 'android studio', 'xcode', 'cursor'] },
  { category: 'an email message', keywords: ['outlook', 'gmail', 'thunderbird', 'mail', 'proton', 'postbox'] },
  { category: 'a text document', keywords: ['word', 'winword', 'docs', 'writer', 'libreoffice', 'pages', 'notion', 'onenote', 'obsidian', 'typora', 'scrivener'] },
  { category: 'a chat or messaging app', keywords: ['slack', 'teams', 'discord', 'whatsapp', 'telegram', 'messenger', 'signal', 'skype', 'zoom'] },
  { category: 'a terminal or shell', keywords: ['terminal', 'cmd', 'powershell', 'iterm', 'konsole', 'bash', 'zsh', 'alacritty', 'kitty', 'windows terminal', 'wezterm'] }
]

const PROFILE_CONTEXT: Record<string, string> = {
  code: 'a code editor',
  text: 'a text document',
  email: 'an email message'
}

let activeProfile: string | null = null

function buildContextHint(ref: WindowRef | null): string {
  if (activeProfile && PROFILE_CONTEXT[activeProfile]) {
    return PROFILE_CONTEXT[activeProfile]
  }

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

function handleChangeProfile(profile: string) {
  activeProfile = profile
  console.log('[Main] Perfil ativo alterado:', profile)
}

function applyActiveTemplate(id: string | null, by: 'ui' | 'voice' | 'profile' = 'ui') {
  templateManager.setActiveTemplate(id)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:template-changed', {
      templateId: id,
      activatedAt: new Date().toISOString(),
      activatedBy: by
    })
  }
}

let lastSuccessfulTranscription = ''

function handleVoxControl(action: string) {
  switch (action) {
    case 'stop':
      hideDock()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vox:stop-recording')
      }
      break
    case 'cancel':
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vox:cancel-recording')
      }
      break
    case 'clear':
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vox:clear-buffer')
      }
      break
    case 'deactivate_template':
      applyActiveTemplate(null, 'voice')
      break
    default:
      if (action.startsWith('activate_template:')) {
        applyActiveTemplate(action.split(':')[1], 'voice')
      } else {
        console.warn('[Main] Ação vox_control desconhecida:', action)
      }
  }
}

async function processCommandSegments(parseResult: ParseResult, language: 'pt' | 'en'): Promise<boolean> {
  const snippets = snippetManager.getAll()
  let cancelled = false

  for (const seg of parseResult.segments) {
    if (cancelled) break

    if (seg.type === 'command' && seg.command) {
      if (seg.command.action.type === 'vox_control' && seg.command.action.parameter === 'cancel') {
        cancelled = true
        break
      }
      await commandExecutor.execute(seg.command, {
        windowRef: targetWindowRef || {},
        lastTranscription: lastSuccessfulTranscription,
        language,
        snippets,
        params: seg.params
      })
    } else if (seg.type === 'content' && seg.contentText) {
      const corrected = await correctTranscription(seg.contentText, buildContextHint(targetWindowRef), templateManager.getActiveTemplate())
      if (corrected) {
        recordCorrections(seg.contentText, corrected)
        await injectText(corrected, targetWindowRef || undefined)
        lastSuccessfulTranscription = corrected
      }
    }
  }

  return cancelled
}

async function processTranscriptionResult(buffer: Buffer): Promise<{ text: string; rawText?: string }> {
  if (!buffer || buffer.length === 0) return { text: '' }

  const result = await transcribeAudio(buffer, getSttLanguage())
  const rawText = result.text
  console.log('[Main] Transcrição bruta:', result.text)

  if (result.text && !result.text.startsWith('[Erro')) {
    const inlineMode = getSetting('commandInlineMode', 'false') === 'true'
    const parser = new CommandParser(getEnabledCommands(), inlineMode)
    const appLang: 'pt' | 'en' = getSetting('language', 'pt-BR') === 'en' ? 'en' : 'pt'

    // 1. Template voice activation (before command parsing)
    let textToProcess = result.text
    const activation = templateManager.resolveVoiceActivation(result.text, appLang)
    if (activation) {
      applyActiveTemplate(activation.templateId === 'none' ? null : activation.templateId, 'voice')
      textToProcess = activation.remainingText
      if (!textToProcess) {
        result.text = ''
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('vox:transcript-result', '')
          mainWindow.webContents.send('vox:transcription-done', {
            rawText,
            segments: [],
            hadCommands: true
          })
        }
        return result
      }
    }

    // 2. Command parsing on the remaining text
    const parseResult = parser.parse(textToProcess, getParserLanguage())
    const language: 'pt' | 'en' = parser.getDetectedLanguage()

    if (parseResult.hasCommands) {
      const cancelled = await processCommandSegments(parseResult, language)

      if (!cancelled && rawText) {
        const sessionData: Session = {
          id: crypto.randomUUID(),
          type: 'dictation',
          title: rawText.slice(0, 60),
          text: rawText,
          rawText,
          createdAt: new Date().toISOString()
        }
        saveSession(sessionData)
      }

      result.text = ''
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vox:transcript-result', '')
        mainWindow.webContents.send('vox:transcription-done', {
          rawText,
          segments: parseResult.segments,
          hadCommands: parseResult.hasCommands
        })
      }
      return result
    }

    result.text = await correctTranscription(textToProcess, buildContextHint(targetWindowRef), templateManager.getActiveTemplate())
    console.log('[Main] Transcrição corrigida:', result.text)

    if (rawText && result.text && rawText !== result.text) {
      recordCorrections(rawText, result.text)
    }
  }

  if (result.text) {
    const sessionData: Session = {
      id: crypto.randomUUID(),
      type: 'dictation',
      title: result.text.slice(0, 60),
      text: result.text,
      rawText: rawText || result.text,
      createdAt: new Date().toISOString()
    }
    saveSession(sessionData)

    const injectRes = await injectText(result.text, targetWindowRef || undefined)
    if (!injectRes.success) {
      console.warn('[Main] Falha ao injetar texto:', injectRes.error)
    }
    lastSuccessfulTranscription = result.text
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:transcript-result', result.text)
    }
  }

  return result
}

interface ModelListOverrides {
  provider?: string
  baseUrl?: string
  apiKey?: string
  azureApiVersion?: string
}

async function fetchAvailableModels(overrides?: ModelListOverrides): Promise<{ stt: string[]; llm: string[]; error?: string }> {
  let provider: ResolvedProvider = resolveProvider()
  if (overrides) {
    const id = (overrides.provider || '').trim().toLowerCase()
    const preset = PROVIDER_PRESETS.find((p) => p.id === id) || PROVIDER_PRESETS[0]
    provider = {
      id: preset.id,
      baseUrl: (overrides.baseUrl || '').trim().replace(/\/+$/, '') || preset.baseUrl,
      apiKey: (overrides.apiKey || '').trim(),
      requiresApiKey: preset.requiresApiKey,
      isAzure: preset.isAzure,
      apiVersion: (overrides.azureApiVersion || '').trim() || preset.defaultApiVersion
    }
  }

  if (provider.requiresApiKey && !provider.apiKey) {
    return { stt: [], llm: [], error: 'no-api-key' }
  }

  const endpoint = provider.isAzure
    ? `${provider.baseUrl}/openai/deployments?api-version=${provider.apiVersion}`
    : `${provider.baseUrl}/models`

  const headers: Record<string, string> = {}
  if (provider.apiKey) {
    if (provider.isAzure) headers['api-key'] = provider.apiKey
    else headers['Authorization'] = `Bearer ${provider.apiKey}`
  }

  const response = await fetch(endpoint, { headers })

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
    // Se já está gravando (ex: wake word já iniciou com autoStopOnSilence), não resetar
    if (!recorder.getIsRecording()) {
      recorder.startRecording()
      void muteSystemAudioIfEnabled()
    }
    showDock()
    return true
  })

  ipcMain.handle('vox:stop-recording', async (_event: unknown, audioData?: ArrayBuffer) => {
    console.log('[Main] IPC vox:stop-recording acionado')
    hideDock()
    void unmuteSystemAudioIfNeeded()

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
      const result = await transcribeAudio(buffer, getSttLanguage())
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

        if (settings.shortcutToggle || settings.shortcutPushToTalk || settings.shortcutClipboard) {
          registerShortcuts()
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

  ipcMain.handle('vox:list-models', async (_event: unknown, overrides?: ModelListOverrides) => {
    try {
      return await fetchAvailableModels(overrides)
    } catch (err) {
      console.error('[Main] Erro ao listar modelos:', err)
      return { stt: [], llm: [], error: 'unknown' }
    }
  })

  ipcMain.handle('vox:get-providers', () => {
    return PROVIDER_PRESETS.map((p) => ({ ...p }))
  })

  ipcMain.handle('vox:ollama-tags', async (_event: unknown, baseUrl?: string) => {
    try {
      return await listOllamaModels(baseUrl || getSetting('baseUrl', 'http://localhost:11434'))
    } catch (err) {
      console.error('[Main] Erro ao listar modelos do Ollama:', err)
      return []
    }
  })

  ipcMain.handle('vox:ollama-pull', async (_event: unknown, model: string, baseUrl?: string) => {
    if (!model || typeof model !== 'string' || !model.trim()) {
      return { success: false, error: 'model-required' }
    }
    const target = baseUrl || resolveProvider().baseUrl
    try {
      const ok = await pullOllamaModel(model.trim(), target, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('vox:ollama-pull-progress', { model: model.trim(), ...progress })
        }
      })
      return { success: ok }
    } catch (err) {
      console.error('[Main] Erro ao baixar modelo do Ollama:', err)
      return { success: false, error: String((err as Error)?.message || err) }
    }
  })

  ipcMain.handle('vox:open-external', (_event: unknown, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url)
    }
  })

  // Whisper Local Models Handlers
  ipcMain.handle('vox:list-downloaded-whisper-models', () => {
    try {
      return listDownloadedWhisperModels()
    } catch (err) {
      console.error('[Main] Erro ao listar modelos Whisper baixados:', err)
      return []
    }
  })

  ipcMain.handle('vox:download-whisper-model', async (_event: unknown, modelId: string) => {
    if (!modelId || typeof modelId !== 'string') {
      return { success: false, error: 'modelId obrigatório' }
    }
    try {
      return await downloadWhisperModel(modelId.trim(), (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('vox:whisper-download-progress', progress)
        }
      })
    } catch (err: any) {
      console.error('[Main] Erro ao baixar modelo Whisper:', err)
      return { success: false, error: err?.message || 'Falha no download' }
    }
  })

  ipcMain.handle('vox:cancel-whisper-download', (_event: unknown, modelId: string) => {
    if (typeof modelId === 'string') {
      return { success: cancelWhisperDownload(modelId.trim()) }
    }
    return { success: false }
  })

  ipcMain.handle('vox:delete-whisper-model', (_event: unknown, modelId: string) => {
    if (typeof modelId === 'string') {
      return { success: deleteWhisperModel(modelId.trim()) }
    }
    return { success: false }
  })

  ipcMain.handle('vox:get-whisper-model-path', (_event: unknown, modelId: string) => {
    if (typeof modelId === 'string') {
      return getDownloadedWhisperModelPath(modelId.trim())
    }
    return null
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

  ipcMain.handle('vox:get-dictation-stats', () => {
    return getDictationStats()
  })

  // Privacy Log Handlers
  ipcMain.handle('vox:list-api-logs', (_event: unknown, limit?: number) => {
    return listApiLogs(limit || 200)
  })

  ipcMain.handle('vox:clear-api-logs', () => {
    clearApiLogs()
    return { success: true }
  })

  // Personal Vocabulary Handlers
  ipcMain.handle('vox:list-vocabulary', () => {
    return listVocabulary()
  })

  ipcMain.handle('vox:add-vocabulary-term', (_event: unknown, term: string) => {
    if (typeof term === 'string') addVocabularyTerm(term)
    return listVocabulary()
  })

  ipcMain.handle('vox:remove-vocabulary-term', (_event: unknown, term: string) => {
    if (typeof term === 'string') removeVocabularyTerm(term)
    return listVocabulary()
  })

  ipcMain.handle('vox:clear-vocabulary', () => {
    clearVocabulary()
    return { success: true }
  })

  // Voice Clipboard History Handlers
  ipcMain.handle('vox:insert-clipboard-item', async (_event: unknown, text: string) => {
    hideClipboardHistory()
    if (text && typeof text === 'string' && text.trim()) {
      await injectText(text, targetWindowRef || undefined)
    }
    return { success: true }
  })

  ipcMain.handle('vox:hide-clipboard', () => {
    hideClipboardHistory()
    return { success: true }
  })

  // Voice Commands Handlers
  ipcMain.handle('vox:get-commands', () => {
    return getAllCommands()
  })

  ipcMain.handle('vox:toggle-command', (_event: unknown, id: string, enabled: boolean) => {
    if (typeof id === 'string') setEnabled(id, !!enabled)
    return { success: true }
  })

  ipcMain.handle('vox:set-command-match-mode', (_event: unknown, id: string, mode: 'isolated' | 'inline') => {
    if (typeof id === 'string' && (mode === 'isolated' || mode === 'inline')) {
      setMatchMode(id, mode)
    }
    return { success: true }
  })

  ipcMain.handle('vox:add-custom-command', (_event: unknown, command: VoiceCommand) => {
    if (command && typeof command === 'object') {
      return addCustomCommand(command)
    }
    return null
  })

  ipcMain.handle('vox:update-custom-command', (_event: unknown, id: string, command: Partial<VoiceCommand>) => {
    if (typeof id === 'string' && command && typeof command === 'object') {
      updateCustomCommand(id, command)
    }
    return { success: true }
  })

  ipcMain.handle('vox:delete-custom-command', (_event: unknown, id: string) => {
    if (typeof id === 'string') deleteCustomCommand(id)
    return { success: true }
  })

  ipcMain.handle('vox:set-inline-mode', (_event: unknown, enabled: boolean) => {
    setSetting('commandInlineMode', enabled ? 'true' : 'false')
    return { success: true }
  })

  // Snippets Handlers
  ipcMain.handle('vox:get-snippets', () => {
    return snippetManager.getAll()
  })

  ipcMain.handle('vox:save-snippet', (_event: unknown, snippet: any) => {
    if (snippet && typeof snippet === 'object' && snippet.id) {
      snippetManager.save(snippet)
    }
    return { success: true }
  })

  ipcMain.handle('vox:delete-snippet', (_event: unknown, id: string) => {
    if (typeof id === 'string') snippetManager.delete(id)
    return { success: true }
  })

  // Templates Handlers
  ipcMain.handle('vox:get-templates', () => {
    return templateManager.getAllTemplates()
  })

  ipcMain.handle('vox:get-active-template', () => {
    return templateManager.getActiveTemplate()
  })

  ipcMain.handle('vox:set-active-template', (_event: unknown, id: string | null) => {
    applyActiveTemplate(typeof id === 'string' && id ? id : null, 'ui')
    return { success: true }
  })

  ipcMain.handle('vox:set-template-enabled', (_event: unknown, id: string, enabled: boolean) => {
    if (typeof id === 'string') templateManager.setTemplateEnabled(id, !!enabled)
    return { success: true }
  })

  ipcMain.handle('vox:add-custom-template', (_event: unknown, template: any) => {
    if (template && typeof template === 'object') {
      return templateManager.addCustomTemplate(template)
    }
    return null
  })

  ipcMain.handle('vox:update-custom-template', (_event: unknown, id: string, updates: any) => {
    if (typeof id === 'string' && updates && typeof updates === 'object') {
      templateManager.updateCustomTemplate(id, updates)
    }
    return { success: true }
  })

  ipcMain.handle('vox:delete-custom-template', (_event: unknown, id: string) => {
    if (typeof id === 'string') templateManager.deleteCustomTemplate(id)
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

function getPushToTalkVk(): number | null {
  const shortcut = getSetting('shortcutPushToTalk', 'F9').trim()
  const parts = shortcut.split('+').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const key = parts[parts.length - 1].toUpperCase()

  // Function keys F1 - F24 (VK_F1 = 0x70, VK_F24 = 0x87)
  const fnMatch = /^F([1-9]|1[0-9]|2[0-4])$/i.exec(key)
  if (fnMatch) {
    return 0x70 + (parseInt(fnMatch[1], 10) - 1)
  }

  // A-Z (VK 0x41 - 0x5A)
  if (/^[A-Z]$/.test(key)) {
    return key.charCodeAt(0)
  }

  // 0-9 (VK 0x30 - 0x39)
  if (/^[0-9]$/.test(key)) {
    return key.charCodeAt(0)
  }

  // Common Special Keys
  const VK_MAP: Record<string, number> = {
    SPACE: 0x20,
    RETURN: 0x0D,
    ENTER: 0x0D,
    TAB: 0x09,
    ESCAPE: 0x1B,
    ESC: 0x1B,
    BACKSPACE: 0x08,
    DELETE: 0x2E,
    INSERT: 0x2D,
    HOME: 0x24,
    END: 0x23,
    PAGEUP: 0x21,
    PAGEDOWN: 0x22,
    UP: 0x26,
    DOWN: 0x28,
    LEFT: 0x25,
    RIGHT: 0x27,
    CAPSLOCK: 0x14,
    NUMLOCK: 0x90,
    SCROLLLOCK: 0x91,
    CONTROL: 0x11,
    CTRL: 0x11,
    ALT: 0x12,
    SHIFT: 0x10
  }

  return VK_MAP[key] ?? null
}

function getWinKeyHelperPath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(__dirname, '../../resources/win-key-helper.exe')
  }
  return path.join(process.resourcesPath, 'win-key-helper.exe')
}

function startPushToTalk() {
  if (!dockWindow) return
  if (recorder.getIsRecording()) return

  const vk = getPushToTalkVk()
  const useAutoStop = process.platform !== 'win32' || vk === null

  void captureActiveWindow()
  showDock()
  recorder.startRecording({ autoStopOnSilence: useAutoStop })
  void muteSystemAudioIfEnabled()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('vox:toggle-recording', true)
  }
  isPushToTalkActive = true

  if (process.platform === 'win32' && vk !== null) {
    const helperPath = getWinKeyHelperPath()
    if (fs.existsSync(helperPath)) {
      execFile(helperPath, [String(vk)], () => {
        stopPushToTalk()
      })
    } else {
      const psScript = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);' -Name KS -Namespace VOX; while (([VOX.KS]::GetAsyncKeyState(${vk}) -band 0x8000) -ne 0) { Start-Sleep -Milliseconds 15 }`
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      execFile('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], { timeout: 60000 }, () => {
        stopPushToTalk()
      })
    }
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

const MODIFIER_MAP: Record<string, string> = {
  Ctrl: 'Control',
  Alt: 'Alt',
  Shift: 'Shift',
  Cmd: 'Super'
}

function toAccelerator(shortcut: string): string | null {
  const parts = shortcut.split('+').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1).map((m) => MODIFIER_MAP[m] || m)
  return [...mods, key].join('+')
}

function registerShortcuts() {
  globalShortcut.unregisterAll()

  const toggle = getSetting('shortcutToggle', 'F10').trim() || 'F10'
  const ptt = getSetting('shortcutPushToTalk', 'F9').trim() || 'F9'
  const clipboard = getSetting('shortcutClipboard', 'F11').trim() || 'F11'

  const register = (shortcut: string, handler: () => void, name: string) => {
    const accel = toAccelerator(shortcut)
    if (!accel) {
      console.warn(`[Main] Atalho inválido para ${name}: "${shortcut}"`)
      return
    }
    try {
      const ok = globalShortcut.register(accel, handler)
      if (!ok) {
        console.warn(`[Main] Falha ao registrar o atalho ${accel} (${name}) — pode estar em uso por outro app.`)
      }
    } catch (err) {
      console.warn(`[Main] Erro ao registrar o atalho ${accel}:`, err)
    }
  }

  register(toggle, toggleDockWindow, 'toggle')
  register(ptt, startPushToTalk, 'push-to-talk')
  register(clipboard, toggleClipboardHistory, 'clipboard')
}

function setupCommandExecutorEvents() {
  commandExecutor.on('vox_control', (action: string) => {
    handleVoxControl(action)
  })
  commandExecutor.on('change_profile', (profile: string) => {
    handleChangeProfile(profile)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:change-profile', profile)
    }
  })
  commandExecutor.on('snippet_not_configured', (name: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:snippet-not-configured', name)
    }
  })
  commandExecutor.on('script_result', (result: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:script-result', result)
    }
  })
}

app.whenReady().then(async () => {
  await checkAndRequestMacPermissions()
  initDatabase()
  seedSnippets([
    { name: 'signature', triggerPt: 'inserir assinatura', triggerEn: 'insert signature' },
    { name: 'email_address', triggerPt: 'inserir email', triggerEn: 'insert email' },
    { name: 'address', triggerPt: 'inserir endereço', triggerEn: 'insert address' }
  ])
  setupIpcHandlers()
  setupCommandExecutorEvents()
  createMainWindow()
  createDockWindow()
  createClipboardWindow()
  initAutoUpdater(() => mainWindow)

  // Wake Word: modelo/detecção inicializado sob demanda (somente quando habilitado nas configurações)
  const settings = getAllSettings()
  const sensitivity = parseFloat(settings.wakeWordSensitivity || '0.5')

  // Acionamento por comando de voz "Vox"
  wakewordDetector.on('detected', () => {
    if (recorder.getIsRecording()) return
    console.log('[Main] 🎙️ Wake Word "Vox" detectada! Capturando janela ativa e iniciando ditado por voz...')
    wakewordDetector.pause()
    recorder.startRecording({ autoStopOnSilence: true })
    void muteSystemAudioIfEnabled()
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
    void unmuteSystemAudioIfNeeded()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vox:toggle-recording', false)
    }

    const buffer = recorder.stopRecording()
    wakewordDetector.resume()
    await processTranscriptionResult(buffer)
  })

  if (settings.wakeWordEnabled !== 'false') {
    await wakewordDetector.init(undefined, sensitivity)
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

  // Registra os atalhos globais a partir das configurações salvas
  registerShortcuts()

  // Tray icon para manter o app vivo quando a janela principal é fechada
  const iconPath = getAppIconPath()
  let trayImage: any = iconPath
  if (process.platform === 'darwin') {
    trayImage = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } else {
    const img = nativeImage.createFromPath(iconPath)
    trayImage = !img.isEmpty() ? img : iconPath
  }
  tray = new Tray(trayImage)
  tray.setToolTip('Vox')
  const lang = (settings.language || 'pt-BR').toLowerCase()
  const isEn = lang === 'en' || lang.startsWith('en')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: isEn ? 'Open Vox' : 'Abrir Vox', click: () => { showMainWindow() } },
    { type: 'separator' },
    { label: isEn ? 'Quit' : 'Sair', click: () => { tray?.destroy(); wakewordDetector.stop(); app.exit(0) } }
  ]))
  tray.on('click', () => { showMainWindow() })
  tray.on('double-click', () => { showMainWindow() })

  app.on('activate', () => {
    showMainWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
  wakewordDetector.stop()
  unmuteSystemAudioOnQuit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // Não encerra o app para manter os globalShortcuts (F9/F10) ativos na bandeja
})
