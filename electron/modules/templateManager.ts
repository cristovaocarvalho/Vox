import crypto from 'crypto'
import type { DictationTemplate } from '../../src/types/templates'
import { DEFAULT_TEMPLATES } from './templateRegistry'
import { getSetting, setSetting, listCustomTemplates, saveCustomTemplate, deleteCustomTemplate } from './db'

const DEACTIVATION_PHRASES = {
  pt: ['ditado livre', 'sem template', 'modo padrão', 'remover template', 'desativar template'],
  en: ['free dictation', 'no template', 'default mode', 'remove template', 'deactivate template']
}

const MAX_PROMPT_CHARS = 8000

export class TemplateManager {
  private getDisabledIds(): string[] {
    try {
      const raw = getSetting('disabledTemplateIds', '[]').trim()
      const parsed = JSON.parse(raw || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private setDisabledIds(ids: string[]): void {
    setSetting('disabledTemplateIds', JSON.stringify(ids))
  }

  getAllTemplates(): DictationTemplate[] {
    const disabled = new Set(this.getDisabledIds())
    const defaults = DEFAULT_TEMPLATES.map((t) => ({ ...t, isEnabled: !disabled.has(t.id) }))
    return [...defaults, ...listCustomTemplates()]
  }

  setTemplateEnabled(id: string, enabled: boolean): void {
    const template = this.getTemplate(id)
    if (!template) return
    if (template.isDefault) {
      const disabled = this.getDisabledIds()
      const next = enabled ? disabled.filter((d) => d !== id) : [...new Set([...disabled, id])]
      this.setDisabledIds(next)
    } else {
      saveCustomTemplate({ ...template, isEnabled: enabled })
    }
  }

  getEnabledTemplates(): DictationTemplate[] {
    return this.getAllTemplates().filter((t) => t.isEnabled)
  }

  getTemplate(id: string): DictationTemplate | null {
    return this.getAllTemplates().find((t) => t.id === id) || null
  }

  getActiveTemplate(): DictationTemplate | null {
    const id = getSetting('activeTemplateId', '').trim()
    if (!id || id === 'none') return null
    const template = this.getTemplate(id)
    if (!template) {
      // Template no longer exists (user deleted it) — reset to free dictation.
      this.setActiveTemplate(null)
      return null
    }
    return template
  }

  setActiveTemplate(id: string | null): void {
    setSetting('activeTemplateId', id || '')
  }

  addCustomTemplate(template: Partial<DictationTemplate>): DictationTemplate {
    const full: DictationTemplate = {
      id: template.id || crypto.randomUUID(),
      isDefault: false,
      isEnabled: template.isEnabled ?? true,
      label: template.labelPt || template.labelEn || template.label || 'Template',
      labelPt: template.labelPt || '',
      labelEn: template.labelEn || '',
      description: template.description || '',
      icon: template.icon || 'file-text',
      category: template.category || 'custom',
      systemPrompt: template.systemPrompt || '',
      voiceTriggerPt: template.voiceTriggerPt || [],
      voiceTriggerEn: template.voiceTriggerEn || [],
      outputPreview: template.outputPreview || '',
      supportsStreaming: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    saveCustomTemplate(full)
    return full
  }

  updateCustomTemplate(id: string, updates: Partial<DictationTemplate>): void {
    const existing = listCustomTemplates().find((t) => t.id === id)
    if (!existing) return
    saveCustomTemplate({ ...existing, ...updates, id, isDefault: false, updatedAt: new Date().toISOString() })
  }

  deleteCustomTemplate(id: string): void {
    deleteCustomTemplate(id)
    if (getSetting('activeTemplateId', '').trim() === id) {
      this.setActiveTemplate(null)
    }
  }

  buildCorrectorPrompt(basePrompt: string, template: DictationTemplate | null): string {
    if (!template || !template.systemPrompt) return basePrompt
    const combined = `${basePrompt}\n\n---\nADDITIONAL FORMATTING INSTRUCTIONS:\n${template.systemPrompt}`
    if (combined.length <= MAX_PROMPT_CHARS) return combined
    const maxTemplate = MAX_PROMPT_CHARS - basePrompt.length - 60
    return `${basePrompt}\n\n---\nADDITIONAL FORMATTING INSTRUCTIONS:\n${template.systemPrompt.slice(0, Math.max(0, maxTemplate))}`
  }

  resolveVoiceActivation(text: string, language: 'pt' | 'en'): { templateId: string; remainingText: string } | null {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!normalized) return null

    const allDeactivation = [...DEACTIVATION_PHRASES.pt, ...DEACTIVATION_PHRASES.en]
    for (const phrase of allDeactivation) {
      const idx = this.findPhraseIndex(normalized, phrase)
      if (idx >= 0) {
        return { templateId: 'none', remainingText: this.removeAt(normalized, idx, phrase) }
      }
    }

    for (const t of this.getEnabledTemplates()) {
      for (const phrase of [...t.voiceTriggerPt, ...t.voiceTriggerEn]) {
        const idx = this.findPhraseIndex(normalized, phrase)
        if (idx >= 0) {
          return { templateId: t.id, remainingText: this.removeAt(normalized, idx, phrase) }
        }
      }
    }

    return null
  }

  private stripAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  private findPhraseIndex(normalized: string, phrase: string): number {
    const p = this.stripAccents(phrase.trim())
    if (!p) return -1
    const norm = this.stripAccents(normalized)
    const idx = norm.indexOf(p)
    if (idx < 0) return -1
    const before = idx === 0 ? ' ' : norm[idx - 1]
    const after = idx + p.length >= norm.length ? ' ' : norm[idx + p.length]
    if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) return -1
    return idx
  }

  private removeAt(normalized: string, idx: number, phrase: string): string {
    const p = this.stripAccents(phrase.trim())
    const length = p.length
    return (normalized.slice(0, idx) + ' ' + normalized.slice(idx + length)).replace(/\s+/g, ' ').trim()
  }
}

export const templateManager = new TemplateManager()
export default templateManager
