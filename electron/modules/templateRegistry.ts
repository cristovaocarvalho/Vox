import type { DictationTemplate } from '../../src/types/templates'

// Default templates shipped with Vox. The systemPrompt is the critical
// element — it determines the LLM's output structure and quality.
export const DEFAULT_TEMPLATES: DictationTemplate[] = [
  {
    id: 'none',
    isDefault: true,
    isEnabled: true,
    label: '✦ Livre / Free',
    labelPt: 'Ditado Livre',
    labelEn: 'Free Dictation',
    description: 'Standard dictation with punctuation and grammar correction only',
    icon: 'mic',
    voiceTriggerPt: [],
    voiceTriggerEn: [],
    systemPrompt: null,
    outputPreview: '',
    supportsStreaming: true,
    category: 'document'
  },

  {
    id: 'email_formal',
    isDefault: true,
    isEnabled: true,
    label: 'Email Formal',
    labelPt: 'Email Formal',
    labelEn: 'Formal Email',
    description: 'Formats dictated text as a complete formal email with greeting, body paragraphs, and closing',
    icon: 'mail',
    voiceTriggerPt: ['ativar email formal', 'modo email formal', 'template email formal'],
    voiceTriggerEn: ['activate formal email', 'formal email mode', 'formal email template'],
    category: 'communication',
    supportsStreaming: false,
    systemPrompt: `You are a professional email formatter. The user has dictated an email verbally. Your task is to transform the raw transcription into a properly formatted formal email in the SAME LANGUAGE as the input text.

Rules:
- Identify and preserve: recipient name (if mentioned), subject (if mentioned), sender name (if mentioned at the end)
- Structure the output as:
    Subject: [subject line if mentioned, otherwise infer from content]

    [Formal greeting], [recipient name or "Dear Sir/Madam"],

    [Body: organized into paragraphs. Each new topic or sentence group becomes its own paragraph. Formal tone throughout.]

    [Formal closing: "Sincerely," / "Atenciosamente," or similar],
    [Sender name if mentioned, otherwise leave blank]

- Fix all punctuation, capitalization, and grammar
- Do NOT add information not present in the dictation
- Do NOT translate — output in the same language as the input
- If the dictation is incomplete (only body, no greeting), format only what was provided without inventing missing parts`,
    outputPreview: `Subject: Project Update — Q3 Report

Dear Mr. Santos,

I hope this message finds you well. I am writing to inform you that the Q3 report has been completed and is ready for your review.

Sincerely,`
  },

  {
    id: 'message_casual',
    isDefault: true,
    isEnabled: true,
    label: 'Mensagem Casual',
    labelPt: 'Mensagem Casual',
    labelEn: 'Casual Message',
    description: 'Formats text as a conversational message, preserving informal tone',
    icon: 'message-circle',
    voiceTriggerPt: ['mensagem casual', 'modo casual', 'template mensagem'],
    voiceTriggerEn: ['casual message', 'casual mode', 'message template'],
    category: 'communication',
    supportsStreaming: true,
    systemPrompt: `You are formatting a casual spoken message into written text.
Rules:
- Fix punctuation and capitalization minimally — preserve conversational tone
- Keep contractions, informal language, and the speaker's natural voice
- Break into short paragraphs if the message is long
- Do NOT make it formal. Do NOT restructure sentences.
- Output in the same language as the input`,
    outputPreview: ''
  },

  {
    id: 'bullet_points',
    isDefault: true,
    isEnabled: true,
    label: 'Tópicos',
    labelPt: 'Tópicos (Bullet Points)',
    labelEn: 'Bullet Points',
    description: 'Converts dictated text into a structured bullet point list',
    icon: 'list',
    voiceTriggerPt: ['ativar tópicos', 'modo tópicos', 'bullet points', 'lista de tópicos'],
    voiceTriggerEn: ['bullet points', 'bullet mode', 'list mode', 'activate bullets'],
    category: 'list',
    supportsStreaming: false,
    systemPrompt: `You are converting spoken dictation into a structured bullet point list.
Rules:
- Each distinct idea, item, or sentence group becomes one bullet point
- Use "• " as the bullet character
- Sub-points (when the speaker elaborates on a point) use "  ◦ " (2 spaces + ◦)
- Fix grammar and punctuation within each bullet
- Remove filler words ("um", "uh", "like", "então", "tipo")
- Keep each bullet concise — if a bullet is very long, split it
- Do NOT add a title or header unless the user explicitly mentioned one
- Output in the same language as the input
- Example output format:
  • Main point one
  • Main point two
    ◦ Sub-point elaborating on point two
  • Main point three`,
    outputPreview: `• Project deadline has been moved to the end of the month
• Team needs to complete the API integration before Thursday
  ◦ Backend endpoints must be documented
  ◦ Frontend tests need to pass
• Client presentation scheduled for Friday at 3 PM`
  },

  {
    id: 'numbered_list',
    isDefault: true,
    isEnabled: true,
    label: 'Lista Numerada',
    labelPt: 'Lista Numerada',
    labelEn: 'Numbered List',
    description: 'Converts dictated text into a numbered ordered list',
    icon: 'list-ordered',
    voiceTriggerPt: ['lista numerada', 'modo lista numerada', 'lista ordenada'],
    voiceTriggerEn: ['numbered list', 'ordered list', 'numbered mode'],
    category: 'list',
    supportsStreaming: false,
    systemPrompt: `You are converting spoken dictation into a numbered ordered list.
Rules:
- Each distinct step, item, or idea becomes one numbered item
- Format: "1. ", "2. ", "3. " etc.
- Fix grammar and punctuation within each item
- Remove filler words
- Keep items parallel in structure when possible
- Output in the same language as the input`,
    outputPreview: ''
  },

  {
    id: 'checklist',
    isDefault: true,
    isEnabled: true,
    label: 'Checklist',
    labelPt: 'Lista de Tarefas (Checklist)',
    labelEn: 'Checklist',
    description: 'Converts dictated items into a markdown checklist',
    icon: 'check-square',
    voiceTriggerPt: ['checklist', 'lista de tarefas', 'modo checklist'],
    voiceTriggerEn: ['checklist', 'task list', 'todo list', 'checklist mode'],
    category: 'list',
    supportsStreaming: false,
    systemPrompt: `You are converting spoken dictation into a markdown checklist.
Rules:
- Each item becomes: "- [ ] Item text"
- Fix grammar and punctuation within each item
- Remove filler words
- Output in the same language as the input`,
    outputPreview: ''
  },

  {
    id: 'meeting_notes',
    isDefault: true,
    isEnabled: true,
    label: 'Notas de Reunião',
    labelPt: 'Notas de Reunião',
    labelEn: 'Meeting Notes',
    description: 'Structures dictated content as organized meeting notes with participants, topics, decisions, and action items',
    icon: 'users',
    voiceTriggerPt: ['notas de reunião', 'modo reunião', 'ata de reunião'],
    voiceTriggerEn: ['meeting notes', 'meeting mode', 'minutes mode'],
    category: 'meeting',
    supportsStreaming: false,
    systemPrompt: `You are formatting spoken dictation into structured meeting notes.
Analyze the content and extract/organize into these sections (only include sections that have relevant content):

## Meeting Notes
**Date:** [today's date if not mentioned]

### Participants
[List any names mentioned as being present]

### Topics Discussed
[Main subjects covered, as bullet points]

### Decisions Made
[Any conclusions or decisions reached, as bullet points]

### Action Items
[Tasks assigned, format: "• [Person] — [task] — [deadline if mentioned]"]

### Next Steps
[Any follow-up meetings or deadlines mentioned]

Rules:
- Output in the same language as the input
- If a section has no content, omit it entirely
- Fix grammar and punctuation throughout
- Remove filler words and verbal artifacts
- Infer structure from context — the speaker may not announce each section`,
    outputPreview: ''
  },

  {
    id: 'code_comment',
    isDefault: true,
    isEnabled: true,
    label: 'Comentário de Código',
    labelPt: 'Comentário de Código',
    labelEn: 'Code Comment',
    description: 'Formats dictated text as a clean inline or block code comment',
    icon: 'code',
    voiceTriggerPt: ['comentário de código', 'modo comentário', 'template código'],
    voiceTriggerEn: ['code comment', 'comment mode', 'code template'],
    category: 'code',
    supportsStreaming: true,
    systemPrompt: `You are formatting spoken dictation into a code comment.
Rules:
- Output ONLY the comment text, no code
- Use clear, technical English regardless of input language (code comments are typically in English — apply this rule unless the user explicitly says "em português" or "in Portuguese")
- Remove all filler words and verbal artifacts completely
- Be concise and precise — eliminate redundancy
- If the dictation describes a function/method: format as a JSDoc-style comment:
    /**
     * [Brief description]
     * @param [name] - [description] (if params mentioned)
     * @returns [description] (if return mentioned)
     */
- If the dictation is a short inline comment: output a single line comment:
    // [concise description]
- If the dictation describes a TODO or fix:
    // TODO: [description]
    // FIXME: [description]
- Do not add // or /* */ automatically — output only the comment content so the user can paste it in the appropriate context`,
    outputPreview: ''
  },

  {
    id: 'git_commit',
    isDefault: true,
    isEnabled: true,
    label: 'Mensagem de Commit',
    labelPt: 'Mensagem de Commit',
    labelEn: 'Git Commit Message',
    description: 'Formats dictated text as a conventional git commit message',
    icon: 'git-commit',
    voiceTriggerPt: ['mensagem de commit', 'modo commit', 'template commit'],
    voiceTriggerEn: ['commit message', 'commit mode', 'git commit'],
    category: 'code',
    supportsStreaming: false,
    systemPrompt: `You are formatting spoken dictation into a git commit message following the Conventional Commits specification.

Output format:
  <type>(<scope>): <short description>

  [optional body: more detailed explanation if the user provided one]

  [optional footer: breaking changes or issue references if mentioned]

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
Scope: infer from context if mentioned (e.g. "auth", "api", "ui")

Rules:
- First line: maximum 72 characters
- Type and scope in lowercase English always, regardless of input language
- Description: imperative mood, lowercase, no period at end
- If user describes multiple changes, use the most significant as the type and list others in the body
- Remove all filler words
- Examples:
    feat(auth): add OAuth2 login with Google
    fix(recorder): prevent memory leak on recording stop
    docs: update README with installation instructions`,
    outputPreview: ''
  },

  {
    id: 'technical_report',
    isDefault: true,
    isEnabled: true,
    label: 'Relatório Técnico',
    labelPt: 'Relatório Técnico',
    labelEn: 'Technical Report',
    description: 'Structures dictated content as a formal technical report with sections and professional language',
    icon: 'file-text',
    voiceTriggerPt: ['relatório técnico', 'modo relatório', 'template relatório'],
    voiceTriggerEn: ['technical report', 'report mode', 'report template'],
    category: 'document',
    supportsStreaming: false,
    systemPrompt: `You are formatting spoken dictation into a structured technical report.

Structure (include only sections with content):
  # [Title — infer from context or omit if unclear]

  ## Introduction / Introdução
  [Context and purpose]

  ## Findings / Resultados
  [Main content, findings, or analysis]

  ## Recommendations / Recomendações
  [Action items or suggestions mentioned]

  ## Conclusion / Conclusão
  [Summary or closing remarks]

Rules:
- Output in the same language as the input
- Use formal, professional language throughout
- Fix all grammar and punctuation
- Remove all filler words and verbal artifacts
- Organize content logically even if the speaker was not perfectly organized`,
    outputPreview: ''
  },

  {
    id: 'brain_dump',
    isDefault: true,
    isEnabled: true,
    label: 'Captura Livre',
    labelPt: 'Captura Livre (Brain Dump)',
    labelEn: 'Brain Dump',
    description: 'Captures raw thoughts with light cleanup, preserving the natural flow without imposing structure',
    icon: 'brain',
    voiceTriggerPt: ['captura livre', 'brain dump', 'modo livre', 'despejo mental'],
    voiceTriggerEn: ['brain dump', 'free capture', 'raw capture', 'stream of thought'],
    category: 'document',
    supportsStreaming: true,
    systemPrompt: `You are lightly cleaning up a stream-of-consciousness voice dictation.
Rules:
- Fix punctuation and capitalization only
- Remove filler words ("um", "uh", "então", "tipo", "like", "you know")
- Preserve the natural, informal flow and structure of thought
- Do NOT reorganize, summarize, or impose structure
- Do NOT change vocabulary or sentence structure
- Keep it as close to the original as possible while being readable
- Output in the same language as the input`,
    outputPreview: ''
  }
]
