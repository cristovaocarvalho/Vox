import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, ipcMain } = require('electron')

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const notify = (data: any) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('vox:updater-status', data)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    notify({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    notify({ status: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', (info) => {
    notify({ status: 'not-available', version: info?.version })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    notify({
      status: 'downloading',
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    notify({ status: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    let msg = err?.message || 'Erro ao conectar ao servidor de atualizações.'
    if (msg.includes('404') && msg.includes('releases.atom')) {
      msg = 'Repositório privado: as releases precisam ser públicas para download automático.'
    }
    notify({ status: 'error', error: msg })
  })

  ipcMain.handle('vox:check-for-updates', async () => {
    if (!app.isPackaged) {
      return { success: false, message: 'Em modo de desenvolvimento (não empacotado)' }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, version: result?.updateInfo?.version }
    } catch (e: any) {
      let msg = e?.message || 'Erro ao verificar atualizações.'
      if (msg.includes('404') && msg.includes('releases.atom')) {
        msg = 'Repositório privado: as releases precisam ser públicas para download automático.'
      }
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('vox:restart-and-install-update', () => {
    autoUpdater.quitAndInstall()
  })

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((e) => {
        console.warn('[AutoUpdater] Falha na checagem automática inicial:', e)
      })
    }, 6000)
  }
}
