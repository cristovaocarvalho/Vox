import type { VoiceCommand } from '../../src/types/commands'
import { listCommands } from './db'

// Default commands ship with Vox. Triggers are regex strings (no anchors for
// inline; the parser wraps isolated commands in ^...$ automatically).
export const DEFAULT_COMMANDS: VoiceCommand[] = [
  // ---- Punctuation (inline) ----
  { id: 'cmd-comma', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Comma', description: 'Inserts a comma', triggers: { pt: ['\\bvírgula\\b'], en: ['\\bcomma\\b'] }, action: { type: 'inject_text', parameter: ',' }, matchMode: 'inline' },
  { id: 'cmd-period', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Period', description: 'Inserts a period', triggers: { pt: ['\\bponto\\b'], en: ['\\bperiod\\b'] }, action: { type: 'inject_text', parameter: '.' }, matchMode: 'inline' },
  { id: 'cmd-question', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Question mark', description: 'Inserts a question mark', triggers: { pt: ['\\bponto de interrogação\\b', '\\binterrogação\\b'], en: ['\\bquestion mark\\b'] }, action: { type: 'inject_text', parameter: '?' }, matchMode: 'inline' },
  { id: 'cmd-exclamation', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Exclamation mark', description: 'Inserts an exclamation mark', triggers: { pt: ['\\bponto de exclamação\\b', '\\bexclamação\\b'], en: ['\\bexclamation mark\\b'] }, action: { type: 'inject_text', parameter: '!' }, matchMode: 'inline' },
  { id: 'cmd-colon', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Colon', description: 'Inserts a colon', triggers: { pt: ['\\bdois pontos\\b'], en: ['\\bcolon\\b'] }, action: { type: 'inject_text', parameter: ':' }, matchMode: 'inline' },
  { id: 'cmd-semicolon', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Semicolon', description: 'Inserts a semicolon', triggers: { pt: ['\\bponto e vírgula\\b'], en: ['\\bsemicolon\\b'] }, action: { type: 'inject_text', parameter: ';' }, matchMode: 'inline' },
  { id: 'cmd-newline', isDefault: true, isEnabled: true, category: 'punctuation', label: 'New line', description: 'Inserts a line break', triggers: { pt: ['\\bnova linha\\b'], en: ['\\bnew line\\b'] }, action: { type: 'keystroke', parameter: 'Enter' }, matchMode: 'inline' },
  { id: 'cmd-paragraph', isDefault: true, isEnabled: true, category: 'punctuation', label: 'New paragraph', description: 'Inserts a paragraph break', triggers: { pt: ['\\bnovo parágrafo\\b'], en: ['\\bnew paragraph\\b'] }, action: { type: 'keystroke_sequence', parameter: [], keySequence: [{ key: 'Enter' }, { key: 'Enter' }] }, matchMode: 'inline' },
  { id: 'cmd-space', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Space', description: 'Inserts a space', triggers: { pt: ['\\bespaço\\b'], en: ['\\bspace\\b'] }, action: { type: 'inject_text', parameter: ' ' }, matchMode: 'inline' },

  // ---- Navigation (isolated) ----
  { id: 'cmd-delete', isDefault: true, isEnabled: true, category: 'navigation', label: 'Delete', description: 'Presses Backspace', triggers: { pt: ['apagar', 'apague'], en: ['delete'] }, action: { type: 'keystroke', parameter: 'Backspace' }, matchMode: 'isolated' },
  { id: 'cmd-delete-word', isDefault: true, isEnabled: true, category: 'navigation', label: 'Delete word', description: 'Deletes the previous word', triggers: { pt: ['apagar palavra'], en: ['delete word'] }, action: { type: 'keystroke', parameter: 'Ctrl+Backspace' }, matchMode: 'isolated' },
  { id: 'cmd-tab', isDefault: true, isEnabled: true, category: 'navigation', label: 'Tab', description: 'Presses Tab', triggers: { pt: ['tab'], en: ['tab'] }, action: { type: 'keystroke', parameter: 'Tab' }, matchMode: 'isolated' },

  // ---- Editing (isolated) ----
  { id: 'cmd-select-all', isDefault: true, isEnabled: true, category: 'editing', label: 'Select all', description: 'Selects all text', triggers: { pt: ['selecionar tudo'], en: ['select all'] }, action: { type: 'keystroke', parameter: 'Ctrl+A' }, matchMode: 'isolated' },
  { id: 'cmd-copy', isDefault: true, isEnabled: true, category: 'editing', label: 'Copy', description: 'Copies selection', triggers: { pt: ['copiar'], en: ['copy'] }, action: { type: 'keystroke', parameter: 'Ctrl+C' }, matchMode: 'isolated' },
  { id: 'cmd-paste', isDefault: true, isEnabled: true, category: 'editing', label: 'Paste', description: 'Pastes from clipboard', triggers: { pt: ['colar'], en: ['paste'] }, action: { type: 'keystroke', parameter: 'Ctrl+V' }, matchMode: 'isolated' },
  { id: 'cmd-undo', isDefault: true, isEnabled: true, category: 'editing', label: 'Undo', description: 'Undoes last action', triggers: { pt: ['desfazer'], en: ['undo'] }, action: { type: 'keystroke', parameter: 'Ctrl+Z' }, matchMode: 'isolated' },
  { id: 'cmd-redo', isDefault: true, isEnabled: true, category: 'editing', label: 'Redo', description: 'Redoes last action', triggers: { pt: ['refazer'], en: ['redo'] }, action: { type: 'keystroke', parameter: 'Ctrl+Y' }, matchMode: 'isolated' },

  // ---- Vox control (isolated) ----
  { id: 'cmd-stop', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Stop', description: 'Stops dictation and finalizes', triggers: { pt: ['parar'], en: ['stop'] }, action: { type: 'vox_control', parameter: 'stop' }, matchMode: 'isolated' },
  { id: 'cmd-cancel', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Cancel', description: 'Cancels dictation without injecting', triggers: { pt: ['cancelar'], en: ['cancel'] }, action: { type: 'vox_control', parameter: 'cancel' }, matchMode: 'isolated' },
  { id: 'cmd-clear', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Clear', description: 'Clears the current transcription', triggers: { pt: ['limpar'], en: ['clear'] }, action: { type: 'vox_control', parameter: 'clear' }, matchMode: 'isolated' },
  { id: 'cmd-repeat', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Repeat', description: 'Re-injects the last transcription', triggers: { pt: ['repetir'], en: ['repeat'] }, action: { type: 'vox_control', parameter: 'repeat' }, matchMode: 'isolated' },

  // ---- Dynamic (inline) ----
  { id: 'cmd-date', isDefault: true, isEnabled: true, category: 'system', label: 'Insert date', description: 'Inserts today\'s date', triggers: { pt: ['\\bdata de hoje\\b'], en: ['\\btoday\'s date\\b'] }, action: { type: 'insert_dynamic', parameter: 'date' }, matchMode: 'inline' },
  { id: 'cmd-time', isDefault: true, isEnabled: true, category: 'system', label: 'Insert time', description: 'Inserts the current time', triggers: { pt: ['\\bhora atual\\b'], en: ['\\bcurrent time\\b'] }, action: { type: 'insert_dynamic', parameter: 'time' }, matchMode: 'inline' }
]

// Returns all enabled commands from the registry (SQLite-backed, seeded with defaults).
export function getEnabledCommands(): VoiceCommand[] {
  return listCommands().filter((c) => c.isEnabled)
}

export function getAllCommands(): VoiceCommand[] {
  return listCommands()
}

export default {
  DEFAULT_COMMANDS,
  getEnabledCommands,
  getAllCommands
}
