/**
 * Módulo de Wake Word (Detecção de Palavra de Ativação Offline "Vox")
 * Utiliza ONNX Runtime (onnxruntime-node) e openWakeWord para processamento 100% offline.
 */

import path from 'path'
import fs from 'fs'
import { EventEmitter } from 'events'

let ort: typeof import('onnxruntime-node') | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ort = require('onnxruntime-node')
} catch (err) {
  console.warn('[WakeWord] onnxruntime-node não pôde ser carregado:', err)
}

let recordLpcm: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  recordLpcm = require('node-record-lpcm16')
} catch {
  // node-record-lpcm16 opcional
}

export class WakeWordDetector extends EventEmitter {
  private active = false
  private paused = false
  private session: any = null
  private sensitivity = 0.5 // 0.0 a 1.0 (50% por padrão)
  private threshold = 0.70 // Derivado da sensibilidade (0.9 - sens * 0.4)
  private lastTriggerTime = 0
  private cooldownMs = 2500 // Cooldown de 2.5s para evitar múltiplos disparos
  private audioBuffer: number[] = []
  private frameSize = 1280 // 1280 amostras = 80ms a 16kHz (exigido pelo openWakeWord)
  private recordingStream: any = null
  private modelLoaded = false
  private isEvaluating = false
  private nextFrameToEvaluate: number[] | null = null

  constructor() {
    super()
  }

  public async init(modelPath?: string, sensitivity = 0.5): Promise<boolean> {
    this.setSensitivity(sensitivity)
    const defaultModelPath = path.join(process.cwd(), 'resources', 'models', 'wakeword', 'vox.onnx')
    const altModelPath = path.join(__dirname, '..', '..', 'resources', 'models', 'wakeword', 'vox.onnx')

    let finalPath = modelPath || defaultModelPath
    if (!fs.existsSync(finalPath) && fs.existsSync(altModelPath)) {
      finalPath = altModelPath
    }

    if (!fs.existsSync(finalPath)) {
      console.warn('[WakeWord] Aviso: Modelo vox.onnx não encontrado em:', finalPath)
      this.modelLoaded = false
      this.emit('wakeword-model-missing', { path: finalPath })
      return false
    }

    if (!ort) {
      console.error('[WakeWord] Erro: onnxruntime-node não disponível.')
      this.modelLoaded = false
      return false
    }

    try {
      this.session = await ort.InferenceSession.create(finalPath)
      this.modelLoaded = true
      console.log('[WakeWord] Modelo ONNX "Vox" carregado com sucesso:', finalPath)
      return true
    } catch (err: any) {
      console.error('[WakeWord] Erro ao carregar modelo ONNX "Vox":', err)
      this.modelLoaded = false
      this.emit('wakeword-error', { error: err?.message || 'Falha ao carregar modelo ONNX' })
      return false
    }
  }

  public setSensitivity(value: number) {
    // Sensibilidade de 0 a 1 -> Threshold de 0.9 a 0.5 (invertido)
    const normalized = Math.max(0.0, Math.min(1.0, value))
    this.sensitivity = normalized
    this.threshold = 0.9 - (normalized * 0.4)
    console.log(`[WakeWord] Sensibilidade ajustada: ${Math.round(normalized * 100)}% (Threshold: ${this.threshold.toFixed(2)})`)
  }

  public isListening(): boolean {
    return this.active && !this.paused
  }

  public isModelLoaded(): boolean {
    return this.modelLoaded
  }

  public start() {
    if (this.active) return
    if (!this.modelLoaded && !this.session) {
      console.warn('[WakeWord] Tentativa de iniciar listener sem modelo ONNX carregado.')
      this.emit('wakeword-model-missing', {})
      return
    }

    this.active = true
    this.paused = false
    this.audioBuffer = []

    this.startMicStream()
    console.log('[WakeWord] Escuta em segundo plano ativa para a palavra "Vox".')
  }

  public stop() {
    this.active = false
    this.paused = false
    this.audioBuffer = []
    this.stopMicStream()
    console.log('[WakeWord] Escuta de Wake Word encerrada.')
  }

  public pause() {
    if (!this.active) return
    this.paused = true
    this.audioBuffer = []
    console.log('[WakeWord] Listener pausado temporariamente durante gravação de áudio.')
  }

  public resume() {
    if (!this.active) return
    this.paused = false
    this.audioBuffer = []
    console.log('[WakeWord] Listener retomado.')
  }

  private startMicStream() {
    if (!recordLpcm || this.recordingStream) return

    try {
      this.recordingStream = recordLpcm.record({
        sampleRate: 16000,
        channels: 1,
        audioType: 'raw',
        endOnSilence: false
      })

      const stream = this.recordingStream.stream()

      stream.on('data', (chunk: Buffer) => {
        if (this.active && !this.paused) {
          this.processAudioChunk(chunk)
        }
      })

      stream.on('error', (err: any) => {
        console.error('[WakeWord] Erro no stream de captura de microfone:', err)
        this.emit('wakeword-error', { error: err?.message || 'Erro no microfone em segundo plano' })
      })
    } catch (err: any) {
      console.warn('[WakeWord] Não foi possível iniciar node-record-lpcm16:', err?.message)
      this.emit('wakeword-error', { error: err?.message || 'Falha ao iniciar microfone de segundo plano' })
    }
  }

  private stopMicStream() {
    if (this.recordingStream) {
      try {
        this.recordingStream.stop()
      } catch {
        // ignore stream close errors
      }
      this.recordingStream = null
    }
  }

  private queueFrameEvaluation(frame: number[]) {
    if (this.isEvaluating) {
      this.nextFrameToEvaluate = frame
      return
    }

    this.isEvaluating = true
    this.evaluateFrame(frame).then(() => {
      this.isEvaluating = false
      if (this.nextFrameToEvaluate) {
        const next = this.nextFrameToEvaluate
        this.nextFrameToEvaluate = null
        this.queueFrameEvaluation(next)
      }
    })
  }

  public processAudioChunk(chunk: Buffer) {
    if (!this.active || this.paused) return

    // Converte PCM 16-bit LE para Float32 (-1.0 a 1.0)
    const samplesCount = Math.floor(chunk.length / 2)
    for (let i = 0; i < samplesCount; i++) {
      const sample = chunk.readInt16LE(i * 2) / 32768.0
      this.audioBuffer.push(sample)
    }

    // Processa em janelas de 1280 amostras (~80ms a 16kHz)
    let offset = 0
    while (offset + this.frameSize <= this.audioBuffer.length) {
      const frame = this.audioBuffer.slice(offset, offset + this.frameSize)
      offset += this.frameSize
      this.queueFrameEvaluation(frame)
    }

    // Compact: remove processed samples
    if (offset > 0) {
      this.audioBuffer = this.audioBuffer.slice(offset)
    }
  }

  private async evaluateFrame(samples: number[]) {
    const now = Date.now()
    if (now - this.lastTriggerTime < this.cooldownMs) return
    if (!this.session || !ort) return

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
        if (score >= this.threshold) {
          this.triggerDetection(score)
        }
      }
    } catch (err: any) {
      console.error('[WakeWord] Exceção durante inferência ONNX:', err?.message)
    }
  }

  private triggerDetection(score: number) {
    const now = Date.now()
    this.lastTriggerTime = now
    console.log(`[WakeWord] 🎙️ Wake Word "Vox" detectada! Score: ${score.toFixed(3)} (Threshold: ${this.threshold.toFixed(2)})`)
    this.emit('detected', { keyword: 'Vox', score, timestamp: now })
  }
}

const wakewordDetector = new WakeWordDetector()
export default wakewordDetector
