export type TemplateCategory =
  | 'communication'
  | 'document'
  | 'code'
  | 'medical'
  | 'meeting'
  | 'list'
  | 'custom'

export interface DictationTemplate {
  id: string
  isDefault: boolean
  isEnabled: boolean
  label: string
  labelPt: string
  labelEn: string
  description: string
  icon: string
  voiceTriggerPt: string[]
  voiceTriggerEn: string[]
  systemPrompt: string | null
  outputPreview: string
  supportsStreaming: boolean
  category: TemplateCategory
  createdAt?: string
  updatedAt?: string
}

export interface ActiveTemplate {
  templateId: string | null
  activatedAt: string
  activatedBy: 'ui' | 'voice' | 'profile'
}
