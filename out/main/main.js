"use strict";
const path = require("path");
const events = require("events");
const fs = require("fs");
const crypto = require("crypto");
const child_process = require("child_process");
const electronUpdater = require("electron-updater");
const util = require("util");
class AudioRecorder extends events.EventEmitter {
  isRecording = false;
  chunks = [];
  vadThreshold = 0.02;
  // Limiar de energia RMS para fala
  autoStopOnSilence = false;
  hasSpoken = false;
  silenceTimer = null;
  silenceDurationMs = 1500;
  // 1.5s de silêncio para encerramento automático
  totalLength = 0;
  startRecording(options) {
    this.isRecording = true;
    this.chunks = [];
    this.totalLength = 0;
    if (options?.autoStopOnSilence !== void 0) {
      this.autoStopOnSilence = options.autoStopOnSilence;
    }
    this.hasSpoken = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    console.log("[Recorder] Iniciando gravação PCM 16kHz mono...", options?.autoStopOnSilence ? "(Auto-stop ativo)" : "");
    this.emit("start");
  }
  processAudioChunk(chunk) {
    if (!this.isRecording) return { energy: 0, isSpeech: false };
    this.chunks.push(chunk);
    this.totalLength += chunk.length;
    const energy = this.calculateRmsEnergy(chunk);
    const isSpeech = energy > this.vadThreshold;
    this.reportSpeech(isSpeech);
    this.emit("energy", { energy, isSpeech });
    return { energy, isSpeech };
  }
  reportSpeech(isSpeech) {
    if (!this.isRecording) return;
    if (isSpeech) {
      this.hasSpoken = true;
    }
    if (!this.autoStopOnSilence) return;
    if (isSpeech) {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (!this.silenceTimer) {
      this.silenceTimer = setTimeout(() => {
        console.log("[Recorder] 🛑 Silêncio detectado, encerrando gravação automaticamente...");
        this.emit("auto-stop");
      }, this.silenceDurationMs);
    }
  }
  getHasSpoken() {
    return this.hasSpoken;
  }
  stopRecording() {
    this.isRecording = false;
    this.autoStopOnSilence = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    console.log("[Recorder] Parando gravação...");
    this.emit("stop");
    const pcmData = Buffer.concat(this.chunks, this.totalLength);
    this.chunks = [];
    if (pcmData.length === 0) {
      return Buffer.alloc(0);
    }
    return this.createWavBuffer(pcmData);
  }
  getIsRecording() {
    return this.isRecording;
  }
  setVadThreshold(threshold) {
    this.vadThreshold = threshold;
  }
  calculateRmsEnergy(buffer) {
    if (buffer.length < 2) return 0;
    let sumSquares = 0;
    const sampleCount = Math.floor(buffer.length / 2);
    for (let i = 0; i < sampleCount; i++) {
      const sample = buffer.readInt16LE(i * 2);
      const normalized = sample / 32768;
      sumSquares += normalized * normalized;
    }
    return Math.sqrt(sumSquares / sampleCount);
  }
  createWavBuffer(pcmData, sampleRate = 16e3, channels = 1, bitDepth = 16) {
    const header = Buffer.alloc(44);
    const dataSize = pcmData.length;
    const fileSize = dataSize + 36;
    header.write("RIFF", 0);
    header.writeUInt32LE(fileSize, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    header.writeUInt16LE(channels * (bitDepth / 8), 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcmData]);
  }
}
const recorder = new AudioRecorder();
const { app: app$2, safeStorage } = require("electron");
let Database = null;
try {
  Database = require("better-sqlite3");
} catch (e) {
  console.warn("[DB] Módulo nativo better-sqlite3 não encontrado, usando fallback seguro:", e);
}
let dbInstance = null;
let fallbackFileSettings = null;
let fallbackFileSessions = null;
let fallbackFileApiLogs = null;
let fallbackFileCorrections = null;
let fallbackFileVocabulary = null;
let fallbackFileCommands = null;
let fallbackFileSnippets = null;
let fallbackFileOverrides = null;
let fallbackFileTemplates = null;
const stmtCache = /* @__PURE__ */ new Map();
function encryptValue(plainText) {
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plainText);
      return "scrypt:" + encrypted.toString("hex");
    }
  } catch (e) {
    console.warn("[DB] Falha ao encriptar com safeStorage:", e);
  }
  return "plaintext:" + plainText;
}
function decryptValue(storedValue) {
  if (storedValue.startsWith("scrypt:")) {
    try {
      const hex = storedValue.substring(7);
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(Buffer.from(hex, "hex"));
        return decrypted;
      }
    } catch (e) {
      console.error("[DB] Falha ao decriptar valor do safeStorage:", e);
    }
    return "";
  }
  if (storedValue.startsWith("plaintext:")) {
    return storedValue.substring(10);
  }
  return storedValue;
}
function cachedStmt(sql) {
  if (!dbInstance) return null;
  let stmt = stmtCache.get(sql);
  if (!stmt) {
    stmt = dbInstance.prepare(sql);
    stmtCache.set(sql, stmt);
  }
  return stmt;
}
function initDatabase() {
  try {
    const userDataPath = app$2.getPath("userData");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const dbPath = path.join(userDataPath, "vox_settings.db");
    fallbackFileSettings = path.join(userDataPath, "vox_settings.json");
    fallbackFileSessions = path.join(userDataPath, "vox_sessions.json");
    fallbackFileApiLogs = path.join(userDataPath, "vox_api_logs.json");
    fallbackFileCorrections = path.join(userDataPath, "vox_corrections.json");
    fallbackFileVocabulary = path.join(userDataPath, "vox_vocabulary.json");
    fallbackFileCommands = path.join(userDataPath, "vox_commands.json");
    fallbackFileSnippets = path.join(userDataPath, "vox_snippets.json");
    fallbackFileOverrides = path.join(userDataPath, "vox_command_overrides.json");
    fallbackFileTemplates = path.join(userDataPath, "vox_templates.json");
    if (Database) {
      dbInstance = new Database(dbPath);
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id          TEXT PRIMARY KEY,
          type        TEXT NOT NULL,
          title       TEXT,
          source      TEXT,
          platform    TEXT,
          model       TEXT,
          language    TEXT,
          duration    REAL,
          text        TEXT,
          rawText     TEXT,
          segments    TEXT,
          exportPaths TEXT,
          audioKept   INTEGER DEFAULT 0,
          createdAt   TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS api_logs (
          id         TEXT PRIMARY KEY,
          createdAt  TEXT NOT NULL,
          provider   TEXT,
          endpoint   TEXT,
          operation  TEXT,
          model      TEXT,
          bytesSent  INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS corrections (
          raw       TEXT NOT NULL,
          corrected TEXT NOT NULL,
          count     INTEGER DEFAULT 0,
          PRIMARY KEY (raw, corrected)
        );

        CREATE TABLE IF NOT EXISTS vocabulary (
          term      TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS custom_commands (
          id          TEXT PRIMARY KEY,
          label       TEXT NOT NULL,
          description TEXT,
          category    TEXT DEFAULT 'custom',
          trigger_pt  TEXT NOT NULL,
          trigger_en  TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_param TEXT NOT NULL,
          match_mode  TEXT DEFAULT 'isolated',
          is_enabled  INTEGER DEFAULT 1,
          created_at  TEXT NOT NULL,
          updated_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS default_command_overrides (
          command_id TEXT PRIMARY KEY,
          is_enabled INTEGER NOT NULL,
          match_mode TEXT
        );

        CREATE TABLE IF NOT EXISTS snippets (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL,
          trigger_pt TEXT NOT NULL,
          trigger_en TEXT NOT NULL,
          content    TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS custom_templates (
          id            TEXT PRIMARY KEY,
          label_pt      TEXT NOT NULL,
          label_en      TEXT NOT NULL,
          description   TEXT,
          icon          TEXT DEFAULT 'file-text',
          category      TEXT DEFAULT 'custom',
          system_prompt TEXT NOT NULL,
          voice_pt      TEXT,
          voice_en      TEXT,
          output_preview TEXT,
          is_enabled    INTEGER DEFAULT 1,
          created_at    TEXT NOT NULL,
          updated_at    TEXT NOT NULL
        );
      `);
      console.log("[DB] Banco de dados SQLite pronto em:", dbPath);
    } else {
      console.log("[DB] Usando fallback de arquivos de dados em:", userDataPath);
    }
  } catch (err) {
    console.error("[DB] Erro ao inicializar banco de dados:", err);
  }
}
function getSetting(key, defaultValue = "") {
  try {
    if (dbInstance) {
      const stmt = cachedStmt("SELECT value FROM settings WHERE key = ?");
      const row = stmt.get(key);
      let val = row ? row.value : defaultValue;
      if (key === "apiKey" && val) {
        val = decryptValue(val);
      }
      return val;
    }
    if (fallbackFileSettings && fs.existsSync(fallbackFileSettings)) {
      const data = JSON.parse(fs.readFileSync(fallbackFileSettings, "utf-8"));
      let val = data[key] !== void 0 ? data[key] : defaultValue;
      if (key === "apiKey" && val) {
        val = decryptValue(val);
      }
      return val;
    }
  } catch (err) {
    console.error(`[DB] Erro ao obter configuração (${key}):`, err);
  }
  return defaultValue;
}
function setSetting(key, value) {
  try {
    let valToStore = value;
    if (key === "apiKey" && value) {
      valToStore = encryptValue(value);
    }
    if (dbInstance) {
      const stmt = cachedStmt(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      stmt.run(key, valToStore);
      return;
    }
    if (fallbackFileSettings) {
      let data = {};
      if (fs.existsSync(fallbackFileSettings)) {
        try {
          data = JSON.parse(fs.readFileSync(fallbackFileSettings, "utf-8"));
        } catch {
          data = {};
        }
      }
      data[key] = valToStore;
      fs.writeFileSync(fallbackFileSettings, JSON.stringify(data, null, 2), "utf-8");
    }
  } catch (err) {
    console.error(`[DB] Erro ao salvar configuração (${key}):`, err);
  }
}
function getAllSettings() {
  let systemLanguage = "pt-BR";
  try {
    const locale = app$2.getLocale() || "pt-BR";
    if (locale.toLowerCase().startsWith("en")) {
      systemLanguage = "en";
    }
  } catch (err) {
    console.error("[DB] Erro ao obter locale do sistema:", err);
  }
  const defaults = {
    apiKey: "",
    provider: "groq",
    baseUrl: "",
    azureApiVersion: "",
    sttModel: "whisper-large-v3-turbo",
    llmModel: "llama-3.1-8b-instant",
    shortcutToggle: "F10",
    shortcutPushToTalk: "F9",
    shortcutClipboard: "F11",
    commandInlineMode: "false",
    activeTemplateId: "",
    wakeWordEnabled: "true",
    wakeWordSensitivity: "0.5",
    language: systemLanguage,
    autoStartEnabled: "true"
  };
  const result = { ...defaults };
  for (const k of Object.keys(defaults)) {
    const val = getSetting(k, defaults[k]);
    if (val) result[k] = val;
  }
  if (result.llmModel === "openai/gpt-oss-20b" && getSetting("llmModelMigrated", "false") !== "true") {
    result.llmModel = "llama-3.1-8b-instant";
    setSetting("llmModel", "llama-3.1-8b-instant");
    setSetting("llmModelMigrated", "true");
  }
  return result;
}
function saveSession(session) {
  try {
    const segmentsJson = typeof session.segments === "object" ? JSON.stringify(session.segments) : session.segments || null;
    const exportPathsJson = typeof session.exportPaths === "object" ? JSON.stringify(session.exportPaths) : session.exportPaths || null;
    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        INSERT INTO sessions (
          id, type, title, source, platform, model, language, duration,
          text, rawText, segments, exportPaths, audioKept, createdAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          title = excluded.title,
          source = excluded.source,
          platform = excluded.platform,
          model = excluded.model,
          language = excluded.language,
          duration = excluded.duration,
          text = excluded.text,
          rawText = excluded.rawText,
          segments = excluded.segments,
          exportPaths = excluded.exportPaths,
          audioKept = excluded.audioKept,
          createdAt = excluded.createdAt
      `);
      stmt.run(
        session.id,
        session.type,
        session.title || null,
        session.source || null,
        session.platform || null,
        session.model || null,
        session.language || null,
        session.duration || null,
        session.text || "",
        session.rawText || null,
        segmentsJson,
        exportPathsJson,
        session.audioKept ? 1 : 0,
        session.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      );
      return;
    }
    if (fallbackFileSessions) {
      let sessions = [];
      if (fs.existsSync(fallbackFileSessions)) {
        try {
          sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, "utf-8"));
        } catch {
          sessions = [];
        }
      }
      const existingIdx = sessions.findIndex((s) => s.id === session.id);
      if (existingIdx >= 0) {
        sessions[existingIdx] = session;
      } else {
        sessions.unshift(session);
      }
      fs.writeFileSync(fallbackFileSessions, JSON.stringify(sessions, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao salvar sessão:", err);
  }
}
function parseSessionRow(row) {
  let segments = row.segments;
  if (typeof segments === "string") {
    try {
      segments = JSON.parse(segments);
    } catch {
    }
  }
  let exportPaths = row.exportPaths;
  if (typeof exportPaths === "string") {
    try {
      exportPaths = JSON.parse(exportPaths);
    } catch {
    }
  }
  return {
    ...row,
    segments,
    exportPaths,
    audioKept: row.audioKept === 1 ? 1 : 0
  };
}
function getSession(id) {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare("SELECT * FROM sessions WHERE id = ?");
      const row = stmt.get(id);
      return row ? parseSessionRow(row) : null;
    }
    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      const sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, "utf-8"));
      const found = sessions.find((s) => s.id === id);
      return found || null;
    }
  } catch (err) {
    console.error(`[DB] Erro ao buscar sessão (${id}):`, err);
  }
  return null;
}
function listSessions(limit = 50, type) {
  try {
    if (dbInstance) {
      let query = "SELECT * FROM sessions";
      const params = [];
      if (type) {
        query += " WHERE type = ?";
        params.push(type);
      }
      query += " ORDER BY datetime(createdAt) DESC LIMIT ?";
      params.push(limit);
      const stmt = dbInstance.prepare(query);
      const rows = stmt.all(...params);
      return rows.map(parseSessionRow);
    }
    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      let sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, "utf-8"));
      if (type) {
        sessions = sessions.filter((s) => s.type === type);
      }
      return sessions.slice(0, limit);
    }
  } catch (err) {
    console.error("[DB] Erro ao listar sessões:", err);
  }
  return [];
}
function deleteSession(id) {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare("DELETE FROM sessions WHERE id = ?");
      stmt.run(id);
      return;
    }
    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      let sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, "utf-8"));
      sessions = sessions.filter((s) => s.id !== id);
      fs.writeFileSync(fallbackFileSessions, JSON.stringify(sessions, null, 2), "utf-8");
    }
  } catch (err) {
    console.error(`[DB] Erro ao excluir sessão (${id}):`, err);
  }
}
function clearAllSessions() {
  try {
    if (dbInstance) {
      dbInstance.exec("DELETE FROM sessions;");
      console.log("[DB] Todas as sessões foram excluídas do SQLite.");
      return;
    }
    if (fallbackFileSessions) {
      fs.writeFileSync(fallbackFileSessions, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao limpar histórico de sessões:", err);
  }
}
function searchSessions(query) {
  if (!query || !query.trim()) return listSessions(50);
  try {
    const term = `%${query.trim()}%`;
    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        SELECT * FROM sessions
        WHERE text LIKE ? OR title LIKE ? OR source LIKE ?
        ORDER BY datetime(createdAt) DESC
        LIMIT 50
      `);
      const rows = stmt.all(term, term, term);
      return rows.map(parseSessionRow);
    }
    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      const sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, "utf-8"));
      const q = query.toLowerCase();
      return sessions.filter(
        (s) => s.text.toLowerCase().includes(q) || s.title && s.title.toLowerCase().includes(q) || s.source && s.source.toLowerCase().includes(q)
      );
    }
  } catch (err) {
    console.error(`[DB] Erro ao pesquisar sessões (${query}):`, err);
  }
  return [];
}
function logApiCall(entry) {
  try {
    const record = {
      id: crypto.randomUUID(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      provider: entry.provider || "",
      endpoint: entry.endpoint || "",
      operation: entry.operation || "",
      model: entry.model || null,
      bytesSent: entry.bytesSent || 0
    };
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO api_logs (id, createdAt, provider, endpoint, operation, model, bytesSent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.createdAt,
        record.provider,
        record.endpoint,
        record.operation,
        record.model,
        record.bytesSent
      );
      return;
    }
    if (fallbackFileApiLogs) {
      let logs = [];
      if (fs.existsSync(fallbackFileApiLogs)) {
        try {
          logs = JSON.parse(fs.readFileSync(fallbackFileApiLogs, "utf-8"));
        } catch {
          logs = [];
        }
      }
      logs.unshift(record);
      fs.writeFileSync(fallbackFileApiLogs, JSON.stringify(logs, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao registrar chamada de API:", err);
  }
}
function listApiLogs(limit = 200) {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        SELECT * FROM api_logs
        ORDER BY datetime(createdAt) DESC
        LIMIT ?
      `);
      return stmt.all(limit);
    }
    if (fallbackFileApiLogs && fs.existsSync(fallbackFileApiLogs)) {
      const logs = JSON.parse(fs.readFileSync(fallbackFileApiLogs, "utf-8"));
      return logs.slice(0, limit);
    }
  } catch (err) {
    console.error("[DB] Erro ao listar logs de API:", err);
  }
  return [];
}
function clearApiLogs() {
  try {
    if (dbInstance) {
      dbInstance.exec("DELETE FROM api_logs;");
      return;
    }
    if (fallbackFileApiLogs) {
      fs.writeFileSync(fallbackFileApiLogs, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao limpar logs de API:", err);
  }
}
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9à-ÿ\s]/g, " ").split(/\s+/).filter(Boolean);
}
function extractCorrections(rawText, correctedText) {
  const a = tokenize(rawText);
  const b = tokenize(correctedText);
  if (a.length === 0 || b.length === 0) return [];
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i2 = n - 1; i2 >= 0; i2--) {
    for (let j2 = m - 1; j2 >= 0; j2--) {
      dp[i2][j2] = a[i2] === b[j2] ? dp[i2 + 1][j2 + 1] + 1 : Math.max(dp[i2 + 1][j2], dp[i2][j2 + 1]);
    }
  }
  const matched = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matched.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  const corrections = [];
  let prevI = -1;
  let prevJ = -1;
  const consumeGap = (fromI, toI, fromJ, toJ) => {
    const rawGap = a.slice(fromI, toI);
    const corrGap = b.slice(fromJ, toJ);
    const minLen = Math.min(rawGap.length, corrGap.length);
    for (let k = 0; k < minLen; k++) {
      if (rawGap[k] !== corrGap[k]) corrections.push([rawGap[k], corrGap[k]]);
    }
  };
  for (const [mi, mj] of matched) {
    consumeGap(prevI + 1, mi, prevJ + 1, mj);
    prevI = mi;
    prevJ = mj;
  }
  consumeGap(prevI + 1, n, prevJ + 1, m);
  return corrections;
}
function recordCorrections(rawText, correctedText) {
  if (!rawText || !correctedText) return;
  const pairs = extractCorrections(rawText, correctedText).filter(
    ([r, c]) => r.length >= 3 && c.length >= 3 && r !== c
  );
  if (pairs.length === 0) return;
  try {
    if (dbInstance) {
      const upsert = dbInstance.prepare(`
        INSERT INTO corrections (raw, corrected, count)
        VALUES (?, ?, 1)
        ON CONFLICT(raw, corrected) DO UPDATE SET count = count + 1
      `);
      for (const [r, c] of pairs) {
        upsert.run(r, c);
      }
      return;
    }
    if (fallbackFileCorrections) {
      let corrections = [];
      if (fs.existsSync(fallbackFileCorrections)) {
        try {
          corrections = JSON.parse(fs.readFileSync(fallbackFileCorrections, "utf-8"));
        } catch {
          corrections = [];
        }
      }
      for (const [r, c] of pairs) {
        const existing = corrections.find((e) => e.raw === r && e.corrected === c);
        if (existing) existing.count += 1;
        else corrections.push({ raw: r, corrected: c, count: 1 });
      }
      fs.writeFileSync(fallbackFileCorrections, JSON.stringify(corrections, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao registrar correções:", err);
  }
}
function getCorrectionDictionary(minCount = 2, limit = 50) {
  try {
    const rows = [];
    if (dbInstance) {
      const stmt = dbInstance.prepare("SELECT raw, corrected, count FROM corrections");
      rows.push(...stmt.all());
    } else if (fallbackFileCorrections && fs.existsSync(fallbackFileCorrections)) {
      rows.push(...JSON.parse(fs.readFileSync(fallbackFileCorrections, "utf-8")));
    }
    const map = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const cur = map.get(row.raw);
      if (!cur) {
        map.set(row.raw, { corrected: row.corrected, count: row.count, bestCount: row.count });
      } else {
        cur.count += row.count;
        if (row.count > cur.bestCount) {
          cur.bestCount = row.count;
          cur.corrected = row.corrected;
        }
      }
    }
    return Array.from(map.entries()).map(([raw, v]) => ({ raw, corrected: v.corrected, count: v.count })).filter((e) => e.count >= minCount && e.raw !== e.corrected).sort((x, y) => y.count - x.count).slice(0, limit);
  } catch (err) {
    console.error("[DB] Erro ao obter dicionário de correções:", err);
  }
  return [];
}
function getSessionCount() {
  try {
    if (dbInstance) {
      const row = dbInstance.prepare("SELECT COUNT(*) AS c FROM sessions").get();
      return row?.c || 0;
    }
    if (fallbackFileSessions && fs.existsSync(fallbackFileSessions)) {
      const sessions = JSON.parse(fs.readFileSync(fallbackFileSessions, "utf-8"));
      return Array.isArray(sessions) ? sessions.length : 0;
    }
  } catch (err) {
    console.error("[DB] Erro ao contar sessões:", err);
  }
  return 0;
}
function addVocabularyTerm(term) {
  const cleaned = (term || "").trim();
  if (!cleaned) return;
  try {
    const record = { term: cleaned, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO vocabulary (term, createdAt)
        VALUES (?, ?)
        ON CONFLICT(term) DO NOTHING
      `).run(record.term, record.createdAt);
      return;
    }
    if (fallbackFileVocabulary) {
      let terms = [];
      if (fs.existsSync(fallbackFileVocabulary)) {
        try {
          terms = JSON.parse(fs.readFileSync(fallbackFileVocabulary, "utf-8"));
        } catch {
          terms = [];
        }
      }
      if (!terms.some((t) => t.term.toLowerCase() === cleaned.toLowerCase())) {
        terms.unshift(record);
        fs.writeFileSync(fallbackFileVocabulary, JSON.stringify(terms, null, 2), "utf-8");
      }
    }
  } catch (err) {
    console.error("[DB] Erro ao adicionar termo ao vocabulário:", err);
  }
}
function listVocabulary() {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare("SELECT term FROM vocabulary ORDER BY datetime(createdAt) ASC").all();
      return rows.map((r) => r.term);
    }
    if (fallbackFileVocabulary && fs.existsSync(fallbackFileVocabulary)) {
      const terms = JSON.parse(fs.readFileSync(fallbackFileVocabulary, "utf-8"));
      return (terms || []).map((t) => t.term);
    }
  } catch (err) {
    console.error("[DB] Erro ao listar vocabulário:", err);
  }
  return [];
}
function removeVocabularyTerm(term) {
  try {
    if (dbInstance) {
      dbInstance.prepare("DELETE FROM vocabulary WHERE term = ?").run(term);
      return;
    }
    if (fallbackFileVocabulary && fs.existsSync(fallbackFileVocabulary)) {
      const terms = JSON.parse(fs.readFileSync(fallbackFileVocabulary, "utf-8"));
      const filtered = (terms || []).filter((t) => t.term !== term);
      fs.writeFileSync(fallbackFileVocabulary, JSON.stringify(filtered, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao remover termo do vocabulário:", err);
  }
}
function clearVocabulary() {
  try {
    if (dbInstance) {
      dbInstance.exec("DELETE FROM vocabulary;");
      return;
    }
    if (fallbackFileVocabulary) {
      fs.writeFileSync(fallbackFileVocabulary, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao limpar vocabulário:", err);
  }
}
function parseCustomCommandRow(row) {
  let pt = [];
  let en = [];
  let param = "";
  try {
    pt = JSON.parse(row.trigger_pt || "[]");
  } catch {
  }
  try {
    en = JSON.parse(row.trigger_en || "[]");
  } catch {
  }
  try {
    param = JSON.parse(row.action_param || '""');
  } catch {
    param = row.action_param || "";
  }
  return {
    id: row.id,
    isDefault: false,
    isEnabled: !!row.is_enabled,
    category: row.category || "custom",
    label: row.label || "",
    description: row.description || "",
    triggers: { pt: Array.isArray(pt) ? pt : [], en: Array.isArray(en) ? en : [] },
    action: { type: row.action_type || "inject_text", parameter: param },
    matchMode: row.match_mode === "inline" ? "inline" : "isolated",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function listCustomCommands() {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare("SELECT * FROM custom_commands ORDER BY datetime(created_at) ASC").all();
      return rows.map(parseCustomCommandRow);
    }
    if (fallbackFileCommands && fs.existsSync(fallbackFileCommands)) {
      return JSON.parse(fs.readFileSync(fallbackFileCommands, "utf-8"));
    }
  } catch (err) {
    console.error("[DB] Erro ao listar comandos personalizados:", err);
  }
  return [];
}
function saveCustomCommand(cmd) {
  try {
    const record = {
      id: cmd.id,
      label: cmd.label,
      description: cmd.description || "",
      category: cmd.category || "custom",
      trigger_pt: JSON.stringify(cmd.triggers.pt || []),
      trigger_en: JSON.stringify(cmd.triggers.en || []),
      action_type: cmd.action.type,
      action_param: JSON.stringify(cmd.action.parameter ?? ""),
      match_mode: cmd.matchMode,
      is_enabled: cmd.isEnabled ? 1 : 0,
      created_at: cmd.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: cmd.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO custom_commands (id, label, description, category, trigger_pt, trigger_en, action_type, action_param, match_mode, is_enabled, created_at, updated_at)
        VALUES (@id, @label, @description, @category, @trigger_pt, @trigger_en, @action_type, @action_param, @match_mode, @is_enabled, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          label = excluded.label,
          description = excluded.description,
          category = excluded.category,
          trigger_pt = excluded.trigger_pt,
          trigger_en = excluded.trigger_en,
          action_type = excluded.action_type,
          action_param = excluded.action_param,
          match_mode = excluded.match_mode,
          is_enabled = excluded.is_enabled,
          updated_at = excluded.updated_at
      `).run(record);
      return;
    }
    if (fallbackFileCommands) {
      let commands = [];
      if (fs.existsSync(fallbackFileCommands)) {
        try {
          commands = JSON.parse(fs.readFileSync(fallbackFileCommands, "utf-8"));
        } catch {
          commands = [];
        }
      }
      const idx = commands.findIndex((c) => c.id === cmd.id);
      const parsed = parseCustomCommandRow(record);
      if (idx >= 0) commands[idx] = parsed;
      else commands.push(parsed);
      fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao salvar comando personalizado:", err);
  }
}
function deleteCustomCommand$1(id) {
  try {
    if (dbInstance) {
      dbInstance.prepare("DELETE FROM custom_commands WHERE id = ?").run(id);
      return;
    }
    if (fallbackFileCommands && fs.existsSync(fallbackFileCommands)) {
      const commands = JSON.parse(fs.readFileSync(fallbackFileCommands, "utf-8"));
      fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands.filter((c) => c.id !== id), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao excluir comando personalizado:", err);
  }
}
function listDefaultOverrides() {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare("SELECT command_id, is_enabled, match_mode FROM default_command_overrides").all();
      return rows.map((r) => ({ commandId: r.command_id, isEnabled: !!r.is_enabled, matchMode: r.match_mode === "inline" ? "inline" : "isolated" }));
    }
    if (fallbackFileOverrides && fs.existsSync(fallbackFileOverrides)) {
      return JSON.parse(fs.readFileSync(fallbackFileOverrides, "utf-8"));
    }
  } catch (err) {
    console.error("[DB] Erro ao listar overrides:", err);
  }
  return [];
}
function setDefaultOverride(commandId, isEnabled, matchMode) {
  try {
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO default_command_overrides (command_id, is_enabled, match_mode)
        VALUES (?, ?, ?)
        ON CONFLICT(command_id) DO UPDATE SET is_enabled = excluded.is_enabled, match_mode = excluded.match_mode
      `).run(commandId, isEnabled ? 1 : 0, matchMode || null);
      return;
    }
    if (fallbackFileOverrides) {
      let overrides = [];
      if (fs.existsSync(fallbackFileOverrides)) {
        try {
          overrides = JSON.parse(fs.readFileSync(fallbackFileOverrides, "utf-8"));
        } catch {
          overrides = [];
        }
      }
      const idx = overrides.findIndex((o) => o.commandId === commandId);
      const entry = { commandId, isEnabled, matchMode };
      if (idx >= 0) overrides[idx] = entry;
      else overrides.push(entry);
      fs.writeFileSync(fallbackFileOverrides, JSON.stringify(overrides, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao definir override de comando:", err);
  }
}
function parseSnippetRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    triggerPt: row.trigger_pt || "",
    triggerEn: row.trigger_en || "",
    content: row.content || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function seedSnippets(placeholders) {
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const p of placeholders) {
      if (dbInstance) {
        dbInstance.prepare(`
          INSERT OR IGNORE INTO snippets (id, name, trigger_pt, trigger_en, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, '', ?, ?)
        `).run(crypto.randomUUID(), p.name, p.triggerPt, p.triggerEn, now, now);
      } else if (fallbackFileSnippets) {
        let snippets = [];
        if (fs.existsSync(fallbackFileSnippets)) {
          try {
            snippets = JSON.parse(fs.readFileSync(fallbackFileSnippets, "utf-8"));
          } catch {
            snippets = [];
          }
        }
        if (!snippets.some((s) => s.name === p.name)) {
          snippets.push({ id: crypto.randomUUID(), name: p.name, triggerPt: p.triggerPt, triggerEn: p.triggerEn, content: "", createdAt: now, updatedAt: now });
          fs.writeFileSync(fallbackFileSnippets, JSON.stringify(snippets, null, 2), "utf-8");
        }
      }
    }
  } catch (err) {
    console.error("[DB] Erro ao semear snippets:", err);
  }
}
function listSnippets() {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare("SELECT * FROM snippets ORDER BY datetime(created_at) ASC").all();
      return rows.map(parseSnippetRow);
    }
    if (fallbackFileSnippets && fs.existsSync(fallbackFileSnippets)) {
      return JSON.parse(fs.readFileSync(fallbackFileSnippets, "utf-8"));
    }
  } catch (err) {
    console.error("[DB] Erro ao listar snippets:", err);
  }
  return [];
}
function saveSnippet(snippet) {
  try {
    const record = {
      id: snippet.id,
      name: snippet.name,
      trigger_pt: snippet.triggerPt,
      trigger_en: snippet.triggerEn,
      content: snippet.content,
      created_at: snippet.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: snippet.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO snippets (id, name, trigger_pt, trigger_en, content, created_at, updated_at)
        VALUES (@id, @name, @trigger_pt, @trigger_en, @content, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          trigger_pt = excluded.trigger_pt,
          trigger_en = excluded.trigger_en,
          content = excluded.content,
          updated_at = excluded.updated_at
      `).run(record);
      return;
    }
    if (fallbackFileSnippets) {
      let snippets = [];
      if (fs.existsSync(fallbackFileSnippets)) {
        try {
          snippets = JSON.parse(fs.readFileSync(fallbackFileSnippets, "utf-8"));
        } catch {
          snippets = [];
        }
      }
      const idx = snippets.findIndex((s) => s.id === snippet.id);
      if (idx >= 0) snippets[idx] = parseSnippetRow(record);
      else snippets.push(parseSnippetRow(record));
      fs.writeFileSync(fallbackFileSnippets, JSON.stringify(snippets, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao salvar snippet:", err);
  }
}
function deleteSnippet(id) {
  try {
    if (dbInstance) {
      dbInstance.prepare("DELETE FROM snippets WHERE id = ?").run(id);
      return;
    }
    if (fallbackFileSnippets && fs.existsSync(fallbackFileSnippets)) {
      const snippets = JSON.parse(fs.readFileSync(fallbackFileSnippets, "utf-8"));
      fs.writeFileSync(fallbackFileSnippets, JSON.stringify(snippets.filter((s) => s.id !== id), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao excluir snippet:", err);
  }
}
function parseTemplateRow(row) {
  let voicePt = [];
  let voiceEn = [];
  try {
    voicePt = JSON.parse(row.voice_pt || "[]");
  } catch {
  }
  try {
    voiceEn = JSON.parse(row.voice_en || "[]");
  } catch {
  }
  return {
    id: row.id,
    isDefault: false,
    isEnabled: !!row.is_enabled,
    label: row.label_pt || row.label_en || "",
    labelPt: row.label_pt || "",
    labelEn: row.label_en || "",
    description: row.description || "",
    icon: row.icon || "file-text",
    category: row.category || "custom",
    systemPrompt: row.system_prompt || "",
    voiceTriggerPt: Array.isArray(voicePt) ? voicePt : [],
    voiceTriggerEn: Array.isArray(voiceEn) ? voiceEn : [],
    outputPreview: row.output_preview || "",
    supportsStreaming: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function listCustomTemplates() {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare("SELECT * FROM custom_templates ORDER BY datetime(created_at) ASC").all();
      return rows.map(parseTemplateRow);
    }
    if (fallbackFileTemplates && fs.existsSync(fallbackFileTemplates)) {
      return JSON.parse(fs.readFileSync(fallbackFileTemplates, "utf-8"));
    }
  } catch (err) {
    console.error("[DB] Erro ao listar templates personalizados:", err);
  }
  return [];
}
function saveCustomTemplate(template) {
  try {
    const record = {
      id: template.id,
      label_pt: template.labelPt || template.label,
      label_en: template.labelEn || template.label,
      description: template.description || "",
      icon: template.icon || "file-text",
      category: template.category || "custom",
      system_prompt: template.systemPrompt || "",
      voice_pt: JSON.stringify(template.voiceTriggerPt || []),
      voice_en: JSON.stringify(template.voiceTriggerEn || []),
      output_preview: template.outputPreview || "",
      is_enabled: template.isEnabled ? 1 : 0,
      created_at: template.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: template.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO custom_templates (id, label_pt, label_en, description, icon, category, system_prompt, voice_pt, voice_en, output_preview, is_enabled, created_at, updated_at)
        VALUES (@id, @label_pt, @label_en, @description, @icon, @category, @system_prompt, @voice_pt, @voice_en, @output_preview, @is_enabled, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          label_pt = excluded.label_pt,
          label_en = excluded.label_en,
          description = excluded.description,
          icon = excluded.icon,
          category = excluded.category,
          system_prompt = excluded.system_prompt,
          voice_pt = excluded.voice_pt,
          voice_en = excluded.voice_en,
          output_preview = excluded.output_preview,
          is_enabled = excluded.is_enabled,
          updated_at = excluded.updated_at
      `).run(record);
      return;
    }
    if (fallbackFileTemplates) {
      let templates = [];
      if (fs.existsSync(fallbackFileTemplates)) {
        try {
          templates = JSON.parse(fs.readFileSync(fallbackFileTemplates, "utf-8"));
        } catch {
          templates = [];
        }
      }
      const idx = templates.findIndex((t) => t.id === template.id);
      const parsed = parseTemplateRow(record);
      if (idx >= 0) templates[idx] = parsed;
      else templates.push(parsed);
      fs.writeFileSync(fallbackFileTemplates, JSON.stringify(templates, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao salvar template personalizado:", err);
  }
}
function deleteCustomTemplate(id) {
  try {
    if (dbInstance) {
      dbInstance.prepare("DELETE FROM custom_templates WHERE id = ?").run(id);
      return;
    }
    if (fallbackFileTemplates && fs.existsSync(fallbackFileTemplates)) {
      const templates = JSON.parse(fs.readFileSync(fallbackFileTemplates, "utf-8"));
      fs.writeFileSync(fallbackFileTemplates, JSON.stringify(templates.filter((t) => t.id !== id), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao excluir template personalizado:", err);
  }
}
const PROVIDER_PRESETS = [
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", requiresApiKey: true, isAzure: false, defaultApiVersion: "" },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", requiresApiKey: true, isAzure: false, defaultApiVersion: "" },
  { id: "azure", label: "Azure OpenAI", baseUrl: "https://YOUR_RESOURCE.openai.azure.com", requiresApiKey: true, isAzure: true, defaultApiVersion: "2024-06-01" },
  { id: "ollama", label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", requiresApiKey: false, isAzure: false, defaultApiVersion: "" },
  { id: "lmstudio", label: "LM Studio (local)", baseUrl: "http://localhost:1234/v1", requiresApiKey: false, isAzure: false, defaultApiVersion: "" }
];
function resolveProvider() {
  const id = (getSetting("provider", "groq").trim() || "groq").toLowerCase();
  const preset = PROVIDER_PRESETS.find((p) => p.id === id) || PROVIDER_PRESETS[0];
  const baseUrl = (getSetting("baseUrl", "").trim() || preset.baseUrl).replace(/\/+$/, "");
  const apiKey = getSetting("apiKey", "").trim();
  const apiVersion = getSetting("azureApiVersion", preset.defaultApiVersion).trim() || preset.defaultApiVersion;
  return {
    id: preset.id,
    baseUrl,
    apiKey,
    requiresApiKey: preset.requiresApiKey,
    isAzure: preset.isAzure,
    apiVersion
  };
}
function getChatEndpoint(model) {
  const p = resolveProvider();
  if (p.isAzure) return `${p.baseUrl}/openai/deployments/${model}/chat/completions?api-version=${p.apiVersion}`;
  return `${p.baseUrl}/chat/completions`;
}
function getSttEndpoint(model) {
  const p = resolveProvider();
  if (p.isAzure) return `${p.baseUrl}/openai/deployments/${model}/audio/transcriptions?api-version=${p.apiVersion}`;
  return `${p.baseUrl}/audio/transcriptions`;
}
function getModelsEndpoint() {
  const p = resolveProvider();
  if (p.isAzure) return `${p.baseUrl}/openai/deployments?api-version=${p.apiVersion}`;
  return `${p.baseUrl}/models`;
}
function getAuthHeaders() {
  const p = resolveProvider();
  if (!p.apiKey) return {};
  if (p.isAzure) return { "api-key": p.apiKey };
  return { "Authorization": `Bearer ${p.apiKey}` };
}
const DEFAULT_MODEL = "whisper-large-v3-turbo";
async function transcribeAudio(audioBuffer, language) {
  if (!audioBuffer || audioBuffer.length < 1e3) {
    console.log("[STT] Áudio muito curto ou vazio, ignorando transcrição.");
    return { text: "", segments: [], duration: 0 };
  }
  const provider = resolveProvider();
  if (provider.requiresApiKey && !provider.apiKey) {
    console.warn("[STT] API Key não configurada.");
    const lang = getSetting("language", "pt-BR");
    const msg = lang === "en" ? "[Error: Configure your API Key in Vox settings]" : "[Erro: Configure sua API Key nas configurações do Vox]";
    return {
      text: msg,
      segments: [],
      duration: 0
    };
  }
  const model = getSetting("sttModel") || process.env.WHISPER_MODEL || DEFAULT_MODEL;
  const endpoint = getSttEndpoint(model);
  const isWebm = audioBuffer.length >= 4 && audioBuffer[0] === 26 && audioBuffer[1] === 69 && audioBuffer[2] === 223 && audioBuffer[3] === 163;
  const mimeType = isWebm ? "audio/webm" : "audio/wav";
  const fileName = isWebm ? "audio.webm" : "audio.wav";
  console.log("[STT] Transcrevendo mídia:", {
    provider: provider.id,
    model,
    audioSize: audioBuffer.length,
    mimeType,
    specifiedLanguage: "auto-detect (sem tradução)"
  });
  try {
    const file = new File([new Uint8Array(audioBuffer)], fileName, { type: mimeType });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);
    if (language) ;
    formData.append("response_format", "verbose_json");
    formData.append("prompt", "Transcrição direta e exata da fala no seu idioma original (sem traduzir para outro idioma).");
    formData.append("temperature", "0");
    logApiCall({
      provider: provider.id,
      endpoint,
      operation: "stt",
      model,
      bytesSent: audioBuffer.length
    });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[STT] Erro da API (${response.status}):`, errText);
      return {
        text: `[Erro ${response.status}] ${errText || "Falha na comunicação"}`,
        segments: [],
        duration: 0
      };
    }
    const data = await response.json();
    let text = (data.text || "").trim();
    const lower = text.toLowerCase().replace(/[.!?,]/g, "").trim();
    const hallucinations = [
      "obrigado",
      "obrigada",
      "obrigado por assistir",
      "legendas pela comunidade amara.org",
      "subtitles by",
      "transcrição",
      "tchau",
      "thank you",
      "thanks for watching"
    ];
    if (hallucinations.includes(lower)) {
      console.log(`[STT] Alucinação ignorada: "${text}"`);
      text = "";
    }
    const segments = Array.isArray(data.segments) ? data.segments.map((s) => ({
      start: s.start || 0,
      end: s.end || 0,
      text: s.text || ""
    })) : [];
    const duration = data.duration || (segments.length > 0 ? segments[segments.length - 1].end : 0);
    return {
      text: text.trim(),
      segments,
      duration
    };
  } catch (error) {
    console.error("[STT] Exceção na API:", error);
    return {
      text: `[Erro na transcrição] ${error?.message || "Ocorreu um erro ao processar o áudio."}`,
      segments: [],
      duration: 0
    };
  }
}
const DEFAULT_TEMPLATES = [
  {
    id: "none",
    isDefault: true,
    isEnabled: true,
    label: "✦ Livre / Free",
    labelPt: "Ditado Livre",
    labelEn: "Free Dictation",
    description: "Standard dictation with punctuation and grammar correction only",
    descriptionPt: "Ditado padrão com correção apenas de gramática e pontuação",
    descriptionEn: "Standard dictation with punctuation and grammar correction only",
    icon: "mic",
    voiceTriggerPt: [],
    voiceTriggerEn: [],
    systemPrompt: null,
    outputPreview: "",
    supportsStreaming: true,
    category: "document"
  },
  {
    id: "email_formal",
    isDefault: true,
    isEnabled: true,
    label: "Email Formal",
    labelPt: "Email Formal",
    labelEn: "Formal Email",
    description: "Formats dictated text as a complete formal email with greeting, body paragraphs, and closing",
    descriptionPt: "Formata o texto ditado como um e-mail formal completo com saudação, corpo e encerramento",
    descriptionEn: "Formats dictated text as a complete formal email with greeting, body paragraphs, and closing",
    icon: "mail",
    voiceTriggerPt: ["ativar email formal", "modo email formal", "template email formal"],
    voiceTriggerEn: ["activate formal email", "formal email mode", "formal email template"],
    category: "communication",
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
    id: "message_casual",
    isDefault: true,
    isEnabled: true,
    label: "Mensagem Casual",
    labelPt: "Mensagem Casual",
    labelEn: "Casual Message",
    description: "Formats text as a conversational message, preserving informal tone",
    descriptionPt: "Formata o texto como uma mensagem conversacional, preservando o tom informal",
    descriptionEn: "Formats text as a conversational message, preserving informal tone",
    icon: "message-circle",
    voiceTriggerPt: ["mensagem casual", "modo casual", "template mensagem"],
    voiceTriggerEn: ["casual message", "casual mode", "message template"],
    category: "communication",
    supportsStreaming: true,
    systemPrompt: `You are formatting a casual spoken message into written text.
Rules:
- Fix punctuation and capitalization minimally — preserve conversational tone
- Keep contractions, informal language, and the speaker's natural voice
- Break into short paragraphs if the message is long
- Do NOT make it formal. Do NOT restructure sentences.
- Output in the same language as the input`,
    outputPreview: ""
  },
  {
    id: "bullet_points",
    isDefault: true,
    isEnabled: true,
    label: "Tópicos",
    labelPt: "Tópicos (Bullet Points)",
    labelEn: "Bullet Points",
    description: "Converts dictated text into a structured bullet point list",
    descriptionPt: "Converte o texto ditado em uma lista estruturada de tópicos com marcadores",
    descriptionEn: "Converts dictated text into a structured bullet point list",
    icon: "list",
    voiceTriggerPt: ["ativar tópicos", "modo tópicos", "bullet points", "lista de tópicos"],
    voiceTriggerEn: ["bullet points", "bullet mode", "list mode", "activate bullets"],
    category: "list",
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
    id: "numbered_list",
    isDefault: true,
    isEnabled: true,
    label: "Lista Numerada",
    labelPt: "Lista Numerada",
    labelEn: "Numbered List",
    description: "Converts dictated text into a numbered ordered list",
    descriptionPt: "Converte o texto ditado em uma lista ordenada numerada",
    descriptionEn: "Converts dictated text into a numbered ordered list",
    icon: "list-ordered",
    voiceTriggerPt: ["lista numerada", "modo lista numerada", "lista ordenada"],
    voiceTriggerEn: ["numbered list", "ordered list", "numbered mode"],
    category: "list",
    supportsStreaming: false,
    systemPrompt: `You are converting spoken dictation into a numbered ordered list.
Rules:
- Each distinct step, item, or idea becomes one numbered item
- Format: "1. ", "2. ", "3. " etc.
- Fix grammar and punctuation within each item
- Remove filler words
- Keep items parallel in structure when possible
- Output in the same language as the input`,
    outputPreview: ""
  },
  {
    id: "checklist",
    isDefault: true,
    isEnabled: true,
    label: "Checklist",
    labelPt: "Lista de Tarefas (Checklist)",
    labelEn: "Checklist",
    description: "Converts dictated items into a markdown checklist",
    descriptionPt: "Converte os itens ditados em uma lista de tarefas (checklist) em markdown",
    descriptionEn: "Converts dictated items into a markdown checklist",
    icon: "check-square",
    voiceTriggerPt: ["checklist", "lista de tarefas", "modo checklist"],
    voiceTriggerEn: ["checklist", "task list", "todo list", "checklist mode"],
    category: "list",
    supportsStreaming: false,
    systemPrompt: `You are converting spoken dictation into a markdown checklist.
Rules:
- Each item becomes: "- [ ] Item text"
- Fix grammar and punctuation within each item
- Remove filler words
- Output in the same language as the input`,
    outputPreview: ""
  },
  {
    id: "meeting_notes",
    isDefault: true,
    isEnabled: true,
    label: "Notas de Reunião",
    labelPt: "Notas de Reunião",
    labelEn: "Meeting Notes",
    description: "Structures dictated content as organized meeting notes with participants, topics, decisions, and action items",
    descriptionPt: "Estrutura o conteúdo ditado em notas de reunião com participantes, pauta, decisões e ações",
    descriptionEn: "Structures dictated content as organized meeting notes with participants, topics, decisions, and action items",
    icon: "users",
    voiceTriggerPt: ["notas de reunião", "modo reunião", "ata de reunião"],
    voiceTriggerEn: ["meeting notes", "meeting mode", "minutes mode"],
    category: "meeting",
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
    outputPreview: ""
  },
  {
    id: "code_comment",
    isDefault: true,
    isEnabled: true,
    label: "Comentário de Código",
    labelPt: "Comentário de Código",
    labelEn: "Code Comment",
    description: "Formats dictated text as a clean inline or block code comment",
    descriptionPt: "Formata o texto ditado como um comentário de código limpo (inline ou bloco JSDoc)",
    descriptionEn: "Formats dictated text as a clean inline or block code comment",
    icon: "code",
    voiceTriggerPt: ["comentário de código", "modo comentário", "template código"],
    voiceTriggerEn: ["code comment", "comment mode", "code template"],
    category: "code",
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
    outputPreview: ""
  },
  {
    id: "git_commit",
    isDefault: true,
    isEnabled: true,
    label: "Mensagem de Commit",
    labelPt: "Mensagem de Commit",
    labelEn: "Git Commit Message",
    description: "Formats dictated text as a conventional git commit message",
    descriptionPt: "Formata o texto ditado como uma mensagem de commit no padrão Conventional Commits",
    descriptionEn: "Formats dictated text as a conventional git commit message",
    icon: "git-commit",
    voiceTriggerPt: ["mensagem de commit", "modo commit", "template commit"],
    voiceTriggerEn: ["commit message", "commit mode", "git commit"],
    category: "code",
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
    outputPreview: ""
  },
  {
    id: "technical_report",
    isDefault: true,
    isEnabled: true,
    label: "Relatório Técnico",
    labelPt: "Relatório Técnico",
    labelEn: "Technical Report",
    description: "Structures dictated content as a formal technical report with sections and professional language",
    descriptionPt: "Estrutura o conteúdo como um relatório técnico formal com seções estruturadas",
    descriptionEn: "Structures dictated content as a formal technical report with sections and professional language",
    icon: "file-text",
    voiceTriggerPt: ["relatório técnico", "modo relatório", "template relatório"],
    voiceTriggerEn: ["technical report", "report mode", "report template"],
    category: "document",
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
    outputPreview: ""
  },
  {
    id: "brain_dump",
    isDefault: true,
    isEnabled: true,
    label: "Captura Livre",
    labelPt: "Captura Livre (Brain Dump)",
    labelEn: "Brain Dump",
    description: "Captures raw thoughts with light cleanup, preserving the natural flow without imposing structure",
    descriptionPt: "Captura pensamentos livres com limpeza leve, preservando o fluxo natural de ideias",
    descriptionEn: "Captures raw thoughts with light cleanup, preserving the natural flow without imposing structure",
    icon: "brain",
    voiceTriggerPt: ["captura livre", "brain dump", "modo livre", "despejo mental"],
    voiceTriggerEn: ["brain dump", "free capture", "raw capture", "stream of thought"],
    category: "document",
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
    outputPreview: ""
  }
];
const DEACTIVATION_PHRASES = {
  pt: ["ditado livre", "sem template", "modo padrão", "remover template", "desativar template"],
  en: ["free dictation", "no template", "default mode", "remove template", "deactivate template"]
};
const MAX_PROMPT_CHARS = 8e3;
class TemplateManager {
  getDisabledIds() {
    try {
      const raw = getSetting("disabledTemplateIds", "[]").trim();
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  setDisabledIds(ids) {
    setSetting("disabledTemplateIds", JSON.stringify(ids));
  }
  getAllTemplates() {
    const disabled = new Set(this.getDisabledIds());
    const defaults = DEFAULT_TEMPLATES.map((t) => ({ ...t, isEnabled: !disabled.has(t.id) }));
    return [...defaults, ...listCustomTemplates()];
  }
  setTemplateEnabled(id, enabled) {
    const template = this.getTemplate(id);
    if (!template) return;
    if (template.isDefault) {
      const disabled = this.getDisabledIds();
      const next = enabled ? disabled.filter((d) => d !== id) : [.../* @__PURE__ */ new Set([...disabled, id])];
      this.setDisabledIds(next);
    } else {
      saveCustomTemplate({ ...template, isEnabled: enabled });
    }
  }
  getEnabledTemplates() {
    return this.getAllTemplates().filter((t) => t.isEnabled);
  }
  getTemplate(id) {
    return this.getAllTemplates().find((t) => t.id === id) || null;
  }
  getActiveTemplate() {
    const id = getSetting("activeTemplateId", "").trim();
    if (!id || id === "none") return null;
    const template = this.getTemplate(id);
    if (!template) {
      this.setActiveTemplate(null);
      return null;
    }
    return template;
  }
  setActiveTemplate(id) {
    setSetting("activeTemplateId", id || "");
  }
  addCustomTemplate(template) {
    const full = {
      id: template.id || crypto.randomUUID(),
      isDefault: false,
      isEnabled: template.isEnabled ?? true,
      label: template.labelPt || template.labelEn || template.label || "Template",
      labelPt: template.labelPt || "",
      labelEn: template.labelEn || "",
      description: template.description || "",
      icon: template.icon || "file-text",
      category: template.category || "custom",
      systemPrompt: template.systemPrompt || "",
      voiceTriggerPt: template.voiceTriggerPt || [],
      voiceTriggerEn: template.voiceTriggerEn || [],
      outputPreview: template.outputPreview || "",
      supportsStreaming: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveCustomTemplate(full);
    return full;
  }
  updateCustomTemplate(id, updates) {
    const existing = listCustomTemplates().find((t) => t.id === id);
    if (!existing) return;
    saveCustomTemplate({ ...existing, ...updates, id, isDefault: false, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }
  deleteCustomTemplate(id) {
    deleteCustomTemplate(id);
    if (getSetting("activeTemplateId", "").trim() === id) {
      this.setActiveTemplate(null);
    }
  }
  buildCorrectorPrompt(basePrompt, template) {
    if (!template || !template.systemPrompt) return basePrompt;
    const combined = `${basePrompt}

---
ADDITIONAL FORMATTING INSTRUCTIONS:
${template.systemPrompt}`;
    if (combined.length <= MAX_PROMPT_CHARS) return combined;
    const maxTemplate = MAX_PROMPT_CHARS - basePrompt.length - 60;
    return `${basePrompt}

---
ADDITIONAL FORMATTING INSTRUCTIONS:
${template.systemPrompt.slice(0, Math.max(0, maxTemplate))}`;
  }
  resolveVoiceActivation(text, language) {
    const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    const allDeactivation = [...DEACTIVATION_PHRASES.pt, ...DEACTIVATION_PHRASES.en];
    for (const phrase of allDeactivation) {
      const idx = this.findPhraseIndex(normalized, phrase);
      if (idx >= 0) {
        return { templateId: "none", remainingText: this.removeAt(normalized, idx, phrase) };
      }
    }
    for (const t of this.getEnabledTemplates()) {
      for (const phrase of [...t.voiceTriggerPt, ...t.voiceTriggerEn]) {
        const idx = this.findPhraseIndex(normalized, phrase);
        if (idx >= 0) {
          return { templateId: t.id, remainingText: this.removeAt(normalized, idx, phrase) };
        }
      }
    }
    return null;
  }
  findPhraseIndex(normalized, phrase) {
    const p = phrase.toLowerCase().trim();
    if (!p) return -1;
    const idx = normalized.indexOf(p);
    if (idx < 0) return -1;
    const before = idx === 0 ? " " : normalized[idx - 1];
    const after = idx + p.length >= normalized.length ? " " : normalized[idx + p.length];
    if (/[a-z0-9áéíóúâêôãõçà-ÿ]/.test(before) || /[a-z0-9áéíóúâêôãõçà-ÿ]/.test(after)) return -1;
    return idx;
  }
  removeAt(normalized, idx, phrase) {
    return (normalized.slice(0, idx) + " " + normalized.slice(idx + phrase.length)).replace(/\s+/g, " ").trim();
  }
}
const templateManager = new TemplateManager();
const DEFAULT_LLM_MODEL = "llama-3.1-8b-instant";
const CALIBRATION_SESSIONS = 25;
function buildDictionaryLine() {
  if (getSessionCount() < CALIBRATION_SESSIONS) return "";
  const dict = getCorrectionDictionary(2, 30);
  if (dict.length === 0) return "";
  const items = dict.map((e) => `"${e.raw}" → "${e.corrected}"`).join(", ");
  return ` Dicionário de correções recorrentes do usuário (aplique quando corresponder ao contexto): ${items}.`;
}
function buildVocabularyLine() {
  const terms = listVocabulary();
  if (terms.length === 0) return "";
  const items = terms.map((t) => `"${t}"`).join(", ");
  return ` Vocabulário pessoal do usuário (nomes próprios, siglas e termos técnicos que devem ser reconhecidos e mantidos exatamente como escritos): ${items}.`;
}
async function correctTranscription(text, context, template) {
  if (!text || text.trim().length === 0) return text;
  const provider = resolveProvider();
  if (provider.requiresApiKey && !provider.apiKey) {
    console.warn("[Corrector] API Key não configurada, retornando texto original.");
    return text;
  }
  const model = (getSetting("llmModel") || process.env.LLM_MODEL || DEFAULT_LLM_MODEL).trim();
  const endpoint = getChatEndpoint(model);
  console.log(`[Corrector] Revisando texto (${provider.id}, ${model})...`);
  const contextLine = context ? ` Contexto do ditado: o usuário está digitando em ${context}. Ajuste a formatação de acordo (ex.: código, e-mail, documento, chat).` : "";
  const dictionaryLine = buildDictionaryLine();
  const vocabularyLine = buildVocabularyLine();
  const basePrompt = `Você é um revisor de transcrições de áudio. Sua ÚNICA função é ajustar pontuação, maiúsculas e ortografia do texto recebido.${contextLine}${vocabularyLine}${dictionaryLine} MANTENHA RIGOROSAMENTE O IDIOMA ORIGINAL DO TEXTO (se o texto estiver em inglês, mantenha em inglês; se estiver em português, mantenha em português). É ESTRITAMENTE PROIBIDO TRADUZIR O TEXTO. Retorne APENAS o texto revisado, sem apresentações ou explicações.`;
  const systemPrompt = templateManager.buildCorrectorPrompt(basePrompt, template ?? null);
  try {
    const body = {
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 512
    };
    if (!provider.isAzure) {
      body.model = model;
    }
    const bodyStr = JSON.stringify(body);
    logApiCall({
      provider: provider.id,
      endpoint,
      operation: "llm",
      model,
      bytesSent: Buffer.byteLength(bodyStr)
    });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: bodyStr
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Corrector] Erro da API (${response.status}):`, errText);
      return text;
    }
    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim();
    if (corrected) {
      console.log("[Corrector] Texto revisado com sucesso");
      return corrected;
    }
    return text;
  } catch (error) {
    console.error("[Corrector] Erro ao se comunicar com a LLM API:", error);
    return text;
  }
}
const { clipboard: clipboard$1 } = require("electron");
async function injectText(text, windowRef, _delayMs = 150, legacyHwnd) {
  if (!text || text.trim().length === 0) {
    return { success: false, method: "none", error: "Texto vazio" };
  }
  let ref = {};
  if (typeof windowRef === "object" && windowRef !== null && ("hwnd" in windowRef || "title" in windowRef || "processName" in windowRef)) {
    ref = windowRef;
  } else if (typeof windowRef === "string") {
    ref = { hwnd: windowRef };
  } else if (legacyHwnd) {
    ref = { hwnd: legacyHwnd };
  }
  console.log(`[Injector] Injetando texto no cursor ativo (${text.length} chars)...`);
  clipboard$1.writeText(text);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const targetHwnd = ref.hwnd;
  const psCommand = targetHwnd && targetHwnd !== "0" && targetHwnd !== "null" ? `$t=(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -Name SFW -Namespace VOX -PassThru); $t::SetForegroundWindow([IntPtr]${targetHwnd}); Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^v')` : `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`;
  return new Promise((resolve) => {
    child_process.execFile("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", psCommand], (err) => {
      if (err) {
        console.error("[Injector] Erro ao colar texto via PowerShell (Windows):", err);
        resolve({ success: false, method: "powershell-win32", error: err.message });
      } else {
        console.log("[Injector] Texto colado no cursor com sucesso (Windows)!");
        resolve({ success: true, method: "powershell-win32" });
      }
    });
  });
}
const PT_FUNCTION_WORDS = /* @__PURE__ */ new Set(["de", "do", "da", "em", "para", "que", "com", "uma", "por"]);
class CommandParser {
  registry;
  inlineModeEnabled;
  detectedLanguage = "en";
  constructor(registry, inlineModeEnabled = true) {
    this.registry = registry;
    this.inlineModeEnabled = inlineModeEnabled;
  }
  parse(rawText, language = "auto") {
    const normalized = this.normalize(rawText);
    if (!normalized) {
      return { segments: [], hasCommands: false, hasContent: false, isMixed: false };
    }
    this.detectedLanguage = language === "auto" ? this.detectLanguage(normalized) : language;
    for (const cmd of this.registry) {
      if (!cmd.isEnabled) continue;
      for (const pattern of this.patterns(cmd)) {
        if (this.fullMatch(normalized, pattern)) {
          return {
            segments: [{ type: "command", value: cmd.id, command: cmd }],
            hasCommands: true,
            hasContent: false,
            isMixed: false
          };
        }
      }
    }
    if (this.inlineModeEnabled) {
      const spans = [];
      for (const cmd of this.registry) {
        if (!cmd.isEnabled || cmd.matchMode !== "inline") continue;
        for (const pattern of this.patterns(cmd)) {
          try {
            const regex = new RegExp(pattern, "gi");
            let m;
            while ((m = regex.exec(normalized)) !== null) {
              if (m[0].length === 0) {
                regex.lastIndex++;
                continue;
              }
              spans.push({ start: m.index, end: m.index + m[0].length, cmd });
            }
          } catch {
          }
        }
      }
      if (spans.length > 0) {
        return this.buildMixed(normalized, spans);
      }
    }
    return {
      segments: [{ type: "content", value: rawText, contentText: rawText }],
      hasCommands: false,
      hasContent: true,
      isMixed: false
    };
  }
  getDetectedLanguage() {
    return this.detectedLanguage;
  }
  normalize(raw) {
    let s = raw.toLowerCase();
    s = s.replace(/^\s+|\s+$/g, "");
    s = s.replace(/^[.,!?;:]+|[.,!?;:]+$/g, "");
    s = s.replace(/\s+/g, " ");
    return s.trim();
  }
  detectLanguage(text) {
    const words = text.split(/\s+/);
    let matches = 0;
    for (const w of words) {
      if (PT_FUNCTION_WORDS.has(w)) matches++;
    }
    return matches >= 3 ? "pt" : "en";
  }
  patterns(cmd) {
    const list = cmd.triggers[this.detectedLanguage] && cmd.triggers[this.detectedLanguage].length > 0 ? cmd.triggers[this.detectedLanguage] : cmd.triggers.en;
    return list || [];
  }
  fullMatch(text, pattern) {
    try {
      const m = new RegExp(pattern, "i").exec(text);
      return !!m && m[0].length === text.length;
    } catch {
      return false;
    }
  }
  cleanContent(text) {
    return text.replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, "").trim();
  }
  buildMixed(normalized, spans) {
    spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const kept = [];
    let lastEnd = -1;
    for (const s of spans) {
      if (s.start < lastEnd) continue;
      kept.push(s);
      lastEnd = s.end;
    }
    const segments = [];
    let cursor = 0;
    for (const s of kept) {
      if (s.start > cursor) {
        const contentText = this.cleanContent(normalized.slice(cursor, s.start));
        if (contentText) segments.push({ type: "content", value: contentText, contentText });
      }
      segments.push({ type: "command", value: s.cmd.id, command: s.cmd });
      cursor = s.end;
    }
    if (cursor < normalized.length) {
      const contentText = this.cleanContent(normalized.slice(cursor));
      if (contentText) segments.push({ type: "content", value: contentText, contentText });
    }
    const hasCommands = segments.some((s) => s.type === "command");
    const hasContent = segments.some((s) => s.type === "content");
    return { segments, hasCommands, hasContent, isMixed: hasCommands && hasContent };
  }
}
const { shell, clipboard } = require("electron");
function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    child_process.exec(`powershell -NoProfile -WindowStyle Hidden -Command ${command}`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
const SEND_KEYS_MAP = {
  Enter: "{ENTER}",
  Backspace: "{BACKSPACE}",
  Tab: "{TAB}",
  Delete: "{DELETE}",
  Escape: "{ESC}",
  Esc: "{ESC}",
  Home: "{HOME}",
  End: "{END}",
  PageUp: "{PGUP}",
  PageDown: "{PGDN}",
  Insert: "{INSERT}",
  Up: "{UP}",
  Down: "{DOWN}",
  Left: "{LEFT}",
  Right: "{RIGHT}",
  Space: " ",
  PrintScreen: "{PRTSC}",
  F1: "{F1}",
  F2: "{F2}",
  F3: "{F3}",
  F4: "{F4}",
  F5: "{F5}",
  F6: "{F6}",
  F7: "{F7}",
  F8: "{F8}",
  F9: "{F9}",
  F10: "{F10}",
  F11: "{F11}",
  F12: "{F12}"
};
function toSendKeys(combo) {
  const parts = combo.split("+").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);
  const keyStr = SEND_KEYS_MAP[key] || (key.length === 1 ? key.toLowerCase() : `{${key.toUpperCase()}}`);
  const prefix = mods.map((m) => m === "Ctrl" ? "^" : m === "Alt" ? "%" : m === "Shift" ? "+" : m === "Meta" || m === "Cmd" || m === "Win" ? "^" : "").join("");
  return prefix + keyStr;
}
async function sendKeys(combos) {
  const keys = combos.map(toSendKeys).join("");
  if (!keys) return;
  await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}')`);
}
async function sendKeySequence(steps) {
  if (!steps || steps.length === 0) return;
  const body = steps.map((s) => {
    const key = toSendKeys(s.key);
    const delay = Math.max(0, s.delayAfter || 0);
    return `[System.Windows.Forms.SendKeys]::SendWait('${key}'); Start-Sleep -Milliseconds ${delay}`;
  }).join("; ");
  await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; ${body}`);
}
function dynamicValue(kind, language) {
  const now = /* @__PURE__ */ new Date();
  const pt = language === "pt";
  switch (kind) {
    case "date":
      return pt ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(now) : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(now);
    case "time":
      return pt ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now) : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(now);
    case "datetime":
      return `${dynamicValue("date", language)}, ${dynamicValue("time", language)}`;
    default:
      return "";
  }
}
async function openApp(name) {
  switch (name) {
    case "terminal":
      await runPowerShell("Start-Process 'wt.exe'").catch(() => runPowerShell("Start-Process 'cmd.exe'"));
      break;
    case "explorer":
      await runPowerShell("Start-Process 'explorer.exe'");
      break;
    case "browser":
      await shell.openExternal("https://");
      break;
    default:
      await runPowerShell(`Start-Process '${name}'`);
  }
}
function findLastSentenceBoundary(text) {
  for (let i = text.length - 2; i >= 0; i--) {
    if ((text[i] === "." || text[i] === "!" || text[i] === "?") && text[i + 1] === " ") {
      return i + 2;
    }
  }
  return -1;
}
async function deleteLastSentence(windowRef) {
  const text = clipboard.readText();
  const boundary = text ? findLastSentenceBoundary(text) : -1;
  if (!text || boundary <= 0) {
    await sendKeySequence([{ key: "Ctrl+Shift+Home", delayAfter: 30 }, { key: "Delete", delayAfter: 0 }]);
    return;
  }
  const newText = text.slice(0, boundary);
  clipboard.writeText(newText);
  await sendKeySequence([{ key: "Ctrl+A", delayAfter: 30 }, { key: "Ctrl+V", delayAfter: 0 }]);
}
class CommandExecutor extends events.EventEmitter {
  async execute(command, context) {
    const action = command.action;
    if (!action) return;
    try {
      switch (action.type) {
        case "keystroke":
          await sendKeys([String(action.parameter)]);
          break;
        case "keystroke_sequence": {
          const raw = action.parameter;
          const steps = Array.isArray(raw) ? raw.map((s) => typeof s === "string" ? { key: s, delayAfter: 0 } : s) : [];
          await sendKeySequence(steps);
          break;
        }
        case "inject_text":
          await injectText(String(action.parameter), context.windowRef);
          break;
        case "inject_snippet": {
          const snippet = (context.snippets || []).find((s) => s.name === action.parameter);
          if (snippet && snippet.content) {
            await injectText(snippet.content, context.windowRef);
          } else {
            this.emit("snippet_not_configured", String(action.parameter));
          }
          break;
        }
        case "insert_dynamic":
          await injectText(dynamicValue(String(action.parameter), context.language), context.windowRef);
          break;
        case "vox_control":
          if (action.parameter === "delete_last_sentence") {
            await deleteLastSentence(context.windowRef);
          } else if (action.parameter === "repeat") {
            if (context.lastTranscription) {
              await injectText(context.lastTranscription, context.windowRef);
            }
          } else {
            this.emit("vox_control", String(action.parameter));
          }
          break;
        case "change_profile":
          this.emit("change_profile", String(action.parameter));
          break;
        case "open_url":
          await shell.openExternal(String(action.parameter));
          break;
        case "open_app":
          await openApp(String(action.parameter));
          break;
        case "run_script":
          await this.runScript(String(action.parameter));
          break;
        default:
          console.warn("[CommandExecutor] Tipo de ação desconhecido:", action.type);
      }
    } catch (err) {
      console.error("[CommandExecutor] Falha ao executar comando:", err);
    }
  }
  runScript(command) {
    return new Promise((resolve) => {
      child_process.exec(command, { timeout: 1e4 }, (err, stdout, stderr) => {
        const result = {
          stdout: stdout || "",
          stderr: stderr || "",
          error: err ? err.killed ? "Timeout" : err.message : void 0
        };
        this.emit("script_result", result);
        resolve();
      });
    });
  }
}
const commandExecutor = new CommandExecutor();
const DEFAULT_COMMANDS = [
  // ───────────────────────────── punctuation ─────────────────────────────
  { id: "punct_comma", isDefault: true, isEnabled: true, category: "punctuation", label: "Comma / Vírgula", description: "Injects a comma followed by a space", descriptionPt: "Insere uma vírgula seguida de espaço", descriptionEn: "Injects a comma followed by a space", triggers: { pt: ["vírgula", "virgula"], en: ["comma"] }, action: { type: "inject_text", parameter: ", " }, matchMode: "inline" },
  { id: "punct_period", isDefault: true, isEnabled: true, category: "punctuation", label: "Period / Ponto Final", description: "Injects a period followed by a space", descriptionPt: "Insere um ponto final seguido de espaço", descriptionEn: "Injects a period followed by a space", triggers: { pt: ["ponto\\s*final", "ponto\\.?$", "^ponto$"], en: ["period", "full stop", "dot"] }, action: { type: "inject_text", parameter: ". " }, matchMode: "inline" },
  { id: "punct_semicolon", isDefault: true, isEnabled: true, category: "punctuation", label: "Semicolon / Ponto e Vírgula", description: "Injects a semicolon followed by a space", descriptionPt: "Insere um ponto e vírgula seguido de espaço", descriptionEn: "Injects a semicolon followed by a space", triggers: { pt: ["ponto\\s*e\\s*v[íi]rgula"], en: ["semicolon"] }, action: { type: "inject_text", parameter: "; " }, matchMode: "inline" },
  { id: "punct_colon", isDefault: true, isEnabled: true, category: "punctuation", label: "Colon / Dois Pontos", description: "Injects a colon followed by a space", descriptionPt: "Insere dois pontos seguidos de espaço", descriptionEn: "Injects a colon followed by a space", triggers: { pt: ["dois\\s*pontos"], en: ["colon"] }, action: { type: "inject_text", parameter: ": " }, matchMode: "inline" },
  { id: "punct_ellipsis", isDefault: true, isEnabled: true, category: "punctuation", label: "Ellipsis / Reticências", description: "Injects an ellipsis followed by a space", descriptionPt: "Insere reticências seguidas de espaço", descriptionEn: "Injects an ellipsis followed by a space", triggers: { pt: ["retic[eê]ncias", "tr[eê]s\\s*pontos"], en: ["ellipsis", "dot\\s*dot\\s*dot", "three dots"] }, action: { type: "inject_text", parameter: "... " }, matchMode: "inline" },
  { id: "punct_exclamation", isDefault: true, isEnabled: true, category: "punctuation", label: "Exclamation / Exclamação", description: "Injects an exclamation mark followed by a space", descriptionPt: "Insere um ponto de exclamação seguido de espaço", descriptionEn: "Injects an exclamation mark followed by a space", triggers: { pt: ["excla(mação|macao|ma)", "ponto\\s*de\\s*excla"], en: ["exclamation\\s*(mark|point)?", "bang"] }, action: { type: "inject_text", parameter: "! " }, matchMode: "inline" },
  { id: "punct_question", isDefault: true, isEnabled: true, category: "punctuation", label: "Question Mark / Interrogação", description: "Injects a question mark followed by a space", descriptionPt: "Insere um ponto de interrogação seguido de espaço", descriptionEn: "Injects a question mark followed by a space", triggers: { pt: ["interroga(ção|cao|)", "ponto\\s*de\\s*interroga"], en: ["question\\s*mark"] }, action: { type: "inject_text", parameter: "? " }, matchMode: "inline" },
  { id: "punct_open_paren", isDefault: true, isEnabled: true, category: "punctuation", label: "Open Parenthesis / Abre Parênteses", description: "", triggers: { pt: ["abre\\s*par[eê]ntese[s]?"], en: ["open\\s*paren(thesis)?", "left\\s*paren(thesis)?"] }, action: { type: "inject_text", parameter: "(" }, matchMode: "inline" },
  { id: "punct_close_paren", isDefault: true, isEnabled: true, category: "punctuation", label: "Close Parenthesis / Fecha Parênteses", description: "", triggers: { pt: ["fecha\\s*par[eê]ntese[s]?"], en: ["close\\s*paren(thesis)?", "right\\s*paren(thesis)?"] }, action: { type: "inject_text", parameter: ")" }, matchMode: "inline" },
  { id: "punct_open_quote", isDefault: true, isEnabled: true, category: "punctuation", label: "Open Quote / Abre Aspas", description: "", triggers: { pt: ["abre\\s*aspas"], en: ["open\\s*quote"] }, action: { type: "inject_text", parameter: '"' }, matchMode: "inline" },
  { id: "punct_close_quote", isDefault: true, isEnabled: true, category: "punctuation", label: "Close Quote / Fecha Aspas", description: "", triggers: { pt: ["fecha\\s*aspas"], en: ["close\\s*quote"] }, action: { type: "inject_text", parameter: '"' }, matchMode: "inline" },
  { id: "punct_em_dash", isDefault: true, isEnabled: true, category: "punctuation", label: "Em Dash / Travessão", description: "", triggers: { pt: ["trav(essão|essao|ess[aã]o)"], en: ["(em\\s*)?dash", "em\\s*dash"] }, action: { type: "inject_text", parameter: " — " }, matchMode: "inline" },
  { id: "punct_hyphen", isDefault: true, isEnabled: true, category: "punctuation", label: "Hyphen / Hífen", description: "", triggers: { pt: ["h[íi]fen"], en: ["hyphen"] }, action: { type: "inject_text", parameter: "-" }, matchMode: "inline" },
  // ───────────────────────────── navigation ─────────────────────────────
  { id: "nav_new_line", isDefault: true, isEnabled: true, category: "navigation", label: "New Line / Nova Linha", description: "Presses Enter once", descriptionPt: "Pressiona Enter uma vez", descriptionEn: "Presses Enter once", triggers: { pt: ["nova\\s*linha", "pr[oó]xima\\s*linha", "quebra\\s*de\\s*linha"], en: ["new\\s*line", "next\\s*line", "line\\s*break", "enter"] }, action: { type: "keystroke", parameter: "Enter" }, matchMode: "inline" },
  { id: "nav_new_paragraph", isDefault: true, isEnabled: true, category: "navigation", label: "New Paragraph / Novo Parágrafo", description: "Presses Enter twice", descriptionPt: "Pressiona Enter duas vezes", descriptionEn: "Presses Enter twice", triggers: { pt: ["novo\\s*par[aá]grafo", "par[aá]grafo\\s*novo", "par[aá]grafo"], en: ["new\\s*paragraph", "paragraph"] }, action: { type: "keystroke_sequence", parameter: [{ key: "Enter", delayAfter: 50 }, { key: "Enter", delayAfter: 0 }] }, matchMode: "isolated" },
  { id: "nav_tab", isDefault: true, isEnabled: true, category: "navigation", label: "Tab / Tabulação", description: "", triggers: { pt: ["tabula(ção|cao|)", "tab"], en: ["tab", "indent"] }, action: { type: "keystroke", parameter: "Tab" }, matchMode: "inline" },
  { id: "nav_home", isDefault: true, isEnabled: true, category: "navigation", label: "Beginning of Line / Início da Linha", description: "", triggers: { pt: ["in[íi]cio\\s*da\\s*linha", "come(ço|co)\\s*da\\s*linha"], en: ["beginning\\s*of\\s*(the\\s*)?line", "start\\s*of\\s*(the\\s*)?line", "home"] }, action: { type: "keystroke", parameter: "Home" }, matchMode: "isolated" },
  { id: "nav_end", isDefault: true, isEnabled: true, category: "navigation", label: "End of Line / Fim da Linha", description: "", triggers: { pt: ["fim\\s*da\\s*linha", "final\\s*da\\s*linha"], en: ["end\\s*of\\s*(the\\s*)?line"] }, action: { type: "keystroke", parameter: "End" }, matchMode: "isolated" },
  { id: "nav_doc_start", isDefault: true, isEnabled: true, category: "navigation", label: "Top of Document / Início do Documento", description: "", triggers: { pt: ["in[íi]cio\\s*do\\s*documento", "topo\\s*do\\s*documento"], en: ["(beginning|top|start)\\s*of\\s*(the\\s*)?document"] }, action: { type: "keystroke", parameter: "Ctrl+Home" }, matchMode: "isolated" },
  { id: "nav_doc_end", isDefault: true, isEnabled: true, category: "navigation", label: "End of Document / Fim do Documento", description: "", triggers: { pt: ["fim\\s*do\\s*documento", "final\\s*do\\s*documento"], en: ["(end|bottom)\\s*of\\s*(the\\s*)?document"] }, action: { type: "keystroke", parameter: "Ctrl+End" }, matchMode: "isolated" },
  // ───────────────────────────── editing ─────────────────────────────
  { id: "edit_backspace", isDefault: true, isEnabled: true, category: "editing", label: "Backspace / Apagar", description: "", triggers: { pt: ["apagar?", "deletar?", "remover?"], en: ["backspace", "delete", "erase"] }, action: { type: "keystroke", parameter: "Backspace" }, matchMode: "isolated" },
  { id: "edit_delete_word", isDefault: true, isEnabled: true, category: "editing", label: "Delete Word / Apagar Palavra", description: "", triggers: { pt: ["apagar?\\s*palavra", "deletar?\\s*palavra", "remover?\\s*palavra"], en: ["delete\\s*word", "backspace\\s*word", "erase\\s*word"] }, action: { type: "keystroke", parameter: "Ctrl+Backspace" }, matchMode: "isolated" },
  { id: "edit_delete_line", isDefault: true, isEnabled: true, category: "editing", label: "Delete Line / Apagar Linha", description: "", triggers: { pt: ["apagar?\\s*linha", "deletar?\\s*linha", "remover?\\s*linha"], en: ["delete\\s*line", "erase\\s*line", "clear\\s*line"] }, action: { type: "keystroke_sequence", parameter: [{ key: "Home", delayAfter: 30 }, { key: "Shift+End", delayAfter: 30 }, { key: "Delete", delayAfter: 0 }] }, matchMode: "isolated" },
  { id: "edit_delete_last_sentence", isDefault: true, isEnabled: true, category: "editing", label: "Delete Last Sentence / Apagar Última Frase", description: "Selects and deletes text back to the previous period, exclamation, or question mark", descriptionPt: "Seleciona e apaga o texto até a pontuação anterior", descriptionEn: "Selects and deletes text back to the previous period, exclamation, or question mark", triggers: { pt: ["apagar?\\s*[uú]ltima\\s*frase", "deletar?\\s*[uú]ltima\\s*frase", "remover?\\s*[uú]ltima\\s*frase"], en: ["delete\\s*(the\\s*)?last\\s*sentence", "erase\\s*(the\\s*)?last\\s*sentence", "remove\\s*(the\\s*)?last\\s*sentence"] }, action: { type: "vox_control", parameter: "delete_last_sentence" }, matchMode: "isolated" },
  { id: "edit_delete_all", isDefault: true, isEnabled: true, category: "editing", label: "Delete All / Apagar Tudo", description: "", triggers: { pt: ["apagar?\\s*tudo", "deletar?\\s*tudo", "limpar\\s*tudo"], en: ["delete\\s*all", "erase\\s*all", "clear\\s*all", "select\\s*all\\s*and\\s*delete"] }, action: { type: "keystroke_sequence", parameter: [{ key: "Ctrl+A", delayAfter: 50 }, { key: "Delete", delayAfter: 0 }] }, matchMode: "isolated" },
  { id: "edit_undo", isDefault: true, isEnabled: true, category: "editing", label: "Undo / Desfazer", description: "", triggers: { pt: ["desfazer?", "desfaz"], en: ["undo"] }, action: { type: "keystroke", parameter: "Ctrl+Z" }, matchMode: "isolated" },
  { id: "edit_redo", isDefault: true, isEnabled: true, category: "editing", label: "Redo / Refazer", description: "", triggers: { pt: ["refazer?", "refaz"], en: ["redo"] }, action: { type: "keystroke", parameter: "Ctrl+Y" }, matchMode: "isolated" },
  { id: "edit_select_all", isDefault: true, isEnabled: true, category: "editing", label: "Select All / Selecionar Tudo", description: "", triggers: { pt: ["selecionar?\\s*tudo", "seleciona\\s*tudo"], en: ["select\\s*all"] }, action: { type: "keystroke", parameter: "Ctrl+A" }, matchMode: "isolated" },
  { id: "edit_copy", isDefault: true, isEnabled: true, category: "editing", label: "Copy / Copiar", description: "", triggers: { pt: ["copiar?", "copia"], en: ["copy"] }, action: { type: "keystroke", parameter: "Ctrl+C" }, matchMode: "isolated" },
  { id: "edit_paste", isDefault: true, isEnabled: true, category: "editing", label: "Paste / Colar", description: "", triggers: { pt: ["colar?", "cola"], en: ["paste"] }, action: { type: "keystroke", parameter: "Ctrl+V" }, matchMode: "isolated" },
  { id: "edit_cut", isDefault: true, isEnabled: true, category: "editing", label: "Cut / Recortar", description: "", triggers: { pt: ["recortar?", "recorta"], en: ["cut"] }, action: { type: "keystroke", parameter: "Ctrl+X" }, matchMode: "isolated" },
  { id: "edit_bold", isDefault: true, isEnabled: true, category: "editing", label: "Bold / Negrito", description: "", triggers: { pt: ["negrito"], en: ["bold"] }, action: { type: "keystroke", parameter: "Ctrl+B" }, matchMode: "isolated" },
  { id: "edit_italic", isDefault: true, isEnabled: true, category: "editing", label: "Italic / Itálico", description: "", triggers: { pt: ["it[aá]lico"], en: ["italic"] }, action: { type: "keystroke", parameter: "Ctrl+I" }, matchMode: "isolated" },
  { id: "edit_underline", isDefault: true, isEnabled: true, category: "editing", label: "Underline / Sublinhado", description: "", triggers: { pt: ["sublinhado", "sublinhar?"], en: ["underline"] }, action: { type: "keystroke", parameter: "Ctrl+U" }, matchMode: "isolated" },
  { id: "edit_save", isDefault: true, isEnabled: true, category: "editing", label: "Save / Salvar", description: "", triggers: { pt: ["salvar?", "salva", "guardar?"], en: ["save"] }, action: { type: "keystroke", parameter: "Ctrl+S" }, matchMode: "isolated" },
  // ───────────────────────────── vox_control ─────────────────────────────
  { id: "vox_stop", isDefault: true, isEnabled: true, category: "vox_control", label: "Stop Recording / Parar Gravação", description: "", triggers: { pt: ["parar?\\s*grava(ção|cao)", "terminar?\\s*grava(ção|cao)", "para\\s*grava(ção|cao)", "para"], en: ["stop\\s*recording", "stop", "finish\\s*recording", "done"] }, action: { type: "vox_control", parameter: "stop" }, matchMode: "isolated" },
  { id: "vox_cancel", isDefault: true, isEnabled: true, category: "vox_control", label: "Cancel / Cancelar", description: "Stops recording and discards the transcription without injecting", descriptionPt: "Para a gravação e descarta a transcrição sem injetar", descriptionEn: "Stops recording and discards the transcription without injecting", triggers: { pt: ["cancelar?", "cancela", "descartar?", "descarta"], en: ["cancel", "abort", "discard", "never\\s*mind"] }, action: { type: "vox_control", parameter: "cancel" }, matchMode: "isolated" },
  { id: "vox_clear", isDefault: true, isEnabled: true, category: "vox_control", label: "Clear / Limpar", description: "Clears the current transcription buffer without stopping", descriptionPt: "Limpa o buffer de transcrição atual sem parar", descriptionEn: "Clears the current transcription buffer without stopping", triggers: { pt: ["limpar?", "limpa"], en: ["clear"] }, action: { type: "vox_control", parameter: "clear" }, matchMode: "isolated" },
  { id: "vox_repeat", isDefault: true, isEnabled: true, category: "vox_control", label: "Repeat / Repetir", description: "Re-injects the last successful transcription", descriptionPt: "Reinserir a última transcrição bem-sucedida", descriptionEn: "Re-injects the last successful transcription", triggers: { pt: ["repetir?", "repete", "dizer?\\s*novamente", "diz\\s*novamente"], en: ["repeat", "say\\s*(that\\s*)?again", "again"] }, action: { type: "vox_control", parameter: "repeat" }, matchMode: "isolated" },
  { id: "vox_mode_code", isDefault: true, isEnabled: true, category: "vox_control", label: "Code Mode / Modo Código", description: "", triggers: { pt: ["modo\\s*c[oó]digo", "ativar?\\s*modo\\s*c[oó]digo"], en: ["code\\s*mode", "coding\\s*mode", "switch\\s*to\\s*code"] }, action: { type: "change_profile", parameter: "code" }, matchMode: "isolated" },
  { id: "vox_mode_text", isDefault: true, isEnabled: true, category: "vox_control", label: "Text Mode / Modo Texto", description: "", triggers: { pt: ["modo\\s*texto", "ativar?\\s*modo\\s*texto", "modo\\s*prosa"], en: ["text\\s*mode", "prose\\s*mode", "switch\\s*to\\s*text"] }, action: { type: "change_profile", parameter: "text" }, matchMode: "isolated" },
  { id: "vox_mode_email", isDefault: true, isEnabled: true, category: "vox_control", label: "Email Mode / Modo Email", description: "", triggers: { pt: ["modo\\s*email", "ativar?\\s*modo\\s*email"], en: ["email\\s*mode", "switch\\s*to\\s*email"] }, action: { type: "change_profile", parameter: "email" }, matchMode: "isolated" },
  { id: "template_deactivate", isDefault: true, isEnabled: true, category: "vox_control", label: "Deactivate Template / Desativar Template", description: "", triggers: { pt: ["desativar template", "sem template", "ditado livre", "modo padrão", "remover template"], en: ["deactivate template", "no template", "free dictation", "default mode", "remove template"] }, action: { type: "vox_control", parameter: "deactivate_template" }, matchMode: "isolated" },
  { id: "vox_mode_code", isDefault: true, isEnabled: true, category: "vox_control", label: "Code Mode / Modo Código", description: "", triggers: { pt: ["modo\\s*c[oó]digo", "ativar?\\s*modo\\s*c[oó]digo"], en: ["code\\s*mode", "coding\\s*mode", "switch\\s*to\\s*code"] }, action: { type: "change_profile", parameter: "code" }, matchMode: "isolated" },
  { id: "vox_mode_text", isDefault: true, isEnabled: true, category: "vox_control", label: "Text Mode / Modo Texto", description: "", triggers: { pt: ["modo\\s*texto", "ativar?\\s*modo\\s*texto", "modo\\s*prosa"], en: ["text\\s*mode", "prose\\s*mode", "switch\\s*to\\s*text"] }, action: { type: "change_profile", parameter: "text" }, matchMode: "isolated" },
  { id: "vox_mode_email", isDefault: true, isEnabled: true, category: "vox_control", label: "Email Mode / Modo Email", description: "", triggers: { pt: ["modo\\s*email", "ativar?\\s*modo\\s*email"], en: ["email\\s*mode", "switch\\s*to\\s*email"] }, action: { type: "change_profile", parameter: "email" }, matchMode: "isolated" },
  { id: "template_deactivate", isDefault: true, isEnabled: true, category: "vox_control", label: "Deactivate Template / Desativar Template", description: "", triggers: { pt: ["desativar template", "sem template", "ditado livre", "modo padrão", "remover template"], en: ["deactivate template", "no template", "free dictation", "default mode", "remove template"] }, action: { type: "vox_control", parameter: "deactivate_template" }, matchMode: "isolated" },
  // ───────────────────────────── snippets (dynamic) ─────────────────────────────
  { id: "snippet_date", isDefault: true, isEnabled: true, category: "snippets", label: "Insert Date / Inserir Data", description: "", triggers: { pt: ["inserir?\\s*data", "insere\\s*data", "data\\s*de\\s*hoje"], en: ["insert\\s*(the\\s*)?date", "today'?s?\\s*date", "current\\s*date"] }, action: { type: "insert_dynamic", parameter: "date" }, matchMode: "isolated" },
  { id: "snippet_time", isDefault: true, isEnabled: true, category: "snippets", label: "Insert Time / Inserir Hora", description: "", triggers: { pt: ["inserir?\\s*hora", "insere\\s*hora", "hora\\s*atual"], en: ["insert\\s*(the\\s*)?time", "current\\s*time"] }, action: { type: "insert_dynamic", parameter: "time" }, matchMode: "isolated" },
  { id: "snippet_datetime", isDefault: true, isEnabled: true, category: "snippets", label: "Insert Date and Time / Inserir Data e Hora", description: "", triggers: { pt: ["inserir?\\s*data\\s*e\\s*hora", "data\\s*e\\s*hora"], en: ["insert\\s*(date\\s*and\\s*time|datetime)", "date\\s*and\\s*time"] }, action: { type: "insert_dynamic", parameter: "datetime" }, matchMode: "isolated" },
  { id: "snippet_signature", isDefault: true, isEnabled: true, category: "snippets", label: "Insert Signature / Inserir Assinatura", description: "", triggers: { pt: ["inserir?\\s*assinatura", "insere\\s*assinatura", "minha\\s*assinatura"], en: ["insert\\s*(my\\s*)?signature", "my\\s*signature"] }, action: { type: "inject_snippet", parameter: "signature" }, matchMode: "isolated" },
  { id: "snippet_email_address", isDefault: true, isEnabled: true, category: "snippets", label: "Insert Email Address / Inserir Email", description: "", triggers: { pt: ["inserir?\\s*(meu\\s*)?e?\\s*mail", "insere\\s*(meu\\s*)?e?\\s*mail"], en: ["insert\\s*(my\\s*)?email(\\s*address)?", "my\\s*email"] }, action: { type: "inject_snippet", parameter: "email_address" }, matchMode: "isolated" },
  { id: "snippet_address", isDefault: true, isEnabled: true, category: "snippets", label: "Insert Address / Inserir Endereço", description: "", triggers: { pt: ["inserir?\\s*(meu\\s*)?endere(ço|co)", "insere\\s*endere(ço|co)"], en: ["insert\\s*(my\\s*)?address", "my\\s*address"] }, action: { type: "inject_snippet", parameter: "address" }, matchMode: "isolated" },
  // ───────────────────────────── system ─────────────────────────────
  { id: "sys_terminal", isDefault: true, isEnabled: true, category: "system", label: "Open Terminal / Abrir Terminal", description: "", triggers: { pt: ["abrir?\\s*terminal", "abre\\s*terminal"], en: ["open\\s*terminal", "open\\s*(the\\s*)?console"] }, action: { type: "open_app", parameter: "terminal" }, matchMode: "isolated" },
  { id: "sys_browser", isDefault: true, isEnabled: true, category: "system", label: "Open Browser / Abrir Navegador", description: "", triggers: { pt: ["abrir?\\s*navegador", "abre\\s*navegador", "abrir?\\s*browser"], en: ["open\\s*(the\\s*)?(browser|web\\s*browser)"] }, action: { type: "open_app", parameter: "browser" }, matchMode: "isolated" },
  { id: "sys_explorer", isDefault: true, isEnabled: true, category: "system", label: "Open File Explorer / Abrir Explorador", description: "", triggers: { pt: ["abrir?\\s*explorador", "abre\\s*explorador", "abrir?\\s*arquivos", "abrir?\\s*pasta"], en: ["open\\s*(the\\s*)?(file\\s*)?explorer", "open\\s*(the\\s*)?finder"] }, action: { type: "open_app", parameter: "explorer" }, matchMode: "isolated" },
  { id: "sys_screenshot", isDefault: true, isEnabled: true, category: "system", label: "Take Screenshot / Tirar Print", description: "", triggers: { pt: ["tirar?\\s*print", "tira\\s*print", "captura\\s*de\\s*tela", "screenshot"], en: ["(take\\s*(a\\s*)?)?screenshot", "print\\s*screen"] }, action: { type: "keystroke", parameter: "PrintScreen" }, matchMode: "isolated" }
];
function applyOverrides() {
  const overrides = listDefaultOverrides();
  const overrideMap = new Map(overrides.map((o) => [o.commandId, o]));
  const defaults = DEFAULT_COMMANDS.map((cmd) => {
    const o = overrideMap.get(cmd.id);
    if (!o) return cmd;
    return {
      ...cmd,
      isEnabled: o.isEnabled,
      matchMode: o.matchMode || cmd.matchMode
    };
  });
  return [...defaults, ...listCustomCommands()];
}
function getAllCommands() {
  return applyOverrides();
}
function getEnabledCommands() {
  return applyOverrides().filter((c) => c.isEnabled);
}
function setEnabled(id, enabled) {
  const current = getAllCommands().find((c) => c.id === id);
  if (!current) return;
  if (current.isDefault) {
    setDefaultOverride(id, enabled, current.matchMode);
  } else {
    saveCustomCommand({ ...current, isEnabled: enabled });
  }
}
function setMatchMode(id, mode) {
  const current = getAllCommands().find((c) => c.id === id);
  if (!current) return;
  if (current.isDefault) {
    setDefaultOverride(id, current.isEnabled, mode);
  } else {
    saveCustomCommand({ ...current, matchMode: mode });
  }
}
function addCustomCommand(command) {
  const full = {
    id: command.id || crypto.randomUUID(),
    isDefault: false,
    isEnabled: command.isEnabled ?? true,
    category: command.category || "custom",
    label: command.label || "Untitled",
    description: command.description || "",
    triggers: command.triggers || { pt: [], en: [] },
    action: command.action || { type: "inject_text", parameter: "" },
    matchMode: command.matchMode || "isolated",
    createdAt: command.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveCustomCommand(full);
  return full;
}
function updateCustomCommand(id, command) {
  const existing = listCustomCommands().find((c) => c.id === id);
  if (!existing) return;
  saveCustomCommand({ ...existing, ...command, id, isDefault: false, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
}
function deleteCustomCommand(id) {
  deleteCustomCommand$1(id);
}
function getAll() {
  return listSnippets();
}
function save(snippet) {
  saveSnippet(snippet);
  return snippet;
}
function remove(id) {
  deleteSnippet(id);
}
const SAMPLE_RATE = 16e3;
const MAX_BUFFER_SECONDS = 3;
const MIN_UTTERANCE_SECONDS = 0.3;
const SILENCE_END_SECONDS = 0.4;
const LEAD_IN_SECONDS = 0.15;
const KEYWORD_VARIANTS = ["vox", "vocs", "voks", "voxs"];
function float32ToWav(samples, sampleRate = SAMPLE_RATE) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(s < 0 ? s * 32768 : s * 32767, 44 + i * 2);
  }
  return buffer;
}
class WakeWordDetector extends events.EventEmitter {
  active = false;
  paused = false;
  sensitivity = 0.5;
  vadThreshold = 0.025;
  modelLoaded = false;
  audioBuffer = [];
  maxBufferSamples = SAMPLE_RATE * MAX_BUFFER_SECONDS;
  minUtteranceSamples = Math.floor(SAMPLE_RATE * MIN_UTTERANCE_SECONDS);
  silenceSamples = Math.floor(SAMPLE_RATE * SILENCE_END_SECONDS);
  leadInSamples = Math.floor(SAMPLE_RATE * LEAD_IN_SECONDS);
  currentIndex = 0;
  lastSpeechIndex = -1;
  utteranceStartIndex = -1;
  hasSpeech = false;
  transcribing = false;
  lastTriggerTime = 0;
  cooldownMs = 2500;
  warnedNoApiKey = false;
  constructor() {
    super();
  }
  async init(_modelPath, sensitivity) {
    if (sensitivity !== void 0) {
      this.setSensitivity(sensitivity);
    }
    this.modelLoaded = true;
    return true;
  }
  setSensitivity(value) {
    const normalized = Math.max(0, Math.min(1, value));
    this.sensitivity = normalized;
    this.vadThreshold = 0.04 - normalized * 0.03;
    console.log(`[WakeWord] Sensibilidade ajustada: ${Math.round(normalized * 100)}% (VAD Threshold: ${this.vadThreshold.toFixed(3)})`);
  }
  isListening() {
    return this.active && !this.paused;
  }
  isModelLoaded() {
    return this.modelLoaded;
  }
  start() {
    if (this.active) return;
    this.active = true;
    this.paused = false;
    this.resetBuffer();
    console.log('[WakeWord] Escuta em segundo plano ativa para a palavra "Vox".');
  }
  stop() {
    this.active = false;
    this.paused = false;
    this.resetBuffer();
    console.log("[WakeWord] Escuta de Wake Word encerrada.");
  }
  pause() {
    if (!this.active) return;
    this.paused = true;
    this.resetBuffer();
    console.log("[WakeWord] Listener pausado temporariamente durante gravação de áudio.");
  }
  resume() {
    if (!this.active) return;
    this.paused = false;
    this.resetBuffer();
    console.log("[WakeWord] Listener retomado.");
  }
  processAudioChunk(chunk) {
    if (!this.active || this.paused) return;
    const samplesCount = Math.floor(chunk.length / 2);
    if (samplesCount === 0) return;
    let sumSq = 0;
    for (let i = 0; i < samplesCount; i++) {
      const sample = chunk.readInt16LE(i * 2) / 32768;
      this.audioBuffer.push(sample);
      sumSq += sample * sample;
    }
    this.currentIndex += samplesCount;
    if (this.audioBuffer.length > this.maxBufferSamples) {
      this.audioBuffer.splice(0, this.audioBuffer.length - this.maxBufferSamples);
    }
    const rms = Math.sqrt(sumSq / samplesCount);
    if (rms > this.vadThreshold) {
      if (!this.hasSpeech) {
        this.utteranceStartIndex = Math.max(0, this.currentIndex - samplesCount);
      }
      this.hasSpeech = true;
      this.lastSpeechIndex = this.currentIndex;
    }
    if (this.hasSpeech && !this.transcribing && this.currentIndex - this.lastSpeechIndex >= this.silenceSamples) {
      this.onUtteranceEnd();
    }
  }
  resetBuffer() {
    this.audioBuffer = [];
    this.currentIndex = 0;
    this.lastSpeechIndex = -1;
    this.utteranceStartIndex = -1;
    this.hasSpeech = false;
  }
  async onUtteranceEnd() {
    const now = Date.now();
    if (now - this.lastTriggerTime < this.cooldownMs) {
      this.hasSpeech = false;
      return;
    }
    const bufferStart = this.currentIndex - this.audioBuffer.length;
    let startOffset = 0;
    if (this.utteranceStartIndex >= 0) {
      startOffset = Math.max(0, this.utteranceStartIndex - bufferStart - this.leadInSamples);
    }
    const utterance = this.audioBuffer.slice(startOffset);
    if (utterance.length < this.minUtteranceSamples) {
      this.hasSpeech = false;
      return;
    }
    const apiKey = getSetting("apiKey", "").trim();
    if (!apiKey) {
      if (!this.warnedNoApiKey) {
        this.warnedNoApiKey = true;
        console.warn('[WakeWord] API Key não configurada — a detecção da palavra "Vox" depende da transcrição (Groq).');
      }
      this.hasSpeech = false;
      this.resetBuffer();
      return;
    }
    this.transcribing = true;
    this.resetBuffer();
    try {
      const wav = float32ToWav(utterance);
      const result = await transcribeAudio(wav);
      const text = (result.text || "").trim();
      console.log("[WakeWord] Transcrição para detecção:", text);
      if (this.matchesKeyword(text)) {
        this.triggerDetection();
      }
    } catch (err) {
      console.warn("[WakeWord] Falha ao transcrever para detecção:", err);
    } finally {
      this.transcribing = false;
    }
  }
  matchesKeyword(text) {
    if (!text || text.startsWith("[")) return false;
    const normalized = text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!normalized) return false;
    const words = normalized.split(" ");
    return words.some((w) => KEYWORD_VARIANTS.includes(w));
  }
  triggerDetection() {
    const now = Date.now();
    this.lastTriggerTime = now;
    console.log('[WakeWord] Palavra "Vox" detectada!');
    this.emit("detected", { keyword: "Vox", timestamp: now });
  }
}
const wakewordDetector = new WakeWordDetector();
const { app: app$1, ipcMain: ipcMain$1 } = require("electron");
function initAutoUpdater(getMainWindow) {
  electronUpdater.autoUpdater.autoDownload = true;
  electronUpdater.autoUpdater.autoInstallOnAppQuit = true;
  const notify = (data) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("vox:updater-status", data);
    }
  };
  electronUpdater.autoUpdater.on("checking-for-update", () => {
    notify({ status: "checking" });
  });
  electronUpdater.autoUpdater.on("update-available", (info) => {
    notify({ status: "available", version: info.version });
  });
  electronUpdater.autoUpdater.on("update-not-available", (info) => {
    notify({ status: "not-available", version: info?.version });
  });
  electronUpdater.autoUpdater.on("download-progress", (progressObj) => {
    notify({
      status: "downloading",
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond
    });
  });
  electronUpdater.autoUpdater.on("update-downloaded", (info) => {
    notify({ status: "downloaded", version: info.version });
  });
  electronUpdater.autoUpdater.on("error", (err) => {
    let msg = err?.message || "Erro ao conectar ao servidor de atualizações.";
    if (msg.includes("404") && msg.includes("releases.atom")) {
      msg = "Repositório privado: as releases precisam ser públicas para download automático.";
    }
    notify({ status: "error", error: msg });
  });
  ipcMain$1.handle("vox:check-for-updates", async () => {
    if (!app$1.isPackaged) {
      return { success: false, message: "Em modo de desenvolvimento (não empacotado)" };
    }
    try {
      const result = await electronUpdater.autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (e) {
      let msg = e?.message || "Erro ao verificar atualizações.";
      if (msg.includes("404") && msg.includes("releases.atom")) {
        msg = "Repositório privado: as releases precisam ser públicas para download automático.";
      }
      return { success: false, error: msg };
    }
  });
  ipcMain$1.handle("vox:restart-and-install-update", () => {
    electronUpdater.autoUpdater.quitAndInstall(true, true);
  });
  if (app$1.isPackaged) {
    setTimeout(() => {
      electronUpdater.autoUpdater.checkForUpdatesAndNotify().catch((e) => {
        console.warn("[AutoUpdater] Falha na checagem automática inicial:", e);
      });
    }, 6e3);
  }
}
const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage } = require("electron");
const execFileAsync = util.promisify(child_process.execFile);
let mainWindow = null;
let dockWindow = null;
let clipboardWindow = null;
let tray = null;
let targetWindowRef = null;
let isQuitting = false;
let isDockHiding = false;
async function captureActiveWindow() {
  try {
    const psScript = [
      "$src = @'",
      "using System;",
      "using System.Text;",
      "using System.Runtime.InteropServices;",
      "public static class VOXWin {",
      '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
      '  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);',
      '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);',
      "}",
      "'@",
      "Add-Type -TypeDefinition $src",
      "$h = [VOXWin]::GetForegroundWindow()",
      'if ($h -eq [IntPtr]::Zero) { Write-Output "||"; exit }',
      "$sb = New-Object System.Text.StringBuilder 512",
      "[void][VOXWin]::GetWindowText($h, $sb, 512)",
      "$pid2 = [uint32]0",
      "[void][VOXWin]::GetWindowThreadProcessId($h, [ref]$pid2)",
      "$p = Get-Process -Id $pid2 -ErrorAction SilentlyContinue",
      'Write-Output ("{0}|{1}|{2}" -f $h, $sb.ToString(), $p.ProcessName)'
    ].join("\n");
    const encoded = Buffer.from(psScript, "utf16le").toString("base64");
    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-EncodedCommand", encoded], { timeout: 2500, encoding: "utf8" });
    const parts = stdout.trim().split("|");
    const hwnd = parts[0];
    const processName = parts[parts.length - 1];
    const title = parts.slice(1, -1).join("|");
    targetWindowRef = hwnd && hwnd !== "0" ? { hwnd, title: title?.trim() || void 0, processName: processName?.trim() || void 0 } : null;
  } catch {
    targetWindowRef = null;
  }
  return targetWindowRef;
}
const getDevUrl = () => process.env["ELECTRON_RENDERER_URL"] || process.env["VITE_DEV_SERVER_URL"];
function getAppIconPath() {
  return app.isPackaged ? path.join(process.resourcesPath, "Logo-Vox1.ico") : path.join(app.getAppPath(), "src/assets/Logo-Vox1.ico");
}
async function disableWindowsShadow(win) {
  if (process.platform !== "win32" || !win) return;
  try {
    const handle = win.getNativeWindowHandle();
    const hwnd = handle.length >= 8 ? handle.readBigUInt64LE(0).toString() : handle.readUInt32LE(0).toString();
    const psScript = [
      "$src = @'",
      "using System;",
      "using System.Runtime.InteropServices;",
      "public static class VoxDwm {",
      '  [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int val, int size);',
      "}",
      "'@",
      "Add-Type -TypeDefinition $src",
      "$policy = 1",
      `[void][VoxDwm]::DwmSetWindowAttribute([IntPtr]${hwnd}, 2, [ref]$policy, 4)`
    ].join("\n");
    const encoded = Buffer.from(psScript, "utf16le").toString("base64");
    await execFileAsync("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-EncodedCommand", encoded], { timeout: 2e3, encoding: "utf8" });
  } catch (err) {
    console.warn("[Main] Falha ao remover sombra da janela:", err);
  }
}
function hideMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("vox:window-visibility", false);
  mainWindow.hide();
}
function showMainWindow() {
  if (mainWindow && mainWindow.isDestroyed()) {
    mainWindow = null;
  }
  if (!mainWindow) {
    createMainWindow();
  }
  if (!mainWindow) return;
  mainWindow.webContents.send("vox:window-visibility", true);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    maximizable: true,
    minimizable: true,
    autoHideMenuBar: true,
    title: "Vox",
    icon: getAppIconPath(),
    backgroundColor: "#0D0D0F",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true
    }
  });
  mainWindow?.setMenu(null);
  mainWindow?.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      hideMainWindow();
    }
  });
  const devUrl = getDevUrl();
  if (devUrl) {
    mainWindow?.loadURL(devUrl);
  } else {
    mainWindow?.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
function positionDockWindow() {
  if (!dockWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const dockWidth = 220;
  const dockHeight = 70;
  const x = Math.round((width - dockWidth) / 2);
  const y = height - dockHeight - 40;
  dockWindow.setBounds({ x, y, width: dockWidth, height: dockHeight });
}
function createDockWindow() {
  dockWindow = new BrowserWindow({
    width: 220,
    height: 70,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  void disableWindowsShadow(dockWindow);
  const devUrl = getDevUrl();
  if (devUrl) {
    dockWindow?.loadURL(`${devUrl}#/dock`);
  } else {
    dockWindow?.loadFile(path.join(__dirname, "../renderer/index.html"), { hash: "dock" });
  }
  positionDockWindow();
}
function showDock() {
  if (!dockWindow) return;
  isDockHiding = false;
  if (dockWindow.isVisible()) return;
  positionDockWindow();
  if (dockWindow.isMinimized()) dockWindow.restore();
  dockWindow.showInactive();
  dockWindow.setAlwaysOnTop(true, "screen-saver");
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send("vox:dock-show");
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:dock-show");
  }
}
function hideDock() {
  if (!dockWindow) return;
  if (!dockWindow.isVisible() || isDockHiding) return;
  isDockHiding = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:dock-hide");
  }
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send("vox:dock-hide");
  }
  setTimeout(() => {
    dockWindow?.hide();
    isDockHiding = false;
  }, 280);
}
function positionClipboardWindow() {
  if (!clipboardWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const winWidth = 420;
  const winHeight = 480;
  const x = Math.round((width - winWidth) / 2);
  const y = Math.round((height - winHeight) / 2);
  clipboardWindow.setBounds({ x, y, width: winWidth, height: winHeight });
}
function createClipboardWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 480,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenu(null);
  void disableWindowsShadow(win);
  win.on("close", (e) => {
    e.preventDefault();
    win.hide();
  });
  win.on("blur", () => {
    hideClipboardHistory();
  });
  const devUrl = getDevUrl();
  if (devUrl) {
    win.loadURL(`${devUrl}#/clipboard`);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"), { hash: "clipboard" });
  }
  clipboardWindow = win;
  positionClipboardWindow();
}
function showClipboardHistory() {
  if (!clipboardWindow) return;
  void captureActiveWindow();
  positionClipboardWindow();
  if (clipboardWindow.isMinimized()) clipboardWindow.restore();
  clipboardWindow.show();
  clipboardWindow.setAlwaysOnTop(true, "screen-saver");
  clipboardWindow.focus();
  if (!clipboardWindow.isDestroyed()) {
    clipboardWindow.webContents.send("vox:clipboard-refresh");
  }
}
function hideClipboardHistory() {
  if (clipboardWindow && clipboardWindow.isVisible()) {
    clipboardWindow.hide();
  }
}
function toggleClipboardHistory() {
  if (clipboardWindow && clipboardWindow.isVisible()) {
    hideClipboardHistory();
  } else {
    showClipboardHistory();
  }
}
const APP_CONTEXT_RULES = [
  { category: "a code editor or IDE", keywords: ["code", "visual studio", "vscode", "intellij", "pycharm", "webstorm", "phpstorm", "goland", "rider", "sublime", "notepad++", "vim", "neovim", "emacs", "atom", "eclipse", "android studio", "xcode", "cursor"] },
  { category: "an email message", keywords: ["outlook", "gmail", "thunderbird", "mail", "proton", "postbox"] },
  { category: "a text document", keywords: ["word", "winword", "docs", "writer", "libreoffice", "pages", "notion", "onenote", "obsidian", "typora", "scrivener"] },
  { category: "a chat or messaging app", keywords: ["slack", "teams", "discord", "whatsapp", "telegram", "messenger", "signal", "skype", "zoom"] },
  { category: "a terminal or shell", keywords: ["terminal", "cmd", "powershell", "iterm", "konsole", "bash", "zsh", "alacritty", "kitty", "windows terminal", "wezterm"] }
];
const PROFILE_CONTEXT = {
  code: "a code editor",
  text: "a text document",
  email: "an email message"
};
let activeProfile = null;
function buildContextHint(ref) {
  if (activeProfile && PROFILE_CONTEXT[activeProfile]) {
    return PROFILE_CONTEXT[activeProfile];
  }
  const candidates = [ref?.processName, ref?.title].map((s) => (s || "").trim()).filter(Boolean);
  if (candidates.length === 0) return "the active application";
  const name = candidates[0];
  const searchable = candidates.join(" ").toLowerCase();
  for (const rule of APP_CONTEXT_RULES) {
    if (rule.keywords.some((k) => searchable.includes(k))) {
      return `${rule.category} (${name})`;
    }
  }
  return `the "${name}" application`;
}
function handleChangeProfile(profile) {
  activeProfile = profile;
  console.log("[Main] Perfil ativo alterado:", profile);
}
function applyActiveTemplate(id, by = "ui") {
  templateManager.setActiveTemplate(id);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:template-changed", {
      templateId: id,
      activatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      activatedBy: by
    });
  }
}
let lastSuccessfulTranscription = "";
function handleVoxControl(action) {
  switch (action) {
    case "stop":
      hideDock();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:stop-recording");
      }
      break;
    case "cancel":
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:cancel-recording");
      }
      break;
    case "clear":
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:clear-buffer");
      }
      break;
    case "deactivate_template":
      applyActiveTemplate(null, "voice");
      break;
    default:
      if (action.startsWith("activate_template:")) {
        applyActiveTemplate(action.split(":")[1], "voice");
      } else {
        console.warn("[Main] Ação vox_control desconhecida:", action);
      }
  }
}
async function processCommandSegments(parseResult, language) {
  const snippets = getAll();
  let cancelled = false;
  for (const seg of parseResult.segments) {
    if (cancelled) break;
    if (seg.type === "command" && seg.command) {
      if (seg.command.action.type === "vox_control" && seg.command.action.parameter === "cancel") {
        cancelled = true;
        break;
      }
      await commandExecutor.execute(seg.command, {
        windowRef: targetWindowRef || {},
        lastTranscription: lastSuccessfulTranscription,
        language,
        snippets
      });
    } else if (seg.type === "content" && seg.contentText) {
      const corrected = await correctTranscription(seg.contentText, buildContextHint(targetWindowRef), templateManager.getActiveTemplate());
      if (corrected) {
        recordCorrections(seg.contentText, corrected);
        await injectText(corrected, targetWindowRef || void 0);
        lastSuccessfulTranscription = corrected;
      }
    }
  }
  return cancelled;
}
async function processTranscriptionResult(buffer) {
  if (!buffer || buffer.length === 0) return { text: "" };
  const result = await transcribeAudio(buffer);
  const rawText = result.text;
  console.log("[Main] Transcrição bruta:", result.text);
  if (result.text && !result.text.startsWith("[Erro")) {
    const inlineMode = getSetting("commandInlineMode", "false") === "true";
    const parser = new CommandParser(getEnabledCommands(), inlineMode);
    const appLang = getSetting("language", "pt-BR") === "en" ? "en" : "pt";
    let textToProcess = result.text;
    const activation = templateManager.resolveVoiceActivation(result.text, appLang);
    if (activation) {
      applyActiveTemplate(activation.templateId === "none" ? null : activation.templateId, "voice");
      textToProcess = activation.remainingText;
      if (!textToProcess) {
        result.text = "";
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("vox:transcript-result", "");
          mainWindow.webContents.send("vox:transcription-done", {
            rawText,
            segments: [],
            hadCommands: true
          });
        }
        return result;
      }
    }
    const parseResult = parser.parse(textToProcess, "auto");
    const language = parser.getDetectedLanguage();
    if (parseResult.hasCommands) {
      const cancelled = await processCommandSegments(parseResult, language);
      if (!cancelled && rawText) {
        const sessionData = {
          id: crypto.randomUUID(),
          type: "dictation",
          title: rawText.slice(0, 60),
          text: rawText,
          rawText,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        saveSession(sessionData);
      }
      result.text = "";
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:transcript-result", "");
        mainWindow.webContents.send("vox:transcription-done", {
          rawText,
          segments: parseResult.segments,
          hadCommands: parseResult.hasCommands
        });
      }
      return result;
    }
    result.text = await correctTranscription(textToProcess, buildContextHint(targetWindowRef), templateManager.getActiveTemplate());
    console.log("[Main] Transcrição corrigida:", result.text);
    if (rawText && result.text && rawText !== result.text) {
      recordCorrections(rawText, result.text);
    }
  }
  if (result.text) {
    const sessionData = {
      id: crypto.randomUUID(),
      type: "dictation",
      title: result.text.slice(0, 60),
      text: result.text,
      rawText: rawText || result.text,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveSession(sessionData);
    const injectRes = await injectText(result.text, targetWindowRef || void 0);
    if (!injectRes.success) {
      console.warn("[Main] Falha ao injetar texto:", injectRes.error);
    }
    lastSuccessfulTranscription = result.text;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:transcript-result", result.text);
    }
  }
  return result;
}
async function fetchAvailableModels() {
  const provider = resolveProvider();
  if (provider.requiresApiKey && !provider.apiKey) {
    return { stt: [], llm: [], error: "no-api-key" };
  }
  const response = await fetch(getModelsEndpoint(), {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    console.warn(`[Main] Erro ao listar modelos (${response.status})`);
    return { stt: [], llm: [], error: `http-${response.status}` };
  }
  const data = await response.json();
  const list = Array.isArray(data?.data) ? data.data : [];
  const stt = [];
  const llm = [];
  for (const m of list) {
    const id = (m.id || "").trim();
    if (!id || m.active === false) continue;
    if (/whisper|distil-whisper/i.test(id)) {
      stt.push(id);
    } else {
      llm.push(id);
    }
  }
  return { stt: stt.sort(), llm: llm.sort() };
}
function setupIpcHandlers() {
  recorder.on("energy", (data) => {
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.webContents.send("vox:volume-update", data);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:volume-update", data);
    }
  });
  ipcMain.handle("vox:start-recording", () => {
    console.log("[Main] IPC vox:start-recording acionado");
    recorder.startRecording();
    showDock();
    return true;
  });
  ipcMain.handle("vox:stop-recording", async (_event, audioData) => {
    console.log("[Main] IPC vox:stop-recording acionado");
    hideDock();
    const hadSpeech = recorder.getHasSpoken();
    let buffer;
    if (audioData && audioData.byteLength > 0) {
      buffer = Buffer.from(audioData);
      recorder.stopRecording();
    } else {
      buffer = recorder.stopRecording();
    }
    if (!hadSpeech) {
      console.log("[Main] Nenhuma fala detectada, ignorando transcrição.");
      return { text: "" };
    }
    return processTranscriptionResult(buffer);
  });
  ipcMain.on("vox:audio-level", (_event, energy) => {
    const data = { energy, isSpeech: energy > 0.02 };
    recorder.reportSpeech(data.isSpeech);
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.webContents.send("vox:volume-update", data);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:volume-update", data);
    }
  });
  ipcMain.on("vox:audio-chunk", (_event, chunk) => {
    if (chunk) {
      const buf = Buffer.from(chunk);
      recorder.processAudioChunk(buf);
      if (wakewordDetector.isListening()) {
        wakewordDetector.processAudioChunk(buf);
      }
    }
  });
  ipcMain.on("vox:wakeword-audio-chunk", (_event, chunk) => {
    if (chunk && wakewordDetector.isListening()) {
      wakewordDetector.processAudioChunk(Buffer.from(chunk));
    }
  });
  ipcMain.handle("vox:transcribe-chunk", async (_event, audioData) => {
    if (!audioData || audioData.byteLength < 1e3) return { text: "" };
    try {
      const buffer = Buffer.from(audioData);
      const result = await transcribeAudio(buffer);
      const text = result.text || "";
      if (text && !text.startsWith("[Erro")) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("vox:partial-transcript", text);
        }
        if (dockWindow && !dockWindow.isDestroyed()) {
          dockWindow.webContents.send("vox:partial-transcript", text);
        }
      }
      return { text };
    } catch (error) {
      console.error("[Main] Erro na transcrição parcial:", error);
      return { text: "" };
    }
  });
  ipcMain.handle("vox:show-dock", () => {
    showDock();
    return true;
  });
  ipcMain.handle("vox:hide-dock", () => {
    hideDock();
    return true;
  });
  ipcMain.handle("vox:minimize", () => {
    mainWindow?.minimize();
    return true;
  });
  ipcMain.handle("vox:get-settings", async () => {
    try {
      return getAllSettings();
    } catch (err) {
      console.error("[Main] Erro ao obter configurações do banco:", err);
      return {};
    }
  });
  ipcMain.handle("vox:save-settings", async (_event, settings) => {
    try {
      if (settings && typeof settings === "object") {
        for (const [key, value] of Object.entries(settings)) {
          setSetting(key, String(value));
        }
        if (settings.wakeWordSensitivity) {
          wakewordDetector.setSensitivity(parseFloat(settings.wakeWordSensitivity));
        }
        if (settings.wakeWordEnabled === "true") {
          if (!wakewordDetector.isModelLoaded()) {
            wakewordDetector.init().then((loaded) => {
              if (loaded) wakewordDetector.start();
            });
          } else {
            wakewordDetector.start();
          }
        } else if (settings.wakeWordEnabled === "false") {
          wakewordDetector.stop();
        }
        if (settings.autoStartEnabled) {
          const autoStart = settings.autoStartEnabled === "true";
          try {
            app.setLoginItemSettings({
              openAtLogin: autoStart,
              path: process.execPath
            });
          } catch (err) {
            console.warn("[Main] Erro ao salvar configuração de autostart:", err);
          }
        }
        if (settings.shortcutToggle || settings.shortcutPushToTalk || settings.shortcutClipboard) {
          registerShortcuts();
        }
      }
      return { success: true };
    } catch (err) {
      console.error("[Main] Erro ao salvar configurações no banco:", err);
      return { success: false };
    }
  });
  ipcMain.handle("vox:set-wakeword-enabled", async (_event, enabled) => {
    if (enabled) {
      if (!wakewordDetector.isModelLoaded()) {
        const loaded = await wakewordDetector.init();
        if (loaded) wakewordDetector.start();
      } else {
        wakewordDetector.start();
      }
    } else {
      wakewordDetector.stop();
    }
    return { success: true };
  });
  ipcMain.handle("vox:set-wakeword-sensitivity", (_event, sensitivity) => {
    wakewordDetector.setSensitivity(sensitivity);
    return { success: true };
  });
  ipcMain.handle("vox:list-models", async () => {
    try {
      return await fetchAvailableModels();
    } catch (err) {
      console.error("[Main] Erro ao listar modelos:", err);
      return { stt: [], llm: [], error: "unknown" };
    }
  });
  ipcMain.handle("vox:get-providers", () => {
    return PROVIDER_PRESETS.map((p) => ({ ...p }));
  });
  ipcMain.handle("vox:list-sessions", (_event, limit, type) => {
    return listSessions(limit || 50, type);
  });
  ipcMain.handle("vox:get-session", (_event, id) => {
    return getSession(id);
  });
  ipcMain.handle("vox:delete-session", (_event, id) => {
    deleteSession(id);
    return { success: true };
  });
  ipcMain.handle("vox:clear-all-sessions", () => {
    clearAllSessions();
    return { success: true };
  });
  ipcMain.handle("vox:search-sessions", (_event, query) => {
    return searchSessions(query);
  });
  ipcMain.handle("vox:list-api-logs", (_event, limit) => {
    return listApiLogs(limit || 200);
  });
  ipcMain.handle("vox:clear-api-logs", () => {
    clearApiLogs();
    return { success: true };
  });
  ipcMain.handle("vox:list-vocabulary", () => {
    return listVocabulary();
  });
  ipcMain.handle("vox:add-vocabulary-term", (_event, term) => {
    if (typeof term === "string") addVocabularyTerm(term);
    return listVocabulary();
  });
  ipcMain.handle("vox:remove-vocabulary-term", (_event, term) => {
    if (typeof term === "string") removeVocabularyTerm(term);
    return listVocabulary();
  });
  ipcMain.handle("vox:clear-vocabulary", () => {
    clearVocabulary();
    return { success: true };
  });
  ipcMain.handle("vox:insert-clipboard-item", async (_event, text) => {
    hideClipboardHistory();
    if (text && typeof text === "string" && text.trim()) {
      await injectText(text, targetWindowRef || void 0);
    }
    return { success: true };
  });
  ipcMain.handle("vox:hide-clipboard", () => {
    hideClipboardHistory();
    return { success: true };
  });
  ipcMain.handle("vox:get-commands", () => {
    return getAllCommands();
  });
  ipcMain.handle("vox:toggle-command", (_event, id, enabled) => {
    if (typeof id === "string") setEnabled(id, !!enabled);
    return { success: true };
  });
  ipcMain.handle("vox:set-command-match-mode", (_event, id, mode) => {
    if (typeof id === "string" && (mode === "isolated" || mode === "inline")) {
      setMatchMode(id, mode);
    }
    return { success: true };
  });
  ipcMain.handle("vox:add-custom-command", (_event, command) => {
    if (command && typeof command === "object") {
      return addCustomCommand(command);
    }
    return null;
  });
  ipcMain.handle("vox:update-custom-command", (_event, id, command) => {
    if (typeof id === "string" && command && typeof command === "object") {
      updateCustomCommand(id, command);
    }
    return { success: true };
  });
  ipcMain.handle("vox:delete-custom-command", (_event, id) => {
    if (typeof id === "string") deleteCustomCommand(id);
    return { success: true };
  });
  ipcMain.handle("vox:set-inline-mode", (_event, enabled) => {
    setSetting("commandInlineMode", enabled ? "true" : "false");
    return { success: true };
  });
  ipcMain.handle("vox:get-snippets", () => {
    return getAll();
  });
  ipcMain.handle("vox:save-snippet", (_event, snippet) => {
    if (snippet && typeof snippet === "object" && snippet.id) {
      save(snippet);
    }
    return { success: true };
  });
  ipcMain.handle("vox:delete-snippet", (_event, id) => {
    if (typeof id === "string") remove(id);
    return { success: true };
  });
  ipcMain.handle("vox:get-templates", () => {
    return templateManager.getAllTemplates();
  });
  ipcMain.handle("vox:get-active-template", () => {
    return templateManager.getActiveTemplate();
  });
  ipcMain.handle("vox:set-active-template", (_event, id) => {
    applyActiveTemplate(typeof id === "string" && id ? id : null, "ui");
    return { success: true };
  });
  ipcMain.handle("vox:set-template-enabled", (_event, id, enabled) => {
    if (typeof id === "string") templateManager.setTemplateEnabled(id, !!enabled);
    return { success: true };
  });
  ipcMain.handle("vox:add-custom-template", (_event, template) => {
    if (template && typeof template === "object") {
      return templateManager.addCustomTemplate(template);
    }
    return null;
  });
  ipcMain.handle("vox:update-custom-template", (_event, id, updates) => {
    if (typeof id === "string" && updates && typeof updates === "object") {
      templateManager.updateCustomTemplate(id, updates);
    }
    return { success: true };
  });
  ipcMain.handle("vox:delete-custom-template", (_event, id) => {
    if (typeof id === "string") templateManager.deleteCustomTemplate(id);
    return { success: true };
  });
}
let lastToggleTime = 0;
function toggleDockWindow() {
  const now = Date.now();
  if (now - lastToggleTime < 350) return;
  lastToggleTime = now;
  if (!dockWindow) return;
  const isVisible = dockWindow.isVisible();
  if (isVisible) {
    hideDock();
  } else {
    void captureActiveWindow();
    showDock();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:toggle-recording", !isVisible);
  }
}
let isPushToTalkActive = false;
function getPushToTalkVk() {
  const shortcut = getSetting("shortcutPushToTalk", "F9").trim();
  const m = /^F([1-9]|1[0-9]|2[0-4])$/i.exec(shortcut);
  if (!m) return null;
  return 112 + (parseInt(m[1], 10) - 1);
}
function startPushToTalk() {
  if (!dockWindow) return;
  if (recorder.getIsRecording()) return;
  const vk = getPushToTalkVk();
  const useAutoStop = process.platform !== "win32" || vk === null;
  void captureActiveWindow();
  showDock();
  recorder.startRecording({ autoStopOnSilence: useAutoStop });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:toggle-recording", true);
  }
  isPushToTalkActive = true;
  if (process.platform === "win32" && vk !== null) {
    const psScript = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);' -Name KS -Namespace VOX; while (([VOX.KS]::GetAsyncKeyState(${vk}) -band 0x8000) -ne 0) { Start-Sleep -Milliseconds 30 }`;
    const encoded = Buffer.from(psScript, "utf16le").toString("base64");
    execFileAsync("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-EncodedCommand", encoded], { timeout: 6e4 }).then(() => stopPushToTalk()).catch(() => stopPushToTalk());
  }
}
function stopPushToTalk() {
  if (!isPushToTalkActive) return;
  isPushToTalkActive = false;
  hideDock();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:toggle-recording", false);
  }
}
const MODIFIER_MAP = {
  Ctrl: "Control",
  Alt: "Alt",
  Shift: "Shift",
  Cmd: "Super"
};
function toAccelerator(shortcut) {
  const parts = shortcut.split("+").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1).map((m) => MODIFIER_MAP[m] || m);
  return [...mods, key].join("+");
}
function registerShortcuts() {
  globalShortcut.unregisterAll();
  const toggle = getSetting("shortcutToggle", "F10").trim() || "F10";
  const ptt = getSetting("shortcutPushToTalk", "F9").trim() || "F9";
  const clipboard2 = getSetting("shortcutClipboard", "F11").trim() || "F11";
  const register = (shortcut, handler, name) => {
    const accel = toAccelerator(shortcut);
    if (!accel) {
      console.warn(`[Main] Atalho inválido para ${name}: "${shortcut}"`);
      return;
    }
    try {
      const ok = globalShortcut.register(accel, handler);
      if (!ok) {
        console.warn(`[Main] Falha ao registrar o atalho ${accel} (${name}) — pode estar em uso por outro app.`);
      }
    } catch (err) {
      console.warn(`[Main] Erro ao registrar o atalho ${accel}:`, err);
    }
  };
  register(toggle, toggleDockWindow, "toggle");
  register(ptt, startPushToTalk, "push-to-talk");
  register(clipboard2, toggleClipboardHistory, "clipboard");
}
function setupCommandExecutorEvents() {
  commandExecutor.on("vox_control", (action) => {
    handleVoxControl(action);
  });
  commandExecutor.on("change_profile", (profile) => {
    handleChangeProfile(profile);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:change-profile", profile);
    }
  });
  commandExecutor.on("snippet_not_configured", (name) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:snippet-not-configured", name);
    }
  });
  commandExecutor.on("script_result", (result) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:script-result", result);
    }
  });
}
app.whenReady().then(async () => {
  initDatabase();
  seedSnippets([
    { name: "signature", triggerPt: "inserir assinatura", triggerEn: "insert signature" },
    { name: "email_address", triggerPt: "inserir email", triggerEn: "insert email" },
    { name: "address", triggerPt: "inserir endereço", triggerEn: "insert address" }
  ]);
  createMainWindow();
  createDockWindow();
  createClipboardWindow();
  initAutoUpdater(() => mainWindow);
  setupIpcHandlers();
  setupCommandExecutorEvents();
  const settings = getAllSettings();
  const sensitivity = parseFloat(settings.wakeWordSensitivity || "0.5");
  wakewordDetector.on("detected", () => {
    if (recorder.getIsRecording()) return;
    console.log('[Main] 🎙️ Wake Word "Vox" detectada! Capturando janela ativa e iniciando ditado por voz...');
    wakewordDetector.pause();
    recorder.startRecording({ autoStopOnSilence: true });
    void captureActiveWindow();
    showDock();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:toggle-recording", true);
      mainWindow.webContents.send("vox:wakeword-fired");
    }
    if (dockWindow && !dockWindow.isDestroyed()) {
      dockWindow.webContents.send("vox:wakeword-fired");
    }
  });
  wakewordDetector.on("wakeword-model-missing", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:wakeword-model-missing", data);
    }
  });
  wakewordDetector.on("wakeword-error", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:wakeword-error", data);
    }
  });
  recorder.on("auto-stop", async () => {
    console.log("[Main] Finalizando gravação por encerramento de fala...");
    isPushToTalkActive = false;
    hideDock();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:toggle-recording", false);
    }
    const buffer = recorder.stopRecording();
    wakewordDetector.resume();
    await processTranscriptionResult(buffer);
  });
  if (settings.wakeWordEnabled !== "false") {
    await wakewordDetector.init(void 0, sensitivity);
    wakewordDetector.start();
  }
  const autoStart = settings.autoStartEnabled !== "false";
  try {
    app.setLoginItemSettings({
      openAtLogin: autoStart,
      path: process.execPath
    });
  } catch (err) {
    console.warn("[Main] Erro ao configurar autostart:", err);
  }
  registerShortcuts();
  const iconPath = getAppIconPath();
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip("Vox");
  const lang = (settings.language || "pt-BR").toLowerCase();
  const isEn = lang === "en" || lang.startsWith("en");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: isEn ? "Open Vox" : "Abrir Vox", click: () => {
      showMainWindow();
    } },
    { type: "separator" },
    { label: isEn ? "Quit" : "Sair", click: () => {
      tray?.destroy();
      wakewordDetector.stop();
      app.exit(0);
    } }
  ]));
  tray.on("double-click", () => {
    showMainWindow();
  });
  app.on("activate", () => {
    showMainWindow();
  });
});
app.on("before-quit", () => {
  isQuitting = true;
  wakewordDetector.stop();
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {
});
