import { EventEmitter } from 'events'

export class AudioRecorder extends EventEmitter {
  private isRecording = false
  private chunks: Buffer[] = []
  private vadThreshold = 0.02 // Limiar de energia RMS para fala

  public startRecording() {
    this.isRecording = true
    this.chunks = []
    console.log('[Recorder] Iniciando gravação PCM 16kHz mono...')
    this.emit('start')
  }

  public processAudioChunk(chunk: Buffer): { energy: number; isSpeech: boolean } {
    if (!this.isRecording) return { energy: 0, isSpeech: false }
    
    this.chunks.push(chunk)
    const energy = this.calculateRmsEnergy(chunk)
    const isSpeech = energy > this.vadThreshold

    this.emit('energy', { energy, isSpeech })
    return { energy, isSpeech }
  }

  public stopRecording(): Buffer {
    this.isRecording = false
    console.log('[Recorder] Parando gravação...')
    this.emit('stop')

    const pcmData = Buffer.concat(this.chunks)
    this.chunks = []

    if (pcmData.length === 0) {
      return Buffer.alloc(0)
    }

    return this.createWavBuffer(pcmData)
  }

  public getIsRecording(): boolean {
    return this.isRecording
  }

  public setVadThreshold(threshold: number) {
    this.vadThreshold = threshold
  }

  private calculateRmsEnergy(buffer: Buffer): number {
    if (buffer.length < 2) return 0
    let sumSquares = 0
    const sampleCount = Math.floor(buffer.length / 2)
    
    for (let i = 0; i < sampleCount; i++) {
      const sample = buffer.readInt16LE(i * 2)
      const normalized = sample / 32768
      sumSquares += normalized * normalized
    }

    return Math.sqrt(sumSquares / sampleCount)
  }

  public createWavBuffer(pcmData: Buffer, sampleRate = 16000, channels = 1, bitDepth = 16): Buffer {
    const header = Buffer.alloc(44)
    const dataSize = pcmData.length
    const fileSize = dataSize + 36

    // RIFF identifier
    header.write('RIFF', 0)
    header.writeUInt32LE(fileSize, 4)
    header.write('WAVE', 8)

    // fmt subchunk
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20)  // AudioFormat (1 for PCM)
    header.writeUInt16LE(channels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28) // ByteRate
    header.writeUInt16LE(channels * (bitDepth / 8), 32)             // BlockAlign
    header.writeUInt16LE(bitDepth, 34)

    // data subchunk
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)

    return Buffer.concat([header, pcmData])
  }
}

export const recorder = new AudioRecorder()
export default recorder

