import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { LiquidGlassCard, SpecularButton, SmoothInput, IconX } from '../../../components'
import type { UserSnippet } from '../../../types/commands'
import { useI18n } from '../../../i18n'

interface Props {
  snippet: UserSnippet | null
  onSave: (snippet: UserSnippet) => void
  onClose: () => void
}

export const SnippetEditor: React.FC<Props> = ({ snippet, onSave, onClose }) => {
  const { t } = useI18n()
  const [name, setName] = useState(snippet?.name || '')
  const [triggerPt, setTriggerPt] = useState(snippet?.triggerPt || '')
  const [triggerEn, setTriggerEn] = useState(snippet?.triggerEn || '')
  const [content, setContent] = useState(snippet?.content || '')

  const save = () => {
    onSave({
      id: snippet?.id || crypto.randomUUID(),
      name: name.trim(),
      triggerPt: triggerPt.trim(),
      triggerEn: triggerEn.trim(),
      content,
      createdAt: snippet?.createdAt || new Date().toISOString(),
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
        className="w-full max-w-lg"
      >
        <LiquidGlassCard glowIntensity="md" blurIntensity="lg" className="p-6 flex flex-col gap-5 border border-border/80 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading tracking-tight text-text-primary">
              {snippet ? t('snippets.edit') : t('snippets.new')}
            </h3>
            <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface transition-colors duration-250 cursor-pointer">
              <IconX className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className={fieldClass}>{t('snippets.name')}</label>
              <SmoothInput type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="my signature" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldClass}>{t('snippets.triggerPt')}</label>
                <SmoothInput type="text" value={triggerPt} onChange={(e) => setTriggerPt(e.target.value)} placeholder="minha assinatura" />
              </div>
              <div>
                <label className={fieldClass}>{t('snippets.triggerEn')}</label>
                <SmoothInput type="text" value={triggerEn} onChange={(e) => setTriggerEn(e.target.value)} placeholder="my signature" />
              </div>
            </div>

            <div>
              <label className={fieldClass}>{t('snippets.content')}</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent/80 resize-none" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-250 cursor-pointer">
              {t('settings.cancel')}
            </button>
            <SpecularButton size="sm" radius={12} onClick={save} className="!px-6">
              {t('settings.save')}
            </SpecularButton>
          </div>
        </LiquidGlassCard>
      </motion.div>
    </motion.div>,
    document.body
  )
}

export default SnippetEditor
