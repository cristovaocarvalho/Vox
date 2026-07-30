import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import https from 'https'

export interface DownloadOptions {
  url: string
  outputDir: string
  cookiesFromBrowser?: 'none' | 'chrome' | 'firefox' | 'edge' | 'brave'
  cookiesFile?: string
  onProgress?: (pct: number, speed: string, eta: string) => void
}

export interface DownloadResult {
  audioPath: string
  title: string
  duration: number
  platform: string
}

export interface VideoInfo {
  title: string
  duration: number
  thumbnail: string
  platform: string
}

export function detectPlatform(url: string): 'youtube' | 'tiktok' | 'instagram' | 'unknown' {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/tiktok\.com/.test(url)) return 'tiktok'
  if (/instagram\.com/.test(url)) return 'instagram'
  return 'unknown'
}

async function downloadBinary(url: string, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          return downloadBinary(res.headers.location, targetPath).then(resolve).catch(reject)
        }
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Falha ao baixar binário: HTTP ${res.statusCode}`))
      }
      const fileStream = fs.createWriteStream(targetPath)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', (err) => {
        fs.unlink(targetPath, () => reject(err))
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

export async function ensureExecutable(): Promise<string> {
  const possiblePaths = [
    path.join(process.cwd(), 'resources', 'binaries', 'yt-dlp.exe'),
    path.join(process.cwd(), 'resources', 'binaries', 'yt-dlp'),
    path.join(__dirname, '..', '..', 'resources', 'binaries', 'yt-dlp.exe'),
    path.join(__dirname, '..', '..', 'resources', 'binaries', 'yt-dlp'),
    'yt-dlp'
  ]

  for (const p of possiblePaths) {
    if (p !== 'yt-dlp' && fs.existsSync(p)) {
      return p
    }
  }

  const targetDir = path.join(process.cwd(), 'resources', 'binaries')
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  const targetFile = path.join(targetDir, 'yt-dlp.exe')

  if (!fs.existsSync(targetFile)) {
    console.log('[Downloader] Baixando yt-dlp.exe automaticamente...')
    try {
      await downloadBinary('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', targetFile)
    } catch (err) {
      console.error('[Downloader] Erro no auto-download do yt-dlp:', err)
    }
  }

  return fs.existsSync(targetFile) ? targetFile : 'yt-dlp'
}

export async function getVideoInfo(url: string, cookiesFromBrowser?: string): Promise<VideoInfo> {
  const platform = detectPlatform(url)
  const executable = await ensureExecutable()

  const args = [
    '--dump-json',
    '--no-warnings',
    '--no-playlist',
    '--no-check-certificates',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    url
  ]

  if (cookiesFromBrowser && cookiesFromBrowser !== 'none') {
    args.push('--cookies-from-browser', cookiesFromBrowser)
  }

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''

    try {
      const proc = spawn(executable, args)

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      proc.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const data = JSON.parse(stdout)
            return resolve({
              title: data.title || data.fulltitle || 'Vídeo Vox Media',
              duration: Math.round(data.duration || 0),
              thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url) || '',
              platform
            })
          } catch {
            // Fallback
          }
        }

        // Auto retry without cookies if browser database is locked by running browser
        if (cookiesFromBrowser && cookiesFromBrowser !== 'none' && /cookie database|Could not copy/i.test(stderr)) {
          return getVideoInfo(url, 'none').then(resolve)
        }

        resolve({
          title: `Mídia (${platform.toUpperCase()})`,
          duration: 120,
          thumbnail: '',
          platform
        })
      })

      proc.on('error', () => {
        resolve({
          title: `Mídia (${platform.toUpperCase()})`,
          duration: 120,
          thumbnail: '',
          platform
        })
      })
    } catch {
      resolve({
        title: `Mídia (${platform.toUpperCase()})`,
        duration: 120,
        thumbnail: '',
        platform
      })
    }
  })
}

export async function downloadAudio(options: DownloadOptions): Promise<DownloadResult> {
  const platform = detectPlatform(options.url)
  const executable = await ensureExecutable()
  const timestamp = Date.now()
  const baseFileName = `vox_media_${timestamp}`
  const outputTemplate = path.join(options.outputDir, `${baseFileName}.%(ext)s`)

  // Robust flags for YouTube, TikTok, Instagram & generic media sites
  const args = [
    '-f',
    'ba/b/best',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--geo-bypass',
    '--socket-timeout',
    '30',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    '-o',
    outputTemplate,
    options.url
  ]

  if (options.cookiesFromBrowser && options.cookiesFromBrowser !== 'none') {
    args.push('--cookies-from-browser', options.cookiesFromBrowser)
  }

  return new Promise((resolve, reject) => {
    let stderrText = ''

    try {
      const proc = spawn(executable, args)

      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString()
        const match = text.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+\S+\s+at\s+(\S+)\s+ETA\s+(\S+)/)
        if (match && options.onProgress) {
          const pct = parseFloat(match[1])
          const speed = match[2]
          const eta = match[3]
          options.onProgress(pct, speed, eta)
        }
      })

      proc.stderr.on('data', (chunk) => {
        stderrText += chunk.toString()
      })

      proc.on('close', (code) => {
        // 1. Check if a file matching vox_media_${timestamp}.* was generated on disk
        try {
          const files = fs.readdirSync(options.outputDir)
          const downloadedFile = files.find((f) => f.startsWith(baseFileName))

          if (downloadedFile) {
            const fullPath = path.join(options.outputDir, downloadedFile)
            options.onProgress?.(100, 'Concluído', '00:00')
            return resolve({
              audioPath: fullPath,
              title: `Mídia (${platform.toUpperCase()})`,
              duration: 0,
              platform
            })
          }
        } catch {
          // directory read error
        }

        // 2. Fallback retry: if browser cookie DB is locked by open browser, retry without cookies!
        const isCookieLock = /cookie database|Could not copy|cookies/i.test(stderrText)
        if (isCookieLock && options.cookiesFromBrowser && options.cookiesFromBrowser !== 'none') {
          console.warn('[Downloader] Banco de cookies bloqueado pelo navegador aberto. Tentando download sem cookies...')
          return downloadAudio({ ...options, cookiesFromBrowser: 'none' }).then(resolve).catch(reject)
        }

        // 3. If no file was created and exit code != 0, extract meaningful error message
        if (code !== 0) {
          const errorMatch = stderrText.match(/ERROR:\s*(.+)/i)
          const cleanError = errorMatch ? errorMatch[1].trim() : stderrText.trim()
          
          if (cleanError) {
            return reject(new Error(`Falha no download: ${cleanError}`))
          }

          return reject(
            new Error(
              `yt-dlp não conseguiu baixar a mídia (Código ${code}). Verifique se a URL é pública e acessível.`
            )
          )
        }

        reject(new Error('O arquivo de mídia não foi encontrado na pasta Downloads.'))
      })

      proc.on('error', (err) => {
        reject(new Error(`Erro ao executar o downloader (${err.message}).`))
      })
    } catch (err: any) {
      reject(new Error(err?.message || 'Erro inesperado ao baixar mídia.'))
    }
  })
}

export default {
  detectPlatform,
  getVideoInfo,
  downloadAudio
}
