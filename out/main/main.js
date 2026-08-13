"use strict";
const path = require("path");
const events = require("events");
const fs = require("fs");
const crypto = require("crypto");
const child_process = require("child_process");
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
const { app: app$1, safeStorage } = require("electron");
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
    const userDataPath = app$1.getPath("userData");
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

        CREATE TABLE IF NOT EXISTS commands (
          id          TEXT PRIMARY KEY,
          isDefault   INTEGER DEFAULT 0,
          isEnabled   INTEGER DEFAULT 1,
          category    TEXT,
          label       TEXT,
          description TEXT,
          triggers    TEXT,
          action      TEXT,
          matchMode   TEXT,
          createdAt   TEXT,
          updatedAt   TEXT
        );

        CREATE TABLE IF NOT EXISTS snippets (
          id         TEXT PRIMARY KEY,
          name       TEXT,
          triggerPt  TEXT,
          triggerEn  TEXT,
          content    TEXT,
          createdAt  TEXT,
          updatedAt  TEXT
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
    const locale = app$1.getLocale() || "pt-BR";
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
function serializeCommand(cmd) {
  return {
    id: cmd.id,
    isDefault: cmd.isDefault ? 1 : 0,
    isEnabled: cmd.isEnabled ? 1 : 0,
    category: cmd.category,
    label: cmd.label,
    description: cmd.description,
    triggers: JSON.stringify(cmd.triggers),
    action: JSON.stringify(cmd.action),
    matchMode: cmd.matchMode,
    createdAt: cmd.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: cmd.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function parseCommandRow(row) {
  let triggers = { pt: [], en: [] };
  let action = { type: "keystroke", parameter: "" };
  try {
    triggers = JSON.parse(row.triggers || '{"pt":[],"en":[]}');
  } catch {
  }
  try {
    action = JSON.parse(row.action || "{}");
  } catch {
  }
  return {
    id: row.id,
    isDefault: !!row.isDefault,
    isEnabled: !!row.isEnabled,
    category: row.category || "custom",
    label: row.label || "",
    description: row.description || "",
    triggers,
    action,
    matchMode: row.matchMode === "inline" ? "inline" : "isolated",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
function seedCommands(defaults) {
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const cmd of defaults) {
      const record = serializeCommand({ ...cmd, createdAt: cmd.createdAt || now, updatedAt: cmd.updatedAt || now });
      if (dbInstance) {
        dbInstance.prepare(`
          INSERT OR IGNORE INTO commands (id, isDefault, isEnabled, category, label, description, triggers, action, matchMode, createdAt, updatedAt)
          VALUES (@id, @isDefault, @isEnabled, @category, @label, @description, @triggers, @action, @matchMode, @createdAt, @updatedAt)
        `).run(record);
      } else if (fallbackFileCommands) {
        let commands = [];
        if (fs.existsSync(fallbackFileCommands)) {
          try {
            commands = JSON.parse(fs.readFileSync(fallbackFileCommands, "utf-8"));
          } catch {
            commands = [];
          }
        }
        if (!commands.some((c) => c.id === cmd.id)) {
          commands.push(parseCommandRow(record));
          fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands, null, 2), "utf-8");
        }
      }
    }
  } catch (err) {
    console.error("[DB] Erro ao semear comandos padrão:", err);
  }
}
function listCommands() {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare("SELECT * FROM commands").all();
      return rows.map(parseCommandRow);
    }
    if (fallbackFileCommands && fs.existsSync(fallbackFileCommands)) {
      return JSON.parse(fs.readFileSync(fallbackFileCommands, "utf-8"));
    }
  } catch (err) {
    console.error("[DB] Erro ao listar comandos:", err);
  }
  return [];
}
function saveCommand(cmd) {
  try {
    const record = serializeCommand(cmd);
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO commands (id, isDefault, isEnabled, category, label, description, triggers, action, matchMode, createdAt, updatedAt)
        VALUES (@id, @isDefault, @isEnabled, @category, @label, @description, @triggers, @action, @matchMode, @createdAt, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          isDefault = excluded.isDefault,
          isEnabled = excluded.isEnabled,
          category = excluded.category,
          label = excluded.label,
          description = excluded.description,
          triggers = excluded.triggers,
          action = excluded.action,
          matchMode = excluded.matchMode,
          updatedAt = excluded.updatedAt
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
      const parsed = parseCommandRow(record);
      if (idx >= 0) commands[idx] = parsed;
      else commands.push(parsed);
      fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao salvar comando:", err);
  }
}
function deleteCommand(id) {
  try {
    if (dbInstance) {
      dbInstance.prepare("DELETE FROM commands WHERE id = ?").run(id);
      return;
    }
    if (fallbackFileCommands && fs.existsSync(fallbackFileCommands)) {
      const commands = JSON.parse(fs.readFileSync(fallbackFileCommands, "utf-8"));
      fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands.filter((c) => c.id !== id), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DB] Erro ao excluir comando:", err);
  }
}
function setCommandEnabled(id, enabled) {
  try {
    if (dbInstance) {
      dbInstance.prepare("UPDATE commands SET isEnabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
      return;
    }
    if (fallbackFileCommands && fs.existsSync(fallbackFileCommands)) {
      const commands = JSON.parse(fs.readFileSync(fallbackFileCommands, "utf-8"));
      const cmd = commands.find((c) => c.id === id);
      if (cmd) {
        cmd.isEnabled = enabled;
        fs.writeFileSync(fallbackFileCommands, JSON.stringify(commands, null, 2), "utf-8");
      }
    }
  } catch (err) {
    console.error("[DB] Erro ao alternar comando:", err);
  }
}
function parseSnippetRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    triggerPt: row.triggerPt || "",
    triggerEn: row.triggerEn || "",
    content: row.content || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
function listSnippets() {
  try {
    if (dbInstance) {
      const rows = dbInstance.prepare("SELECT * FROM snippets ORDER BY datetime(createdAt) ASC").all();
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
      triggerPt: snippet.triggerPt,
      triggerEn: snippet.triggerEn,
      content: snippet.content,
      createdAt: snippet.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: snippet.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    if (dbInstance) {
      dbInstance.prepare(`
        INSERT INTO snippets (id, name, triggerPt, triggerEn, content, createdAt, updatedAt)
        VALUES (@id, @name, @triggerPt, @triggerEn, @content, @createdAt, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          triggerPt = excluded.triggerPt,
          triggerEn = excluded.triggerEn,
          content = excluded.content,
          updatedAt = excluded.updatedAt
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
async function correctTranscription(text, context) {
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
  try {
    const body = {
      messages: [
        {
          role: "system",
          content: `Você é um revisor de transcrições de áudio. Sua ÚNICA função é ajustar pontuação, maiúsculas e ortografia do texto recebido.${contextLine}${vocabularyLine}${dictionaryLine} MANTENHA RIGOROSAMENTE O IDIOMA ORIGINAL DO TEXTO (se o texto estiver em inglês, mantenha em inglês; se estiver em português, mantenha em português). É ESTRITAMENTE PROIBIDO TRADUZIR O TEXTO. Retorne APENAS o texto revisado, sem apresentações ou explicações.`
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
const { clipboard } = require("electron");
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
  clipboard.writeText(text);
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
function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function getTriggers(cmd, language) {
  const lang = language === "en" ? "en" : "pt";
  const list = cmd.triggers[lang] && cmd.triggers[lang].length > 0 ? cmd.triggers[lang] : cmd.triggers.en;
  return list || [];
}
function matchWhole(text, pattern) {
  try {
    return new RegExp(`^(?:${pattern})$`, "i").test(text);
  } catch {
    return false;
  }
}
function parseCommandText(rawText, commands, language = "pt-BR") {
  const normalized = normalize(rawText);
  if (!normalized) {
    return { segments: [], hasCommands: false, hasContent: false, isMixed: false };
  }
  for (const cmd of commands) {
    if (!cmd.isEnabled || cmd.matchMode !== "isolated") continue;
    for (const pattern of getTriggers(cmd, language)) {
      if (matchWhole(normalized, pattern)) {
        return {
          segments: [{ type: "command", value: cmd.id, command: cmd }],
          hasCommands: true,
          hasContent: false,
          isMixed: false
        };
      }
    }
  }
  const spans = [];
  for (const cmd of commands) {
    if (!cmd.isEnabled || cmd.matchMode !== "inline") continue;
    for (const pattern of getTriggers(cmd, language)) {
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
  if (spans.length === 0) {
    return {
      segments: [{ type: "content", value: rawText, contentText: rawText }],
      hasCommands: false,
      hasContent: true,
      isMixed: false
    };
  }
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
      const contentText = normalized.slice(cursor, s.start).trim();
      if (contentText) segments.push({ type: "content", value: contentText, contentText });
    }
    segments.push({ type: "command", value: s.cmd.id, command: s.cmd });
    cursor = s.end;
  }
  if (cursor < normalized.length) {
    const contentText = normalized.slice(cursor).trim();
    if (contentText) segments.push({ type: "content", value: contentText, contentText });
  }
  const hasCommands = segments.some((s) => s.type === "command");
  const hasContent = segments.some((s) => s.type === "content");
  return { segments, hasCommands, hasContent, isMixed: hasCommands && hasContent };
}
const { shell } = require("electron");
function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    child_process.execFile("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", command], (err) => {
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
  const prefix = mods.map((m) => m === "Ctrl" ? "^" : m === "Alt" ? "%" : m === "Shift" ? "+" : "").join("");
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
function dynamicValue(kind) {
  const now = /* @__PURE__ */ new Date();
  switch (kind) {
    case "date":
      return now.toLocaleDateString();
    case "time":
      return now.toLocaleTimeString();
    case "datetime":
      return now.toLocaleString();
    default:
      return "";
  }
}
async function executeCommand(command, ctx = {}) {
  const action = command.action;
  if (!action) return;
  try {
    switch (action.type) {
      case "keystroke":
        await sendKeys([String(action.parameter)]);
        break;
      case "keystroke_sequence": {
        const steps = action.keySequence || (Array.isArray(action.parameter) ? action.parameter.map((k) => ({ key: String(k) })) : []);
        await sendKeySequence(steps);
        break;
      }
      case "inject_text":
        await injectText(String(action.parameter), ctx.windowRef || void 0);
        break;
      case "inject_snippet": {
        const snippet = (ctx.snippets || []).find((s) => s.name === action.parameter);
        if (snippet) await injectText(snippet.content, ctx.windowRef || void 0);
        break;
      }
      case "insert_dynamic":
        await injectText(dynamicValue(String(action.parameter)), ctx.windowRef || void 0);
        break;
      case "vox_control":
        ctx.onVoxControl?.(String(action.parameter));
        break;
      case "open_url":
        await shell.openExternal(String(action.parameter));
        break;
      case "open_app":
        await shell.openPath(String(action.parameter));
        break;
      case "run_script":
        await new Promise((resolve) => {
          child_process.execFile("powershell", ["-NoProfile", "-Command", String(action.parameter)], () => resolve());
        });
        break;
      case "change_profile":
        console.warn("[CommandExecutor] change_profile ainda não implementado:", action.parameter);
        break;
      default:
        console.warn("[CommandExecutor] Tipo de ação desconhecido:", action.type);
    }
  } catch (err) {
    console.error("[CommandExecutor] Falha ao executar comando:", err);
  }
}
const DEFAULT_COMMANDS = [
  // ---- Punctuation (inline) ----
  { id: "cmd-comma", isDefault: true, isEnabled: true, category: "punctuation", label: "Comma", description: "Inserts a comma", triggers: { pt: ["\\bvírgula\\b"], en: ["\\bcomma\\b"] }, action: { type: "inject_text", parameter: "," }, matchMode: "inline" },
  { id: "cmd-period", isDefault: true, isEnabled: true, category: "punctuation", label: "Period", description: "Inserts a period", triggers: { pt: ["\\bponto\\b"], en: ["\\bperiod\\b"] }, action: { type: "inject_text", parameter: "." }, matchMode: "inline" },
  { id: "cmd-question", isDefault: true, isEnabled: true, category: "punctuation", label: "Question mark", description: "Inserts a question mark", triggers: { pt: ["\\bponto de interrogação\\b", "\\binterrogação\\b"], en: ["\\bquestion mark\\b"] }, action: { type: "inject_text", parameter: "?" }, matchMode: "inline" },
  { id: "cmd-exclamation", isDefault: true, isEnabled: true, category: "punctuation", label: "Exclamation mark", description: "Inserts an exclamation mark", triggers: { pt: ["\\bponto de exclamação\\b", "\\bexclamação\\b"], en: ["\\bexclamation mark\\b"] }, action: { type: "inject_text", parameter: "!" }, matchMode: "inline" },
  { id: "cmd-colon", isDefault: true, isEnabled: true, category: "punctuation", label: "Colon", description: "Inserts a colon", triggers: { pt: ["\\bdois pontos\\b"], en: ["\\bcolon\\b"] }, action: { type: "inject_text", parameter: ":" }, matchMode: "inline" },
  { id: "cmd-semicolon", isDefault: true, isEnabled: true, category: "punctuation", label: "Semicolon", description: "Inserts a semicolon", triggers: { pt: ["\\bponto e vírgula\\b"], en: ["\\bsemicolon\\b"] }, action: { type: "inject_text", parameter: ";" }, matchMode: "inline" },
  { id: "cmd-newline", isDefault: true, isEnabled: true, category: "punctuation", label: "New line", description: "Inserts a line break", triggers: { pt: ["\\bnova linha\\b"], en: ["\\bnew line\\b"] }, action: { type: "keystroke", parameter: "Enter" }, matchMode: "inline" },
  { id: "cmd-paragraph", isDefault: true, isEnabled: true, category: "punctuation", label: "New paragraph", description: "Inserts a paragraph break", triggers: { pt: ["\\bnovo parágrafo\\b"], en: ["\\bnew paragraph\\b"] }, action: { type: "keystroke_sequence", parameter: [], keySequence: [{ key: "Enter" }, { key: "Enter" }] }, matchMode: "inline" },
  { id: "cmd-space", isDefault: true, isEnabled: true, category: "punctuation", label: "Space", description: "Inserts a space", triggers: { pt: ["\\bespaço\\b"], en: ["\\bspace\\b"] }, action: { type: "inject_text", parameter: " " }, matchMode: "inline" },
  // ---- Navigation (isolated) ----
  { id: "cmd-delete", isDefault: true, isEnabled: true, category: "navigation", label: "Delete", description: "Presses Backspace", triggers: { pt: ["apagar", "apague"], en: ["delete"] }, action: { type: "keystroke", parameter: "Backspace" }, matchMode: "isolated" },
  { id: "cmd-delete-word", isDefault: true, isEnabled: true, category: "navigation", label: "Delete word", description: "Deletes the previous word", triggers: { pt: ["apagar palavra"], en: ["delete word"] }, action: { type: "keystroke", parameter: "Ctrl+Backspace" }, matchMode: "isolated" },
  { id: "cmd-tab", isDefault: true, isEnabled: true, category: "navigation", label: "Tab", description: "Presses Tab", triggers: { pt: ["tab"], en: ["tab"] }, action: { type: "keystroke", parameter: "Tab" }, matchMode: "isolated" },
  // ---- Editing (isolated) ----
  { id: "cmd-select-all", isDefault: true, isEnabled: true, category: "editing", label: "Select all", description: "Selects all text", triggers: { pt: ["selecionar tudo"], en: ["select all"] }, action: { type: "keystroke", parameter: "Ctrl+A" }, matchMode: "isolated" },
  { id: "cmd-copy", isDefault: true, isEnabled: true, category: "editing", label: "Copy", description: "Copies selection", triggers: { pt: ["copiar"], en: ["copy"] }, action: { type: "keystroke", parameter: "Ctrl+C" }, matchMode: "isolated" },
  { id: "cmd-paste", isDefault: true, isEnabled: true, category: "editing", label: "Paste", description: "Pastes from clipboard", triggers: { pt: ["colar"], en: ["paste"] }, action: { type: "keystroke", parameter: "Ctrl+V" }, matchMode: "isolated" },
  { id: "cmd-undo", isDefault: true, isEnabled: true, category: "editing", label: "Undo", description: "Undoes last action", triggers: { pt: ["desfazer"], en: ["undo"] }, action: { type: "keystroke", parameter: "Ctrl+Z" }, matchMode: "isolated" },
  { id: "cmd-redo", isDefault: true, isEnabled: true, category: "editing", label: "Redo", description: "Redoes last action", triggers: { pt: ["refazer"], en: ["redo"] }, action: { type: "keystroke", parameter: "Ctrl+Y" }, matchMode: "isolated" },
  // ---- Vox control (isolated) ----
  { id: "cmd-stop", isDefault: true, isEnabled: true, category: "vox_control", label: "Stop", description: "Stops dictation and finalizes", triggers: { pt: ["parar"], en: ["stop"] }, action: { type: "vox_control", parameter: "stop" }, matchMode: "isolated" },
  { id: "cmd-cancel", isDefault: true, isEnabled: true, category: "vox_control", label: "Cancel", description: "Cancels dictation without injecting", triggers: { pt: ["cancelar"], en: ["cancel"] }, action: { type: "vox_control", parameter: "cancel" }, matchMode: "isolated" },
  { id: "cmd-clear", isDefault: true, isEnabled: true, category: "vox_control", label: "Clear", description: "Clears the current transcription", triggers: { pt: ["limpar"], en: ["clear"] }, action: { type: "vox_control", parameter: "clear" }, matchMode: "isolated" },
  { id: "cmd-repeat", isDefault: true, isEnabled: true, category: "vox_control", label: "Repeat", description: "Re-injects the last transcription", triggers: { pt: ["repetir"], en: ["repeat"] }, action: { type: "vox_control", parameter: "repeat" }, matchMode: "isolated" },
  // ---- Dynamic (inline) ----
  { id: "cmd-date", isDefault: true, isEnabled: true, category: "system", label: "Insert date", description: "Inserts today's date", triggers: { pt: ["\\bdata de hoje\\b"], en: ["\\btoday's date\\b"] }, action: { type: "insert_dynamic", parameter: "date" }, matchMode: "inline" },
  { id: "cmd-time", isDefault: true, isEnabled: true, category: "system", label: "Insert time", description: "Inserts the current time", triggers: { pt: ["\\bhora atual\\b"], en: ["\\bcurrent time\\b"] }, action: { type: "insert_dynamic", parameter: "time" }, matchMode: "inline" }
];
function getEnabledCommands() {
  return listCommands().filter((c) => c.isEnabled);
}
function getSnippets() {
  return listSnippets();
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
  async init(_modelPath, sensitivity = 0.5) {
    this.setSensitivity(sensitivity);
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
      nodeIntegration: false
    }
  });
  mainWindow?.setMenu(null);
  mainWindow?.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
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
function buildContextHint(ref) {
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
let lastInjectedText = "";
function handleVoxControl(action) {
  switch (action) {
    case "stop":
      hideDock();
      break;
    case "cancel":
      break;
    case "clear":
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:transcript-result", "");
      }
      break;
    case "repeat":
      if (lastInjectedText) {
        void injectText(lastInjectedText, targetWindowRef || void 0);
      }
      break;
    default:
      console.warn("[Main] Ação vox_control desconhecida:", action);
  }
}
async function processCommandSegments(parseResult) {
  const snippets = getSnippets();
  let cancelled = false;
  for (const seg of parseResult.segments) {
    if (cancelled) break;
    if (seg.type === "command" && seg.command) {
      if (seg.command.action.type === "vox_control" && seg.command.action.parameter === "cancel") {
        cancelled = true;
        break;
      }
      await executeCommand(seg.command, {
        windowRef: targetWindowRef,
        snippets,
        onVoxControl: handleVoxControl
      });
    } else if (seg.type === "content" && seg.contentText) {
      const corrected = await correctTranscription(seg.contentText, buildContextHint(targetWindowRef));
      if (corrected) {
        recordCorrections(seg.contentText, corrected);
        await injectText(corrected, targetWindowRef || void 0);
        lastInjectedText = corrected;
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
    const language = getSetting("language", "pt-BR");
    const commands = getEnabledCommands();
    const parseResult = parseCommandText(result.text, commands, language);
    if (parseResult.hasCommands) {
      const cancelled = await processCommandSegments(parseResult);
      result.text = cancelled ? "" : rawText;
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
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:transcript-result", result.text);
      }
      return result;
    }
    result.text = await correctTranscription(result.text, buildContextHint(targetWindowRef));
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
    lastInjectedText = result.text;
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
  ipcMain.handle("vox:list-commands", () => {
    return listCommands();
  });
  ipcMain.handle("vox:save-command", (_event, cmd) => {
    if (cmd && typeof cmd === "object" && cmd.id) {
      saveCommand(cmd);
    }
    return { success: true };
  });
  ipcMain.handle("vox:delete-command", (_event, id) => {
    if (typeof id === "string") deleteCommand(id);
    return { success: true };
  });
  ipcMain.handle("vox:set-command-enabled", (_event, id, enabled) => {
    if (typeof id === "string") setCommandEnabled(id, !!enabled);
    return { success: true };
  });
  ipcMain.handle("vox:list-snippets", () => {
    return listSnippets();
  });
  ipcMain.handle("vox:save-snippet", (_event, snippet) => {
    if (snippet && typeof snippet === "object" && snippet.id) {
      saveSnippet(snippet);
    }
    return { success: true };
  });
  ipcMain.handle("vox:delete-snippet", (_event, id) => {
    if (typeof id === "string") deleteSnippet(id);
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
app.whenReady().then(async () => {
  initDatabase();
  seedCommands(DEFAULT_COMMANDS);
  createMainWindow();
  createDockWindow();
  createClipboardWindow();
  setupIpcHandlers();
  const settings = getAllSettings();
  const sensitivity = parseFloat(settings.wakeWordSensitivity || "0.5");
  await wakewordDetector.init(void 0, sensitivity);
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
      mainWindow?.show();
    } },
    { type: "separator" },
    { label: isEn ? "Quit" : "Sair", click: () => {
      tray?.destroy();
      wakewordDetector.stop();
      app.exit(0);
    } }
  ]));
  tray.on("double-click", () => {
    mainWindow?.show();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createDockWindow();
    }
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
