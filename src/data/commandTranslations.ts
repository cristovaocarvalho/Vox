import type { AppLocale } from '../stores/useVoxStore'

export interface CommandLocaleInfo {
  label: string
  description?: string
  triggers: string[]
}

export const COMMAND_TRANSLATIONS: Record<string, Partial<Record<AppLocale, CommandLocaleInfo>>> = {
  // ─── punctuation ─────────────────────────────────────────────────────────────
  punct_comma: {
    'pt-BR': { label: 'Vírgula', description: 'Insere uma vírgula seguida de espaço', triggers: ['vírgula', 'virgula'] },
    en: { label: 'Comma', description: 'Injects a comma followed by a space', triggers: ['comma'] },
    es: { label: 'Coma', description: 'Inserta una coma seguida de un espacio', triggers: ['coma'] },
    fr: { label: 'Virgule', description: 'Insère une virgule suivie d’un espace', triggers: ['virgule'] },
    de: { label: 'Komma', description: 'Fügt ein Komma gefolgt von einem Leerzeichen ein', triggers: ['komma'] },
    it: { label: 'Virgola', description: 'Inserisce una virgola seguita da uno spazio', triggers: ['virgola'] },
    'zh-CN': { label: '逗号', description: '插入逗号和空格', triggers: ['逗号'] },
    ja: { label: '読点 (カンマ)', description: '読点とスペースを挿入します', triggers: ['読点', 'カンマ'] }
  },
  punct_period: {
    'pt-BR': { label: 'Ponto Final', description: 'Insere um ponto final seguido de espaço', triggers: ['ponto final', 'ponto'] },
    en: { label: 'Period', description: 'Injects a period followed by a space', triggers: ['period', 'full stop', 'dot'] },
    es: { label: 'Punto Final', description: 'Inserta un punto final seguido de un espacio', triggers: ['punto final', 'punto'] },
    fr: { label: 'Point Final', description: 'Insère un point final suivi d’un espace', triggers: ['point final', 'point'] },
    de: { label: 'Punkt', description: 'Fügt einen Punkt gefolgt von einem Leerzeichen ein', triggers: ['punkt'] },
    it: { label: 'Punto Fermo', description: 'Inserisce un punto fermo seguito da uno spazio', triggers: ['punto fermo', 'punto'] },
    'zh-CN': { label: '句号', description: '插入句号和空格', triggers: ['句号'] },
    ja: { label: '句点 (ピリオド)', description: '句点とスペースを挿入します', triggers: ['句点', 'ピリオド', 'まる'] }
  },
  punct_semicolon: {
    'pt-BR': { label: 'Ponto e Vírgula', description: 'Insere um ponto e vírgula seguido de espaço', triggers: ['ponto e vírgula'] },
    en: { label: 'Semicolon', description: 'Injects a semicolon followed by a space', triggers: ['semicolon'] },
    es: { label: 'Punto y Coma', description: 'Inserta un punto y coma seguido de un espacio', triggers: ['punto y coma'] },
    fr: { label: 'Point-virgule', description: 'Insère un point-virgule suivi d’un espace', triggers: ['point-virgule'] },
    de: { label: 'Semikolon', description: 'Fügt ein Semikolon gefolgt von einem Leerzeichen ein', triggers: ['semikolon', 'strichpunkt'] },
    it: { label: 'Punto e Virgola', description: 'Inserisce un punto e virgola seguito da uno spazio', triggers: ['punto e virgola'] },
    'zh-CN': { label: '分号', description: '插入分号和空格', triggers: ['分号'] },
    ja: { label: 'セミコロン', description: 'セミコロンとスペースを挿入します', triggers: ['セミコロン'] }
  },
  punct_colon: {
    'pt-BR': { label: 'Dois Pontos', description: 'Insere dois pontos seguidos de espaço', triggers: ['dois pontos'] },
    en: { label: 'Colon', description: 'Injects a colon followed by a space', triggers: ['colon'] },
    es: { label: 'Dos Puntos', description: 'Inserta dos puntos seguidos de un espacio', triggers: ['dos puntos'] },
    fr: { label: 'Deux-points', description: 'Insère deux-points suivis d’un espace', triggers: ['deux-points'] },
    de: { label: 'Doppelpunkt', description: 'Fügt einen Doppelpunkt gefolgt von einem Leerzeichen ein', triggers: ['doppelpunkt'] },
    it: { label: 'Due Punti', description: 'Inserisce due punti seguiti da uno spazio', triggers: ['due punti'] },
    'zh-CN': { label: '冒号', description: '插入冒号和空格', triggers: ['冒号'] },
    ja: { label: 'コロン', description: 'コロンとスペースを挿入します', triggers: ['コロン'] }
  },
  punct_ellipsis: {
    'pt-BR': { label: 'Reticências', description: 'Insere reticências seguidas de espaço', triggers: ['reticências', 'três pontos'] },
    en: { label: 'Ellipsis', description: 'Injects an ellipsis followed by a space', triggers: ['ellipsis', 'three dots'] },
    es: { label: 'Puntos Suspensivos', description: 'Inserta puntos suspensivos seguidos de un espacio', triggers: ['puntos suspensivos', 'tres puntos'] },
    fr: { label: 'Points de Suspension', description: 'Insère des points de suspension suivis d’un espace', triggers: ['points de suspension', 'trois points'] },
    de: { label: 'Auslassungspunkte', description: 'Fügt drei Auslassungspunkte ein', triggers: ['auslassungspunkte', 'drei punkte'] },
    it: { label: 'Puntini di Sospensione', description: 'Inserisce puntini di sospensione', triggers: ['puntini di sospensione', 'tre punti'] },
    'zh-CN': { label: '省略号', description: '插入省略号', triggers: ['省略号'] },
    ja: { label: '三点リーダー', description: '三点リーダーを挿入します', triggers: ['三点リーダー', 'てんてんてん'] }
  },
  punct_exclamation: {
    'pt-BR': { label: 'Ponto de Exclamação', description: 'Insere um ponto de exclamação seguido de espaço', triggers: ['ponto de exclamação', 'exclamação'] },
    en: { label: 'Exclamation Mark', description: 'Injects an exclamation mark followed by a space', triggers: ['exclamation mark', 'bang'] },
    es: { label: 'Signo de Exclamación', description: 'Inserta un signo de exclamación', triggers: ['signo de exclamación', 'exclamación'] },
    fr: { label: 'Point d’Exclamation', description: 'Insère un point d’exclamation', triggers: ['point d’exclamation'] },
    de: { label: 'Ausrufezeichen', description: 'Fügt ein Ausrufezeichen ein', triggers: ['ausrufezeichen'] },
    it: { label: 'Punto Esclamativo', description: 'Inserisce un punto esclamativo', triggers: ['punto esclamativo'] },
    'zh-CN': { label: '感叹号', description: '插入感叹号', triggers: ['感叹号'] },
    ja: { label: '感嘆符 (ビックリマーク)', description: '感嘆符を挿入します', triggers: ['感嘆符', 'ビックリマーク'] }
  },
  punct_question: {
    'pt-BR': { label: 'Ponto de Interrogação', description: 'Insere um ponto de interrogação seguido de espaço', triggers: ['ponto de interrogação', 'interrogação'] },
    en: { label: 'Question Mark', description: 'Injects a question mark followed by a space', triggers: ['question mark'] },
    es: { label: 'Signo de Interrogación', description: 'Inserta un signo de interrogación', triggers: ['signo de interrogación', 'interrogación'] },
    fr: { label: 'Point d’Interrogation', description: 'Insère un point d’interrogation', triggers: ['point d’interrogation'] },
    de: { label: 'Fragezeichen', description: 'Fügt ein Fragezeichen ein', triggers: ['fragezeichen'] },
    it: { label: 'Punto Interrogativo', description: 'Inserisce un punto interrogativo', triggers: ['punto interrogativo'] },
    'zh-CN': { label: '问号', description: '插入问号', triggers: ['问号'] },
    ja: { label: '疑問符 (ハテナマーク)', description: '疑問符を挿入します', triggers: ['疑問符', 'ハテナマーク', 'クエスチョンマーク'] }
  },
  punct_open_paren: {
    'pt-BR': { label: 'Abre Parênteses', description: 'Insere parêntese de abertura', triggers: ['abre parênteses'] },
    en: { label: 'Open Parenthesis', description: 'Injects an open parenthesis', triggers: ['open parenthesis', 'open paren'] },
    es: { label: 'Abrir Paréntesis', description: 'Inserta paréntesis de apertura', triggers: ['abrir paréntesis'] },
    fr: { label: 'Ouvrir Parenthèse', description: 'Insère une parenthèse ouvrante', triggers: ['ouvrir parenthèse'] },
    de: { label: 'Klammer Auf', description: 'Fügt eine öffnende Klammer ein', triggers: ['klammer auf'] },
    it: { label: 'Apri Parentesi', description: 'Inserisce parentesi aperta', triggers: ['apri parentesi'] },
    'zh-CN': { label: '左括号', description: '插入左括号', triggers: ['左括号', '开括号'] },
    ja: { label: '開き括弧', description: '開き括弧を挿入します', triggers: ['開き括弧', '括弧開く'] }
  },
  punct_close_paren: {
    'pt-BR': { label: 'Fecha Parênteses', description: 'Insere parêntese de fechamento', triggers: ['fecha parênteses'] },
    en: { label: 'Close Parenthesis', description: 'Injects a close parenthesis', triggers: ['close parenthesis', 'close paren'] },
    es: { label: 'Cerrar Paréntesis', description: 'Inserta paréntesis de cierre', triggers: ['cerrar paréntesis'] },
    fr: { label: 'Fermer Parenthèse', description: 'Insère une parenthèse fermante', triggers: ['fermer parenthèse'] },
    de: { label: 'Klammer Zu', description: 'Fügt eine schließende Klammer ein', triggers: ['klammer zu'] },
    it: { label: 'Chiudi Parentesi', description: 'Inserisce parentesi chiusa', triggers: ['chiudi parentesi'] },
    'zh-CN': { label: '右括号', description: '插入右括号', triggers: ['右括号', '闭括号'] },
    ja: { label: '閉じ括弧', description: '閉じ括弧を挿入します', triggers: ['閉じ括弧', '括弧閉じる'] }
  },
  punct_open_quote: {
    'pt-BR': { label: 'Abre Aspas', description: 'Insere aspas de abertura', triggers: ['abre aspas'] },
    en: { label: 'Open Quote', description: 'Injects opening quotation marks', triggers: ['open quote'] },
    es: { label: 'Abrir Comillas', description: 'Inserta comillas de apertura', triggers: ['abrir comillas'] },
    fr: { label: 'Ouvrir Guillemets', description: 'Insère des guillemets ouvrants', triggers: ['ouvrir les guillemets'] },
    de: { label: 'Anführungszeichen Oben', description: 'Fügt öffnende Anführungszeichen ein', triggers: ['anführungszeichen oben'] },
    it: { label: 'Apri Virgolette', description: 'Inserisce virgolette aperte', triggers: ['apri virgolette'] },
    'zh-CN': { label: '前引号', description: '插入开引号', triggers: ['前引号', '开引号'] },
    ja: { label: '開き引用符', description: '開き引用符を挿入します', triggers: ['開き引用符', 'カギ括弧開く'] }
  },
  punct_close_quote: {
    'pt-BR': { label: 'Fecha Aspas', description: 'Insere aspas de fechamento', triggers: ['fecha aspas'] },
    en: { label: 'Close Quote', description: 'Injects closing quotation marks', triggers: ['close quote'] },
    es: { label: 'Cerrar Comillas', description: 'Inserta comillas de cierre', triggers: ['cerrar comillas'] },
    fr: { label: 'Fermer Guillemets', description: 'Insère des guillemets fermants', triggers: ['fermer les guillemets'] },
    de: { label: 'Anführungszeichen Unten', description: 'Fügt schließende Anführungszeichen ein', triggers: ['anführungszeichen unten'] },
    it: { label: 'Chiudi Virgolette', description: 'Inserisce virgolette chiuse', triggers: ['chiudi virgolette'] },
    'zh-CN': { label: '后引号', description: '插入闭引号', triggers: ['后引号', '闭引号'] },
    ja: { label: '閉じ引用符', description: '閉じ引用符を挿入します', triggers: ['閉じ引用符', 'カギ括弧閉じる'] }
  },
  punct_em_dash: {
    'pt-BR': { label: 'Travessão', description: 'Insere travessão', triggers: ['travessão', 'travessao'] },
    en: { label: 'Em Dash', description: 'Injects an em dash', triggers: ['em dash', 'dash'] },
    es: { label: 'Raya (Guión Largo)', description: 'Inserta una raya larga', triggers: ['raya', 'guión largo'] },
    fr: { label: 'Tiret Cadratin', description: 'Insère un tiret cadratin', triggers: ['tiret cadratin', 'tiret long'] },
    de: { label: 'Gedankenstrich', description: 'Fügt einen Gedankenstrich ein', triggers: ['gedankenstrich'] },
    it: { label: 'Lineetta', description: 'Inserisce una lineetta', triggers: ['lineetta', 'trattino lungo'] },
    'zh-CN': { label: '破折号', description: '插入破折号', triggers: ['破折号'] },
    ja: { label: 'ダッシュ', description: 'ダッシュ記号を挿入します', triggers: ['ダッシュ'] }
  },
  punct_hyphen: {
    'pt-BR': { label: 'Hífen', description: 'Insere hífen', triggers: ['hífen', 'hifen'] },
    en: { label: 'Hyphen', description: 'Injects a hyphen', triggers: ['hyphen'] },
    es: { label: 'Guión', description: 'Inserta un guión', triggers: ['guión', 'guion'] },
    fr: { label: 'Tiret', description: 'Insère un tiret', triggers: ['tiret', 'trait d’union'] },
    de: { label: 'Bindestrich', description: 'Fügt einen Bindestrich ein', triggers: ['bindestrich'] },
    it: { label: 'Trattino', description: 'Inserisce un trattino', triggers: ['trattino'] },
    'zh-CN': { label: '连字符', description: '插入连字符', triggers: ['连字符'] },
    ja: { label: 'ハイフン', description: 'ハイフンを挿入します', triggers: ['ハイフン'] }
  },

  // ─── navigation ─────────────────────────────────────────────────────────────
  nav_new_line: {
    'pt-BR': { label: 'Nova Linha', description: 'Pressiona Enter uma vez', triggers: ['nova linha', 'próxima linha', 'quebra de linha'] },
    en: { label: 'New Line', description: 'Presses Enter once', triggers: ['new line', 'next line', 'line break', 'enter'] },
    es: { label: 'Nueva Línea', description: 'Presiona Enter una vez', triggers: ['nueva línea', 'siguiente línea', 'salto de línea'] },
    fr: { label: 'Nouvelle Ligne', description: 'Appuie sur Entrée une fois', triggers: ['nouvelle ligne', 'à la ligne', 'saut de ligne'] },
    de: { label: 'Neue Zeile', description: 'Drückt einmal die Eingabetaste', triggers: ['neue zeile', 'nächste zeile', 'zeilenumbruch'] },
    it: { label: 'Nuova Riga', description: 'Premi Invio una volta', triggers: ['nuova riga', 'a capo', 'interruzione di riga'] },
    'zh-CN': { label: '换行', description: '按一次回车键', triggers: ['换行', '新行', '下一行'] },
    ja: { label: '改行', description: 'Enterキーを1回押します', triggers: ['改行', '新しい行', 'エンター'] }
  },
  nav_new_paragraph: {
    'pt-BR': { label: 'Novo Parágrafo', description: 'Pressiona Enter duas vezes', triggers: ['novo parágrafo', 'parágrafo novo', 'parágrafo'] },
    en: { label: 'New Paragraph', description: 'Presses Enter twice', triggers: ['new paragraph', 'paragraph'] },
    es: { label: 'Nuevo Párrafo', description: 'Presiona Enter dos veces', triggers: ['nuevo párrafo', 'párrafo'] },
    fr: { label: 'Nouveau Paragraphe', description: 'Appuie sur Entrée deux fois', triggers: ['nouveau paragraphe', 'paragraphe'] },
    de: { label: 'Neuer Absatz', description: 'Drückt zweimal die Eingabetaste', triggers: ['neuer absatz', 'absatz'] },
    it: { label: 'Nuovo Paragrafo', description: 'Premi Invio due volte', triggers: ['nuovo paragrafo', 'paragrafo'] },
    'zh-CN': { label: '新段落', description: '按两次回车键', triggers: ['新段落', '段落'] },
    ja: { label: '新しい段落', description: 'Enterキーを2回押します', triggers: ['新しい段落', '改段落'] }
  },
  nav_tab: {
    'pt-BR': { label: 'Tabulação', description: 'Pressiona a tecla Tab', triggers: ['tabulação', 'tab'] },
    en: { label: 'Tab', description: 'Presses Tab', triggers: ['tab', 'indent'] },
    es: { label: 'Tabulación', description: 'Presiona la tecla Tab', triggers: ['tabulación', 'tab'] },
    fr: { label: 'Tabulation', description: 'Appuie sur Tab', triggers: ['tabulation', 'tab'] },
    de: { label: 'Tabulator', description: 'Drückt die Tab-Taste', triggers: ['tabulator', 'tab'] },
    it: { label: 'Tabulazione', description: 'Premi il tasto Tab', triggers: ['tabulazione', 'tab'] },
    'zh-CN': { label: '制表符', description: '按 Tab 键', triggers: ['制表符', '缩进'] },
    ja: { label: 'タブ', description: 'Tabキーを押します', triggers: ['タブ', 'インデント'] }
  },
  nav_home: {
    'pt-BR': { label: 'Início da Linha', description: 'Move o cursor para o início da linha', triggers: ['início da linha', 'começo da linha'] },
    en: { label: 'Beginning of Line', description: 'Moves cursor to start of line', triggers: ['beginning of line', 'start of line', 'home'] },
    es: { label: 'Inicio de Línea', description: 'Mueve el cursor al inicio de la línea', triggers: ['inicio de línea'] },
    fr: { label: 'Début de Ligne', description: 'Déplace le curseur au début de la ligne', triggers: ['début de ligne'] },
    de: { label: 'Zeilenanfang', description: 'Bewegt den Cursor an den Anfang der Zeile', triggers: ['zeilenanfang', 'home'] },
    it: { label: 'Inizio Riga', description: 'Sposta il cursore all’inizio della riga', triggers: ['inizio riga'] },
    'zh-CN': { label: '行首', description: '将光标移至行首', triggers: ['行首', '移动到行首'] },
    ja: { label: '行頭', description: 'カーソルを行の先頭に移動します', triggers: ['行頭', '行の先頭'] }
  },
  nav_end: {
    'pt-BR': { label: 'Fim da Linha', description: 'Move o cursor para o fim da linha', triggers: ['fim da linha', 'final da linha'] },
    en: { label: 'End of Line', description: 'Moves cursor to end of line', triggers: ['end of line'] },
    es: { label: 'Fin de Línea', description: 'Mueve el cursor al final de la línea', triggers: ['fin de línea', 'final de línea'] },
    fr: { label: 'Fin de Ligne', description: 'Déplace le curseur à la fin de la ligne', triggers: ['fin de ligne'] },
    de: { label: 'Zeilenende', description: 'Bewegt den Cursor an das Ende der Zeile', triggers: ['zeilenende', 'end'] },
    it: { label: 'Fine Riga', description: 'Sposta il cursore alla fine della riga', triggers: ['fine riga'] },
    'zh-CN': { label: '行尾', description: '将光标移至行末', triggers: ['行尾', '移动到行末'] },
    ja: { label: '行末', description: 'カーソルを行の末尾に移動します', triggers: ['行末', '行の最後'] }
  },
  nav_doc_start: {
    'pt-BR': { label: 'Início do Documento', description: 'Move o cursor para o início do documento', triggers: ['início do documento', 'topo do documento'] },
    en: { label: 'Top of Document', description: 'Moves cursor to beginning of document', triggers: ['top of document', 'beginning of document'] },
    es: { label: 'Inicio del Documento', description: 'Mueve el cursor al inicio del documento', triggers: ['inicio del documento', 'principio del documento'] },
    fr: { label: 'Début du Document', description: 'Déplace le curseur au début du document', triggers: ['début du document'] },
    de: { label: 'Dokumentanfang', description: 'Bewegt den Cursor an den Anfang des Dokuments', triggers: ['dokumentanfang'] },
    it: { label: 'Inizio Documento', description: 'Sposta il cursore all’inizio del documento', triggers: ['inizio documento'] },
    'zh-CN': { label: '文档开头', description: '将光标移至文档开头', triggers: ['文档开头', '文档顶部'] },
    ja: { label: '文書の先頭', description: 'カーソルを文書の先頭に移動します', triggers: ['文書の先頭', 'トップ'] }
  },
  nav_doc_end: {
    'pt-BR': { label: 'Fim do Documento', description: 'Move o cursor para o fim do documento', triggers: ['fim do documento', 'final do documento'] },
    en: { label: 'End of Document', description: 'Moves cursor to bottom of document', triggers: ['end of document', 'bottom of document'] },
    es: { label: 'Fin del Documento', description: 'Mueve el cursor al final del documento', triggers: ['fin del documento'] },
    fr: { label: 'Fin du Document', description: 'Déplace le curseur à la fin du document', triggers: ['fin du document'] },
    de: { label: 'Dokumentende', description: 'Bewegt den Cursor an das Ende des Dokuments', triggers: ['dokumentende'] },
    it: { label: 'Fine Documento', description: 'Sposta il cursore alla fine del documento', triggers: ['fine documento'] },
    'zh-CN': { label: '文档结尾', description: '将光标移至文档末尾', triggers: ['文档结尾', '文档底部'] },
    ja: { label: '文書の末尾', description: 'カーソルを文書の末尾に移動します', triggers: ['文書の末尾', 'ラスト'] }
  },

  // ─── editing ─────────────────────────────────────────────────────────────
  edit_backspace: {
    'pt-BR': { label: 'Apagar', description: 'Pressiona Backspace', triggers: ['apagar', 'deletar', 'remover'] },
    en: { label: 'Backspace', description: 'Presses Backspace', triggers: ['backspace', 'delete', 'erase'] },
    es: { label: 'Borrar', description: 'Presiona Retroceso', triggers: ['borrar', 'eliminar'] },
    fr: { label: 'Effacer', description: 'Appuie sur Retour arrière', triggers: ['effacer', 'supprimer'] },
    de: { label: 'Rücktaste', description: 'Drückt die Rücktaste', triggers: ['löschen', 'entfernen', 'rückschritt'] },
    it: { label: 'Cancella', description: 'Premi Backspace', triggers: ['cancella', 'elimina'] },
    'zh-CN': { label: '退格删除', description: '按退格键', triggers: ['退格', '删除'] },
    ja: { label: '1文字削除', description: 'Backspaceキーを押します', triggers: ['削除', 'バックスペース'] }
  },
  edit_delete_word: {
    'pt-BR': { label: 'Apagar Palavra', description: 'Apaga a palavra anterior', triggers: ['apagar palavra', 'deletar palavra', 'remover palavra'] },
    en: { label: 'Delete Word', description: 'Deletes the previous word', triggers: ['delete word', 'backspace word', 'erase word'] },
    es: { label: 'Borrar Palabra', description: 'Elimina la palabra anterior', triggers: ['borrar palabra', 'eliminar palabra'] },
    fr: { label: 'Supprimer Mot', description: 'Supprime le mot précédent', triggers: ['supprimer mot', 'effacer mot'] },
    de: { label: 'Wort Löschen', description: 'Löscht das vorherige Wort', triggers: ['wort löschen'] },
    it: { label: 'Elimina Parola', description: 'Elimina la parola precedente', triggers: ['elimina parola', 'cancella parola'] },
    'zh-CN': { label: '删除词语', description: '删除前一个词语', triggers: ['删除词语', '删除单词'] },
    ja: { label: '単語を削除', description: '直前の単語を削除します', triggers: ['単語を削除', '単語削除'] }
  },
  edit_delete_line: {
    'pt-BR': { label: 'Apagar Linha', description: 'Apaga a linha atual', triggers: ['apagar linha', 'deletar linha', 'limpar linha'] },
    en: { label: 'Delete Line', description: 'Deletes the current line', triggers: ['delete line', 'erase line', 'clear line'] },
    es: { label: 'Borrar Línea', description: 'Elimina la línea actual', triggers: ['borrar línea', 'eliminar línea'] },
    fr: { label: 'Supprimer Ligne', description: 'Supprime la ligne actuelle', triggers: ['supprimer ligne', 'effacer ligne'] },
    de: { label: 'Zeile Löschen', description: 'Löscht die aktuelle Zeile', triggers: ['zeile löschen'] },
    it: { label: 'Elimina Riga', description: 'Elimina la riga corrente', triggers: ['elimina riga', 'cancella riga'] },
    'zh-CN': { label: '删除整行', description: '删除当前行', triggers: ['删除整行', '清空当前行'] },
    ja: { label: '行を削除', description: '現在の行を削除します', triggers: ['行を削除', '行削除'] }
  },
  edit_delete_last_sentence: {
    'pt-BR': { label: 'Apagar Última Frase', description: 'Seleciona e apaga o texto até a pontuação anterior', triggers: ['apagar última frase', 'deletar última frase'] },
    en: { label: 'Delete Last Sentence', description: 'Selects and deletes text back to the previous punctuation', triggers: ['delete last sentence', 'erase last sentence'] },
    es: { label: 'Borrar Última Frase', description: 'Elimina el texto hasta la puntuación anterior', triggers: ['borrar última frase', 'eliminar última frase'] },
    fr: { label: 'Supprimer Dernière Phrase', description: 'Supprime le texte jusqu’à la ponctuation précédente', triggers: ['supprimer dernière phrase'] },
    de: { label: 'Letzten Satz Löschen', description: 'Löscht den Text bis zum vorherigen Satzzeichen', triggers: ['letzten satz löschen'] },
    it: { label: 'Elimina Ultima Frase', description: 'Elimina il testo fino alla punteggiatura precedente', triggers: ['elimina ultima frase'] },
    'zh-CN': { label: '删除上一句', description: '删除至上一处标点符号', triggers: ['删除上一句', '撤销上一句话'] },
    ja: { label: '直前の文を削除', description: '直前の句点までの文を削除します', triggers: ['直前の文を削除', '最後の文を削除'] }
  },
  edit_delete_all: {
    'pt-BR': { label: 'Apagar Tudo', description: 'Seleciona e apaga todo o texto', triggers: ['apagar tudo', 'deletar tudo', 'limpar tudo'] },
    en: { label: 'Delete All', description: 'Selects all and deletes', triggers: ['delete all', 'erase all', 'clear all'] },
    es: { label: 'Borrar Todo', description: 'Selecciona todo y lo elimina', triggers: ['borrar todo', 'eliminar todo', 'limpiar todo'] },
    fr: { label: 'Tout Supprimer', description: 'Sélectionne tout et supprime', triggers: ['tout supprimer', 'effacer tout'] },
    de: { label: 'Alles Löschen', description: 'Wählt alles aus und löscht es', triggers: ['alles löschen'] },
    it: { label: 'Cancella Tutto', description: 'Seleziona tutto ed elimina', triggers: ['cancella tutto', 'elimina tutto'] },
    'zh-CN': { label: '删除全部', description: '全选并删除所有内容', triggers: ['删除全部', '清空全部'] },
    ja: { label: 'すべて削除', description: 'すべて選択して削除します', triggers: ['すべて削除', '全消去'] }
  },
  edit_undo: {
    'pt-BR': { label: 'Desfazer', description: 'Desfaz a última ação (Ctrl+Z)', triggers: ['desfazer', 'desfaz'] },
    en: { label: 'Undo', description: 'Undoes the last action (Ctrl+Z)', triggers: ['undo'] },
    es: { label: 'Deshacer', description: 'Deshace la última acción (Ctrl+Z)', triggers: ['deshacer'] },
    fr: { label: 'Annuler', description: 'Annule la dernière action (Ctrl+Z)', triggers: ['annuler'] },
    de: { label: 'Rückgängig', description: 'Macht die letzte Aktion rückgängig (Ctrl+Z)', triggers: ['rückgängig'] },
    it: { label: 'Annulla', description: 'Annulla l’ultima azione (Ctrl+Z)', triggers: ['annulla'] },
    'zh-CN': { label: '撤销', description: '撤销上一步操作 (Ctrl+Z)', triggers: ['撤销'] },
    ja: { label: '元に戻す', description: '直前の操作を元に戻します (Ctrl+Z)', triggers: ['元に戻す', 'アンドゥ'] }
  },
  edit_redo: {
    'pt-BR': { label: 'Refazer', description: 'Refaz a última ação desfeita (Ctrl+Y)', triggers: ['refazer', 'refaz'] },
    en: { label: 'Redo', description: 'Redoes the last undone action (Ctrl+Y)', triggers: ['redo'] },
    es: { label: 'Rehacer', description: 'Rehace la última acción deshecha (Ctrl+Y)', triggers: ['rehacer'] },
    fr: { label: 'Rétablir', description: 'Rétablit l’action annulée (Ctrl+Y)', triggers: ['rétablir', 'refaire'] },
    de: { label: 'Wiederholen', description: 'Wiederholt die rückgängig gemachte Aktion (Ctrl+Y)', triggers: ['wiederholen'] },
    it: { label: 'Ripristina', description: 'Ripristina l’azione annullata (Ctrl+Y)', triggers: ['ripristina', 'rifai'] },
    'zh-CN': { label: '重做', description: '重做上一步撤销的操作 (Ctrl+Y)', triggers: ['重做'] },
    ja: { label: 'やり直し', description: '取り消した操作をやり直します (Ctrl+Y)', triggers: ['やり直し', 'リドゥ'] }
  },
  edit_select_all: {
    'pt-BR': { label: 'Selecionar Tudo', description: 'Seleciona todo o conteúdo (Ctrl+A)', triggers: ['selecionar tudo', 'seleciona tudo'] },
    en: { label: 'Select All', description: 'Selects all content (Ctrl+A)', triggers: ['select all'] },
    es: { label: 'Seleccionar Todo', description: 'Selecciona todo el contenido (Ctrl+A)', triggers: ['seleccionar todo'] },
    fr: { label: 'Tout Sélectionner', description: 'Sélectionne tout le contenu (Ctrl+A)', triggers: ['tout sélectionner'] },
    de: { label: 'Alles Auswählen', description: 'Wählt den gesamten Inhalt aus (Ctrl+A)', triggers: ['alles auswählen'] },
    it: { label: 'Seleziona Tutto', description: 'Seleziona tutto il contenuto (Ctrl+A)', triggers: ['seleziona tutto'] },
    'zh-CN': { label: '全选', description: '全选当前内容 (Ctrl+A)', triggers: ['全选'] },
    ja: { label: 'すべて選択', description: 'すべてのコンテンツを選択します (Ctrl+A)', triggers: ['すべて選択', '全選択'] }
  },
  edit_copy: {
    'pt-BR': { label: 'Copiar', description: 'Copia a seleção (Ctrl+C)', triggers: ['copiar', 'copia'] },
    en: { label: 'Copy', description: 'Copies the selection (Ctrl+C)', triggers: ['copy'] },
    es: { label: 'Copiar', description: 'Copia la selección (Ctrl+C)', triggers: ['copiar'] },
    fr: { label: 'Copier', description: 'Copie la sélection (Ctrl+C)', triggers: ['copier'] },
    de: { label: 'Kopieren', description: 'Kopiert die Auswahl (Ctrl+C)', triggers: ['kopieren'] },
    it: { label: 'Copia', description: 'Copia la selezione (Ctrl+C)', triggers: ['copia'] },
    'zh-CN': { label: '复制', description: '复制选中文本 (Ctrl+C)', triggers: ['复制'] },
    ja: { label: 'コピー', description: '選択範囲をコピーします (Ctrl+C)', triggers: ['コピー'] }
  },
  edit_paste: {
    'pt-BR': { label: 'Colar', description: 'Cola da área de transferência (Ctrl+V)', triggers: ['colar', 'cola'] },
    en: { label: 'Paste', description: 'Pastes from clipboard (Ctrl+V)', triggers: ['paste'] },
    es: { label: 'Pegar', description: 'Pega del portapapeles (Ctrl+V)', triggers: ['pegar'] },
    fr: { label: 'Coller', description: 'Colle depuis le presse-papiers (Ctrl+V)', triggers: ['coller'] },
    de: { label: 'Einfügen', description: 'Fügt aus der Zwischenablage ein (Ctrl+V)', triggers: ['einfügen'] },
    it: { label: 'Incolla', description: 'Incolla dagli appunti (Ctrl+V)', triggers: ['incolla'] },
    'zh-CN': { label: '粘贴', description: '粘贴剪贴板内容 (Ctrl+V)', triggers: ['粘贴'] },
    ja: { label: '貼り付け', description: 'クリップボードから貼り付けます (Ctrl+V)', triggers: ['貼り付け', 'ペースト'] }
  },
  edit_cut: {
    'pt-BR': { label: 'Recortar', description: 'Recorta a seleção (Ctrl+X)', triggers: ['recortar', 'recorta'] },
    en: { label: 'Cut', description: 'Cuts the selection (Ctrl+X)', triggers: ['cut'] },
    es: { label: 'Cortar', description: 'Corta la selección (Ctrl+X)', triggers: ['cortar'] },
    fr: { label: 'Couper', description: 'Coupe la sélection (Ctrl+X)', triggers: ['couper'] },
    de: { label: 'Ausschneiden', description: 'Schneidet die Auswahl aus (Ctrl+X)', triggers: ['ausschneiden'] },
    it: { label: 'Taglia', description: 'Taglia la selezione (Ctrl+X)', triggers: ['taglia'] },
    'zh-CN': { label: '剪切', description: '剪切选中文本 (Ctrl+X)', triggers: ['剪切'] },
    ja: { label: '切り取り', description: '選択範囲を切り取ります (Ctrl+X)', triggers: ['切り取り', 'カット'] }
  },
  edit_bold: {
    'pt-BR': { label: 'Negrito', description: 'Aplica formatação em negrito (Ctrl+B)', triggers: ['negrito'] },
    en: { label: 'Bold', description: 'Applies bold formatting (Ctrl+B)', triggers: ['bold'] },
    es: { label: 'Negrita', description: 'Aplica formato en negrita (Ctrl+B)', triggers: ['negrita'] },
    fr: { label: 'Gras', description: 'Applique le format gras (Ctrl+B)', triggers: ['gras'] },
    de: { label: 'Fett', description: 'Formatiert Text fett (Ctrl+B)', triggers: ['fett'] },
    it: { label: 'Grassetto', description: 'Formatta in grassetto (Ctrl+B)', triggers: ['grassetto'] },
    'zh-CN': { label: '加粗', description: '应用粗体格式 (Ctrl+B)', triggers: ['加粗', '粗体'] },
    ja: { label: '太字', description: 'テキストを太字にします (Ctrl+B)', triggers: ['太字', 'ボールド'] }
  },
  edit_italic: {
    'pt-BR': { label: 'Itálico', description: 'Aplica formatação em itálico (Ctrl+I)', triggers: ['itálico', 'italico'] },
    en: { label: 'Italic', description: 'Applies italic formatting (Ctrl+I)', triggers: ['italic'] },
    es: { label: 'Cursiva', description: 'Aplica formato en cursiva (Ctrl+I)', triggers: ['cursiva', 'itálica'] },
    fr: { label: 'Italique', description: 'Applique le format italique (Ctrl+I)', triggers: ['italique'] },
    de: { label: 'Kursiv', description: 'Formatiert Text kursiv (Ctrl+I)', triggers: ['kursiv'] },
    it: { label: 'Corsivo', description: 'Formatta in corsivo (Ctrl+I)', triggers: ['corsivo'] },
    'zh-CN': { label: '斜体', description: '应用斜体格式 (Ctrl+I)', triggers: ['斜体'] },
    ja: { label: '斜体', description: 'テキストを斜体にします (Ctrl+I)', triggers: ['斜体', 'イタリック'] }
  },
  edit_underline: {
    'pt-BR': { label: 'Sublinhado', description: 'Aplica formatação sublinhada (Ctrl+U)', triggers: ['sublinhado', 'sublinhar'] },
    en: { label: 'Underline', description: 'Applies underline formatting (Ctrl+U)', triggers: ['underline'] },
    es: { label: 'Subrayado', description: 'Aplica formato subrayado (Ctrl+U)', triggers: ['subrayado', 'subrayar'] },
    fr: { label: 'Souligné', description: 'Applique le format souligné (Ctrl+U)', triggers: ['souligné', 'souligner'] },
    de: { label: 'Unterstrichen', description: 'Unterstreicht den Text (Ctrl+U)', triggers: ['unterstrichen'] },
    it: { label: 'Sottolineato', description: 'Formatta con sottolineatura (Ctrl+U)', triggers: ['sottolineato'] },
    'zh-CN': { label: '下划线', description: '添加下划线 (Ctrl+U)', triggers: ['下划线'] },
    ja: { label: '下線', description: '下線を設定します (Ctrl+U)', triggers: ['下線', 'アンダーライン'] }
  },
  edit_save: {
    'pt-BR': { label: 'Salvar', description: 'Salva o arquivo ativo (Ctrl+S)', triggers: ['salvar', 'salva', 'guardar'] },
    en: { label: 'Save', description: 'Saves active document (Ctrl+S)', triggers: ['save'] },
    es: { label: 'Guardar', description: 'Guarda el documento activo (Ctrl+S)', triggers: ['guardar', 'salvar'] },
    fr: { label: 'Enregistrer', description: 'Enregistre le document actif (Ctrl+S)', triggers: ['enregistrer', 'sauvegarder'] },
    de: { label: 'Speichern', description: 'Speichert das aktive Dokument (Ctrl+S)', triggers: ['speichern'] },
    it: { label: 'Salva', description: 'Salva il documento attivo (Ctrl+S)', triggers: ['salva'] },
    'zh-CN': { label: '保存', description: '保存当前文件 (Ctrl+S)', triggers: ['保存'] },
    ja: { label: '保存', description: 'ファイルを保存します (Ctrl+S)', triggers: ['保存', 'セーブ'] }
  },

  // ─── vox_control ─────────────────────────────────────────────────────────────
  vox_stop: {
    'pt-BR': { label: 'Parar Gravação', description: 'Finaliza a gravação de voz', triggers: ['parar gravação', 'terminar gravação', 'para gravação', 'para'] },
    en: { label: 'Stop Recording', description: 'Stops and finalizes voice recording', triggers: ['stop recording', 'stop', 'finish recording', 'done'] },
    es: { label: 'Detener Grabación', description: 'Finaliza la grabación de voz', triggers: ['detener grabación', 'parar grabación', 'para'] },
    fr: { label: 'Arrêter l’Enregistrement', description: 'Termine l’enregistrement vocal', triggers: ['arrêter enregistrement', 'stop', 'terminé'] },
    de: { label: 'Aufnahme Stoppen', description: 'Beendet die Sprachaufnahme', triggers: ['aufnahme stoppen', 'stopp', 'fertig'] },
    it: { label: 'Interrompi Registrazione', description: 'Termina la registrazione vocale', triggers: ['interrompi registrazione', 'stop', 'fine'] },
    'zh-CN': { label: '停止录音', description: '结束语音录制并开始转写', triggers: ['停止录音', '完成录音', '结束'] },
    ja: { label: '録音停止', description: '録音を終了して確定します', triggers: ['録音停止', 'ストップ', '完了'] }
  },
  vox_cancel: {
    'pt-BR': { label: 'Cancelar', description: 'Para a gravação e descarta a transcrição sem injetar', triggers: ['cancelar', 'cancela', 'descartar', 'descarta'] },
    en: { label: 'Cancel', description: 'Stops recording and discards the transcription without injecting', triggers: ['cancel', 'abort', 'discard', 'never mind'] },
    es: { label: 'Cancelar', description: 'Detiene la grabación y descarta la transcripción', triggers: ['cancelar', 'descartar', 'abortar'] },
    fr: { label: 'Annuler', description: 'Arrête l’enregistrement et supprime la transcription', triggers: ['annuler', 'rejeter', 'abandonner'] },
    de: { label: 'Abbrechen', description: 'Stoppt die Aufnahme und verwirft den Text', triggers: ['abbrechen', 'verwerfen'] },
    it: { label: 'Annulla', description: 'Ferma la registrazione e scarta la trascrizione', triggers: ['annulla', 'scarta', 'abbandona'] },
    'zh-CN': { label: '取消录音', description: '放弃本次录音且不输入文本', triggers: ['取消', '放弃录音', '作废'] },
    ja: { label: 'キャンセル', description: '録音を中断してテキストを破棄します', triggers: ['キャンセル', '破棄', '取り消し'] }
  },
  vox_clear: {
    'pt-BR': { label: 'Limpar', description: 'Limpa o buffer de transcrição atual sem parar', triggers: ['limpar', 'limpa'] },
    en: { label: 'Clear', description: 'Clears the current transcription buffer without stopping', triggers: ['clear'] },
    es: { label: 'Limpiar', description: 'Limpia el búfer de transcripción actual', triggers: ['limpiar'] },
    fr: { label: 'Effacer', description: 'Vide le tampon de transcription sans arrêter', triggers: ['effacer', 'vider'] },
    de: { label: 'Leeren', description: 'Leert den aktuellen Transkriptionspuffer', triggers: ['leeren'] },
    it: { label: 'Pulisci', description: 'Pulisce il buffer di trascrizione attuale', triggers: ['pulisci'] },
    'zh-CN': { label: '清空缓冲区', description: '清空当前转写缓冲区', triggers: ['清空', '清除'] },
    ja: { label: 'クリア', description: '現在の認識バッファをクリアします', triggers: ['クリア'] }
  },
  vox_repeat: {
    'pt-BR': { label: 'Repetir', description: 'Reinserir a última transcrição bem-sucedida', triggers: ['repetir', 'repete', 'dizer novamente', 'diz novamente'] },
    en: { label: 'Repeat', description: 'Re-injects the last successful transcription', triggers: ['repeat', 'say again', 'again'] },
    es: { label: 'Repetir', description: 'Vuelve a insertar la última transcripción correcta', triggers: ['repetir', 'decir de nuevo'] },
    fr: { label: 'Répéter', description: 'Réinsère la dernière transcription réussie', triggers: ['répéter', 'redire'] },
    de: { label: 'Wiederholen', description: 'Fügt die letzte erfolgreiche Transkription erneut ein', triggers: ['wiederholen', 'nochmal'] },
    it: { label: 'Ripeti', description: 'Reinserisce l’ultima trascrizione completata', triggers: ['ripeti', 'di nuovo'] },
    'zh-CN': { label: '重复输入', description: '重新注入上一次成功的转写内容', triggers: ['重复', '再说一遍', '重新输入'] },
    ja: { label: 'リピート', description: '直前の文字起こし結果を再入力します', triggers: ['もう一度', 'リピート', '繰り返す'] }
  },
  vox_mode_code: {
    'pt-BR': { label: 'Modo Código', description: 'Ativa o perfil de digitação de código', triggers: ['modo código', 'modo codigo', 'ativar modo código'] },
    en: { label: 'Code Mode', description: 'Switches to code transcription mode', triggers: ['code mode', 'coding mode', 'switch to code'] },
    es: { label: 'Modo Código', description: 'Cambia al modo de código', triggers: ['modo código', 'modo codigo'] },
    fr: { label: 'Mode Code', description: 'Active le mode de transcription de code', triggers: ['mode code'] },
    de: { label: 'Code-Modus', description: 'Wechselt in den Code-Transkriptionsmodus', triggers: ['code-modus', 'programmiermodus'] },
    it: { label: 'Modalità Codice', description: 'Attiva la modalità codice', triggers: ['modalità codice'] },
    'zh-CN': { label: '代码模式', description: '切换至代码专用转写模式', triggers: ['代码模式', '编程模式'] },
    ja: { label: 'コードモード', description: 'コード入力モードに切り替えます', triggers: ['コードモード', 'プログラムモード'] }
  },
  vox_mode_text: {
    'pt-BR': { label: 'Modo Texto', description: 'Ativa o perfil de ditado geral em prosa', triggers: ['modo texto', 'modo prosa', 'ativar modo texto'] },
    en: { label: 'Text Mode', description: 'Switches to prose/general text mode', triggers: ['text mode', 'prose mode', 'switch to text'] },
    es: { label: 'Modo Texto', description: 'Cambia al modo de texto general', triggers: ['modo texto', 'modo prosa'] },
    fr: { label: 'Mode Texte', description: 'Active le mode texte général', triggers: ['mode texte'] },
    de: { label: 'Text-Modus', description: 'Wechselt in den Standard-Textmodus', triggers: ['text-modus'] },
    it: { label: 'Modalità Testo', description: 'Attiva la modalità testo normale', triggers: ['modalità testo'] },
    'zh-CN': { label: '文本模式', description: '切换至通用文本转写模式', triggers: ['文本模式', '普通模式'] },
    ja: { label: 'テキストモード', description: '通常の文章入力モードに切り替えます', triggers: ['テキストモード'] }
  },
  vox_mode_email: {
    'pt-BR': { label: 'Modo Email', description: 'Ativa o perfil de redação de e-mails', triggers: ['modo email', 'modo e-mail', 'ativar modo email'] },
    en: { label: 'Email Mode', description: 'Switches to email dictation mode', triggers: ['email mode', 'switch to email'] },
    es: { label: 'Modo Correo', description: 'Cambia al modo de redacción de correos', triggers: ['modo correo', 'modo email'] },
    fr: { label: 'Mode E-mail', description: 'Active le mode de rédaction d’e-mails', triggers: ['mode email', 'mode courriel'] },
    de: { label: 'E-Mail-Modus', description: 'Wechselt in den E-Mail-Modus', triggers: ['e-mail-modus'] },
    it: { label: 'Modalità Email', description: 'Attiva la modalità email', triggers: ['modalità email'] },
    'zh-CN': { label: '邮件模式', description: '切换至邮件书写模式', triggers: ['邮件模式', '写信模式'] },
    ja: { label: 'メールモード', description: 'メール作成モードに切り替えます', triggers: ['メールモード'] }
  },
  template_deactivate: {
    'pt-BR': { label: 'Desativar Template', description: 'Retorna ao modo de ditado padrão', triggers: ['desativar template', 'sem template', 'ditado livre', 'modo padrão'] },
    en: { label: 'Deactivate Template', description: 'Switches back to standard dictation', triggers: ['deactivate template', 'no template', 'free dictation', 'default mode'] },
    es: { label: 'Desactivar Plantilla', description: 'Vuelve al dictado estándar', triggers: ['desactivar plantilla', 'sin plantilla', 'modo estándar'] },
    fr: { label: 'Désactiver Modèle', description: 'Revient à la dictée standard', triggers: ['désactiver modèle', 'sans modèle', 'mode par défaut'] },
    de: { label: 'Vorlage Deaktivieren', description: 'Kehrt zum Standard-Diktat zurück', triggers: ['vorlage deaktivieren', 'ohne vorlage'] },
    it: { label: 'Disattiva Modello', description: 'Torna alla dettatura standard', triggers: ['disattiva modello', 'senza modello'] },
    'zh-CN': { label: '停用模板', description: '恢复为默认自由听写模式', triggers: ['停用模板', '关闭模板', '默认模式'] },
    ja: { label: 'テンプレート解除', description: '標準の自由入力モードに戻します', triggers: ['テンプレート解除', '通常モード'] }
  },

  // ─── system ─────────────────────────────────────────────────────────────
  snippet_date: {
    'pt-BR': { label: 'Inserir Data', description: 'Insere a data atual', triggers: ['inserir data', 'insere data', 'data de hoje'] },
    en: { label: 'Insert Date', description: 'Inserts current date', triggers: ['insert date', "today's date", 'current date'] },
    es: { label: 'Insertar Fecha', description: 'Inserta la fecha actual', triggers: ['insertar fecha', 'fecha de hoy'] },
    fr: { label: 'Insérer la Date', description: 'Insère la date du jour', triggers: ['insérer la date', "date d'aujourd'hui"] },
    de: { label: 'Datum Einfügen', description: 'Fügt das heutige Datum ein', triggers: ['datum einfügen', 'heutiges datum'] },
    it: { label: 'Inserisci Data', description: 'Inserisce la data odierna', triggers: ['inserisci data', 'data di oggi'] },
    'zh-CN': { label: '插入日期', description: '插入当前日期', triggers: ['插入日期', '今天日期'] },
    ja: { label: '日付を挿入', description: '今日の日付を挿入します', triggers: ['日付を挿入', '今日の日付'] }
  },
  snippet_time: {
    'pt-BR': { label: 'Inserir Hora', description: 'Insere a hora atual', triggers: ['inserir hora', 'insere hora', 'hora atual'] },
    en: { label: 'Insert Time', description: 'Inserts current time', triggers: ['insert time', 'current time'] },
    es: { label: 'Insertar Hora', description: 'Inserta la hora actual', triggers: ['insertar hora', 'hora actual'] },
    fr: { label: 'Insérer l’Heure', description: 'Insère l’heure actuelle', triggers: ['insérer l’heure', 'heure actuelle'] },
    de: { label: 'Uhrzeit Einfügen', description: 'Fügt die aktuelle Uhrzeit ein', triggers: ['uhrzeit einfügen', 'aktuelle uhrzeit'] },
    it: { label: 'Inserisci Ora', description: 'Inserisce l’ora attuale', triggers: ['inserisci ora', 'ora attuale'] },
    'zh-CN': { label: '插入时间', description: '插入当前时间', triggers: ['插入时间', '现在时间'] },
    ja: { label: '時刻を挿入', description: '現在の時刻を挿入します', triggers: ['時刻を挿入', '現在の時刻'] }
  },
  snippet_datetime: {
    'pt-BR': { label: 'Inserir Data e Hora', description: 'Insere data e hora atuais', triggers: ['inserir data e hora', 'data e hora'] },
    en: { label: 'Insert Date and Time', description: 'Inserts date and time', triggers: ['insert date and time', 'datetime'] },
    es: { label: 'Insertar Fecha y Hora', description: 'Inserta la fecha y hora actuales', triggers: ['insertar fecha y hora'] },
    fr: { label: 'Insérer Date et Heure', description: 'Insère la date et l’heure actuelles', triggers: ['insérer date et heure'] },
    de: { label: 'Datum und Uhrzeit', description: 'Fügt Datum und Uhrzeit ein', triggers: ['datum und uhrzeit einfügen'] },
    it: { label: 'Inserisci Data e Ora', description: 'Inserisce data e ora attuali', triggers: ['inserisci data e ora'] },
    'zh-CN': { label: '插入日期时间', description: '插入当前的日期与时间', triggers: ['插入日期和时间', '日期时间'] },
    ja: { label: '日時を挿入', description: '現在の日時を挿入します', triggers: ['日時を挿入', '現在の日時'] }
  },
  sys_terminal: {
    'pt-BR': { label: 'Abrir Terminal', description: 'Abre o terminal do sistema', triggers: ['abrir terminal', 'abre terminal'] },
    en: { label: 'Open Terminal', description: 'Opens system terminal / console', triggers: ['open terminal', 'open console'] },
    es: { label: 'Abrir Terminal', description: 'Abre la terminal del sistema', triggers: ['abrir terminal'] },
    fr: { label: 'Ouvrir le Terminal', description: 'Ouvre le terminal système', triggers: ['ouvrir le terminal'] },
    de: { label: 'Terminal Öffnen', description: 'Öffnet das Terminal', triggers: ['terminal öffnen'] },
    it: { label: 'Apri Terminale', description: 'Apre il terminale di sistema', triggers: ['apri terminale'] },
    'zh-CN': { label: '打开终端', description: '打开系统终端命令行', triggers: ['打开终端', '启动终端'] },
    ja: { label: 'ターミナルを開く', description: 'ターミナルを起動します', triggers: ['ターミナルを開く'] }
  },
  sys_browser: {
    'pt-BR': { label: 'Abrir Navegador', description: 'Abre o navegador de internet padrão', triggers: ['abrir navegador', 'abre navegador', 'abrir browser'] },
    en: { label: 'Open Browser', description: 'Opens default web browser', triggers: ['open browser', 'open web browser'] },
    es: { label: 'Abrir Navegador', description: 'Abre el navegador web predeterminado', triggers: ['abrir navegador'] },
    fr: { label: 'Ouvrir le Navigateur', description: 'Ouvre le navigateur web par défaut', triggers: ['ouvrir le navigateur'] },
    de: { label: 'Browser Öffnen', description: 'Öffnet den Standard-Webbrowser', triggers: ['browser öffnen'] },
    it: { label: 'Apri Browser', description: 'Apre il browser web predefinito', triggers: ['apri browser'] },
    'zh-CN': { label: '打开浏览器', description: '打开默认网页浏览器', triggers: ['打开浏览器'] },
    ja: { label: 'ブラウザを開く', description: '標準のWebブラウザを起動します', triggers: ['ブラウザを開く'] }
  },
  sys_explorer: {
    'pt-BR': { label: 'Abrir Explorador', description: 'Abre o gerenciador de arquivos', triggers: ['abrir explorador', 'abrir arquivos', 'abrir pasta'] },
    en: { label: 'Open File Explorer', description: 'Opens file explorer or finder', triggers: ['open explorer', 'open file explorer', 'open finder'] },
    es: { label: 'Abrir Explorador', description: 'Abre el explorador de archivos', triggers: ['abrir explorador', 'abrir archivos'] },
    fr: { label: 'Ouvrir l’Explorateur', description: 'Ouvre le gestionnaire de fichiers', triggers: ['ouvrir l’explorateur', 'ouvrir les dossiers'] },
    de: { label: 'Explorer Öffnen', description: 'Öffnet den Dateimanager', triggers: ['explorer öffnen', 'dateimanager öffnen'] },
    it: { label: 'Apri Esplora File', description: 'Apre la gestione file', triggers: ['apri esplora file', 'apri cartelle'] },
    'zh-CN': { label: '打开文件资源管理器', description: '打开文件浏览器或目录', triggers: ['打开文件管理器', '打开资源管理器'] },
    ja: { label: 'エクスプローラーを開く', description: 'ファイルエクスプローラーまたはFinderを起動します', triggers: ['エクスプローラーを開く', 'Finderを開く'] }
  },
  sys_screenshot: {
    'pt-BR': { label: 'Tirar Print', description: 'Captura a tela do sistema (PrintScreen)', triggers: ['tirar print', 'tira print', 'captura de tela', 'screenshot'] },
    en: { label: 'Take Screenshot', description: 'Captures screen (PrintScreen)', triggers: ['take screenshot', 'screenshot', 'print screen'] },
    es: { label: 'Hacer Captura', description: 'Captura la pantalla (PrintScreen)', triggers: ['hacer captura', 'captura de pantalla', 'screenshot'] },
    fr: { label: 'Capture d’Écran', description: 'Effectue une capture d’écran (PrintScreen)', triggers: ['capture d’écran', 'faire une capture'] },
    de: { label: 'Screenshot Machen', description: 'Erstellt ein Bildschirmfoto (PrintScreen)', triggers: ['screenshot machen', 'bildschirmfoto'] },
    it: { label: 'Cattura Schermata', description: 'Cattura la schermata (PrintScreen)', triggers: ['cattura schermata', 'screenshot'] },
    'zh-CN': { label: '截屏', description: '执行屏幕截图 (PrintScreen)', triggers: ['截屏', '截图', '抓屏'] },
    ja: { label: 'スクリーンショット', description: '画面キャプチャを実行します (PrintScreen)', triggers: ['スクリーンショット', '画面キャプチャ'] }
  },
  sys_open: {
    'pt-BR': { label: 'Abrir Aplicativo', description: 'Abre qualquer aplicativo ou site pelo nome (ex.: "abrir chrome", "abrir vs code")', triggers: ['abrir', 'abre', 'abra', 'iniciar', 'executar'] },
    en: { label: 'Open Application', description: 'Opens any application or website by name (e.g. "open chrome", "open vs code")', triggers: ['open', 'launch', 'start'] },
    es: { label: 'Abrir Aplicación', description: 'Abre cualquier aplicación o web por nombre (ej.: "abrir chrome")', triggers: ['abrir', 'iniciar', 'ejecutar'] },
    fr: { label: 'Ouvrir l’Application', description: 'Ouvre une application ou un site par son nom (ex. "ouvrir chrome")', triggers: ['ouvrir', 'lancer', 'démarrer'] },
    de: { label: 'Programm Öffnen', description: 'Öffnet jede App oder Website nach Namen (z.B. "öffne chrome")', triggers: ['öffnen', 'starte', 'ausführen'] },
    it: { label: 'Apri Applicazione', description: 'Apre qualsiasi app o sito per nome (es. "apri chrome")', triggers: ['apri', 'avvia', 'esegui'] },
    'zh-CN': { label: '打开应用程序', description: '按名称打开任何程序或网址 (如 "打开 Chrome")', triggers: ['打开', '启动', '运行'] },
    ja: { label: 'アプリを開く', description: 'アプリやWebサイトを名前で起動します (例:「Chromeを開く」)', triggers: ['開く', '起動', '実行'] }
  },
  sys_search_youtube: {
    'pt-BR': { label: 'Pesquisar no YouTube', description: 'Pesquisa no YouTube o que você disser', triggers: ['pesquisar no youtube', 'buscar no youtube', 'youtube'] },
    en: { label: 'Search on YouTube', description: 'Searches YouTube for whatever you say', triggers: ['search on youtube', 'youtube search', 'youtube'] },
    es: { label: 'Buscar en YouTube', description: 'Busca en YouTube lo que digas', triggers: ['buscar en youtube', 'youtube'] },
    fr: { label: 'Rechercher sur YouTube', description: 'Recherche sur YouTube vos paroles', triggers: ['rechercher sur youtube', 'youtube'] },
    de: { label: 'Auf YouTube Suchen', description: 'Sucht auf YouTube nach deinen Worten', triggers: ['auf youtube suchen', 'youtube'] },
    it: { label: 'Cerca su YouTube', description: 'Cerca su YouTube ciò che pronunci', triggers: ['cerca su youtube', 'youtube'] },
    'zh-CN': { label: '在 YouTube 搜索', description: '在 YouTube 上搜索你所说的内容', triggers: ['在youtube搜索', '搜索youtube', 'youtube'] },
    ja: { label: 'YouTubeで検索', description: '発話した内容をYouTubeで検索します', triggers: ['YouTubeで検索', 'ユーチューブで検索'] }
  },
  sys_search: {
    'pt-BR': { label: 'Pesquisar na Web', description: 'Pesquisa na web o que você disser', triggers: ['pesquisar por', 'pesquisar', 'buscar por', 'buscar'] },
    en: { label: 'Web Search', description: 'Searches the web for whatever you say', triggers: ['search for', 'search', 'google', 'look up'] },
    es: { label: 'Buscar en la Web', description: 'Busca en la web lo que digas', triggers: ['buscar en la web', 'buscar por', 'buscar', 'googlear'] },
    fr: { label: 'Rechercher sur le Web', description: 'Recherche sur le web vos paroles', triggers: ['rechercher sur le web', 'rechercher', 'chercher'] },
    de: { label: 'Im Web Suchen', description: 'Sucht im Web nach deinen Worten', triggers: ['im web suchen', 'suchen nach', 'suchen', 'googeln'] },
    it: { label: 'Cerca sul Web', description: 'Cerca sul web ciò que pronunci', triggers: ['cerca sul web', 'cerca per', 'cerca'] },
    'zh-CN': { label: '网页搜索', description: '在网络上搜索你所说的内容', triggers: ['网页搜索', '搜索', '查找', '谷歌搜索'] },
    ja: { label: 'Web検索', description: '発話した内容をGoogleで検索します', triggers: ['Web検索', '検索', 'ググる', 'Google検索'] }
  }
}
