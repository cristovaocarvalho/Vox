const fs = require('fs')
const path = require('path')
const https = require('https')

const URLs = [
  'https://media.githubusercontent.com/media/dscripka/openWakeWord/v0.5.0/openwakeword/resources/models/hey_jarvis_v0.1.onnx',
  'https://media.githubusercontent.com/media/dscripka/openWakeWord/v0.5.0/openwakeword/resources/models/alexa_v0.1.onnx',
  'https://media.githubusercontent.com/media/dscripka/openWakeWord/v0.5.0/openwakeword/resources/models/hey_mycroft_v0.1.onnx'
]

const targetDir = path.join(__dirname, '..', 'resources', 'models', 'wakeword')
const targetPath = path.join(targetDir, 'vox.onnx')

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const opt = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }
    https.get(url, opt, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          return downloadFile(res.headers.location, dest).then(resolve).catch(reject)
        }
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP Error ${res.statusCode}`))
      }
      const fileStream = fs.createWriteStream(dest)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => reject(err))
      })
    }).on('error', (err) => reject(err))
  })
}

async function main() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 100000) {
    console.log(`[WakeWord Download] O modelo vox.onnx já existe em ${targetPath} (${(fs.statSync(targetPath).size / 1024).toFixed(1)} KB)`)
    return
  }

  console.log('[WakeWord Download] Baixando modelo ONNX openWakeWord (LFS binary)...')

  for (const url of URLs) {
    try {
      console.log(`[WakeWord Download] Baixando de: ${url}`)
      await downloadFile(url, targetPath)
      const size = fs.statSync(targetPath).size
      if (size > 100000) {
        console.log(`[WakeWord Download] Modelo vox.onnx baixado com sucesso! (${(size / 1024).toFixed(1)} KB)`)
        return
      }
    } catch (err) {
      console.warn(`[WakeWord Download] Falha em ${url}: ${err.message}`)
    }
  }

  console.error('[WakeWord Download] Não foi possível baixar o modelo ONNX.')
  process.exit(1)
}

main()
