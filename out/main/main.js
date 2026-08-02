"use strict";
const path = require("path");
const events = require("events");
const child_process = require("child_process");
const fs = require("fs");
const https = require("https");
class AudioRecorder extends events.EventEmitter {
  isRecording = false;
  chunks = [];
  vadThreshold = 0.02;
  // Limiar de energia RMS para fala
  autoStopOnSilence = false;
  hasSpoken = false;
  silenceTimer = null;
  silenceDurationMs = 1300;
  // 1.3s de silêncio para encerramento automático
  startRecording(options) {
    this.isRecording = true;
    this.chunks = [];
    this.autoStopOnSilence = options?.autoStopOnSilence ?? false;
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
    const energy = this.calculateRmsEnergy(chunk);
    const isSpeech = energy > this.vadThreshold;
    if (this.autoStopOnSilence) {
      if (isSpeech) {
        this.hasSpoken = true;
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (this.hasSpoken && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          console.log("[Recorder] 🛑 Silêncio pós-fala detectado, encerrando gravação automaticamente...");
          this.emit("auto-stop");
        }, this.silenceDurationMs);
      }
    }
    this.emit("energy", { energy, isSpeech });
    return { energy, isSpeech };
  }
  stopRecording() {
    this.isRecording = false;
    this.autoStopOnSilence = false;
    this.hasSpoken = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    console.log("[Recorder] Parando gravação...");
    this.emit("stop");
    const pcmData = Buffer.concat(this.chunks);
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
const GROQ_API_KEY$1 = "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";
const GROQ_STT_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-large-v3-turbo";
async function transcribeAudio(audioBuffer, language) {
  if (!audioBuffer || audioBuffer.length < 1e3) {
    console.log("[STT] Áudio muito curto ou vazio, ignorando transcrição.");
    return { text: "", segments: [], duration: 0 };
  }
  const apiKey = process.env.GROQ_API_KEY || GROQ_API_KEY$1;
  const endpoint = GROQ_STT_ENDPOINT;
  const model = process.env.WHISPER_MODEL || DEFAULT_MODEL;
  const isWebm = audioBuffer.length >= 4 && audioBuffer[0] === 26 && audioBuffer[1] === 69 && audioBuffer[2] === 223 && audioBuffer[3] === 163;
  const mimeType = isWebm ? "audio/webm" : "audio/wav";
  const fileName = isWebm ? "audio.webm" : "audio.wav";
  console.log("[STT] Transcrevendo mídia:", {
    model,
    audioSize: audioBuffer.length,
    mimeType,
    specifiedLanguage: language || "auto-detect (sem tradução)"
  });
  try {
    const file = new File([Uint8Array.from(audioBuffer)], fileName, { type: mimeType });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);
    if (language) {
      formData.append("language", language);
    }
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
const GROQ_API_KEY = "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";
const GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_LLM_MODEL = "openai/gpt-oss-20b";
async function correctTranscription(text) {
  if (!text || text.trim().length === 0) return text;
  const apiKey = process.env.GROQ_API_KEY || GROQ_API_KEY;
  const model = process.env.LLM_MODEL || DEFAULT_LLM_MODEL;
  console.log(`[Corrector] Revisando texto via Groq (${model})...`);
  try {
    const response = await fetch(GROQ_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Você é um revisor de transcrições de áudio. Sua ÚNICA função é ajustar pontuação, maiúsculas e ortografia do texto recebido. MANTENHA RIGOROSAMENTE O IDIOMA ORIGINAL DO TEXTO (se o texto estiver em inglês, mantenha em inglês; se estiver em português, mantenha em português). É ESTRITAMENTE PROIBIDO TRADUZIR O TEXTO. Retorne APENAS o texto revisado, sem apresentações ou explicações."
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 2048
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
async function injectText(text, _mode = "clipboard", delayMs = 100, hwnd) {
  if (!text || text.trim().length === 0) return;
  try {
    console.log(`[Injector] Injetando texto no cursor ativo (${text.length} chars)...`);
    clipboard.writeText(text);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const psCommand = hwnd && hwnd !== "0" ? `$t=(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -Name SFW -Namespace VOX -PassThru); $t::SetForegroundWindow([IntPtr]${hwnd}); Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^v')` : `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`;
    child_process.execFile("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", psCommand], (err) => {
      if (err) {
        console.error("[Injector] Erro ao colar texto via PowerShell:", err);
      } else {
        console.log("[Injector] Texto colado no cursor com sucesso!");
      }
    });
  } catch (err) {
    console.error("[Injector] Erro no processo de injeção:", err);
  }
}
function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/instagram\.com/.test(url)) return "instagram";
  return "unknown";
}
async function downloadBinary(url, targetPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          return downloadBinary(res.headers.location, targetPath).then(resolve).catch(reject);
        }
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Falha ao baixar binário: HTTP ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(targetPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
      fileStream.on("error", (err) => {
        fs.unlink(targetPath, () => reject(err));
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}
async function ensureExecutable() {
  const possiblePaths = [
    path.join(process.cwd(), "resources", "binaries", "yt-dlp.exe"),
    path.join(process.cwd(), "resources", "binaries", "yt-dlp"),
    path.join(__dirname, "..", "..", "resources", "binaries", "yt-dlp.exe"),
    path.join(__dirname, "..", "..", "resources", "binaries", "yt-dlp"),
    "yt-dlp"
  ];
  for (const p of possiblePaths) {
    if (p !== "yt-dlp" && fs.existsSync(p)) {
      return p;
    }
  }
  const targetDir = path.join(process.cwd(), "resources", "binaries");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetFile = path.join(targetDir, "yt-dlp.exe");
  if (!fs.existsSync(targetFile)) {
    console.log("[Downloader] Baixando yt-dlp.exe automaticamente...");
    try {
      await downloadBinary("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe", targetFile);
    } catch (err) {
      console.error("[Downloader] Erro no auto-download do yt-dlp:", err);
    }
  }
  return fs.existsSync(targetFile) ? targetFile : "yt-dlp";
}
async function getVideoInfo(url, cookiesFromBrowser) {
  const platform = detectPlatform(url);
  const executable = await ensureExecutable();
  const args = [
    "--dump-json",
    "--no-warnings",
    "--no-playlist",
    "--no-check-certificates",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    url
  ];
  if (cookiesFromBrowser && cookiesFromBrowser !== "none") {
    args.push("--cookies-from-browser", cookiesFromBrowser);
  }
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    try {
      const proc = child_process.spawn(executable, args);
      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      proc.on("close", (code) => {
        if (code === 0 && stdout) {
          try {
            const data = JSON.parse(stdout);
            return resolve({
              title: data.title || data.fulltitle || "Vídeo Vox Media",
              duration: Math.round(data.duration || 0),
              thumbnail: data.thumbnail || data.thumbnails && data.thumbnails[0]?.url || "",
              platform
            });
          } catch {
          }
        }
        if (cookiesFromBrowser && cookiesFromBrowser !== "none" && /cookie database|Could not copy/i.test(stderr)) {
          return getVideoInfo(url, "none").then(resolve);
        }
        resolve({
          title: `Mídia (${platform.toUpperCase()})`,
          duration: 120,
          thumbnail: "",
          platform
        });
      });
      proc.on("error", () => {
        resolve({
          title: `Mídia (${platform.toUpperCase()})`,
          duration: 120,
          thumbnail: "",
          platform
        });
      });
    } catch {
      resolve({
        title: `Mídia (${platform.toUpperCase()})`,
        duration: 120,
        thumbnail: "",
        platform
      });
    }
  });
}
async function downloadAudio(options) {
  const platform = detectPlatform(options.url);
  const executable = await ensureExecutable();
  const timestamp = Date.now();
  const baseFileName = `vox_media_${timestamp}`;
  const outputTemplate = path.join(options.outputDir, `${baseFileName}.%(ext)s`);
  const args = [
    "-f",
    "ba/b/best",
    "--no-playlist",
    "--no-warnings",
    "--no-check-certificates",
    "--geo-bypass",
    "--socket-timeout",
    "30",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "-o",
    outputTemplate,
    options.url
  ];
  if (options.cookiesFromBrowser && options.cookiesFromBrowser !== "none") {
    args.push("--cookies-from-browser", options.cookiesFromBrowser);
  }
  return new Promise((resolve, reject) => {
    let stderrText = "";
    try {
      const proc = child_process.spawn(executable, args);
      proc.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        const match = text.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+\S+\s+at\s+(\S+)\s+ETA\s+(\S+)/);
        if (match && options.onProgress) {
          const pct = parseFloat(match[1]);
          const speed = match[2];
          const eta = match[3];
          options.onProgress(pct, speed, eta);
        }
      });
      proc.stderr.on("data", (chunk) => {
        stderrText += chunk.toString();
      });
      proc.on("close", (code) => {
        try {
          const files = fs.readdirSync(options.outputDir);
          const downloadedFile = files.find((f) => f.startsWith(baseFileName));
          if (downloadedFile) {
            const fullPath = path.join(options.outputDir, downloadedFile);
            options.onProgress?.(100, "Concluído", "00:00");
            return resolve({
              audioPath: fullPath,
              title: `Mídia (${platform.toUpperCase()})`,
              duration: 0,
              platform
            });
          }
        } catch {
        }
        const isCookieLock = /cookie database|Could not copy|cookies/i.test(stderrText);
        if (isCookieLock && options.cookiesFromBrowser && options.cookiesFromBrowser !== "none") {
          console.warn("[Downloader] Banco de cookies bloqueado pelo navegador aberto. Tentando download sem cookies...");
          return downloadAudio({ ...options, cookiesFromBrowser: "none" }).then(resolve).catch(reject);
        }
        if (code !== 0) {
          const errorMatch = stderrText.match(/ERROR:\s*(.+)/i);
          const cleanError = errorMatch ? errorMatch[1].trim() : stderrText.trim();
          if (cleanError) {
            return reject(new Error(`Falha no download: ${cleanError}`));
          }
          return reject(
            new Error(
              `yt-dlp não conseguiu baixar a mídia (Código ${code}). Verifique se a URL é pública e acessível.`
            )
          );
        }
        reject(new Error("O arquivo de mídia não foi encontrado na pasta Downloads."));
      });
      proc.on("error", (err) => {
        reject(new Error(`Erro ao executar o downloader (${err.message}).`));
      });
    } catch (err) {
      reject(new Error(err?.message || "Erro inesperado ao baixar mídia."));
    }
  });
}
const downloader = {
  detectPlatform,
  getVideoInfo,
  downloadAudio
};
const { app: app$1 } = require("electron");
let Database = null;
try {
  Database = require("better-sqlite3");
} catch (e) {
  console.warn("[DB] Módulo nativo better-sqlite3 não encontrado, usando fallback seguro:", e);
}
let dbInstance = null;
let fallbackFile = null;
function initDatabase() {
  try {
    const userDataPath = app$1.getPath("userData");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const dbPath = path.join(userDataPath, "vox_settings.db");
    fallbackFile = path.join(userDataPath, "vox_settings.json");
    if (Database) {
      dbInstance = new Database(dbPath);
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      console.log("[DB] Banco de dados SQLite pronto em:", dbPath);
    } else {
      console.log("[DB] Usando fallback de dados em:", fallbackFile);
    }
  } catch (err) {
    console.error("[DB] Erro ao inicializar banco de dados:", err);
  }
}
function getSetting(key, defaultValue = "") {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare("SELECT value FROM settings WHERE key = ?");
      const row = stmt.get(key);
      return row ? row.value : defaultValue;
    }
    if (fallbackFile && fs.existsSync(fallbackFile)) {
      const data = JSON.parse(fs.readFileSync(fallbackFile, "utf-8"));
      return data[key] !== void 0 ? data[key] : defaultValue;
    }
  } catch (err) {
    console.error(`[DB] Erro ao obter configuração (${key}):`, err);
  }
  return defaultValue;
}
function setSetting(key, value) {
  try {
    if (dbInstance) {
      const stmt = dbInstance.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      stmt.run(key, value);
      return;
    }
    if (fallbackFile) {
      let data = {};
      if (fs.existsSync(fallbackFile)) {
        try {
          data = JSON.parse(fs.readFileSync(fallbackFile, "utf-8"));
        } catch {
          data = {};
        }
      }
      data[key] = value;
      fs.writeFileSync(fallbackFile, JSON.stringify(data, null, 2), "utf-8");
    }
  } catch (err) {
    console.error(`[DB] Erro ao salvar configuração (${key}):`, err);
  }
}
function getAllSettings() {
  const defaults = {
    apiKey: "",
    sttModel: "whisper-large-v3-turbo",
    llmModel: "openai/gpt-oss-20b",
    shortcutToggle: "F10",
    shortcutPushToTalk: "F9",
    browserCookies: "chrome",
    wakeWordEnabled: "true",
    wakeWordSensitivity: "0.5"
  };
  const result = { ...defaults };
  for (const k of Object.keys(defaults)) {
    const val = getSetting(k, defaults[k]);
    if (val) result[k] = val;
  }
  return result;
}
let ort = null;
try {
  ort = require("onnxruntime-node");
} catch (err) {
  console.warn("[WakeWord] onnxruntime-node não pôde ser carregado:", err);
}
class WakeWordDetector extends events.EventEmitter {
  active = false;
  session = null;
  sensitivity = 0.5;
  lastTriggerTime = 0;
  cooldownMs = 2500;
  // Debounce para evitar disparos múltiplos seguidos
  audioBuffer = [];
  frameSize = 1280;
  // ~80ms de áudio em 16kHz
  constructor() {
    super();
  }
  async init(modelPath, sensitivity = 0.5) {
    this.sensitivity = sensitivity;
    const defaultModelPath = path.join(process.cwd(), "resources", "models", "wakeword", "vox.onnx");
    const finalPath = modelPath || defaultModelPath;
    if (ort && fs.existsSync(finalPath)) {
      try {
        this.session = await ort.InferenceSession.create(finalPath);
        console.log('[WakeWord] Modelo ONNX "Vox" carregado com sucesso:', finalPath);
      } catch (err) {
        console.error('[WakeWord] Erro ao carregar modelo ONNX "Vox":', err);
        this.session = null;
      }
    } else {
      console.log('[WakeWord] Escuta ativa para a palavra-chave "Vox" inicializada em modo VAD adaptativo (aguardando modelo vox.onnx em resources/models/wakeword/)');
    }
  }
  start() {
    this.active = true;
    this.audioBuffer = [];
    console.log('[WakeWord] Escuta em segundo plano ativa para a palavra "Vox".');
  }
  stop() {
    this.active = false;
    this.audioBuffer = [];
    console.log("[WakeWord] Escuta de Wake Word parada.");
  }
  setSensitivity(value) {
    this.sensitivity = Math.max(0.1, Math.min(1, value));
  }
  isListening() {
    return this.active;
  }
  async processAudioChunk(chunk) {
    if (!this.active) return;
    const samplesCount = Math.floor(chunk.length / 2);
    for (let i = 0; i < samplesCount; i++) {
      const sample = chunk.readInt16LE(i * 2) / 32768;
      this.audioBuffer.push(sample);
    }
    while (this.audioBuffer.length >= this.frameSize) {
      const frame = this.audioBuffer.splice(0, this.frameSize);
      await this.evaluateFrame(frame);
    }
  }
  async evaluateFrame(samples) {
    const now = Date.now();
    if (now - this.lastTriggerTime < this.cooldownMs) return;
    if (this.session && ort) {
      try {
        const tensor = new ort.Tensor("float32", Float32Array.from(samples), [1, samples.length]);
        const feeds = {};
        const inputName = this.session.inputNames[0] || "input";
        feeds[inputName] = tensor;
        const results = await this.session.run(feeds);
        const outputName = this.session.outputNames[0] || "output";
        const outputTensor = results[outputName];
        if (outputTensor && outputTensor.data) {
          const score = outputTensor.data[0];
          if (score >= this.sensitivity) {
            this.triggerDetection(score);
          }
        }
      } catch (err) {
        console.error("[WakeWord] Erro durante a inferência ONNX:", err);
      }
    } else {
      let sumSq = 0;
      for (let i = 0; i < samples.length; i++) {
        sumSq += samples[i] * samples[i];
      }
      const rms = Math.sqrt(sumSq / samples.length);
      const dynamicThreshold = 0.25 * (1.1 - this.sensitivity);
      if (rms > dynamicThreshold) {
        this.triggerDetection(rms);
      }
    }
  }
  triggerDetection(confidence) {
    const now = Date.now();
    this.lastTriggerTime = now;
    console.log(`[WakeWord] 🎙️ Palavra de ativação "Vox" detectada! Confiança: ${confidence.toFixed(2)}`);
    this.emit("detected", { keyword: "Vox", confidence, timestamp: now });
  }
}
const wakewordDetector = new WakeWordDetector();
const { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, Tray, Menu, nativeImage } = require("electron");
let mainWindow = null;
let dockWindow = null;
let tray = null;
let targetWindowHwnd = null;
function captureActiveWindow() {
  try {
    const result = child_process.execFileSync("powershell", [
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-Command",
      `(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name FGW -Namespace VOX -PassThru)::GetForegroundWindow()`
    ], { timeout: 1500, encoding: "utf8" });
    targetWindowHwnd = result.trim() || null;
  } catch {
    targetWindowHwnd = null;
  }
}
const getDevUrl = () => process.env["ELECTRON_RENDERER_URL"] || process.env["VITE_DEV_SERVER_URL"];
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 740,
    minWidth: 1040,
    maxWidth: 1040,
    minHeight: 740,
    maxHeight: 740,
    resizable: false,
    maximizable: false,
    minimizable: true,
    title: "Vox",
    backgroundColor: "#0D0D0F",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
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
      sandbox: false,
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
  if (dockWindow.isVisible()) return;
  positionDockWindow();
  if (dockWindow.isMinimized()) dockWindow.restore();
  dockWindow.showInactive();
  dockWindow.setAlwaysOnTop(true, "screen-saver");
}
function hideDock() {
  if (!dockWindow) return;
  if (!dockWindow.isVisible()) return;
  dockWindow.hide();
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
    let buffer;
    if (audioData && audioData.byteLength > 0) {
      buffer = Buffer.from(audioData);
      recorder.stopRecording();
    } else {
      buffer = recorder.stopRecording();
    }
    if (!buffer || buffer.length === 0) {
      return { text: "" };
    }
    const result = await transcribeAudio(buffer);
    console.log("[Main] Transcrição bruta:", result.text);
    if (result.text && !result.text.startsWith("[Erro")) {
      result.text = await correctTranscription(result.text);
      console.log("[Main] Transcrição corrigida:", result.text);
    }
    if (result.text) {
      await injectText(result.text, "clipboard", 100, targetWindowHwnd ?? void 0);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:transcript-result", result.text);
      }
    }
    return result;
  });
  ipcMain.on("vox:audio-level", (_event, energy) => {
    const data = { energy, isSpeech: energy > 0.02 };
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
  ipcMain.handle("vox:get-video-info", async (_event, url, cookiesFromBrowser) => {
    try {
      const info = await downloader.getVideoInfo(url, cookiesFromBrowser);
      return info;
    } catch (err) {
      console.error("[Main] Erro ao obter info do vídeo:", err);
      return { title: "Vídeo Desconhecido", duration: 0, thumbnail: "", platform: "unknown" };
    }
  });
  ipcMain.handle("vox:download-audio", async (_event, url, cookiesFromBrowser) => {
    try {
      const downloadsDir = app.getPath("downloads");
      const result = await downloader.downloadAudio({
        url,
        outputDir: downloadsDir,
        cookiesFromBrowser,
        onProgress: (pct, speed, eta) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("vox:download-progress", { pct, speed, eta });
          }
        }
      });
      return result;
    } catch (err) {
      console.error("[Main] Erro ao baixar áudio:", err);
      return { error: err?.message || "Erro ao baixar áudio via yt-dlp" };
    }
  });
  ipcMain.handle("vox:transcribe-media", async (_event, options) => {
    try {
      if (!options.audioPath || !fs.existsSync(options.audioPath)) {
        return { text: "[Erro: Arquivo de áudio não encontrado]" };
      }
      const buffer = fs.readFileSync(options.audioPath);
      const sttRes = await transcribeAudio(buffer);
      let text = sttRes.text || "";
      if (text && !text.startsWith("[Erro")) {
        text = await correctTranscription(text);
      }
      return { text };
    } catch (err) {
      console.error("[Main] Erro na transcrição de mídia:", err);
      return { text: "[Erro na transcrição de mídia]" };
    }
  });
  ipcMain.handle("vox:delete-file", async (_event, filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("[Main] Arquivo excluído com sucesso:", filePath);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error("[Main] Erro ao excluir arquivo:", err);
      return { success: false };
    }
  });
  ipcMain.handle("vox:select-file", async () => {
    try {
      if (!mainWindow) return null;
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Selecionar Vídeo ou Áudio",
        buttonLabel: "Selecionar Mídia",
        properties: ["openFile"],
        filters: [
          { name: "Mídias de Áudio e Vídeo", extensions: ["mp4", "mp3", "wav", "mkv", "mov", "m4a", "webm", "aac", "flac", "ogg", "avi"] },
          { name: "Todos os Arquivos", extensions: ["*"] }
        ]
      });
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (err) {
      console.error("[Main] Erro ao selecionar arquivo:", err);
      return null;
    }
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
          wakewordDetector.start();
        } else if (settings.wakeWordEnabled === "false") {
          wakewordDetector.stop();
        }
      }
      return { success: true };
    } catch (err) {
      console.error("[Main] Erro ao salvar configurações no banco:", err);
      return { success: false };
    }
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
    captureActiveWindow();
    showDock();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vox:toggle-recording", !isVisible);
  }
}
let f9ReleaseTimer = null;
function handleGlobalPushToTalk() {
  if (!dockWindow) return;
  if (!dockWindow.isVisible()) {
    captureActiveWindow();
    showDock();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:toggle-recording", true);
    }
  }
  if (f9ReleaseTimer) {
    clearTimeout(f9ReleaseTimer);
  }
  f9ReleaseTimer = setTimeout(() => {
    hideDock();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:toggle-recording", false);
    }
    f9ReleaseTimer = null;
  }, 180);
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
    console.log('[Main] 🎙️ Wake Word "Vox" detectada! Capturando janela ativa e iniciando ditado por voz...');
    captureActiveWindow();
    showDock();
    recorder.startRecording({ autoStopOnSilence: true });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:toggle-recording", true);
    }
  });
  recorder.on("auto-stop", async () => {
    console.log("[Main] Finalizando gravação por encerramento de fala...");
    hideDock();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:toggle-recording", false);
    }
    const buffer = recorder.stopRecording();
    if (!buffer || buffer.length === 0) return;
    const result = await transcribeAudio(buffer);
    console.log("[Main] Transcrição bruta:", result.text);
    if (result.text && !result.text.startsWith("[Erro")) {
      result.text = await correctTranscription(result.text);
      console.log("[Main] Transcrição corrigida:", result.text);
    }
    if (result.text) {
      console.log("[Main] Injetando texto no cursor da janela ativa (HWND:", targetWindowHwnd, ")...");
      await injectText(result.text, "clipboard", 100, targetWindowHwnd ?? void 0);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vox:transcript-result", result.text);
      }
    }
  });
  if (settings.wakeWordEnabled !== "false") {
    wakewordDetector.start();
  }
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath
    });
  } catch (err) {
    console.warn("[Main] Erro ao configurar autostart no Windows:", err);
  }
  globalShortcut.register("F10", toggleDockWindow);
  globalShortcut.register("F9", handleGlobalPushToTalk);
  const iconPath = app.isPackaged ? path.join(process.resourcesPath, "favicon.png") : path.join(app.getAppPath(), "src/favicon.png");
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip("Vox");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir Vox", click: () => {
      mainWindow?.show();
    } },
    { type: "separator" },
    { label: "Sair", click: () => {
      tray?.destroy();
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
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {
});
