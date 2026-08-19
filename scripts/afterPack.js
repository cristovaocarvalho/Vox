const fs = require('fs')
const path = require('path')

/**
 * electron-builder afterPack hook
 * Remove binários nativos de plataformas externas do onnxruntime-node
 * reduzindo mais de 140 MB do pacote final.
 */
exports.default = async function (context) {
  const targetPlatform = context.electronPlatformName // 'win32' | 'darwin' | 'linux'
  const appOutDir = context.appOutDir

  console.log(`[afterPack] Iniciando pruning do onnxruntime-node para a plataforma: ${targetPlatform}...`)

  const candidateRoots = [
    path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'onnxruntime-node', 'bin'),
    path.join(appOutDir, 'resources', 'app', 'node_modules', 'onnxruntime-node', 'bin'),
    path.join(appOutDir, 'Vox.app', 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'onnxruntime-node', 'bin'),
    path.join(appOutDir, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'onnxruntime-node', 'bin'),
    path.join(appOutDir, 'Contents', 'Resources', 'app', 'node_modules', 'onnxruntime-node', 'bin')
  ]

  let prunedCount = 0

  for (const binRoot of candidateRoots) {
    if (!fs.existsSync(binRoot)) continue

    const napiDirs = fs.readdirSync(binRoot)
    for (const napiDir of napiDirs) {
      const napiPath = path.join(binRoot, napiDir)
      if (!fs.statSync(napiPath).isDirectory()) continue

      const platformDirs = fs.readdirSync(napiPath)
      for (const platformDir of platformDirs) {
        const platformPath = path.join(napiPath, platformDir)
        if (!fs.statSync(platformPath).isDirectory()) continue

        // Remove plataformas que não sejam a de destino
        if (platformDir !== targetPlatform) {
          console.log(`[afterPack] 🗑️ Removendo binários não utilizados (${platformDir}): ${platformPath}`)
          fs.rmSync(platformPath, { recursive: true, force: true })
          prunedCount++
        }
      }
    }
  }

  console.log(`[afterPack] ✅ Pruning do onnxruntime-node finalizado com sucesso (${prunedCount} pastas de plataformas externas removidas).`)
}
