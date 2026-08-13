import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { LiquidGlassCard, SpecularButton, SmoothInput, IconX } from '../../../components'
import type { VoiceCommand, CommandAction, CommandActionType, CommandCategory } from '../../../types/commands'
import { useI18n } from '../../../i18n'

const CATEGORIES: CommandCategory[] = ['punctuation', 'navigation', 'editing', 'vox_control', 'snippets', 'system', 'custom']
const ACTION_TYPES: CommandActionType[] = ['keystroke', 'keystroke_sequence', 'inject_text', 'inject_snippet', 'insert_dynamic', 'vox_control', 'open_app', 'run_script', 'open_url']
const DYNAMIC_VALUES = ['date', 'time', 'datetime']
const VOX_CONTROLS = ['stop', 'cancel', 'clear', 'repeat']

function buildAction(type: CommandActionType, parameter: string): CommandAction {
  switch (type) {
    case 'keystroke_sequence':
      return {
        type,
        parameter: [],
        keySequence: parameter
          .split(',')
          .map((s) => ({ key: s.trim() }))
          .filter((s) => s.key.length > 0)
      }
    case 'insert_dynamic':
      return { type, parameter: DYNAMIC_VALUES.includes(parameter) ? parameter : 'date' }
    case 'vox_control':
      return { type, parameter: VOX_CONTROLS.includes(parameter) ? parameter : 'stop' }
    default:
      return { type, parameter }
  }
}

interface Props {
  command: VoiceCommand | null
  onSave: (cmd: VoiceCommand) => void
  onClose: () => void
}

export const CommandEditor: React.FC<Props> = ({ command, onSave, onClose }) => {
  const { t } = useI18n()
  const [label, setLabel] = useState(command?.label || '')
  const [description, setDescription] = useState(command?.description || '')
  const [category, setCategory] = useState<CommandCategory>(command?.category || 'custom')
  const [matchMode, setMatchMode] = useState<'isolated' | 'inline'>(command?.matchMode || 'isolated')
  const [triggersPt, setTriggersPt] = useState((command?.triggers.pt || []).join('\n'))
  const [triggersEn, setTriggersEn] = useState((command?.triggers.en || []).join('\n'))
  const [actionType, setActionType] = useState<CommandActionType>(command?.action?.type || 'inject_text')
  const [parameter, setParameter] = useState<string>(
    Array.isArray(command?.action?.parameter)
      ? command.action.parameter.join(', ')
      : String(command?.action?.parameter || '')
  )

  const save = () => {
    onSave({
      id: command?.id || crypto.randomUUID(),
      isDefault: command?.isDefault ?? false,
      isEnabled: command?.isEnabled ?? true,
      category,
      label: label.trim() || 'Untitled',
      description: description.trim(),
      triggers: {
        pt: triggersPt.split('\n').map((s) => s.trim()).filter(Boolean),
        en: triggersEn.split('\n').map((s) => s.trim()).filter(Boolean)
      },
      action: buildAction(actionType, parameter),
      matchMode,
      createdAt: command?.createdAt,
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
              {command ? t('commands.edit') : t('commands.new')}
            </h3>
            <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface transition-colors duration-250 cursor-pointer">
              <IconX className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
            <div>
              <label className={fieldClass}>{t('commands.label')}</label>
              <SmoothInput type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. New line" />
            </div>

            <div>
              <label className={fieldClass}>{t('commands.description')}</label>
              <SmoothInput type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldClass}>{t('commands.category')}</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as CommandCategory)} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary outline-none focus:border-accent/80 cursor-pointer">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={fieldClass}>{t('commands.matchMode')}</label>
                <select value={matchMode} onChange={(e) => setMatchMode(e.target.value as 'isolated' | 'inline')} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary outline-none focus:border-accent/80 cursor-pointer">
                  <option value="isolated">isolated</option>
                  <option value="inline">inline</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldClass}>{t('commands.triggersPt')}</label>
                <textarea value={triggersPt} onChange={(e) => setTriggersPt(e.target.value)} rows={3} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-accent/80 resize-none" placeholder="nova linha" />
              </div>
              <div>
                <label className={fieldClass}>{t('commands.triggersEn')}</label>
                <textarea value={triggersEn} onChange={(e) => setTriggersEn(e.target.value)} rows={3} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-accent/80 resize-none" placeholder="new line" />
              </div>
            </div>

            <div>
              <label className={fieldClass}>{t('commands.action')}</label>
              <select value={actionType} onChange={(e) => setActionType(e.target.value as CommandActionType)} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary outline-none focus:border-accent/80 cursor-pointer">
                {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className={fieldClass}>{t('commands.parameter')}</label>
              {actionType === 'insert_dynamic' ? (
                <select value={parameter} onChange={(e) => setParameter(e.target.value)} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary outline-none focus:border-accent/80 cursor-pointer">
                  {DYNAMIC_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : actionType === 'vox_control' ? (
                <select value={parameter} onChange={(e) => setParameter(e.target.value)} className="w-full bg-background/70 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary outline-none focus:border-accent/80 cursor-pointer">
                  {VOX_CONTROLS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <SmoothInput type="text" value={parameter} onChange={(e) => setParameter(e.target.value)} placeholder={actionType === 'keystroke' ? 'Enter, Ctrl+Z, ...' : actionType === 'keystroke_sequence' ? 'Enter, Enter' : '...'} />
              )}
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

export default CommandEditor
