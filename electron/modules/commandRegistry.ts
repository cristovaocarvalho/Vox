import crypto from 'crypto'
import type { VoiceCommand } from '../../src/types/commands'
import { listCustomCommands, saveCustomCommand, deleteCustomCommand as dbDeleteCustomCommand, listDefaultOverrides, setDefaultOverride } from './db'

// Full default command registry. Trigger patterns are case-insensitive regex
// strings that tolerate common Whisper variations (accents, trailing punctuation).
export const DEFAULT_COMMANDS: VoiceCommand[] = [
  // ───────────────────────────── punctuation ─────────────────────────────
  { id: 'punct_comma', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Comma / Vírgula', description: 'Injects a comma followed by a space', descriptionPt: 'Insere uma vírgula seguida de espaço', descriptionEn: 'Injects a comma followed by a space', triggers: { pt: ['vírgula', 'virgula'], en: ['comma'] }, action: { type: 'inject_text', parameter: ', ' }, matchMode: 'inline' },
  { id: 'punct_period', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Period / Ponto Final', description: 'Injects a period followed by a space', descriptionPt: 'Insere um ponto final seguido de espaço', descriptionEn: 'Injects a period followed by a space', triggers: { pt: ['ponto\\s*final', 'ponto\\.?$', '^ponto$'], en: ['period', 'full stop', 'dot'] }, action: { type: 'inject_text', parameter: '. ' }, matchMode: 'inline' },
  { id: 'punct_semicolon', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Semicolon / Ponto e Vírgula', description: 'Injects a semicolon followed by a space', descriptionPt: 'Insere um ponto e vírgula seguido de espaço', descriptionEn: 'Injects a semicolon followed by a space', triggers: { pt: ['ponto\\s*e\\s*v[íi]rgula'], en: ['semicolon'] }, action: { type: 'inject_text', parameter: '; ' }, matchMode: 'inline' },
  { id: 'punct_colon', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Colon / Dois Pontos', description: 'Injects a colon followed by a space', descriptionPt: 'Insere dois pontos seguidos de espaço', descriptionEn: 'Injects a colon followed by a space', triggers: { pt: ['dois\\s*pontos'], en: ['colon'] }, action: { type: 'inject_text', parameter: ': ' }, matchMode: 'inline' },
  { id: 'punct_ellipsis', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Ellipsis / Reticências', description: 'Injects an ellipsis followed by a space', descriptionPt: 'Insere reticências seguidas de espaço', descriptionEn: 'Injects an ellipsis followed by a space', triggers: { pt: ['retic[eê]ncias', 'tr[eê]s\\s*pontos'], en: ['ellipsis', 'dot\\s*dot\\s*dot', 'three dots'] }, action: { type: 'inject_text', parameter: '... ' }, matchMode: 'inline' },
  { id: 'punct_exclamation', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Exclamation / Exclamação', description: 'Injects an exclamation mark followed by a space', descriptionPt: 'Insere um ponto de exclamação seguido de espaço', descriptionEn: 'Injects an exclamation mark followed by a space', triggers: { pt: ['excla(mação|macao|ma)', 'ponto\\s*de\\s*excla'], en: ['exclamation\\s*(mark|point)?', 'bang'] }, action: { type: 'inject_text', parameter: '! ' }, matchMode: 'inline' },
  { id: 'punct_question', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Question Mark / Interrogação', description: 'Injects a question mark followed by a space', descriptionPt: 'Insere um ponto de interrogação seguido de espaço', descriptionEn: 'Injects a question mark followed by a space', triggers: { pt: ['interroga(ção|cao|)', 'ponto\\s*de\\s*interroga'], en: ['question\\s*mark'] }, action: { type: 'inject_text', parameter: '? ' }, matchMode: 'inline' },
  { id: 'punct_open_paren', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Open Parenthesis / Abre Parênteses', description: '', triggers: { pt: ['abre\\s*par[eê]ntese[s]?'], en: ['open\\s*paren(thesis)?', 'left\\s*paren(thesis)?'] }, action: { type: 'inject_text', parameter: '(' }, matchMode: 'inline' },
  { id: 'punct_close_paren', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Close Parenthesis / Fecha Parênteses', description: '', triggers: { pt: ['fecha\\s*par[eê]ntese[s]?'], en: ['close\\s*paren(thesis)?', 'right\\s*paren(thesis)?'] }, action: { type: 'inject_text', parameter: ')' }, matchMode: 'inline' },
  { id: 'punct_open_quote', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Open Quote / Abre Aspas', description: '', triggers: { pt: ['abre\\s*aspas'], en: ['open\\s*quote'] }, action: { type: 'inject_text', parameter: '"' }, matchMode: 'inline' },
  { id: 'punct_close_quote', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Close Quote / Fecha Aspas', description: '', triggers: { pt: ['fecha\\s*aspas'], en: ['close\\s*quote'] }, action: { type: 'inject_text', parameter: '"' }, matchMode: 'inline' },
  { id: 'punct_em_dash', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Em Dash / Travessão', description: '', triggers: { pt: ['trav(essão|essao|ess[aã]o)'], en: ['(em\\s*)?dash', 'em\\s*dash'] }, action: { type: 'inject_text', parameter: ' — ' }, matchMode: 'inline' },
  { id: 'punct_hyphen', isDefault: true, isEnabled: true, category: 'punctuation', label: 'Hyphen / Hífen', description: '', triggers: { pt: ['h[íi]fen'], en: ['hyphen'] }, action: { type: 'inject_text', parameter: '-' }, matchMode: 'inline' },

  // ───────────────────────────── navigation ─────────────────────────────
  { id: 'nav_new_line', isDefault: true, isEnabled: true, category: 'navigation', label: 'New Line / Nova Linha', description: 'Presses Enter once', descriptionPt: 'Pressiona Enter uma vez', descriptionEn: 'Presses Enter once', triggers: { pt: ['nova\\s*linha', 'pr[oó]xima\\s*linha', 'quebra\\s*de\\s*linha'], en: ['new\\s*line', 'next\\s*line', 'line\\s*break', 'enter'] }, action: { type: 'keystroke', parameter: 'Enter' }, matchMode: 'inline' },
  { id: 'nav_new_paragraph', isDefault: true, isEnabled: true, category: 'navigation', label: 'New Paragraph / Novo Parágrafo', description: 'Presses Enter twice', descriptionPt: 'Pressiona Enter duas vezes', descriptionEn: 'Presses Enter twice', triggers: { pt: ['novo\\s*par[aá]grafo', 'par[aá]grafo\\s*novo', 'par[aá]grafo'], en: ['new\\s*paragraph', 'paragraph'] }, action: { type: 'keystroke_sequence', parameter: [{ key: 'Enter', delayAfter: 50 }, { key: 'Enter', delayAfter: 0 }] }, matchMode: 'isolated' },
  { id: 'nav_tab', isDefault: true, isEnabled: true, category: 'navigation', label: 'Tab / Tabulação', description: '', triggers: { pt: ['tabula(ção|cao|)', 'tab'], en: ['tab', 'indent'] }, action: { type: 'keystroke', parameter: 'Tab' }, matchMode: 'inline' },
  { id: 'nav_home', isDefault: true, isEnabled: true, category: 'navigation', label: 'Beginning of Line / Início da Linha', description: '', triggers: { pt: ['in[íi]cio\\s*da\\s*linha', 'come(ço|co)\\s*da\\s*linha'], en: ['beginning\\s*of\\s*(the\\s*)?line', 'start\\s*of\\s*(the\\s*)?line', 'home'] }, action: { type: 'keystroke', parameter: 'Home' }, matchMode: 'isolated' },
  { id: 'nav_end', isDefault: true, isEnabled: true, category: 'navigation', label: 'End of Line / Fim da Linha', description: '', triggers: { pt: ['fim\\s*da\\s*linha', 'final\\s*da\\s*linha'], en: ['end\\s*of\\s*(the\\s*)?line'] }, action: { type: 'keystroke', parameter: 'End' }, matchMode: 'isolated' },
  { id: 'nav_doc_start', isDefault: true, isEnabled: true, category: 'navigation', label: 'Top of Document / Início do Documento', description: '', triggers: { pt: ['in[íi]cio\\s*do\\s*documento', 'topo\\s*do\\s*documento'], en: ['(beginning|top|start)\\s*of\\s*(the\\s*)?document'] }, action: { type: 'keystroke', parameter: 'Ctrl+Home' }, matchMode: 'isolated' },
  { id: 'nav_doc_end', isDefault: true, isEnabled: true, category: 'navigation', label: 'End of Document / Fim do Documento', description: '', triggers: { pt: ['fim\\s*do\\s*documento', 'final\\s*do\\s*documento'], en: ['(end|bottom)\\s*of\\s*(the\\s*)?document'] }, action: { type: 'keystroke', parameter: 'Ctrl+End' }, matchMode: 'isolated' },

  // ───────────────────────────── editing ─────────────────────────────
  { id: 'edit_backspace', isDefault: true, isEnabled: true, category: 'editing', label: 'Backspace / Apagar', description: '', triggers: { pt: ['apagar?', 'deletar?', 'remover?'], en: ['backspace', 'delete', 'erase'] }, action: { type: 'keystroke', parameter: 'Backspace' }, matchMode: 'isolated' },
  { id: 'edit_delete_word', isDefault: true, isEnabled: true, category: 'editing', label: 'Delete Word / Apagar Palavra', description: '', triggers: { pt: ['apagar?\\s*palavra', 'deletar?\\s*palavra', 'remover?\\s*palavra'], en: ['delete\\s*word', 'backspace\\s*word', 'erase\\s*word'] }, action: { type: 'keystroke', parameter: 'Ctrl+Backspace' }, matchMode: 'isolated' },
  { id: 'edit_delete_line', isDefault: true, isEnabled: true, category: 'editing', label: 'Delete Line / Apagar Linha', description: '', triggers: { pt: ['apagar?\\s*linha', 'deletar?\\s*linha', 'remover?\\s*linha'], en: ['delete\\s*line', 'erase\\s*line', 'clear\\s*line'] }, action: { type: 'keystroke_sequence', parameter: [{ key: 'Home', delayAfter: 30 }, { key: 'Shift+End', delayAfter: 30 }, { key: 'Delete', delayAfter: 0 }] }, matchMode: 'isolated' },
  { id: 'edit_delete_last_sentence', isDefault: true, isEnabled: true, category: 'editing', label: 'Delete Last Sentence / Apagar Última Frase', description: 'Selects and deletes text back to the previous period, exclamation, or question mark', descriptionPt: 'Seleciona e apaga o texto até a pontuação anterior', descriptionEn: 'Selects and deletes text back to the previous period, exclamation, or question mark', triggers: { pt: ['apagar?\\s*[uú]ltima\\s*frase', 'deletar?\\s*[uú]ltima\\s*frase', 'remover?\\s*[uú]ltima\\s*frase'], en: ['delete\\s*(the\\s*)?last\\s*sentence', 'erase\\s*(the\\s*)?last\\s*sentence', 'remove\\s*(the\\s*)?last\\s*sentence'] }, action: { type: 'vox_control', parameter: 'delete_last_sentence' }, matchMode: 'isolated' },
  { id: 'edit_delete_all', isDefault: true, isEnabled: true, category: 'editing', label: 'Delete All / Apagar Tudo', description: '', triggers: { pt: ['apagar?\\s*tudo', 'deletar?\\s*tudo', 'limpar\\s*tudo'], en: ['delete\\s*all', 'erase\\s*all', 'clear\\s*all', 'select\\s*all\\s*and\\s*delete'] }, action: { type: 'keystroke_sequence', parameter: [{ key: 'Ctrl+A', delayAfter: 50 }, { key: 'Delete', delayAfter: 0 }] }, matchMode: 'isolated' },
  { id: 'edit_undo', isDefault: true, isEnabled: true, category: 'editing', label: 'Undo / Desfazer', description: '', triggers: { pt: ['desfazer?', 'desfaz'], en: ['undo'] }, action: { type: 'keystroke', parameter: 'Ctrl+Z' }, matchMode: 'isolated' },
  { id: 'edit_redo', isDefault: true, isEnabled: true, category: 'editing', label: 'Redo / Refazer', description: '', triggers: { pt: ['refazer?', 'refaz'], en: ['redo'] }, action: { type: 'keystroke', parameter: 'Ctrl+Y' }, matchMode: 'isolated' },
  { id: 'edit_select_all', isDefault: true, isEnabled: true, category: 'editing', label: 'Select All / Selecionar Tudo', description: '', triggers: { pt: ['selecionar?\\s*tudo', 'seleciona\\s*tudo'], en: ['select\\s*all'] }, action: { type: 'keystroke', parameter: 'Ctrl+A' }, matchMode: 'isolated' },
  { id: 'edit_copy', isDefault: true, isEnabled: true, category: 'editing', label: 'Copy / Copiar', description: '', triggers: { pt: ['copiar?', 'copia'], en: ['copy'] }, action: { type: 'keystroke', parameter: 'Ctrl+C' }, matchMode: 'isolated' },
  { id: 'edit_paste', isDefault: true, isEnabled: true, category: 'editing', label: 'Paste / Colar', description: '', triggers: { pt: ['colar?', 'cola'], en: ['paste'] }, action: { type: 'keystroke', parameter: 'Ctrl+V' }, matchMode: 'isolated' },
  { id: 'edit_cut', isDefault: true, isEnabled: true, category: 'editing', label: 'Cut / Recortar', description: '', triggers: { pt: ['recortar?', 'recorta'], en: ['cut'] }, action: { type: 'keystroke', parameter: 'Ctrl+X' }, matchMode: 'isolated' },
  { id: 'edit_bold', isDefault: true, isEnabled: true, category: 'editing', label: 'Bold / Negrito', description: '', triggers: { pt: ['negrito'], en: ['bold'] }, action: { type: 'keystroke', parameter: 'Ctrl+B' }, matchMode: 'isolated' },
  { id: 'edit_italic', isDefault: true, isEnabled: true, category: 'editing', label: 'Italic / Itálico', description: '', triggers: { pt: ['it[aá]lico'], en: ['italic'] }, action: { type: 'keystroke', parameter: 'Ctrl+I' }, matchMode: 'isolated' },
  { id: 'edit_underline', isDefault: true, isEnabled: true, category: 'editing', label: 'Underline / Sublinhado', description: '', triggers: { pt: ['sublinhado', 'sublinhar?'], en: ['underline'] }, action: { type: 'keystroke', parameter: 'Ctrl+U' }, matchMode: 'isolated' },
  { id: 'edit_save', isDefault: true, isEnabled: true, category: 'editing', label: 'Save / Salvar', description: '', triggers: { pt: ['salvar?', 'salva', 'guardar?'], en: ['save'] }, action: { type: 'keystroke', parameter: 'Ctrl+S' }, matchMode: 'isolated' },

  // ───────────────────────────── vox_control ─────────────────────────────
  { id: 'vox_stop', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Stop Recording / Parar Gravação', description: '', triggers: { pt: ['parar?\\s*grava(ção|cao)', 'terminar?\\s*grava(ção|cao)', 'para\\s*grava(ção|cao)', 'para'], en: ['stop\\s*recording', 'stop', 'finish\\s*recording', 'done'] }, action: { type: 'vox_control', parameter: 'stop' }, matchMode: 'isolated' },
  { id: 'vox_cancel', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Cancel / Cancelar', description: 'Stops recording and discards the transcription without injecting', descriptionPt: 'Para a gravação e descarta a transcrição sem injetar', descriptionEn: 'Stops recording and discards the transcription without injecting', triggers: { pt: ['cancelar?', 'cancela', 'descartar?', 'descarta'], en: ['cancel', 'abort', 'discard', 'never\\s*mind'] }, action: { type: 'vox_control', parameter: 'cancel' }, matchMode: 'isolated' },
  { id: 'vox_clear', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Clear / Limpar', description: 'Clears the current transcription buffer without stopping', descriptionPt: 'Limpa o buffer de transcrição atual sem parar', descriptionEn: 'Clears the current transcription buffer without stopping', triggers: { pt: ['limpar?', 'limpa'], en: ['clear'] }, action: { type: 'vox_control', parameter: 'clear' }, matchMode: 'isolated' },
  { id: 'vox_repeat', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Repeat / Repetir', description: 'Re-injects the last successful transcription', descriptionPt: 'Reinserir a última transcrição bem-sucedida', descriptionEn: 'Re-injects the last successful transcription', triggers: { pt: ['repetir?', 'repete', 'dizer?\\s*novamente', 'diz\\s*novamente'], en: ['repeat', 'say\\s*(that\\s*)?again', 'again'] }, action: { type: 'vox_control', parameter: 'repeat' }, matchMode: 'isolated' },
  { id: 'vox_mode_code', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Code Mode / Modo Código', description: '', triggers: { pt: ['modo\\s*c[oó]digo', 'ativar?\\s*modo\\s*c[oó]digo'], en: ['code\\s*mode', 'coding\\s*mode', 'switch\\s*to\\s*code'] }, action: { type: 'change_profile', parameter: 'code' }, matchMode: 'isolated' },
  { id: 'vox_mode_text', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Text Mode / Modo Texto', description: '', triggers: { pt: ['modo\\s*texto', 'ativar?\\s*modo\\s*texto', 'modo\\s*prosa'], en: ['text\\s*mode', 'prose\\s*mode', 'switch\\s*to\\s*text'] }, action: { type: 'change_profile', parameter: 'text' }, matchMode: 'isolated' },
  { id: 'vox_mode_email', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Email Mode / Modo Email', description: '', triggers: { pt: ['modo\\s*email', 'ativar?\\s*modo\\s*email'], en: ['email\\s*mode', 'switch\\s*to\\s*email'] }, action: { type: 'change_profile', parameter: 'email' }, matchMode: 'isolated' },
  { id: 'template_deactivate', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Deactivate Template / Desativar Template', description: '', triggers: { pt: ['desativar template', 'sem template', 'ditado livre', 'modo padrão', 'remover template'], en: ['deactivate template', 'no template', 'free dictation', 'default mode', 'remove template'] }, action: { type: 'vox_control', parameter: 'deactivate_template' }, matchMode: 'isolated' },
  { id: 'vox_mode_code', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Code Mode / Modo Código', description: '', triggers: { pt: ['modo\\s*c[oó]digo', 'ativar?\\s*modo\\s*c[oó]digo'], en: ['code\\s*mode', 'coding\\s*mode', 'switch\\s*to\\s*code'] }, action: { type: 'change_profile', parameter: 'code' }, matchMode: 'isolated' },
  { id: 'vox_mode_text', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Text Mode / Modo Texto', description: '', triggers: { pt: ['modo\\s*texto', 'ativar?\\s*modo\\s*texto', 'modo\\s*prosa'], en: ['text\\s*mode', 'prose\\s*mode', 'switch\\s*to\\s*text'] }, action: { type: 'change_profile', parameter: 'text' }, matchMode: 'isolated' },
  { id: 'vox_mode_email', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Email Mode / Modo Email', description: '', triggers: { pt: ['modo\\s*email', 'ativar?\\s*modo\\s*email'], en: ['email\\s*mode', 'switch\\s*to\\s*email'] }, action: { type: 'change_profile', parameter: 'email' }, matchMode: 'isolated' },
  { id: 'template_deactivate', isDefault: true, isEnabled: true, category: 'vox_control', label: 'Deactivate Template / Desativar Template', description: '', triggers: { pt: ['desativar template', 'sem template', 'ditado livre', 'modo padrão', 'remover template'], en: ['deactivate template', 'no template', 'free dictation', 'default mode', 'remove template'] }, action: { type: 'vox_control', parameter: 'deactivate_template' }, matchMode: 'isolated' },

  // ───────────────────────────── snippets (dynamic) ─────────────────────────────
  { id: 'snippet_date', isDefault: true, isEnabled: true, category: 'snippets', label: 'Insert Date / Inserir Data', description: '', triggers: { pt: ['inserir?\\s*data', 'insere\\s*data', 'data\\s*de\\s*hoje'], en: ['insert\\s*(the\\s*)?date', "today'?s?\\s*date", 'current\\s*date'] }, action: { type: 'insert_dynamic', parameter: 'date' }, matchMode: 'isolated' },
  { id: 'snippet_time', isDefault: true, isEnabled: true, category: 'snippets', label: 'Insert Time / Inserir Hora', description: '', triggers: { pt: ['inserir?\\s*hora', 'insere\\s*hora', 'hora\\s*atual'], en: ['insert\\s*(the\\s*)?time', 'current\\s*time'] }, action: { type: 'insert_dynamic', parameter: 'time' }, matchMode: 'isolated' },
  { id: 'snippet_datetime', isDefault: true, isEnabled: true, category: 'snippets', label: 'Insert Date and Time / Inserir Data e Hora', description: '', triggers: { pt: ['inserir?\\s*data\\s*e\\s*hora', 'data\\s*e\\s*hora'], en: ['insert\\s*(date\\s*and\\s*time|datetime)', 'date\\s*and\\s*time'] }, action: { type: 'insert_dynamic', parameter: 'datetime' }, matchMode: 'isolated' },
  { id: 'snippet_signature', isDefault: true, isEnabled: true, category: 'snippets', label: 'Insert Signature / Inserir Assinatura', description: '', triggers: { pt: ['inserir?\\s*assinatura', 'insere\\s*assinatura', 'minha\\s*assinatura'], en: ['insert\\s*(my\\s*)?signature', 'my\\s*signature'] }, action: { type: 'inject_snippet', parameter: 'signature' }, matchMode: 'isolated' },
  { id: 'snippet_email_address', isDefault: true, isEnabled: true, category: 'snippets', label: 'Insert Email Address / Inserir Email', description: '', triggers: { pt: ['inserir?\\s*(meu\\s*)?e?\\s*mail', 'insere\\s*(meu\\s*)?e?\\s*mail'], en: ['insert\\s*(my\\s*)?email(\\s*address)?', 'my\\s*email'] }, action: { type: 'inject_snippet', parameter: 'email_address' }, matchMode: 'isolated' },
  { id: 'snippet_address', isDefault: true, isEnabled: true, category: 'snippets', label: 'Insert Address / Inserir Endereço', description: '', triggers: { pt: ['inserir?\\s*(meu\\s*)?endere(ço|co)', 'insere\\s*endere(ço|co)'], en: ['insert\\s*(my\\s*)?address', 'my\\s*address'] }, action: { type: 'inject_snippet', parameter: 'address' }, matchMode: 'isolated' },

  // ───────────────────────────── system ─────────────────────────────
  { id: 'sys_terminal', isDefault: true, isEnabled: true, category: 'system', label: 'Open Terminal / Abrir Terminal', description: '', triggers: { pt: ['abrir?\\s*terminal', 'abre\\s*terminal'], en: ['open\\s*terminal', 'open\\s*(the\\s*)?console'] }, action: { type: 'open_app', parameter: 'terminal' }, matchMode: 'isolated' },
  { id: 'sys_browser', isDefault: true, isEnabled: true, category: 'system', label: 'Open Browser / Abrir Navegador', description: '', triggers: { pt: ['abrir?\\s*navegador', 'abre\\s*navegador', 'abrir?\\s*browser'], en: ['open\\s*(the\\s*)?(browser|web\\s*browser)'] }, action: { type: 'open_app', parameter: 'browser' }, matchMode: 'isolated' },
  { id: 'sys_explorer', isDefault: true, isEnabled: true, category: 'system', label: 'Open File Explorer / Abrir Explorador', description: '', triggers: { pt: ['abrir?\\s*explorador', 'abre\\s*explorador', 'abrir?\\s*arquivos', 'abrir?\\s*pasta'], en: ['open\\s*(the\\s*)?(file\\s*)?explorer', 'open\\s*(the\\s*)?finder'] }, action: { type: 'open_app', parameter: 'explorer' }, matchMode: 'isolated' },
  { id: 'sys_screenshot', isDefault: true, isEnabled: true, category: 'system', label: 'Take Screenshot / Tirar Print', description: '', triggers: { pt: ['tirar?\\s*print', 'tira\\s*print', 'captura\\s*de\\s*tela', 'screenshot'], en: ['(take\\s*(a\\s*)?)?screenshot', 'print\\s*screen'] }, action: { type: 'keystroke', parameter: 'PrintScreen' }, matchMode: 'isolated' },

  // ───────────────────────────── system (dynamic) ─────────────────────────────
  { id: 'sys_open', isDefault: true, isEnabled: true, category: 'system', label: 'Open Application / Abrir Aplicativo', description: 'Opens any application or website by name (e.g. "open chrome", "open gmail", "open vs code")', descriptionPt: 'Abre qualquer aplicativo ou site pelo nome (ex.: "abrir chrome", "abrir gmail", "abrir vs code")', descriptionEn: 'Opens any application or website by name (e.g. "open chrome", "open gmail", "open vs code")', triggers: { pt: ['abrir', 'abre', 'abra'], en: ['open up', 'open'] }, action: { type: 'open_app', parameter: '' }, matchMode: 'isolated', dynamic: true },
  { id: 'sys_search_youtube', isDefault: true, isEnabled: true, category: 'system', label: 'Search on YouTube / Pesquisar no YouTube', description: 'Searches YouTube for anything you say', descriptionPt: 'Pesquisa no YouTube o que você disser', descriptionEn: 'Searches YouTube for anything you say', triggers: { pt: ['pesquisar no youtube', 'buscar no youtube', 'youtube'], en: ['search on youtube', 'youtube search', 'youtube'] }, action: { type: 'open_search', parameter: 'youtube' }, matchMode: 'isolated', dynamic: true },
  { id: 'sys_search', isDefault: true, isEnabled: true, category: 'system', label: 'Web Search / Pesquisar na Web', description: 'Searches the web for anything you say', descriptionPt: 'Pesquisa na web o que você disser', descriptionEn: 'Searches the web for anything you say', triggers: { pt: ['pesquisar por', 'pesquisar', 'pesquise', 'pesquisa', 'buscar', 'busque', 'procura', 'procurar por', 'procurar'], en: ['search for', 'search', 'google', 'look up'] }, action: { type: 'open_search', parameter: 'google' }, matchMode: 'isolated', dynamic: true }
]

function applyOverrides(): VoiceCommand[] {
  const overrides = listDefaultOverrides()
  const overrideMap = new Map(overrides.map((o) => [o.commandId, o]))

  const defaults = DEFAULT_COMMANDS.map((cmd) => {
    const o = overrideMap.get(cmd.id)
    if (!o) return cmd
    return {
      ...cmd,
      isEnabled: o.isEnabled,
      matchMode: o.matchMode || cmd.matchMode
    }
  })

  return [...defaults, ...listCustomCommands()]
}

export function getAllCommands(): VoiceCommand[] {
  return applyOverrides()
}

export function getEnabledCommands(): VoiceCommand[] {
  return applyOverrides().filter((c) => c.isEnabled)
}

export function setEnabled(id: string, enabled: boolean): void {
  const current = getAllCommands().find((c) => c.id === id)
  if (!current) return
  if (current.isDefault) {
    setDefaultOverride(id, enabled, current.matchMode)
  } else {
    saveCustomCommand({ ...current, isEnabled: enabled })
  }
}

export function setMatchMode(id: string, mode: 'isolated' | 'inline'): void {
  const current = getAllCommands().find((c) => c.id === id)
  if (!current) return
  if (current.isDefault) {
    setDefaultOverride(id, current.isEnabled, mode)
  } else {
    saveCustomCommand({ ...current, matchMode: mode })
  }
}

export function addCustomCommand(command: VoiceCommand): VoiceCommand {
  const full: VoiceCommand = {
    id: command.id || crypto.randomUUID(),
    isDefault: false,
    isEnabled: command.isEnabled ?? true,
    category: command.category || 'custom',
    label: command.label || 'Untitled',
    description: command.description || '',
    triggers: command.triggers || { pt: [], en: [] },
    action: command.action || { type: 'inject_text', parameter: '' },
    matchMode: command.matchMode || 'isolated',
    createdAt: command.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  saveCustomCommand(full)
  return full
}

export function updateCustomCommand(id: string, command: Partial<VoiceCommand>): void {
  const existing = listCustomCommands().find((c) => c.id === id)
  if (!existing) return
  saveCustomCommand({ ...existing, ...command, id, isDefault: false, updatedAt: new Date().toISOString() })
}

export function deleteCustomCommand(id: string): void {
  dbDeleteCustomCommand(id)
}

export default {
  DEFAULT_COMMANDS,
  getAllCommands,
  getEnabledCommands,
  setEnabled,
  setMatchMode,
  addCustomCommand,
  updateCustomCommand,
  deleteCustomCommand
}
