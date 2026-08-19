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
    .replace(/^\^|\$$/g, '')
    .replace(/\\s\*/g, ' ')
    .replace(/\\s\+/g, ' ')
    .replace(/\(\?:/g, '(')
    .replace(/\(([a-zA-Záéíóúâêôãõç\s]+)\|[a-zA-Záéíóúâêôãõç\s|]+\)/gi, '$1')
    .replace(/\\([()[\]{}?+|^$.])/g, '$1')
    .replace(/\[\^?([a-záéíóúâêôãõç]+)\]/gi, (m, chars) => (chars.length <= 2 ? chars : chars[0]))
    .replace(/\?|\*|\+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const COMMAND_DESCRIPTIONS_PT: Record<string, string> = {
  punct_comma: 'Insere uma vírgula seguida de espaço',
  punct_period: 'Insere um ponto final seguido de espaço',
  punct_semicolon: 'Insere um ponto e vírgula seguido de espaço',
  punct_colon: 'Insere dois pontos seguidos de espaço',
  punct_ellipsis: 'Insere reticências seguidas de espaço',
  punct_exclamation: 'Insere um ponto de exclamação seguido de espaço',
  punct_question: 'Insere um ponto de interrogação seguido de espaço',
  nav_new_line: 'Pressiona Enter uma vez',
  nav_new_paragraph: 'Pressiona Enter duas vezes',
  edit_delete_last_sentence: 'Seleciona e apaga o texto até a pontuação anterior',
  vox_cancel: 'Para a gravação e descarta a transcrição sem injetar',
  vox_clear: 'Limpa o buffer de transcrição atual sem parar',
  vox_repeat: 'Reinserir a última transcrição bem-sucedida'
}

function actionBadge(action: VoiceCommand['action'], isEn: boolean): React.ReactNode {
  const keysLabel = isEn ? ' keys' : ' teclas'
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
  const isPt = language === 'pt-BR'
  const isEn = language === 'en'

  const displayLabel = command.isDefault && command.label.includes(' / ')
    ? (isPt ? command.label.split(' / ')[1] : command.label.split(' / ')[0])
    : (isPt ? (command.labelPt || command.label) : (command.labelEn || command.label))

  const displayDesc = isPt
    ? (command.descriptionPt || COMMAND_DESCRIPTIONS_PT[command.id] || command.description)
    : (command.descriptionEn || command.description)

  const triggersList = isPt ? command.triggers.pt : command.triggers.en
  const activeTriggers = (triggersList && triggersList.length > 0)
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
            {isPt ? 'Diga:' : 'Say:'}
          </span>
          {activeTriggers.map((p, i) => (
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
          {actionBadge(command.action, isEn)}
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
