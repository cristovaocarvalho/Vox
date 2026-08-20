import { getSetting, logApiCall, getCorrectionDictionary, getSessionCount, listVocabulary } from './db'
import { resolveProvider, getChatEndpoint, getAuthHeaders } from './providers'
import { templateManager } from './templateManager'
import type { DictationTemplate } from '../../src/types/templates'

const CALIBRATION_SESSIONS = 25

function buildDictionaryLine(): string {
  if (getSessionCount() < CALIBRATION_SESSIONS) return ''

  const dict = getCorrectionDictionary(2, 30)
  if (dict.length === 0) return ''

  const items = dict.map((e) => `"${e.raw}" → "${e.corrected}"`).join(', ')
  return ` Dicionário de correções recorrentes do usuário (aplique quando corresponder ao contexto): ${items}.`
}

function buildVocabularyLine(): string {
  const terms = listVocabulary()
  if (terms.length === 0) return ''

  const items = terms.map((t) => `"${t}"`).join(', ')
  return ` Vocabulário pessoal do usuário (nomes próprios, siglas e termos técnicos que devem ser reconhecidos e mantidos exatamente como escritos): ${items}.`
}

function applyVocabularyReplacements(text: string): string {
  const terms = listVocabulary()
  if (!terms || terms.length === 0 || !text) return text

  let result = text
  for (const term of terms) {
    if (!term || term.length < 2) continue
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(regex, term)
  }
  return result
}

export async function correctTranscription(text: string, context?: string, template?: DictationTemplate | null): Promise<string> {
  if (!text || text.trim().length === 0) return text

  const provider = resolveProvider()
  if (provider.requiresApiKey && !provider.apiKey) {
    console.warn('[Corrector] API Key não configurada, retornando texto original.')
    return applyVocabularyReplacements(text)
  }
  const model = (getSetting('llmModel') || process.env.LLM_MODEL || '').trim()
  if (!model) {
    console.warn('[Corrector] Nenhum modelo LLM configurado, retornando texto original.')
    return applyVocabularyReplacements(text)
  }

  const endpoint = getChatEndpoint(model)

  console.log(`[Corrector] Revisando texto (${provider.id}, ${model})...`)

  const contextLine = context
    ? ` Contexto do ditado: o usuário está digitando em ${context}. Ajuste a formatação de acordo (ex.: código, e-mail, documento, chat).`
    : ''

  const dictionaryLine = buildDictionaryLine()
  const vocabularyLine = buildVocabularyLine()

  const basePrompt = `Você é um revisor de transcrições de áudio. Sua ÚNICA função é ajustar pontuação, maiúsculas e ortografia do texto recebido.${contextLine}${vocabularyLine}${dictionaryLine} MANTENHA RIGOROSAMENTE O IDIOMA ORIGINAL DO TEXTO (se o texto estiver em inglês, mantenha em inglês; se estiver em português, mantenha em português). É ESTRITAMENTE PROIBIDO TRADUZIR O TEXTO. Retorne APENAS o texto revisado, sem apresentações ou explicações.`
  const systemPrompt = templateManager.buildCorrectorPrompt(basePrompt, template ?? null)

  try {
    const body: Record<string, any> = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 1024
    }
    if (!provider.isAzure) {
      body.model = model
    }

    const bodyStr = JSON.stringify(body)
    logApiCall({
      provider: provider.id,
      endpoint,
      operation: 'llm',
      model,
      bytesSent: Buffer.byteLength(bodyStr)
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: bodyStr
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.warn(`[Corrector] Erro da API (${response.status}):`, errText)
      return applyVocabularyReplacements(text)
    }

    const data = await response.json()
    const corrected = data.choices?.[0]?.message?.content?.trim()

    if (corrected) {
      console.log('[Corrector] Texto revisado com sucesso')
      return applyVocabularyReplacements(corrected)
    }

    return applyVocabularyReplacements(text)
  } catch (error) {
    console.error('[Corrector] Erro ao se comunicar com a LLM API:', error)
    return applyVocabularyReplacements(text)
  }
}

export default {
  correctTranscription
}
