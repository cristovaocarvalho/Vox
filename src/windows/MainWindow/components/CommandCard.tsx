import React from 'react'
import type { VoiceCommand, CommandCategory } from '../../../types/commands'
import { IconTrash, IconX } from '../../../components'

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  punctuation: 'Punctuation',
  navigation: 'Navigation',
  editing: 'Editing',
  vox_control: 'Vox Control',
  snippets: 'Snippets',
  system: 'System',
  custom: 'Custom'
}

interface Props {
  command: VoiceCommand
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (command: VoiceCommand) => void
  onDelete: (id: string) => void
}

export const CommandCard: React.FC<Props> = ({ command, onToggle, onEdit, onDelete }) => {
  return (
    <div className="p-3 bg-background/40 border border-border/50 rounded-xl flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary truncate">{command.label}</span>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 shrink-0">
            {CATEGORY_LABELS[command.category] || command.category}
          </span>
          {command.matchMode === 'inline' && (
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-border/50 text-text-muted shrink-0">inline</span>
          )}
        </div>
        {command.description && (
          <p className="text-[11px] text-text-muted truncate mt-0.5">{command.description}</p>
        )}
        <p className="text-[10px] text-text-muted truncate mt-0.5 font-mono">
          {[...command.triggers.pt, ...command.triggers.en].join(', ')}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(command)}
          className="px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/50 hover:border-border rounded-lg transition-all duration-200 cursor-pointer"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(command.id)}
          className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors duration-200 cursor-pointer"
        >
          <IconTrash className="w-3.5 h-3.5" />
        </button>
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
