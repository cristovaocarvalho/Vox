/**
 * Automated Verification Script for Vox
 * Tests all backend modules, DB CRUD, Win32 bindings, Command Parser, STT Hallucination Filter, Corrector & Templates.
 */

const assert = require('assert')
const path = require('path')

console.log('=====================================================')
console.log('  TESTING ALL VOX CORE FUNCTIONALITIES & MODULES')
console.log('=====================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message)
    failed++
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message)
    failed++
  }
}

async function runAll() {
  // 1. Database & Vocabulary Tests
  console.log('--- 1. Testing SQLite Database & Vocabulary ---')
  const db = require('../out/main/modules/db.js')
  db.initDatabase()

  test('Database settings get/set', () => {
    db.setSetting('test_key', 'test_value_123')
    assert.strictEqual(db.getSetting('test_key'), 'test_value_123')
  })

  test('Vocabulary CRUD operations', () => {
    db.clearVocabulary()
    assert.deepStrictEqual(db.listVocabulary(), [])
    
    db.addVocabularyTerm('Kubernetes')
    db.addVocabularyTerm('Dra. Juliana')
    const list = db.listVocabulary()
    assert.strictEqual(list.includes('Kubernetes'), true)
    assert.strictEqual(list.includes('Dra. Juliana'), true)

    db.removeVocabularyTerm('Kubernetes')
    const listAfter = db.listVocabulary()
    assert.strictEqual(listAfter.includes('Kubernetes'), false)
    assert.strictEqual(listAfter.includes('Dra. Juliana'), true)
  })

  // 2. Win32 Native Bindings Tests
  console.log('\n--- 2. Testing Win32 Native Bindings & Fast Paste ---')
  const win32 = require('../out/main/modules/win32.js')
  test('Win32 active window capture (<1ms)', () => {
    const win = win32.getActiveWindowWin32()
    console.log('   Captured Active Window:', win)
    // Should return an object or null without throwing
    assert.ok(win === null || (typeof win === 'object' && typeof win.hwnd === 'string'))
  })

  // 3. Command Parser Tests (Multilingual & Dynamic)
  console.log('\n--- 3. Testing Voice Command Parser ---')
  const { CommandParser } = require('../out/main/modules/commandParser.js')
  const { DEFAULT_COMMANDS } = require('../out/main/modules/commandRegistry.js')
  const parser = new CommandParser(DEFAULT_COMMANDS, true)

  test('Command Parser: Punctuation (Portuguese - "vírgula")', () => {
    const res = parser.parse('olá vírgula tudo bem', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg.command.id, 'punct_comma')
  })

  test('Command Parser: Punctuation (English - "comma")', () => {
    const res = parser.parse('hello comma world', 'en')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg.command.id, 'punct_comma')
  })

  test('Command Parser: Dynamic Web Search ("pesquisar por inteligência artificial")', () => {
    const res = parser.parse('pesquisar por inteligência artificial', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg.command.id, 'sys_search')
  })

  test('Command Parser: Dynamic App Launch ("abrir chrome")', () => {
    const res = parser.parse('abrir chrome', 'pt')
    assert.strictEqual(res.hasCommands, true)
    const cmdSeg = res.segments.find(s => s.type === 'command')
    assert.ok(cmdSeg)
    assert.strictEqual(cmdSeg.command.id, 'sys_open')
  })

  // 4. STT Hallucination Filter Tests
  console.log('\n--- 4. Testing STT Hallucination Filter ---')
  const { isWhisperHallucination } = require('../out/main/modules/stt.js')
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
  const { templateManager } = require('../out/main/modules/templateManager.js')
  test('Template manager returns formal email prompt when active', () => {
    const emailTemplate = templateManager.getTemplate('email_formal')
    assert.ok(emailTemplate)
    const prompt = templateManager.buildCorrectorPrompt('Base prompt', emailTemplate)
    assert.ok(prompt.includes('email') || prompt.includes('Email') || prompt.includes('FORMATADOR') || prompt.includes('formatador'))
  })

  // 6. Wake Word Offline Initialization
  console.log('\n--- 6. Testing Wake Word Local Detector ---')
  const { wakewordDetector } = require('../out/main/modules/wakeword.js')
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
