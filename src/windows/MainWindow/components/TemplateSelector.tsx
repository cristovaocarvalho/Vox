import React, { useEffect } from 'react'
import { useVoxStore } from '../../../stores/useVoxStore'
import { IconMic, IconTerminal, IconCheck, IconFile, IconX } from '../../../components'
import { useI18n } from '../../../i18n'

function templateIcon(name: string): React.ReactNode {
  switch (name) {
    case 'mic':
      return <IconMic className="w-3.5 h-3.5" />
    case 'code':
    case 'git-commit':
      return <IconTerminal className="w-3.5 h-3.5" />
    case 'list':
    case 'list-ordered':
    case 'check-square':
      return <IconCheck className="w-3.5 h-3.5" />
    default:
      return <IconFile className="w-3.5 h-3.5" />
  }
}

export const TemplateSelector: React.FC = () => {
  const { t, language } = useI18n()
  const { templates, activeTemplateId, loadTemplates, setActiveTemplate } = useVoxStore()

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const enabled = templates.filter((t) => t.isEnabled)
  const active = templates.find((t) => t.id === activeTemplateId) || null

  const isEn = language === 'en'

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setActiveTemplate(null)}
          title={isEn ? 'Free Dictation — no template' : 'Ditado Livre — sem template'}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 cursor-pointer ${activeTemplateId === null
            ? 'bg-accent text-background border-accent font-semibold'
            : 'bg-background/50 text-text-secondary border-border/50 hover:text-text-primary hover:border-border'
            }`}
        >
          <span>✦</span>
          {isEn ? 'Free' : 'Livre'}
        </button>

        {enabled.filter((t) => t.id !== 'none').map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setActiveTemplate(tpl.id)}
            title={`${isEn ? tpl.labelEn : tpl.labelPt}\n\n${tpl.description}\n\n${isEn ? 'Say' : 'Diga'} "${isEn ? tpl.voiceTriggerEn[0] : tpl.voiceTriggerPt[0]}" ${isEn ? 'to activate' : 'para ativar'}`}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 cursor-pointer ${activeTemplateId === tpl.id
              ? 'bg-accent text-background border-accent font-semibold'
              : 'bg-background/50 text-text-secondary border-border/50 hover:text-text-primary hover:border-border'
              }`}
          >
            {templateIcon(tpl.icon)}
            <span>{isEn ? tpl.labelEn : tpl.labelPt}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {isEn
              ? `Active template: ${active.labelEn} — say "free dictation" to deactivate`
              : `Template ativo: ${active.labelPt} — diga "ditado livre" para desativar`}
          </span>
          <button
            type="button"
            onClick={() => setActiveTemplate(null)}
            className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors cursor-pointer"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export default TemplateSelector
