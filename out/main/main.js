"use strict";
const path = require("path");
const events = require("events");
const fs = require("fs");
const child_process = require("child_process");
const util = require("util");
const crypto = require("crypto");
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
    sttModel: "whisper-large-v3-turbo",
    llmModel: "llama-3.1-8b-instant",
    shortcutToggle: "F10",
    shortcutPushToTalk: "F9",
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
  if (result.llmModel === "openai/gpt-oss-20b") {
    result.llmModel = "llama-3.1-8b-instant";
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
const GROQ_STT_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-large-v3-turbo";
async function transcribeAudio(audioBuffer, language) {
  if (!audioBuffer || audioBuffer.length < 1e3) {
    console.log("[STT] Áudio muito curto ou vazio, ignorando transcrição.");
    return { text: "", segments: [], duration: 0 };
  }
  const apiKey = getSetting("apiKey", "").trim();
  if (!apiKey) {
    console.warn("[STT] API Key não configurada.");
    const lang = getSetting("language", "pt-BR");
    const msg = lang === "en" ? "[Error: Configure your API Key in Vox settings]" : "[Erro: Configure sua API Key nas configurações do Vox]";
    return {
      text: msg,
      segments: [],
      duration: 0
    };
  }
  const endpoint = GROQ_STT_ENDPOINT;
  const model = getSetting("sttModel") || process.env.WHISPER_MODEL || DEFAULT_MODEL;
  const isWebm = audioBuffer.length >= 4 && audioBuffer[0] === 26 && audioBuffer[1] === 69 && audioBuffer[2] === 223 && audioBuffer[3] === 163;
  const mimeType = isWebm ? "audio/webm" : "audio/wav";
  const fileName = isWebm ? "audio.webm" : "audio.wav";
  console.log("[STT] Transcrevendo mídia:", {
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
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[STT] Erro da API Groq (${response.status}):`, errText);
      return {
        text: `[Erro Groq ${response.status}] ${errText || "Falha na comunicação"}`,
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
    console.error("[STT] Exceção na API Groq:", error);
    return {
      text: `[Erro na transcrição] ${error?.message || "Ocorreu um erro ao processar o áudio."}`,
      segments: [],
      duration: 0
    };
  }
}
const GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_LLM_MODEL = "llama-3.1-8b-instant";
async function correctTranscription(text, context) {
  if (!text || text.trim().length === 0) return text;
  const apiKey = getSetting("apiKey", "").trim();
  if (!apiKey) {
    console.warn("[Corrector] API Key não configurada, retornando texto original.");
    return text;
  }
  const model = (getSetting("llmModel") || process.env.LLM_MODEL || DEFAULT_LLM_MODEL).trim();
  const resolvedModel = model === "openai/gpt-oss-20b" || model === "openai/gpt-oss-120b" ? DEFAULT_LLM_MODEL : model;
  console.log(`[Corrector] Revisando texto via Groq (${resolvedModel})...`);
  const contextLine = context ? ` Contexto do ditado: o usuário está digitando em ${context}. Ajuste a formatação de acordo (ex.: código, e-mail, documento, chat).` : "";
  try {
    const response = await fetch(GROQ_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          {
            role: "system",
            content: `Você é um revisor de transcrições de áudio. Sua ÚNICA função é ajustar pontuação, maiúsculas e ortografia do texto recebido.${contextLine} MANTENHA RIGOROSAMENTE O IDIOMA ORIGINAL DO TEXTO (se o texto estiver em inglês, mantenha em inglês; se estiver em português, mantenha em português). É ESTRITAMENTE PROIBIDO TRADUZIR O TEXTO. Retorne APENAS o texto revisado, sem apresentações ou explicações.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 512
      })
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Corrector] Erro da API Groq (${response.status}):`, errText);
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
    console.error("[Corrector] Erro ao se comunicar com Groq LLM API:", error);
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
const APP_CONTEXT_RULES = [
  { category: "a code editor or IDE", keywords: ["code", "visual studio", "vscode", "intellij", "pycharm", "webstorm", "phpstorm", "goland", "rider", "sublime", "notepad++", "vim", "neovim", "emacs", "atom", "eclipse", "android studio", "xcode", "cursor"] },
  { category: "an email message", keywords: ["outlook", "gmail", "thunderbird", "mail", "proton", "postbox"] },
  { category: "a text document", keywords: ["word", "winword", "docs", "writer", "libreoffice", "pages", "notion", "onenote", "obsidian", "typora", "scrivener"] },
  { category: "a chat or messaging app", keywords: ["slack", "teams", "discord", "whatsapp", "telegram", "messenger", "signal", "skype", "zoom"] },
  { category: "a terminal or shell", keywords: ["terminal", "cmd", "powershell", "iterm", "konsole", "bash", "zsh", "alacritty", "kitty", "windows terminal", "wezterm"] },
  { category: "a web page or browser form", keywords: ["chrome", "chromium", "firefox", "edge", "safari", "brave", "opera", "arc", "vivaldi"] }
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
async function processTranscriptionResult(buffer) {
  if (!buffer || buffer.length === 0) return { text: "" };
  const result = await transcribeAudio(buffer);
  console.log("[Main] Transcrição bruta:", result.text);
  if (result.text && !result.text.startsWith("[Erro")) {
    result.text = await correctTranscription(result.text, buildContextHint(targetWindowRef));
    console.log("[Main] Transcrição corrigida:", result.text);
  }
  if (result.text) {
    const sessionData = {
      id: crypto.randomUUID(),
      type: "dictation",
      title: result.text.slice(0, 60),
      text: result.text,
      rawText: result.rawText || result.text,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveSession(sessionData);
    const injectRes = await injectText(result.text, targetWindowRef || void 0);
    if (!injectRes.success) {
      console.warn("[Main] Falha ao injetar texto:", injectRes.error);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:transcript-result", result.text);
    }
  }
  return result;
}
const GROQ_MODELS_ENDPOINT = "https://api.groq.com/openai/v1/models";
async function fetchAvailableModels() {
  const apiKey = getSetting("apiKey", "").trim();
  if (!apiKey) {
    return { stt: [], llm: [], error: "no-api-key" };
  }
  const response = await fetch(GROQ_MODELS_ENDPOINT, {
    headers: { "Authorization": `Bearer ${apiKey}` }
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
function startPushToTalk() {
  if (!dockWindow) return;
  if (recorder.getIsRecording()) return;
  void captureActiveWindow();
  showDock();
  recorder.startRecording({ autoStopOnSilence: process.platform !== "win32" });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:toggle-recording", true);
  }
  isPushToTalkActive = true;
  if (process.platform === "win32") {
    const psScript = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);' -Name KS -Namespace VOX; while (([VOX.KS]::GetAsyncKeyState(0x78) -band 0x8000) -ne 0) { Start-Sleep -Milliseconds 30 }`;
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
app.whenReady().then(async () => {
  initDatabase();
  createMainWindow();
  createDockWindow();
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
  const toggleRegistered = globalShortcut.register("F10", toggleDockWindow);
  if (!toggleRegistered) {
    console.warn("[Main] Falha ao registrar o atalho F10 (pode estar em uso por outro app ou reservado pelo sistema).");
  }
  const pttRegistered = globalShortcut.register("F9", startPushToTalk);
  if (!pttRegistered) {
    console.warn("[Main] Falha ao registrar o atalho F9 (pode estar em uso por outro app ou reservado pelo sistema).");
  }
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
