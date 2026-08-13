export type CommandActionType =
  | 'keystroke'
  | 'keystroke_sequence'
  | 'inject_text'
  | 'inject_snippet'
  | 'insert_dynamic'
  | 'change_profile'
  | 'vox_control'
  | 'open_app'
  | 'run_script'
  | 'open_url'

export interface KeystrokeStep {
  key: string
  delayAfter?: number
}

export interface CommandAction {
  type: CommandActionType
  // keystroke: "Enter", "Backspace", "Ctrl+Z", "Ctrl+Shift+T"
  // keystroke_sequence: keySequence
  // inject_text: literal string
  // inject_snippet: snippet name key
  // insert_dynamic: "date" | "time" | "datetime"
  // change_profile: profile name string
  // vox_control: "stop" | "cancel" | "clear" | "repeat"
  // open_app: executable path or app name
  // run_script: shell command string
  // open_url: full URL string
  parameter: string | string[]
  keySequence?: KeystrokeStep[]
}

export type CommandCategory =
  | 'punctuation'
  | 'navigation'
  | 'editing'
  | 'vox_control'
  | 'snippets'
  | 'system'
  | 'custom'

export interface VoiceCommand {
  id: string
  isDefault: boolean
  isEnabled: boolean
  category: CommandCategory
  label: string
  description: string
  triggers: {
    pt: string[]
    en: string[]
  }
  action: CommandAction
  matchMode: 'isolated' | 'inline'
  createdAt?: string
  updatedAt?: string
}

export interface UserSnippet {
  id: string
  name: string
  triggerPt: string
  triggerEn: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface ParsedSegment {
  type: 'content' | 'command'
  value: string
  command?: VoiceCommand
  contentText?: string
}

export interface ParseResult {
  segments: ParsedSegment[]
  hasCommands: boolean
  hasContent: boolean
  isMixed: boolean
}
