import { getSetting } from './db'

const GROQ_CHAT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_LLM_MODEL = 'openai/gpt-oss-20b'

export async function correctTranscription(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text

  const apiKey = getSetting('apiKey', '').trim()
  if (!apiKey) {
    console.warn('[Corrector] API Key não configurada, retornando texto original.')
    return text
  }
  const model = getSetting('llmModel') || process.env.LLM_MODEL || DEFAULT_LLM_MODEL

  console.log(`[Corrector] Revisando texto via Groq (${model})...`)

  try {
    const response = await fetch(GROQ_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Você é um revisor de transcrições de áudio. Sua ÚNICA função é ajustar pontuação, maiúsculas e ortografia do texto recebido. MANTENHA RIGOROSAMENTE O IDIOMA ORIGINAL DO TEXTO (se o texto estiver em inglês, mantenha em inglês; se estiver em português, mantenha em português). É ESTRITAMENTE PROIBIDO TRADUZIR O TEXTO. Retorne APENAS o texto revisado, sem apresentações ou explicações.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 2048
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.warn(`[Corrector] Erro da API Groq (${response.status}):`, errText)
      return text
    }

    const data = await response.json()
    const corrected = data.choices?.[0]?.message?.content?.trim()

    if (corrected) {
      console.log('[Corrector] Texto revisado com sucesso')
      return corrected
    }

    return text
  } catch (error) {
    console.error('[Corrector] Erro ao se comunicar com Groq LLM API:', error)
    return text
  }
}

// Export legado
export const correctWithNvidia = correctTranscription

export default {
  correctTranscription,
  correctWithNvidia
}
