import { execFile, execFileSync } from 'child_process'
import { promisify } from 'util'
import { sendKeyWin32 } from './win32'

const execFileAsync = promisify(execFile)

let isCurrentlyMuted = false

export async function muteSystemAudio(): Promise<void> {
  if (isCurrentlyMuted) return

  // macOS (Darwin)
  if (process.platform === 'darwin') {
    try {
      await execFileAsync('osascript', ['-e', 'set volume output muted true'], { timeout: 1500 })
      isCurrentlyMuted = true
    } catch (err) {
      console.warn('[AudioMute] Falha ao mutar áudio no macOS:', err)
    }
    return
  }

  // Windows (Win32): Instant VK_VOLUME_MUTE (0xAD) via Win32 FFI (<0.1ms)
  if (process.platform === 'win32') {
    try {
      sendKeyWin32(0xAD) // VK_VOLUME_MUTE
      isCurrentlyMuted = true
    } catch (err) {
      console.warn('[AudioMute] Falha ao mutar áudio no Windows:', err)
    }
  }
}

export async function unmuteSystemAudio(): Promise<void> {
  if (!isCurrentlyMuted) return

  // macOS (Darwin)
  if (process.platform === 'darwin') {
    try {
      await execFileAsync('osascript', ['-e', 'set volume output muted false'], { timeout: 1500 })
      isCurrentlyMuted = false
    } catch (err) {
      console.warn('[AudioMute] Falha ao desmutar áudio no macOS:', err)
    }
    return
  }

  // Windows (Win32)
  if (process.platform === 'win32') {
    try {
      sendKeyWin32(0xAD) // VK_VOLUME_MUTE
      isCurrentlyMuted = false
    } catch (err) {
      console.warn('[AudioMute] Falha ao desmutar áudio no Windows:', err)
    }
  }
}

export function unmuteSystemAudioSync(): void {
  if (!isCurrentlyMuted) return

  if (process.platform === 'darwin') {
    try {
      execFileSync('osascript', ['-e', 'set volume output muted false'], { timeout: 1500 })
      isCurrentlyMuted = false
    } catch (err) {
      console.warn('[AudioMute] Falha ao desmutar áudio no macOS (sync):', err)
    }
    return
  }

  if (process.platform === 'win32') {
    try {
      sendKeyWin32(0xAD)
      isCurrentlyMuted = false
    } catch (err) {
      console.warn('[AudioMute] Falha ao desmutar áudio no Windows (sync):', err)
    }
  }
}

export default {
  muteSystemAudio,
  unmuteSystemAudio,
  unmuteSystemAudioSync
}
