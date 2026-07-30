/**
 * Módulo de Wake Word (Comando de Voz)
 * Integração preparada para Picovoice Porcupine (exige chave de API Picovoice).
 */

export function start() {
  console.log('[WakeWord] Módulo de Wake Word: não inicializado (aguardando API Key)')
}

export function stop() {
  console.log('[WakeWord] Parando módulo de Wake Word')
}

export function onDetected(callback: () => void) {
  // Placeholder para evento de detecção de palavra de ativação
}

export default {
  start,
  stop,
  onDetected
}
