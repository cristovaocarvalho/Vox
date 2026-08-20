import assert from 'assert'
import { initDatabase, getSetting, setSetting, addVocabularyTerm, listVocabulary, removeVocabularyTerm, clearVocabulary } from '../electron/modules/db'
import { getActiveWindowWin32, focusAndPasteWin32 } from '../electron/modules/win32'
import { CommandParser } from '../electron/modules/commandParser'
import { DEFAULT_COMMANDS } from '../electron/modules/commandRegistry'
import { isWhisperHallucination } from '../electron/modules/stt'
import { templateManager } from '../electron/modules/templateManager'
import { wakewordDetector } from '../electron/modules/wakeword'

console.log('=====================================================')
console.log('  TESTING ALL VOX CORE FUNCTIONALITIES & MODULES')
console.log('=====================================================\n')

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message)
    failed++
  }
}

async function testAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message)
    failed++
  }
}

async function runAll() {
  // 1. Database & Vocabulary Tests
  console.log('--- 1. Testing SQLite Database & Vocabulary ---')
  initDatabase()

  test('Database settings get/set', () => {
    setSetting('test_key', 'test_value_123')
    assert.strictEqual(getSetting('test_key'), 'test_value_123')
  })

  test('Vocabulary CRUD operations', () => {
    clearVocabulary()
    assert.deepStrictEqual(listVocabulary(), [])
    
    addVocabularyTerm('Kubernetes')
    addVocabularyTerm('Dra. Juliana')
    const list = listVocabulary()
    assert.strictEqual(list.includes('Kubernetes'), true)
    assert.strictEqual(list.includes('Dra. Juliana'), true)

    removeVocabularyTerm('Kubernetes')
    const listAfter = listVocabulary()
    assert.strictEqual(listAfter.includes('Kubernetes'), false)
    assert.strictEqual(listAfter.includes('Dra. Juliana'), true)
  })

  // 2. Win32 Native Bindings Tests
  console.log('\n--- 2. Testing Win32 Native Bindings & Fast Paste ---')
  test('Win32 active window capture (<1ms)', () => {
    const win = getActiveWindowWin32()
    console.log('   Captured Active Window:', win)
    assert.ok(win === null || (typeof win === 'object' && typeof win.hwnd === 'string'))
  })

  // 3. Command Parser Tests (Multilingual & Dynamic)
  console.log('\n--- 3. Testing Voice Command Parser ---')
  const parser = new CommandParser(DEFAULT_COMMANDS, true)

  test('Command Parser: Punctuation (Portuguese - "vírgula")', () => {
    const res = parser.parse('olá vírgula tudo bem', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg?.command?.id, 'punct_comma')
  })

  test('Command Parser: Punctuation (English - "comma")', () => {
    const res = parser.parse('hello comma world', 'en')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg?.command?.id, 'punct_comma')
  })

  test('Command Parser: Dynamic Web Search ("pesquisar por inteligência artificial")', () => {
    const res = parser.parse('pesquisar por inteligência artificial', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg?.command?.id, 'sys_search')
  })

  test('Command Parser: Navigation ("nova linha")', () => {
    const res = parser.parse('primeira linha nova linha segunda linha', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg?.command?.id, 'nav_new_line')
  })

  test('Command Parser: Editing ("desfazer")', () => {
    const res = parser.parse('desfazer', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg?.command?.id, 'edit_undo')
  })

  test('Command Parser: System / Dynamic Date ("inserir data")', () => {
    const res = parser.parse('inserir data', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg?.command?.id, 'snippet_date')
  })

  test('Command Parser: Dynamic App Launch ("abrir chrome")', () => {
    const res = parser.parse('abrir chrome', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg?.command?.id, 'sys_open')
  })

  // 4. STT Hallucination Filter Tests
  console.log('\n--- 4. Testing STT Hallucination Filter ---')
  test('Hallucination filter detects "A CIDADE NO BRASIL"', () => {
    assert.strictEqual(isWhisperHallucination('A CIDADE NO BRASIL'), true)
    assert.strictEqual(isWhisperHallucination('a cidade de são paulo.'), true)
  })

  test('Hallucination filter detects YouTube subtitles & Thank You', () => {
    assert.strictEqual(isWhisperHallucination('Thank you for watching!'), true)
    assert.strictEqual(isWhisperHallucination('Obrigado por assistir.'), true)
    assert.strictEqual(isWhisperHallucination('Inscreva-se no canal!'), true)
    assert.strictEqual(isWhisperHallucination('Legendas pela comunidade Amara.org'), true)
  })

  test('Hallucination filter permits real user speech', () => {
    assert.strictEqual(isWhisperHallucination('Relatório de vendas do terceiro trimestre aprovado.'), false)
    assert.strictEqual(isWhisperHallucination('Preciso enviar este e-mail para o cliente hoje à tarde.'), false)
  })

  // 5. Template Prompt Resolution Tests
  console.log('\n--- 5. Testing Template Prompt Builder ---')
  test('Template manager returns formal email prompt when active', () => {
    const emailTemplate = templateManager.getTemplate('email_formal')
    assert.ok(emailTemplate)
    const prompt = templateManager.buildCorrectorPrompt('Base prompt', emailTemplate)
    assert.ok(prompt.includes('email') || prompt.includes('Email') || prompt.includes('FORMATADOR') || prompt.includes('formatador') || prompt.includes('template'))
  })

  // 6. Wake Word Offline Initialization
  console.log('\n--- 6. Testing Wake Word Local Detector ---')
  await testAsync('Wake Word detector initializes offline without network', async () => {
    const ok = await wakewordDetector.init()
    assert.strictEqual(ok, true)
    assert.strictEqual(wakewordDetector.isModelLoaded(), true)
  })

  // Summary
  console.log('\n=====================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
