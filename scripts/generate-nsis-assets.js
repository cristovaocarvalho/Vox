const fs = require('fs')
const path = require('path')

function createBmp(width, height, drawPixelFn) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize

  const buffer = Buffer.alloc(fileSize)

  // BMP Header (14 bytes)
  buffer.write('BM', 0) // Type
  buffer.writeUInt32LE(fileSize, 2) // File size
  buffer.writeUInt32LE(0, 6) // Reserved
  buffer.writeUInt32LE(54, 10) // Offset to pixel array

  // DIB Header (40 bytes - BITMAPINFOHEADER)
  buffer.writeUInt32LE(40, 14) // Header size
  buffer.writeInt32LE(width, 18) // Width
  buffer.writeInt32LE(height, 22) // Height (bottom to top if positive)
  buffer.writeUInt16LE(1, 26) // Planes
  buffer.writeUInt16LE(24, 28) // Bits per pixel (24-bit RGB)
  buffer.writeUInt32LE(0, 30) // Compression (none)
  buffer.writeUInt32LE(pixelArraySize, 34) // Image size
  buffer.writeInt32LE(2835, 38) // Horizontal resolution (72 DPI)
  buffer.writeInt32LE(2835, 42) // Vertical resolution (72 DPI)
  buffer.writeUInt32LE(0, 46) // Colors in color table
  buffer.writeUInt32LE(0, 50) // Important color count

  // Pixels (from bottom row to top row)
  for (let y = 0; y < height; y++) {
    // In BMP bottom row is y=0, top row is y=height-1
    const actualY = height - 1 - y
    const rowOffset = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const [r, g, b] = drawPixelFn(x, actualY, width, height)
      const pixelOffset = rowOffset + x * 3
      buffer[pixelOffset] = Math.min(255, Math.max(0, Math.round(b)))
      buffer[pixelOffset + 1] = Math.min(255, Math.max(0, Math.round(g)))
      buffer[pixelOffset + 2] = Math.min(255, Math.max(0, Math.round(r)))
    }
  }

  return buffer
}

const buildDir = path.join(__dirname, '../resources/installer')
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

// 1. Sidebar (164 x 314) - Deep Dark Luxury / Liquid Glass Aesthetic
const sidebarBmp = createBmp(164, 314, (x, y, w, h) => {
  // Base dark gradient from top to bottom (#0D0D0F -> #16161A)
  const normY = y / h
  const normX = x / w
  let r = 13 + normY * 9
  let g = 13 + normY * 9
  let b = 15 + normY * 11

  // Radial glow in upper center (where the logo sits)
  const centerX = w * 0.5
  const centerY = h * 0.38
  const dx = (x - centerX) / (w * 0.5)
  const dy = (y - centerY) / (h * 0.35)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) {
    const glow = Math.pow(1 - dist, 2) * 55
    r += glow
    g += glow
    b += glow * 1.15
  }

  // Subtle grid pattern
  if ((x % 16 === 0 || y % 16 === 0) && Math.random() < 0.15) {
    r += 8
    g += 8
    b += 10
  }

  // Right edge border separator line
  if (x >= w - 1) {
    r = 42
    g = 42
    b = 53
  }

  return [r, g, b]
})

// 2. Header (150 x 57) - Dark Top Banner
const headerBmp = createBmp(150, 57, (x, y, w, h) => {
  const normX = x / w
  let r = 16 + (1 - normX) * 6
  let g = 16 + (1 - normX) * 6
  let b = 20 + (1 - normX) * 8

  // Bottom border separator line
  if (y >= h - 1) {
    r = 42
    g = 42
    b = 53
  }

  return [r, g, b]
})

fs.writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBmp)
fs.writeFileSync(path.join(buildDir, 'uninstallerSidebar.bmp'), sidebarBmp)
fs.writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBmp)

console.log('NSIS BMP assets generated successfully at:', buildDir)
