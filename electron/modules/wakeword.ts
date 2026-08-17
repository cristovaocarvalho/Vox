/**
 * Módulo de Wake Word (Detecção da Palavra de Ativação "Vox")
 * Detecta a palavra "Vox" transcrevendo enunciados curtos via STT (Groq/Whisper)
 * e verificando se a transcrição corresponde à palavra-chave.
 */

import { EventEmitter } from 'events'
import { transcribeAudio } from './stt'
import { getSetting } from './db'

const SAMPLE_RATE = 16000
const MAX_BUFFER_SECONDS = 3
const MIN_UTTERANCE_SECONDS = 0.3
const SILENCE_END_SECONDS = 0.4
const LEAD_IN_SECONDS = 0.15

const KEYWORD_VARIANTS = ['vox', 'vocs', 'voks', 'voxs']

function float32ToWav(samples: number[], sampleRate = SAMPLE_RATE): Buffer {
  const dataLength = samples.length * 2
  const buffer = Buffer.alloc(44 + dataLength)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataLength, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataLength, 40)

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2)
  }

  return buffer
}

export class WakeWordDetector extends EventEmitter {
  private active = false
  private paused = false
  private sensitivity = 0.5
  private vadThreshold = 0.025
  private modelLoaded = false
  private audioBuffer: number[] = []
  private maxBufferSamples = SAMPLE_RATE * MAX_BUFFER_SECONDS
  private minUtteranceSamples = Math.floor(SAMPLE_RATE * MIN_UTTERANCE_SECONDS)
  private silenceSamples = Math.floor(SAMPLE_RATE * SILENCE_END_SECONDS)
  private leadInSamples = Math.floor(SAMPLE_RATE * LEAD_IN_SECONDS)
  private currentIndex = 0
  private lastSpeechIndex = -1
  private utteranceStartIndex = -1
  private hasSpeech = false
  private transcribing = false
  private lastTriggerTime = 0
  private cooldownMs = 2500
  private warnedNoApiKey = false

  constructor() {
    super()
  }

  public async init(_modelPath?: string, sensitivity?: number): Promise<boolean> {
    if (sensitivity !== undefined) {
      this.setSensitivity(sensitivity)
    }
    this.modelLoaded = true
    return true
  }

  public setSensitivity(value: number) {
    const normalized = Math.max(0.0, Math.min(1.0, value))
    this.sensitivity = normalized
    this.vadThreshold = 0.04 - normalized * 0.03
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
    console.log('[WakeWord] Escuta em segundo plano ativa para a palavra "Vox".')
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
    console.log('[WakeWord] Listener pausado temporariamente durante gravação de áudio.')
  }

  public resume() {
    if (!this.active) return
    this.paused = false
    this.resetBuffer()
    console.log('[WakeWord] Listener retomado.')
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
      !this.transcribing &&
      this.currentIndex - this.lastSpeechIndex >= this.silenceSamples
    ) {
      this.onUtteranceEnd()
    }
  }

  private resetBuffer() {
    this.audioBuffer = []
    this.currentIndex = 0
    this.lastSpeechIndex = -1
    this.utteranceStartIndex = -1
    this.hasSpeech = false
  }

  private async onUtteranceEnd() {
    const now = Date.now()
    if (now - this.lastTriggerTime < this.cooldownMs) {
      this.hasSpeech = false
      return
    }

    const bufferStart = this.currentIndex - this.audioBuffer.length
    let startOffset = 0
    if (this.utteranceStartIndex >= 0) {
      startOffset = Math.max(0, this.utteranceStartIndex - bufferStart - this.leadInSamples)
    }
    const utterance = this.audioBuffer.slice(startOffset)

    if (utterance.length < this.minUtteranceSamples) {
      this.hasSpeech = false
      return
    }

    const apiKey = getSetting('apiKey', '').trim()
    if (!apiKey) {
      if (!this.warnedNoApiKey) {
        this.warnedNoApiKey = true
        console.warn('[WakeWord] API Key não configurada — a detecção da palavra "Vox" depende da transcrição (Groq).')
      }
      this.hasSpeech = false
      this.resetBuffer()
      return
    }

    this.transcribing = true
    this.resetBuffer()

    try {
      const wav = float32ToWav(utterance)
      const result = await transcribeAudio(wav)
      const text = (result.text || '').trim()
      console.log('[WakeWord] Transcrição para detecção:', text)

      if (this.matchesKeyword(text)) {
        this.triggerDetection()
      }
    } catch (err) {
      console.warn('[WakeWord] Falha ao transcrever para detecção:', err)
    } finally {
      this.transcribing = false
    }
  }

  private matchesKeyword(text: string): boolean {
    if (!text || text.startsWith('[')) return false

    const normalized = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!normalized) return false

    const words = normalized.split(' ')
    return words.some((w) => KEYWORD_VARIANTS.includes(w))
  }

  private triggerDetection() {
    const now = Date.now()
    this.lastTriggerTime = now
    console.log('[WakeWord] Palavra "Vox" detectada!')
    this.emit('detected', { keyword: 'Vox', timestamp: now })
  }
}

const wakewordDetector = new WakeWordDetector()
export default wakewordDetector
