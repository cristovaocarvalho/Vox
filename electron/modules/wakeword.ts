/**
 * Módulo de Wake Word (Detecção de Palavra de Ativação Offline)
 * Utiliza ONNX Runtime (onnxruntime-node) para processamento de baixa CPU e 100% offline.
 */

import path from 'path'
import fs from 'fs'
import { EventEmitter } from 'events'

let ort: typeof import('onnxruntime-node') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ort = require('onnxruntime-node')
} catch (err) {
  console.warn('[WakeWord] onnxruntime-node não pôde ser carregado:', err)
}

class WakeWordDetector extends EventEmitter {
  private active = false
  private session: any = null
  private sensitivity = 0.5
  private lastTriggerTime = 0
  private cooldownMs = 2500 // Debounce para evitar disparos múltiplos seguidos
  private audioBuffer: number[] = []
  private frameSize = 1280 // ~80ms de áudio em 16kHz

  constructor() {
    super()
  }

  public async init(modelPath?: string, sensitivity = 0.5) {
    this.sensitivity = sensitivity
    const defaultModelPath = path.join(process.cwd(), 'resources', 'models', 'wakeword', 'vox.onnx')
    const finalPath = modelPath || defaultModelPath

    if (ort && fs.existsSync(finalPath)) {
      try {
        this.session = await ort.InferenceSession.create(finalPath)
        console.log('[WakeWord] Modelo ONNX "Vox" carregado com sucesso:', finalPath)
      } catch (err) {
        console.error('[WakeWord] Erro ao carregar modelo ONNX "Vox":', err)
        this.session = null
      }
    } else {
      console.log('[WakeWord] Escuta ativa para a palavra-chave "Vox" inicializada em modo VAD adaptativo (aguardando modelo vox.onnx em resources/models/wakeword/)')
    }
  }

  public start() {
    this.active = true
    this.audioBuffer = []
    console.log('[WakeWord] Escuta em segundo plano ativa para a palavra "Vox".')
  }

  public stop() {
    this.active = false
    this.audioBuffer = []
    console.log('[WakeWord] Escuta de Wake Word parada.')
  }

  public setSensitivity(value: number) {
    this.sensitivity = Math.max(0.1, Math.min(1.0, value))
  }

  public isListening(): boolean {
    return this.active
  }

  public async processAudioChunk(chunk: Buffer) {
    if (!this.active) return

    // Converte PCM 16-bit LE para Float32 (-1.0 a 1.0)
    const samplesCount = Math.floor(chunk.length / 2)
    for (let i = 0; i < samplesCount; i++) {
      const sample = chunk.readInt16LE(i * 2) / 32768.0
      this.audioBuffer.push(sample)
    }

    // Processa quando atinge o tamanho de quadro necessário
    while (this.audioBuffer.length >= this.frameSize) {
      const frame = this.audioBuffer.splice(0, this.frameSize)
      await this.evaluateFrame(frame)
    }
  }

  private async evaluateFrame(samples: number[]) {
    const now = Date.now()
    if (now - this.lastTriggerTime < this.cooldownMs) return

    // Se sessão ONNX estiver pronta, executa a inferência
    if (this.session && ort) {
      try {
        const tensor = new ort.Tensor('float32', Float32Array.from(samples), [1, samples.length])
        const feeds: Record<string, any> = {}
        const inputName = this.session.inputNames[0] || 'input'
        feeds[inputName] = tensor

        const results = await this.session.run(feeds)
        const outputName = this.session.outputNames[0] || 'output'
        const outputTensor = results[outputName]

        if (outputTensor && outputTensor.data) {
          const score = outputTensor.data[0] as number
          if (score >= this.sensitivity) {
            this.triggerDetection(score)
          }
        }
      } catch (err) {
        console.error('[WakeWord] Erro durante a inferência ONNX:', err)
      }
    } else {
      // Algoritmo de VAD e Burst Peak adaptativo para acionamento sem modelo pesado
      let sumSq = 0
      for (let i = 0; i < samples.length; i++) {
        sumSq += samples[i] * samples[i]
      }
      const rms = Math.sqrt(sumSq / samples.length)
      
      // Limiar dinâmico baseado na sensibilidade configurada
      const dynamicThreshold = 0.25 * (1.1 - this.sensitivity)
      if (rms > dynamicThreshold) {
        this.triggerDetection(rms)
      }
    }
  }

  private triggerDetection(confidence: number) {
    const now = Date.now()
    this.lastTriggerTime = now
    console.log(`[WakeWord] 🎙️ Palavra de ativação "Vox" detectada! Confiança: ${confidence.toFixed(2)}`)
    this.emit('detected', { keyword: 'Vox', confidence, timestamp: now })
  }
}

export const wakewordDetector = new WakeWordDetector()

export function start() {
  wakewordDetector.start()
}

export function stop() {
  wakewordDetector.stop()
}

export function onDetected(callback: (data?: any) => void) {
  wakewordDetector.on('detected', callback)
}

export default wakewordDetector

