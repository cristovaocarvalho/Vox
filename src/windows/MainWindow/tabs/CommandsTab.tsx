import React, { useEffect, useState } from 'react'
import type { VoiceCommand, UserSnippet } from '../../../types/commands'
import { SpecularButton, IconTrash } from '../../../components'
import { CommandCard } from '../components/CommandCard'
import { CommandEditor } from '../components/CommandEditor'
import { SnippetEditor } from '../components/SnippetEditor'
import { useI18n } from '../../../i18n'

export const CommandsTab: React.FC = () => {
  const { t } = useI18n()
  const [commands, setCommands] = useState<VoiceCommand[]>([])
  const [snippets, setSnippets] = useState<UserSnippet[]>([])
  const [editingCommand, setEditingCommand] = useState<VoiceCommand | null>(null)
  const [commandEditorOpen, setCommandEditorOpen] = useState(false)
  const [editingSnippet, setEditingSnippet] = useState<UserSnippet | null>(null)
  const [snippetEditorOpen, setSnippetEditorOpen] = useState(false)

  const load = async () => {
    try {
      const cmds = await window.vox?.listCommands()
      const snips = await window.vox?.listSnippets()
      setCommands(cmds || [])
      setSnippets(snips || [])
    } catch (err) {
      console.error('Erro ao carregar comandos/snippets:', err)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleCommand = async (id: string, enabled: boolean) => {
    setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, isEnabled: enabled } : c)))
    await window.vox?.setCommandEnabled(id, enabled)
  }

  const saveCommand = async (cmd: VoiceCommand) => {
    await window.vox?.saveCommand(cmd)
    setCommandEditorOpen(false)
    setEditingCommand(null)
    load()
  }

  const deleteCommand = async (id: string) => {
    await window.vox?.deleteCommand(id)
    load()
  }

  const openNewCommand = () => {
    setEditingCommand(null)
    setCommandEditorOpen(true)
  }

  const openEditCommand = (cmd: VoiceCommand) => {
    setEditingCommand(cmd)
    setCommandEditorOpen(true)
  }

  const saveSnippet = async (snippet: UserSnippet) => {
    await window.vox?.saveSnippet(snippet)
    setSnippetEditorOpen(false)
    setEditingSnippet(null)
    load()
  }

  const deleteSnippet = async (id: string) => {
    await window.vox?.deleteSnippet(id)
    load()
  }

  const sectionLabel = 'text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide'

  return (
    <div className="space-y-6">
      {/* Commands */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className={sectionLabel}>{t('commands.title')} ({commands.length})</span>
          <SpecularButton size="sm" radius={12} onClick={openNewCommand} className="!px-4">
            {t('commands.new')}
          </SpecularButton>
        </div>
        {commands.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">{t('commands.empty')}</p>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <CommandCard
                key={cmd.id}
                command={cmd}
                onToggle={toggleCommand}
                onEdit={openEditCommand}
                onDelete={deleteCommand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Snippets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className={sectionLabel}>{t('snippets.title')} ({snippets.length})</span>
          <SpecularButton size="sm" radius={12} onClick={() => { setEditingSnippet(null); setSnippetEditorOpen(true) }} className="!px-4">
            {t('snippets.new')}
          </SpecularButton>
        </div>
        {snippets.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">{t('snippets.empty')}</p>
        ) : (
          <div className="space-y-2">
            {snippets.map((snip) => (
              <div key={snip.id} className="p-3 bg-background/40 border border-border/50 rounded-xl flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-text-primary block truncate">{snip.name}</span>
                  <span className="text-[10px] text-text-muted font-mono">{snip.triggerPt} · {snip.triggerEn}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingSnippet(snip); setSnippetEditorOpen(true) }}
                  className="px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/50 hover:border-border rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                >
                  {t('commands.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSnippet(snip.id)}
                  className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors duration-200 cursor-pointer shrink-0"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {commandEditorOpen && (
        <CommandEditor command={editingCommand} onSave={saveCommand} onClose={() => { setCommandEditorOpen(false); setEditingCommand(null) }} />
      )}
      {snippetEditorOpen && (
        <SnippetEditor snippet={editingSnippet} onSave={saveSnippet} onClose={() => { setSnippetEditorOpen(false); setEditingSnippet(null) }} />
      )}
    </div>
  )
}

export default CommandsTab
