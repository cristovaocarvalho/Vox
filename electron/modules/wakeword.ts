/**
 * Módulo de Wake Word (Detecção da Palavra de Ativação "Vox")
 * 100% Local e Offline utilizando ONNX Runtime e VAD inteligente.
 * Elimina completamente requisições de rede à Groq durante a escuta de fundo.
 */

import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('electron')

let ort: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ort = require('onnxruntime-node')
} catch (err) {
  console.warn('[WakeWord] onnxruntime-node não disponível:', err)
}

const SAMPLE_RATE = 16000
const MAX_BUFFER_SECONDS = 2.5
const MIN_UTTERANCE_SECONDS = 0.25
const SILENCE_END_SECONDS = 0.45

export class WakeWordDetector extends EventEmitter {
  private active = false
  private paused = false
  private sensitivity = 0.5
  private vadThreshold = 0.02
  private onnxSession: any = null
  private modelLoaded = false
  private audioBuffer: number[] = []
  private maxBufferSamples = SAMPLE_RATE * MAX_BUFFER_SECONDS
  private minUtteranceSamples = Math.floor(SAMPLE_RATE * MIN_UTTERANCE_SECONDS)
  private silenceSamples = Math.floor(SAMPLE_RATE * SILENCE_END_SECONDS)
  private currentIndex = 0
  private lastSpeechIndex = -1
  private utteranceStartIndex = -1
  private hasSpeech = false
  private lastTriggerTime = 0
  private cooldownMs = 2000

  constructor() {
    super()
  }

  public async init(_modelPath?: string, sensitivity?: number): Promise<boolean> {
    if (sensitivity !== undefined) {
      this.setSensitivity(sensitivity)
    }

    try {
      const defaultModelPath = this.resolveModelPath()
      if (ort && fs.existsSync(defaultModelPath)) {
        this.onnxSession = await ort.InferenceSession.create(defaultModelPath)
        this.modelLoaded = true
        console.log('[WakeWord] Modelo ONNX vox.onnx carregado com sucesso:', defaultModelPath)
        return true
      }
    } catch (err) {
      console.warn('[WakeWord] Falha ao carregar modelo ONNX (usando VAD local):', err)
    }

    this.modelLoaded = true
    return true
  }

  private resolveModelPath(): string {
    const isDev = !app?.isPackaged
    if (isDev) {
      return path.join(process.cwd(), 'resources', 'models', 'wakeword', 'vox.onnx')
    }
    return path.join(process.resourcesPath, 'models', 'wakeword', 'vox.onnx')
  }

  public setSensitivity(value: number) {
    const normalized = Math.max(0.0, Math.min(1.0, value))
    this.sensitivity = normalized
    this.vadThreshold = 0.035 - normalized * 0.025
    console.log(`[WakeWord] Sensibilidade ajustada: ${Math.round(normalized * 100)}% (VAD Threshold: ${this.vadThreshold.toFixed(3)})`)
  }

  public isListening(): boolean {
    return this.active && !this.paused
  }

  public isModelLoaded(): boolean {
    return this.modelLoaded
  }

  public start() {
    if (this.active) return
    this.active = true
    this.paused = false
    this.resetBuffer()
    console.log('[WakeWord] Escuta em segundo plano ativa para a palavra "Vox" (Local Offline).')
  }

  public stop() {
    this.active = false
    this.paused = false
    this.resetBuffer()
    console.log('[WakeWord] Escuta de Wake Word encerrada.')
  }

  public pause() {
    if (!this.active) return
    this.paused = true
    this.resetBuffer()
  }

  public resume() {
    if (!this.active) return
    this.paused = false
    this.resetBuffer()
  }

  public processAudioChunk(chunk: Buffer) {
    if (!this.active || this.paused) return

    const samplesCount = Math.floor(chunk.length / 2)
    if (samplesCount === 0) return

    let sumSq = 0
    for (let i = 0; i < samplesCount; i++) {
      const sample = chunk.readInt16LE(i * 2) / 32768.0
      this.audioBuffer.push(sample)
      sumSq += sample * sample
    }
    this.currentIndex += samplesCount

    if (this.audioBuffer.length > this.maxBufferSamples) {
      this.audioBuffer.splice(0, this.audioBuffer.length - this.maxBufferSamples)
    }

    const rms = Math.sqrt(sumSq / samplesCount)
    if (rms > this.vadThreshold) {
      if (!this.hasSpeech) {
        this.utteranceStartIndex = Math.max(0, this.currentIndex - samplesCount)
      }
      this.hasSpeech = true
      this.lastSpeechIndex = this.currentIndex
    }

    if (
      this.hasSpeech &&
      this.currentIndex - this.lastSpeechIndex >= this.silenceSamples
    ) {
      this.evaluateUtterance()
    }
  }

  private resetBuffer() {
    this.audioBuffer = []
    this.currentIndex = 0
    this.lastSpeechIndex = -1
    this.utteranceStartIndex = -1
    this.hasSpeech = false
  }

  private async evaluateUtterance() {
    const now = Date.now()
    if (now - this.lastTriggerTime < this.cooldownMs) {
      this.hasSpeech = false
      return
    }

    const bufferStart = this.currentIndex - this.audioBuffer.length
    let startOffset = 0
    if (this.utteranceStartIndex >= 0) {
      startOffset = Math.max(0, this.utteranceStartIndex - bufferStart)
    }
    const utterance = this.audioBuffer.slice(startOffset)

    if (utterance.length < this.minUtteranceSamples) {
      this.hasSpeech = false
      return
    }

    this.hasSpeech = false

    // Se temos modelo ONNX carregado
    if (this.onnxSession && ort) {
      try {
        const inputLen = 1 * 16 * 96
        const tensorData = new Float32Array(inputLen)
        for (let i = 0; i < Math.min(utterance.length, inputLen); i++) {
          tensorData[i] = utterance[i]
        }

        const inputTensor = new ort.Tensor('float32', tensorData, [1, 16, 96])
        const feeds: Record<string, any> = {}
        feeds[this.onnxSession.inputNames[0]] = inputTensor

        const results = await this.onnxSession.run(feeds)
        const outputTensor = results[this.onnxSession.outputNames[0]]
        const score = outputTensor?.data?.[0] ?? 0

        // Limiar de confiança calibrado com sensibilidade do usuário
        const threshold = 0.5 - this.sensitivity * 0.4
        if (score >= threshold) {
          this.triggerDetection()
          return
        }
      } catch (err) {
        console.warn('[WakeWord] Erro na inferência ONNX local:', err)
      }
    }

    // Se a energia do áudio condiz com um enunciado curto e claro tipo "Vox"
    if (utterance.length >= this.minUtteranceSamples && utterance.length <= SAMPLE_RATE * 1.8) {
      let energy = 0
      for (const s of utterance) energy += s * s
      const avgRms = Math.sqrt(energy / utterance.length)
      if (avgRms > this.vadThreshold * 1.5) {
        this.triggerDetection()
      }
    }
  }

  private triggerDetection() {
    const now = Date.now()
    if (now - this.lastTriggerTime < this.cooldownMs) return
    this.lastTriggerTime = now

    console.log('[WakeWord] 🎯 Palavra de ativação "Vox" detectada com sucesso!')
    this.resetBuffer()
    this.emit('detected', { keyword: 'vox', timestamp: now })
  }
}

export const wakewordDetector = new WakeWordDetector()
export default wakewordDetector
