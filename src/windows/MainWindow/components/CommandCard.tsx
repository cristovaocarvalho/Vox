import React from 'react'
import type { VoiceCommand, CommandCategory } from '../../../types/commands'
import { IconTrash, IconCopy, IconClock, IconMic, IconTerminal, IconGlobe, IconFile } from '../../../components'
import { useI18n } from '../../../i18n'

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  punctuation: 'Punctuation',
  navigation: 'Navigation',
  editing: 'Editing',
  vox_control: 'Vox Control',
  snippets: 'Snippets',
  system: 'System',
  custom: 'Custom'
}

export function displayPattern(pattern: string): string {
  return pattern
    .replace(/\\s\*/g, ' ')
    .replace(/\\([()[\]{}?+|^$.])/g, '$1')
    .replace(/\[\^?([a-záéíóúâêôãõç]+)\]/gi, (m, chars) => (chars.length <= 2 ? chars : m))
    .replace(/\s+/g, ' ')
    .trim()
}

function actionBadge(action: VoiceCommand['action']): React.ReactNode {
  const param = Array.isArray(action.parameter) ? action.parameter.length + ' keys' : String(action.parameter ?? '')
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
  const { t } = useI18n()

  return (
    <div className="p-3 bg-background/40 border border-border/50 rounded-xl flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-text-primary">{command.label}</span>
          {command.isDefault && (
            <span className="text-[10px] text-text-muted" title={t('commands.default')}>🔒</span>
          )}
          <button
            type="button"
            onClick={() => onToggleMatchMode(command.id)}
            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${command.matchMode === 'inline' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface text-text-muted border-border/50'}`}
            title={t('commands.matchModeHint')}
          >
            {command.matchMode}
          </button>
        </div>

        {command.description && (
          <p className="text-[11px] text-text-muted mt-0.5">{command.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <span className="text-[9px] font-mono uppercase text-text-muted">{t('commands.triggersPtShort')}:</span>
          {command.triggers.pt.map((p, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border/40 text-text-secondary font-mono">{displayPattern(p)}</span>
          ))}
          <span className="text-[9px] font-mono uppercase text-text-muted ml-2">{t('commands.triggersEnShort')}:</span>
          {command.triggers.en.map((p, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border/40 text-text-secondary font-mono">{displayPattern(p)}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] px-2 py-1 rounded-lg bg-background/60 border border-border/40 text-text-secondary inline-flex items-center gap-1">
          {actionBadge(command.action)}
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
