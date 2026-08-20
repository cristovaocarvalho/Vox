import React from 'react'
import type { VoiceCommand, CommandCategory } from '../../../types/commands'
import { IconTrash, IconCopy, IconClock, IconMic, IconTerminal, IconGlobe, IconFile } from '../../../components'
import { useI18n } from '../../../i18n'
import { COMMAND_TRANSLATIONS } from '../../../data/commandTranslations'

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  punctuation: 'Pontuação',
  navigation: 'Navegação',
  editing: 'Edição',
  vox_control: 'Controle do Vox',
  snippets: 'Snippets',
  system: 'Sistema',
  custom: 'Personalizados'
}

export function displayPattern(pattern: string): string {
  return pattern
    .replace(/^\^|\$$/g, '')
    .replace(/\\s\*/g, ' ')
    .replace(/\\s\+/g, ' ')
    .replace(/\(\?:/g, '(')
    .replace(/\(([a-zA-Záéíóúâêôãõç\s]+)\|[a-zA-Záéíóúâêôãõç\s|]+\)/gi, '$1')
    .replace(/\\([()[\]{}?+|^$.])/g, '$1')
    .replace(/\[\^?([a-záéíóúâêôãõç]+)\]/gi, (_m, chars) => (chars.length <= 2 ? chars : chars[0]))
    .replace(/\?|\*|\+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function actionBadge(action: VoiceCommand['action'], language: string): React.ReactNode {
  const keysLabel = language === 'pt-BR' || language === 'es' ? ' teclas'
    : language === 'fr' ? ' touches'
    : language === 'de' ? ' Tasten'
    : language === 'it' ? ' tasti'
    : language === 'zh-CN' ? ' 个按键'
    : language === 'ja' ? ' キー'
    : ' keys'
  const param = Array.isArray(action.parameter) ? action.parameter.length + keysLabel : String(action.parameter ?? '')
  switch (action.type) {
    case 'keystroke':
      return <span className="inline-flex items-center gap-1"><IconTerminal className="w-3 h-3" />{param || action.type}</span>
    case 'keystroke_sequence':
      return <span className="inline-flex items-center gap-1"><IconTerminal className="w-3 h-3" />{param}</span>
    case 'inject_text':
      return <span className="inline-flex items-center gap-1"><IconCopy className="w-3 h-3" />{param}</span>
    case 'inject_snippet':
      return <span className="inline-flex items-center gap-1"><IconFile className="w-3 h-3" />{param}</span>
    case 'insert_dynamic':
      return <span className="inline-flex items-center gap-1"><IconClock className="w-3 h-3" />{param}</span>
    case 'vox_control':
      return <span className="inline-flex items-center gap-1"><IconMic className="w-3 h-3" />{param}</span>
    case 'open_app':
    case 'open_search':
    case 'open_url':
      return <span className="inline-flex items-center gap-1"><IconGlobe className="w-3 h-3" />{param}</span>
    case 'run_script':
      return <span className="inline-flex items-center gap-1"><IconTerminal className="w-3 h-3" />script</span>
    default:
      return <span>{action.type}</span>
  }
}

interface Props {
  command: VoiceCommand
  onToggle: (id: string, enabled: boolean) => void
  onToggleMatchMode: (id: string) => void
  onEdit: (command: VoiceCommand) => void
  onDelete: (id: string) => void
}

export const CommandCard: React.FC<Props> = ({ command, onToggle, onToggleMatchMode, onEdit, onDelete }) => {
  const { t, language } = useI18n()

  const tr = COMMAND_TRANSLATIONS[command.id]?.[language]

  const displayLabel = tr?.label
    || (command.isDefault && command.label.includes(' / ')
      ? (language === 'pt-BR' ? command.label.split(' / ')[1] : command.label.split(' / ')[0])
      : (language === 'pt-BR' ? (command.labelPt || command.label) : (command.labelEn || command.label)))

  const displayDesc = tr?.description
    || (language === 'pt-BR' ? (command.descriptionPt || command.description) : (command.descriptionEn || command.description))

  const triggersList = tr?.triggers
    || (language === 'pt-BR' ? command.triggers.pt : (command.triggers as any)[language])
    || command.triggers.en

  const activeTriggers: string[] = (triggersList && triggersList.length > 0)
    ? triggersList
    : (command.triggers.en && command.triggers.en.length > 0 ? command.triggers.en : command.triggers.pt)

  return (
    <div className="p-3 bg-background/40 border border-border/50 rounded-xl flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-text-primary">{displayLabel}</span>
          <button
            type="button"
            onClick={() => onToggleMatchMode(command.id)}
            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${command.matchMode === 'inline' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface text-text-muted border-border/50'}`}
            title={t('commands.matchModeHint')}
          >
            {command.matchMode}
          </button>
        </div>

        {displayDesc && (
          <p className="text-[11px] text-text-muted mt-0.5">{displayDesc}</p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          <span className="text-[9px] font-mono uppercase text-text-muted">
            {t('commands.say')}
          </span>
          {activeTriggers.map((p: string, i: number) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded bg-background/60 border border-border/40 text-text-secondary font-mono tracking-tight"
            >
              {displayPattern(p)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] px-2 py-1 rounded-lg bg-background/60 border border-border/40 text-text-secondary inline-flex items-center gap-1">
          {actionBadge(command.action, language)}
        </span>
        {!command.isDefault && (
          <button
            type="button"
            onClick={() => onEdit(command)}
            className="px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/50 hover:border-border rounded-lg transition-all duration-200 cursor-pointer"
          >
            {t('commands.edit')}
          </button>
        )}
        {!command.isDefault && (
          <button
            type="button"
            onClick={() => onDelete(command.id)}
            className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            <IconTrash className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="switch-button">
          <label className="switch-outer">
            <input
              type="checkbox"
              checked={command.isEnabled}
              onChange={(e) => onToggle(command.id, e.target.checked)}
            />
            <div className="button">
              <div className="button-toggle"></div>
              <div className="button-indicator"></div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

export default CommandCard
