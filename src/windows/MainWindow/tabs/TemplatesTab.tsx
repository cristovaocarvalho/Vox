import React, { useEffect, useState } from 'react'
import type { DictationTemplate } from '../../../types/templates'
import { SpecularButton, IconTrash, IconChevronDown } from '../../../components'
import { useVoxStore } from '../../../stores/useVoxStore'
import { TemplateEditor } from '../components/TemplateEditor'
import { useI18n } from '../../../i18n'

export const TemplatesTab: React.FC = () => {
  const { t, language } = useI18n()
  const {
    templates,
    loadTemplates,
    setTemplateEnabled,
    addCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate
  } = useVoxStore()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DictationTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const isEn = language === 'en'

  const saveTemplate = async (tpl: DictationTemplate) => {
    if (editing && !editing.isDefault) {
      await updateCustomTemplate(tpl.id, tpl)
    } else {
      await addCustomTemplate(tpl)
    }
    setEditorOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-secondary leading-relaxed flex-1 mr-4">
          {t('templates.hint')}
        </p>
        <SpecularButton size="sm" radius={12} onClick={() => { setEditing(null); setEditorOpen(true) }} className="!px-4 shrink-0">
          {t('templates.new')}
        </SpecularButton>
      </div>

      <div className="space-y-2">
        {templates.filter((tpl) => tpl.id !== 'none').map((tpl) => (
          <div key={tpl.id} className="p-3 bg-background/40 border border-border/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">{isEn ? tpl.labelEn : tpl.labelPt}</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{tpl.category}</span>
                </div>
                {tpl.description && <p className="text-[11px] text-text-muted truncate mt-0.5">{tpl.description}</p>}
                <p className="text-[10px] text-text-muted font-mono mt-0.5">
                  {isEn ? 'Say' : 'Diga'}: {(isEn ? tpl.voiceTriggerEn : tpl.voiceTriggerPt)[0] || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [tpl.id]: !prev[tpl.id] }))}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <IconChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded[tpl.id] ? 'rotate-180' : ''}`} />
              </button>

              {!tpl.isDefault && (
                <>
                  <button
                    type="button"
                    onClick={() => { setEditing(tpl); setEditorOpen(true) }}
                    className="px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/50 hover:border-border rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                  >
                    {t('commands.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCustomTemplate(tpl.id)}
                    className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors duration-200 cursor-pointer shrink-0"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <div className="switch-button shrink-0">
                <label className="switch-outer">
                  <input
                    type="checkbox"
                    checked={tpl.isEnabled}
                    onChange={(e) => setTemplateEnabled(tpl.id, e.target.checked)}
                  />
                  <div className="button">
                    <div className="button-toggle"></div>
                    <div className="button-indicator"></div>
                  </div>
                </label>
              </div>
            </div>

            {expanded[tpl.id] && tpl.systemPrompt && (
              <div className="mt-3 p-3 bg-background/60 border border-border/40 rounded-lg">
                <pre className="text-[10px] font-mono text-text-secondary whitespace-pre-wrap break-words">{tpl.systemPrompt}</pre>
                {tpl.outputPreview && (
                  <>
                    <div className="text-[10px] text-text-muted mt-2 mb-1">{t('templates.outputPreview')}</div>
                    <pre className="text-[10px] font-mono text-text-secondary whitespace-pre-wrap break-words">{tpl.outputPreview}</pre>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editorOpen && (
        <TemplateEditor template={editing} onSave={saveTemplate} onClose={() => { setEditorOpen(false); setEditing(null) }} />
      )}
    </div>
  )
}

export default TemplatesTab
