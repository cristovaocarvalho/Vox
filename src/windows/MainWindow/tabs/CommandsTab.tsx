import React, { useEffect, useMemo, useState } from 'react'
import type { VoiceCommand, UserSnippet, CommandCategory } from '../../../types/commands'
import { SpecularButton, IconTrash, IconChevronDown } from '../../../components'
import { useVoxStore } from '../../../stores/useVoxStore'
import { CommandCard, CATEGORY_LABELS } from '../components/CommandCard'
import { CommandEditor } from '../components/CommandEditor'
import { SnippetEditor } from '../components/SnippetEditor'
import { useI18n } from '../../../i18n'
import { COMMAND_TRANSLATIONS } from '../../../data/commandTranslations'

const CATEGORY_ORDER: CommandCategory[] = ['punctuation', 'navigation', 'editing', 'vox_control', 'system', 'custom']

export const CommandsTab: React.FC = () => {
  const { t, language } = useI18n()
  const {
    commands,
    snippets,
    commandInlineMode,
    loadCommands,
    loadSnippets,
    toggleCommand,
    setCommandMatchMode,
    addCustomCommand,
    updateCustomCommand,
    deleteCustomCommand,
    saveSnippet,
    deleteSnippet,
    setInlineMode
  } = useVoxStore()

  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [commandEditorOpen, setCommandEditorOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState<VoiceCommand | null>(null)
  const [snippetEditorOpen, setSnippetEditorOpen] = useState(false)
  const [editingSnippet, setEditingSnippet] = useState<UserSnippet | null>(null)

  useEffect(() => {
    loadCommands()
    loadSnippets()
  }, [loadCommands, loadSnippets])

  const defaultCount = commands.filter((c) => c.isDefault).length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => {
      const tr = COMMAND_TRANSLATIONS[c.id]?.[language]
      const trAll = COMMAND_TRANSLATIONS[c.id]
        ? Object.values(COMMAND_TRANSLATIONS[c.id]!).flatMap((item) => (item ? [item.label, item.description || '', ...item.triggers] : []))
        : []
      const hay = [
        c.label,
        c.description,
        c.category,
        tr?.label || '',
        tr?.description || '',
        ...trAll,
        ...(c.triggers.pt || []),
        ...(c.triggers.en || [])
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [commands, search, language])

  const grouped = useMemo(() => {
    const map = new Map<CommandCategory, VoiceCommand[]>()
    for (const c of filtered) {
      const list = map.get(c.category) || []
      list.push(c)
      map.set(c.category, list)
    }
    return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({ cat, items: map.get(cat)! }))
  }, [filtered])

  const handleSaveCommand = async (cmd: VoiceCommand) => {
    if (editingCommand && !editingCommand.isDefault) {
      await updateCustomCommand(cmd.id, cmd)
    } else {
      await addCustomCommand(cmd)
    }
    setCommandEditorOpen(false)
    setEditingCommand(null)
  }

  const customEmpty = !commands.some((c) => c.category === 'custom')

  return (
    <div className="space-y-5">
      {/* Default commands notice */}
      <div className="p-3 bg-accent/[0.04] border border-accent/15 rounded-xl">
        <p className="text-[11px] text-text-secondary leading-relaxed">
          {t('commands.defaultNotice', { n: defaultCount })}
        </p>
      </div>

      {/* Top bar */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('commands.search')}
          className="flex-1 min-w-0 bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent/80 placeholder:text-text-disabled"
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-text-secondary">{t('commands.inlineMode')}</span>
          <div className="switch-button">
            <label className="switch-outer" title={t('commands.inlineModeHint')}>
              <input
                type="checkbox"
                checked={commandInlineMode}
                onChange={(e) => setInlineMode(e.target.checked)}
              />
              <div className="button">
                <div className="button-toggle"></div>
                <div className="button-indicator"></div>
              </div>
            </label>
          </div>
        </div>
        <SpecularButton size="sm" onClick={() => { setEditingCommand(null); setCommandEditorOpen(true) }} className="!px-4 shrink-0">
          {t('commands.new')}
        </SpecularButton>
      </div>

      {/* Category sections */}
      <div className="space-y-4">
        {grouped.map(({ cat, items }) => {
          const enabled = items.filter((c) => c.isEnabled).length
          const isCollapsed = collapsed[cat]
          return (
            <div key={cat}>
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                className="w-full flex items-center justify-between px-1 py-1.5 mb-2 cursor-pointer group"
              >
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide flex items-center gap-2">
                  <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                  {t(`commands.categories.${cat}` as any) || CATEGORY_LABELS[cat]}
                </span>
                <span className="text-[11px] text-text-muted font-mono tnum">{enabled}/{items.length}</span>
              </button>
              {!isCollapsed && (
                <div className="space-y-2">
                  {cat === 'custom' && items.length === 0 && customEmpty ? (
                    <div className="py-6 text-center">
                      <p className="text-xs text-text-muted leading-relaxed">{t('commands.customEmptyHint')}</p>
                    </div>
                  ) : (
                    items.map((cmd) => (
                      <CommandCard
                        key={cmd.id}
                        command={cmd}
                        onToggle={toggleCommand}
                        onToggleMatchMode={(id) => {
                          const c = commands.find((x) => x.id === id)
                          if (c) setCommandMatchMode(id, c.matchMode === 'inline' ? 'isolated' : 'inline')
                        }}
                        onEdit={(c) => { setEditingCommand(c); setCommandEditorOpen(true) }}
                        onDelete={deleteCustomCommand}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Snippets */}
      <div className="pt-6 mt-6 border-t border-border/40">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide">{t('snippets.title')} ({snippets.length})</span>
          <button
            type="button"
            onClick={() => { setEditingSnippet(null); setSnippetEditorOpen(true) }}
            className="px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/60 hover:border-border rounded-lg transition-all duration-200 cursor-pointer inline-flex items-center gap-1 shrink-0"
          >
            <span className="text-xs leading-none">+</span>
            {t('snippets.new')}
          </button>
        </div>
        {snippets.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">{t('snippets.empty')}</p>
        ) : (
          <div className="space-y-3">
            {snippets.map((snip) => (
              <div key={snip.id} className="p-3.5 bg-background/40 border border-border/50 rounded-xl flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-text-primary block truncate">{snip.name}</span>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-text-muted font-mono">{[snip.triggerPt, snip.triggerEn].filter(Boolean).join(' · ')}</span>
                    {snip.content ? (
                      <span className="text-[10px] text-text-muted">{t('templates.charCount', { n: snip.content.length })}</span>
                    ) : (
                      <span className="text-[10px] font-medium text-warning px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20">
                        {t('snippets.notConfigured')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingSnippet(snip); setSnippetEditorOpen(true) }}
                    className="px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border/50 hover:border-border rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    {t('commands.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSnippet(snip.id)}
                    className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors duration-200 cursor-pointer"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {commandEditorOpen && (
        <CommandEditor command={editingCommand} onSave={handleSaveCommand} onClose={() => { setCommandEditorOpen(false); setEditingCommand(null) }} />
      )}
      {snippetEditorOpen && (
        <SnippetEditor snippet={editingSnippet} onSave={(s) => { saveSnippet(s); setSnippetEditorOpen(false); setEditingSnippet(null) }} onClose={() => { setSnippetEditorOpen(false); setEditingSnippet(null) }} />
      )}
    </div>
  )
}

export default CommandsTab
