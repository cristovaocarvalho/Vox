import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { LiquidGlassCard, SpecularButton, SmoothInput, CustomSelect, IconX } from '../../../components'
import type { DictationTemplate, TemplateCategory } from '../../../types/templates'
import { useI18n } from '../../../i18n'

const CATEGORIES: TemplateCategory[] = ['communication', 'document', 'code', 'medical', 'meeting', 'list', 'custom']

interface Props {
  template: DictationTemplate | null
  onSave: (t: DictationTemplate) => void
  onClose: () => void
}

export const TemplateEditor: React.FC<Props> = ({ template, onSave, onClose }) => {
  const { t } = useI18n()
  const [labelPt, setLabelPt] = useState(template?.labelPt || '')
  const [labelEn, setLabelEn] = useState(template?.labelEn || '')
  const [description, setDescription] = useState(template?.description || '')
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'custom')
  const [icon, setIcon] = useState(template?.icon || 'file-text')
  const [systemPrompt, setSystemPrompt] = useState(template?.systemPrompt || '')
  const [voicePt, setVoicePt] = useState((template?.voiceTriggerPt || []).join('\n'))
  const [voiceEn, setVoiceEn] = useState((template?.voiceTriggerEn || []).join('\n'))
  const [outputPreview, setOutputPreview] = useState(template?.outputPreview || '')

  const save = () => {
    onSave({
      id: template?.id || crypto.randomUUID(),
      isDefault: false,
      isEnabled: template?.isEnabled ?? true,
      label: labelPt || labelEn || 'Template',
      labelPt: labelPt.trim(),
      labelEn: labelEn.trim(),
      description: description.trim(),
      icon: icon.trim() || 'file-text',
      category,
      systemPrompt,
      voiceTriggerPt: voicePt.split('\n').map((s) => s.trim()).filter(Boolean),
      voiceTriggerEn: voiceEn.split('\n').map((s) => s.trim()).filter(Boolean),
      outputPreview,
      supportsStreaming: false,
      createdAt: template?.createdAt,
      updatedAt: new Date().toISOString()
    })
  }

  const fieldClass = 'text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-2'

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        className="w-full max-w-xl"
      >
        <LiquidGlassCard glowIntensity="md" blurIntensity="lg" className="p-6 flex flex-col gap-5 border border-border/80 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading tracking-tight text-text-primary">
              {template ? t('templates.edit') : t('templates.new')}
            </h3>
            <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface transition-colors duration-250 cursor-pointer">
              <IconX className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 max-h-[62vh] overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className={fieldClass}>{t('templates.labelPt')}</label>
                <SmoothInput type="text" value={labelPt} onChange={(e) => setLabelPt(e.target.value)} placeholder="Email Formal" />
              </div>
              <div>
                <label className={fieldClass}>{t('templates.labelEn')}</label>
                <SmoothInput type="text" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} placeholder="Formal Email" />
              </div>
            </div>

            <div>
              <label className={fieldClass}>{t('templates.description')}</label>
              <SmoothInput type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldClass}>{t('templates.category')}</label>
                <CustomSelect
                  value={category}
                  options={CATEGORIES}
                  onChange={(val) => setCategory(val as TemplateCategory)}
                />
              </div>
              <div>
                <label className={fieldClass}>{t('templates.icon')}</label>
                <SmoothInput type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="file-text" />
              </div>
            </div>

            <div>
              <label className={fieldClass}>{t('templates.systemPrompt')}</label>
              <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={8} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-accent/80 resize-none" />
              <p className="text-[10px] text-text-muted mt-1">{t('templates.systemPromptHint')}</p>
              <p className="text-[10px] text-text-muted">{t('templates.charCount', { n: systemPrompt.length })}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldClass}>{t('templates.voicePt')}</label>
                <textarea value={voicePt} onChange={(e) => setVoicePt(e.target.value)} rows={3} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-accent/80 resize-none" placeholder="ativar email formal" />
              </div>
              <div>
                <label className={fieldClass}>{t('templates.voiceEn')}</label>
                <textarea value={voiceEn} onChange={(e) => setVoiceEn(e.target.value)} rows={3} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-accent/80 resize-none" placeholder="activate formal email" />
              </div>
            </div>

            <div className="pb-3">
              <label className={fieldClass}>{t('templates.outputPreview')}</label>
              <textarea value={outputPreview} onChange={(e) => setOutputPreview(e.target.value)} rows={4} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-accent/80 resize-none" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer">
              {t('settings.cancel')}
            </button>
            <SpecularButton size="sm" onClick={save} className="!px-6">
              {t('settings.save')}
            </SpecularButton>
          </div>
        </LiquidGlassCard>
      </motion.div>
    </motion.div>,
    document.body
  )
}

export default TemplateEditor
