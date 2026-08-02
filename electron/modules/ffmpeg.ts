import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function ensureFfmpegExecutable(): Promise<string> {
  const isWin = process.platform === 'win32'
  const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg'

  const possiblePaths = [
    path.join(process.cwd(), 'resources', 'binaries', binaryName),
    path.join(__dirname, '..', '..', 'resources', 'binaries', binaryName),
    'ffmpeg'
  ]

  for (const p of possiblePaths) {
    if (p !== 'ffmpeg' && fs.existsSync(p)) {
      return p
    }
  }

  return 'ffmpeg'
}

export function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ['.mp4', '.mkv', '.mov', '.avi', '.webm'].includes(ext)
}

export async function extractAudioFromVideo(
  videoPath: string,
  outputDir: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const ffmpegExec = await ensureFfmpegExecutable()
  const timestamp = Date.now()
  const audioPath = path.join(outputDir, `vox_extracted_${timestamp}.mp3`)

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', videoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      audioPath
    ]

    console.log(`[FFmpeg] Extraindo áudio de ${videoPath} para ${audioPath}...`)
    try {
      const proc = spawn(ffmpegExec, args)

      proc.stderr.on('data', (data) => {
        const text = data.toString()
        const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/)
        if (match && onProgress) {
          // Rough progress callback if needed
          onProgress(50)
        }
      })

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(audioPath)) {
          resolve(audioPath)
        } else {
          // Fallback: If libmp3lame fails or code != 0, try simple default mp3 audio copy
          const fallbackArgs = ['-y', '-i', videoPath, '-vn', audioPath]
          const fallbackProc = spawn(ffmpegExec, fallbackArgs)
          fallbackProc.on('close', (fallbackCode) => {
            if (fallbackCode === 0 && fs.existsSync(audioPath)) {
              resolve(audioPath)
            } else {
              reject(new Error(`Falha ao extrair áudio via FFmpeg (código ${code})`))
            }
          })
        }
      })

      proc.on('error', (err) => {
        reject(new Error(`Erro no processo FFmpeg: ${err.message}`))
      })
    } catch (err: any) {
      reject(new Error(`Exceção ao executar FFmpeg: ${err?.message || err}`))
    }
  })
}

export default {
  ensureFfmpegExecutable,
  isVideoFile,
  extractAudioFromVideo
}
