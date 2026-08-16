const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const pkg = require('../package.json')
const version = pkg.version
const tag = `v${version}`

console.log(`[Release] Iniciando build e publicação da versão ${tag}...`)

// 1. Build
execSync('npm run build:win', { stdio: 'inherit', cwd: path.join(__dirname, '..') })

const distDir = path.join(__dirname, '../dist-build')
const setupExe = path.join(distDir, 'Vox Setup.exe')
const latestYml = path.join(distDir, 'latest.yml')

if (!fs.existsSync(setupExe) || !fs.existsSync(latestYml)) {
  console.error('[Release] Erro: Arquivos Vox Setup.exe ou latest.yml não encontrados em dist-build.')
  process.exit(1)
}

// 2. Publicar via GitHub CLI (gh)
console.log(`[Release] Publicando ${tag} no GitHub Releases via gh CLI...`)
try {
  execSync(`gh release create ${tag} "${setupExe}" "${latestYml}" --title "Vox ${tag}" --notes "Lançamento da versão ${tag} com atualizações automáticas."`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  })
  console.log(`[Release] ✅ Versão ${tag} publicada com sucesso no GitHub!`)
} catch (err) {
  console.error('[Release] ⚠️ Falha ao criar release via gh CLI:', err.message)
  console.log('[Release] Dica: Você também pode fazer o upload manual dos arquivos dist-build/Vox Setup.exe e dist-build/latest.yml em https://github.com/cristovaocarvalho/Vox/releases')
}
