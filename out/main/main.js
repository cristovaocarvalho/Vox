"use strict";
const path = require("path");
const events = require("events");
const child_process = require("child_process");
const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
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
const { clipboard, systemPreferences: systemPreferences$1 } = require("electron");
function checkBinaryExists(binaryName) {
  return new Promise((resolve) => {
    child_process.execFile("which", [binaryName], (err) => {
      resolve(!err);
    });
  });
}
async function injectText(text, windowRef, _delayMs = 150, legacyHwnd) {
  if (!text || text.trim().length === 0) {
    return { success: false, method: "none", error: "Texto vazio" };
  }
  let ref = {};
  if (typeof windowRef === "object" && windowRef !== null && ("hwnd" in windowRef || "appName" in windowRef || "windowId" in windowRef)) {
    ref = windowRef;
  } else if (typeof windowRef === "string") {
    ref = { hwnd: windowRef };
  } else if (legacyHwnd) {
    ref = { hwnd: legacyHwnd };
  }
  const platform = process.platform;
  console.log(`[Injector] Injetando texto no cursor ativo (${text.length} chars, plataforma: ${platform})...`);
  clipboard.writeText(text);
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (platform === "win32") {
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
  if (platform === "darwin") {
    const isTrusted = systemPreferences$1 ? systemPreferences$1.isTrustedAccessibilityClient(false) : true;
    if (!isTrusted) {
      console.warn("[Injector] Permissão de Acessibilidade não concedida no macOS.");
      return {
        success: false,
        method: "applescript-macos",
        error: "accessibility-required"
      };
    }
    const appName = ref.appName;
    const script = appName && appName !== "null" ? `tell application "${appName}" to activate
delay 0.08
tell application "System Events" to keystroke "v" using command down` : `tell application "System Events" to keystroke "v" using command down`;
    return new Promise((resolve) => {
      child_process.execFile("osascript", ["-e", script], (err) => {
        if (err) {
          console.error("[Injector] Erro ao colar texto via AppleScript (macOS):", err);
          resolve({ success: false, method: "applescript-macos", error: err.message });
        } else {
          console.log("[Injector] Texto colado no cursor com sucesso (macOS)!");
          resolve({ success: true, method: "applescript-macos" });
        }
      });
    });
  }
  if (platform === "linux") {
    const isWayland = process.env.WAYLAND_DISPLAY !== void 0;
    const hasXdotool = await checkBinaryExists("xdotool");
    const hasWtype = await checkBinaryExists("wtype");
    if (!isWayland && hasXdotool) {
      const windowId = ref.windowId;
      return new Promise((resolve) => {
        if (windowId && windowId !== "0" && windowId !== "null") {
          child_process.execFile("xdotool", ["windowactivate", "--sync", String(windowId)], () => {
            child_process.execFile("xdotool", ["key", "ctrl+v"], (err) => {
              if (err) {
                console.error("[Injector] Erro xdotool:", err);
                resolve({ success: false, method: "xdotool-linux", error: err.message });
              } else {
                console.log("[Injector] Texto colado com xdotool (Linux)!");
                resolve({ success: true, method: "xdotool-linux" });
              }
            });
          });
        } else {
          child_process.execFile("xdotool", ["key", "ctrl+v"], (err) => {
            if (err) {
              resolve({ success: false, method: "xdotool-linux", error: err.message });
            } else {
              resolve({ success: true, method: "xdotool-linux" });
            }
          });
        }
      });
    }
    if (isWayland && hasWtype) {
      return new Promise((resolve) => {
        child_process.execFile("wtype", ["-M", "ctrl", "-k", "v"], (err) => {
          if (err) {
            resolve({ success: false, method: "wtype-wayland", error: err.message });
          } else {
            resolve({ success: true, method: "wtype-wayland" });
          }
        });
      });
    }
    console.warn("[Injector] Auto-paste não disponível no Linux (xdotool/wtype ausentes).");
    return {
      success: false,
      method: "clipboard-only-linux",
      error: isWayland ? "wtype-missing" : "xdotool-missing"
    };
  }
  return { success: true, method: "clipboard-only" };
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
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";
  const binaryName = isWin ? "yt-dlp.exe" : isMac ? "yt-dlp_macos" : "yt-dlp";
  const possiblePaths = [
    path.join(process.cwd(), "resources", "binaries", binaryName),
    path.join(process.cwd(), "resources", "binaries", "yt-dlp"),
    path.join(__dirname, "..", "..", "resources", "binaries", binaryName),
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
  const targetFile = path.join(targetDir, binaryName);
  if (!fs.existsSync(targetFile)) {
    const downloadUrl = isWin ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" : isMac ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
    console.log(`[Downloader] Baixando ${binaryName} automaticamente...`);
    try {
      await downloadBinary(downloadUrl, targetFile);
      if (!isWin) {
        fs.chmodSync(targetFile, 493);
      }
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
let activeDownloadProc = null;
function cancelDownload() {
  if (activeDownloadProc) {
    try {
      activeDownloadProc.kill("SIGKILL");
      activeDownloadProc = null;
      console.log("[Downloader] Processo yt-dlp cancelado com sucesso.");
      return true;
    } catch (err) {
      console.error("[Downloader] Erro ao cancelar yt-dlp:", err);
    }
  }
  return false;
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
      activeDownloadProc = proc;
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
        if (activeDownloadProc === proc) {
          activeDownloadProc = null;
        }
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
        if (activeDownloadProc === proc) {
          activeDownloadProc = null;
        }
        reject(new Error(`Erro ao executar o downloader (${err.message}).`));
      });
    } catch (err) {
      activeDownloadProc = null;
      reject(new Error(err?.message || "Erro inesperado ao baixar mídia."));
    }
  });
}
const downloader = {
  detectPlatform,
  getVideoInfo,
  downloadAudio,
  cancelDownload
};
function formatTimestamp(seconds, decimalSeparator = ",") {
  const s = Math.max(0, seconds || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor(s % 3600 / 60);
  const secs = Math.floor(s % 60);
  const millis = Math.floor(s % 1 * 1e3);
  const hh = String(hrs).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${hh}:${mm}:${ss}${decimalSeparator}${mmm}`;
}
function formatShortTimestamp(seconds) {
  const s = Math.max(0, seconds || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor(s % 3600 / 60);
  const secs = Math.floor(s % 60);
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  if (hrs > 0) {
    const hh = String(hrs).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
function generateContent(result, format, options = {}) {
  const title = options.title || "Transcrição Vox";
  const includeTimestamps = options.includeTimestamps ?? false;
  const segments = result.segments || [];
  switch (format.toLowerCase()) {
    case "txt": {
      if (includeTimestamps && segments.length > 0) {
        return segments.map((s) => `[${formatShortTimestamp(s.start)}] ${s.text.trim()}`).join("\n");
      }
      return result.text;
    }
    case "md": {
      let content = `# ${title}

`;
      if (includeTimestamps && segments.length > 0) {
        content += segments.map((s) => `**[${formatShortTimestamp(s.start)}]** ${s.text.trim()}`).join("\n\n");
      } else {
        content += result.text;
      }
      return content;
    }
    case "srt": {
      if (segments.length > 0) {
        return segments.map((s, idx) => {
          const start = formatTimestamp(s.start, ",");
          const end = formatTimestamp(s.end, ",");
          return `${idx + 1}
${start} --> ${end}
${s.text.trim()}
`;
        }).join("\n");
      }
      const duration = result.duration || 10;
      return `1
00:00:00,000 --> ${formatTimestamp(duration, ",")}
${result.text}
`;
    }
    case "vtt": {
      let content = "WEBVTT\n\n";
      if (segments.length > 0) {
        content += segments.map((s, idx) => {
          const start = formatTimestamp(s.start, ".");
          const end = formatTimestamp(s.end, ".");
          return `${idx + 1}
${start} --> ${end}
${s.text.trim()}
`;
        }).join("\n");
      } else {
        const duration = result.duration || 10;
        content += `1
00:00:00.000 --> ${formatTimestamp(duration, ".")}
${result.text}
`;
      }
      return content;
    }
    case "json": {
      return JSON.stringify(
        {
          title,
          duration: result.duration,
          text: result.text,
          segments: result.segments,
          exportedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        null,
        2
      );
    }
    default:
      return result.text;
  }
}
async function exportTranscription(result, formats, outputPath, options = {}) {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  const timestamp = Date.now();
  const sanitizedTitle = (options.title || "vox_transcription").toLowerCase().replace(/[^a-z0-9_-]/gi, "_").slice(0, 30);
  const createdFiles = [];
  for (const fmt of formats) {
    const ext = fmt.toLowerCase().replace(/^\./, "");
    const fileName = `${sanitizedTitle}_${timestamp}.${ext}`;
    const filePath = path.join(outputPath, fileName);
    const content = generateContent(result, ext, options);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`[Exporter] Arquivo exportado: ${filePath}`);
    createdFiles.push(filePath);
  }
  return createdFiles;
}
const exporter = {
  generateContent,
  exportTranscription,
  export: exportTranscription
};
async function ensureFfmpegExecutable() {
  const isWin = process.platform === "win32";
  const binaryName = isWin ? "ffmpeg.exe" : "ffmpeg";
  const possiblePaths = [
    path.join(process.cwd(), "resources", "binaries", binaryName),
    path.join(__dirname, "..", "..", "resources", "binaries", binaryName),
    "ffmpeg"
  ];
  for (const p of possiblePaths) {
    if (p !== "ffmpeg" && fs.existsSync(p)) {
      return p;
    }
  }
  return "ffmpeg";
}
function isVideoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [".mp4", ".mkv", ".mov", ".avi", ".webm"].includes(ext);
}
async function extractAudioFromVideo(videoPath, outputDir, onProgress) {
  const ffmpegExec = await ensureFfmpegExecutable();
  const timestamp = Date.now();
  const audioPath = path.join(outputDir, `vox_extracted_${timestamp}.mp3`);
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      videoPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-q:a",
      "2",
      audioPath
    ];
    console.log(`[FFmpeg] Extraindo áudio de ${videoPath} para ${audioPath}...`);
    try {
      const proc = child_process.spawn(ffmpegExec, args);
      proc.stderr.on("data", (data) => {
        const text = data.toString();
        const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (match && onProgress) {
          onProgress(50);
        }
      });
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(audioPath)) {
          resolve(audioPath);
        } else {
          const fallbackArgs = ["-y", "-i", videoPath, "-vn", audioPath];
          const fallbackProc = child_process.spawn(ffmpegExec, fallbackArgs);
          fallbackProc.on("close", (fallbackCode) => {
            if (fallbackCode === 0 && fs.existsSync(audioPath)) {
              resolve(audioPath);
            } else {
              reject(new Error(`Falha ao extrair áudio via FFmpeg (código ${code})`));
            }
          });
        }
      });
      proc.on("error", (err) => {
        reject(new Error(`Erro no processo FFmpeg: ${err.message}`));
      });
    } catch (err) {
      reject(new Error(`Exceção ao executar FFmpeg: ${err?.message || err}`));
    }
  });
}
const ffmpeg = {
  ensureFfmpegExecutable,
  isVideoFile,
  extractAudioFromVideo
};
const { app: app$1 } = require("electron");
let Database = null;
try {
  Database = require("better-sqlite3");
} catch (e) {
  console.warn("[DB] Módulo nativo better-sqlite3 não encontrado, usando fallback seguro:", e);
}
let dbInstance = null;
let fallbackFileSettings = null;
let fallbackFileSessions = null;
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
      const stmt = dbInstance.prepare("SELECT value FROM settings WHERE key = ?");
      const row = stmt.get(key);
      return row ? row.value : defaultValue;
    }
    if (fallbackFileSettings && fs.existsSync(fallbackFileSettings)) {
      const data = JSON.parse(fs.readFileSync(fallbackFileSettings, "utf-8"));
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
    if (fallbackFileSettings) {
      let data = {};
      if (fs.existsSync(fallbackFileSettings)) {
        try {
          data = JSON.parse(fs.readFileSync(fallbackFileSettings, "utf-8"));
        } catch {
          data = {};
        }
      }
      data[key] = value;
      fs.writeFileSync(fallbackFileSettings, JSON.stringify(data, null, 2), "utf-8");
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
let ort = null;
try {
  ort = require("onnxruntime-node");
} catch (err) {
  console.warn("[WakeWord] onnxruntime-node não pôde ser carregado:", err);
}
let recordLpcm = null;
try {
  recordLpcm = require("node-record-lpcm16");
} catch {
}
class WakeWordDetector extends events.EventEmitter {
  active = false;
  paused = false;
  session = null;
  sensitivity = 0.5;
  // 0.0 a 1.0 (50% por padrão)
  threshold = 0.7;
  // Derivado da sensibilidade (0.9 - sens * 0.4)
  lastTriggerTime = 0;
  cooldownMs = 2500;
  // Cooldown de 2.5s para evitar múltiplos disparos
  audioBuffer = [];
  frameSize = 1280;
  // 1280 amostras = 80ms a 16kHz (exigido pelo openWakeWord)
  recordingStream = null;
  modelLoaded = false;
  constructor() {
    super();
  }
  async init(modelPath, sensitivity = 0.5) {
    this.setSensitivity(sensitivity);
    const defaultModelPath = path.join(process.cwd(), "resources", "models", "wakeword", "vox.onnx");
    const altModelPath = path.join(__dirname, "..", "..", "resources", "models", "wakeword", "vox.onnx");
    let finalPath = modelPath || defaultModelPath;
    if (!fs.existsSync(finalPath) && fs.existsSync(altModelPath)) {
      finalPath = altModelPath;
    }
    if (!fs.existsSync(finalPath)) {
      console.warn("[WakeWord] Aviso: Modelo vox.onnx não encontrado em:", finalPath);
      this.modelLoaded = false;
      this.emit("wakeword-model-missing", { path: finalPath });
      return false;
    }
    if (!ort) {
      console.error("[WakeWord] Erro: onnxruntime-node não disponível.");
      this.modelLoaded = false;
      return false;
    }
    try {
      this.session = await ort.InferenceSession.create(finalPath);
      this.modelLoaded = true;
      console.log('[WakeWord] Modelo ONNX "Vox" carregado com sucesso:', finalPath);
      return true;
    } catch (err) {
      console.error('[WakeWord] Erro ao carregar modelo ONNX "Vox":', err);
      this.modelLoaded = false;
      this.emit("wakeword-error", { error: err?.message || "Falha ao carregar modelo ONNX" });
      return false;
    }
  }
  setSensitivity(value) {
    const normalized = Math.max(0, Math.min(1, value));
    this.sensitivity = normalized;
    this.threshold = 0.9 - normalized * 0.4;
    console.log(`[WakeWord] Sensibilidade ajustada: ${Math.round(normalized * 100)}% (Threshold: ${this.threshold.toFixed(2)})`);
  }
  isListening() {
    return this.active && !this.paused;
  }
  isModelLoaded() {
    return this.modelLoaded;
  }
  start() {
    if (this.active) return;
    if (!this.modelLoaded && !this.session) {
      console.warn("[WakeWord] Tentativa de iniciar listener sem modelo ONNX carregado.");
      this.emit("wakeword-model-missing", {});
      return;
    }
    this.active = true;
    this.paused = false;
    this.audioBuffer = [];
    this.startMicStream();
    console.log('[WakeWord] Escuta em segundo plano ativa para a palavra "Vox".');
  }
  stop() {
    this.active = false;
    this.paused = false;
    this.audioBuffer = [];
    this.stopMicStream();
    console.log("[WakeWord] Escuta de Wake Word encerrada.");
  }
  pause() {
    if (!this.active) return;
    this.paused = true;
    this.audioBuffer = [];
    console.log("[WakeWord] Listener pausado temporariamente durante gravação de áudio.");
  }
  resume() {
    if (!this.active) return;
    this.paused = false;
    this.audioBuffer = [];
    console.log("[WakeWord] Listener retomado.");
  }
  startMicStream() {
    if (!recordLpcm || this.recordingStream) return;
    try {
      this.recordingStream = recordLpcm.record({
        sampleRate: 16e3,
        channels: 1,
        audioType: "raw",
        endOnSilence: false
      });
      const stream = this.recordingStream.stream();
      stream.on("data", (chunk) => {
        if (this.active && !this.paused) {
          this.processAudioChunk(chunk);
        }
      });
      stream.on("error", (err) => {
        console.error("[WakeWord] Erro no stream de captura de microfone:", err);
        this.emit("wakeword-error", { error: err?.message || "Erro no microfone em segundo plano" });
      });
    } catch (err) {
      console.warn("[WakeWord] Não foi possível iniciar node-record-lpcm16:", err?.message);
      this.emit("wakeword-error", { error: err?.message || "Falha ao iniciar microfone de segundo plano" });
    }
  }
  stopMicStream() {
    if (this.recordingStream) {
      try {
        this.recordingStream.stop();
      } catch {
      }
      this.recordingStream = null;
    }
  }
  async processAudioChunk(chunk) {
    if (!this.active || this.paused) return;
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
    if (!this.session || !ort) return;
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
        if (score >= this.threshold) {
          this.triggerDetection(score);
        }
      }
    } catch (err) {
      console.error("[WakeWord] Exceção durante inferência ONNX:", err?.message);
    }
  }
  triggerDetection(score) {
    const now = Date.now();
    this.lastTriggerTime = now;
    console.log(`[WakeWord] 🎙️ Wake Word "Vox" detectada! Score: ${score.toFixed(3)} (Threshold: ${this.threshold.toFixed(2)})`);
    this.emit("detected", { keyword: "Vox", score, timestamp: now });
  }
}
const wakewordDetector = new WakeWordDetector();
const { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, Tray, Menu, nativeImage, shell, systemPreferences } = require("electron");
let mainWindow = null;
let dockWindow = null;
let tray = null;
let targetWindowRef = null;
let isQuitting = false;
function captureActiveWindow() {
  try {
    if (process.platform === "win32") {
      const result = child_process.execFileSync("powershell", [
        "-NoProfile",
        "-WindowStyle",
        "Hidden",
        "-Command",
        `(Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name FGW -Namespace VOX -PassThru)::GetForegroundWindow()`
      ], { timeout: 1500, encoding: "utf8" });
      const hwnd = result.trim();
      targetWindowRef = hwnd ? { hwnd } : null;
    } else if (process.platform === "darwin") {
      const result = child_process.execFileSync("osascript", [
        "-e",
        'tell application "System Events" to get name of first process whose frontmost is true'
      ], { timeout: 1500, encoding: "utf8" });
      const appName = result.trim();
      targetWindowRef = appName ? { appName } : null;
    } else if (process.platform === "linux") {
      const result = child_process.execFileSync("xdotool", ["getactivewindow"], { timeout: 1500, encoding: "utf8" });
      const windowId = result.trim();
      targetWindowRef = windowId ? { windowId } : null;
    }
  } catch {
    targetWindowRef = null;
  }
  return targetWindowRef;
}
const getDevUrl = () => process.env["ELECTRON_RENDERER_URL"] || process.env["VITE_DEV_SERVER_URL"];
function getAppIconPath() {
  return app.isPackaged ? path.join(process.resourcesPath, "favicon.png") : path.join(app.getAppPath(), "src/favicon.png");
}
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
    autoHideMenuBar: true,
    title: "Vox",
    icon: getAppIconPath(),
    backgroundColor: "#0D0D0F",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
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
        if (injectRes.error === "accessibility-required") {
          mainWindow?.webContents.send("vox:accessibility-required");
        } else if (injectRes.error === "xdotool-missing" || injectRes.error === "wtype-missing") {
          mainWindow?.webContents.send("vox:xdotool-missing", { isWayland: process.env.WAYLAND_DISPLAY !== void 0 });
        }
      }
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
  const sendMediaProgress = (phase, percent, speed, eta) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:media-progress", { phase, percent: Math.round(percent), speed, eta });
    }
  };
  ipcMain.handle("vox:get-video-info", async (_event, url, cookiesFromBrowser) => {
    try {
      const info = await downloader.getVideoInfo(url, cookiesFromBrowser);
      return info;
    } catch (err) {
      console.error("[Main] Erro ao obter info do vídeo:", err);
      return { title: "Vídeo Desconhecido", duration: 0, thumbnail: "", platform: "unknown" };
    }
  });
  ipcMain.handle("vox:start-media-transcription", async (_event, payload) => {
    try {
      let audioPath = "";
      const downloadsDir = app.getPath("downloads");
      if (payload.url) {
        sendMediaProgress("Baixando áudio", 0, "0 B/s", "--:--");
        const dlResult = await downloader.downloadAudio({
          url: payload.url,
          outputDir: downloadsDir,
          cookiesFromBrowser: payload.cookiesFromBrowser,
          onProgress: (pct, speed, eta) => {
            const mappedPct = Math.min(40, pct / 100 * 40);
            sendMediaProgress("Baixando áudio", mappedPct, speed, eta);
          }
        });
        if (dlResult.audioPath) {
          audioPath = dlResult.audioPath;
        } else {
          throw new Error("Caminho do áudio não retornado pelo downloader.");
        }
      } else if (payload.filePath) {
        const isVideo = ffmpeg.isVideoFile(payload.filePath);
        if (isVideo) {
          sendMediaProgress("Baixando áudio", 10);
          audioPath = await ffmpeg.extractAudioFromVideo(payload.filePath, downloadsDir, (pct) => {
            const mappedPct = Math.min(40, pct / 100 * 40);
            sendMediaProgress("Baixando áudio", mappedPct);
          });
        } else {
          audioPath = payload.filePath;
          sendMediaProgress("Baixando áudio", 40);
        }
      } else {
        throw new Error("Nenhuma URL ou arquivo informado.");
      }
      sendMediaProgress("Transcrevendo", 40);
      if (!fs.existsSync(audioPath)) {
        throw new Error("Arquivo de áudio não encontrado no disco.");
      }
      const buffer = fs.readFileSync(audioPath);
      sendMediaProgress("Transcrevendo", 55);
      const sttRes = await transcribeAudio(buffer);
      sendMediaProgress("Transcrevendo", 75);
      let correctedText = sttRes.text || "";
      if (correctedText && !correctedText.startsWith("[Erro")) {
        correctedText = await correctTranscription(correctedText);
        sttRes.text = correctedText;
      }
      let mediaTitle = payload.filePath ? path.basename(payload.filePath) : "Mídia da Web";
      let mediaPlatform = payload.filePath ? "local" : "web";
      if (payload.url) {
        if (payload.url.includes("youtu")) mediaPlatform = "youtube";
        else if (payload.url.includes("tiktok")) mediaPlatform = "tiktok";
        else if (payload.url.includes("instagram")) mediaPlatform = "instagram";
        try {
          const info = await downloader.getVideoInfo(payload.url);
          if (info && info.title) mediaTitle = info.title;
        } catch {
        }
      }
      const mediaSession = {
        id: crypto.randomUUID(),
        type: "media",
        title: mediaTitle,
        source: payload.url || payload.filePath,
        platform: mediaPlatform,
        duration: sttRes.duration || 0,
        text: sttRes.text || "",
        rawText: sttRes.rawText || sttRes.text || "",
        segments: sttRes.segments || [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      saveSession(mediaSession);
      sendMediaProgress("Transcrevendo", 90);
      return {
        audioPath,
        result: sttRes,
        text: sttRes.text,
        sessionId: mediaSession.id
      };
    } catch (err) {
      console.error("[Main] Erro em start-media-transcription:", err);
      return { error: err?.message || "Falha ao processar mídia" };
    }
  });
  ipcMain.handle("vox:cancel-media-transcription", async () => {
    try {
      const canceled = downloader.cancelDownload();
      return { success: canceled };
    } catch (err) {
      console.error("[Main] Erro ao cancelar transcrição:", err);
      return { success: false };
    }
  });
  ipcMain.handle("vox:select-export-folder", async () => {
    try {
      if (!mainWindow) return null;
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Selecionar Pasta para Exportação",
        buttonLabel: "Selecionar Pasta",
        properties: ["openDirectory"]
      });
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (err) {
      console.error("[Main] Erro ao selecionar pasta de exportação:", err);
      return null;
    }
  });
  ipcMain.handle("vox:export-transcription", async (_event, payload) => {
    try {
      sendMediaProgress("Exportando", 92);
      const files = await exporter.exportTranscription(
        payload.result,
        payload.formats,
        payload.outputPath,
        payload.options || {}
      );
      sendMediaProgress("Exportando", 100);
      return { success: true, files };
    } catch (err) {
      console.error("[Main] Erro ao exportar transcrição:", err);
      return { success: false, error: err?.message || "Falha ao exportar arquivos" };
    }
  });
  ipcMain.handle("vox:delete-audio", async (_event, audioPath) => {
    try {
      if (audioPath && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        console.log("[Main] Áudio excluído com sucesso:", audioPath);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error("[Main] Erro ao excluir áudio:", err);
      return { success: false };
    }
  });
  ipcMain.handle("vox:open-folder", async (_event, folderOrFilePath) => {
    try {
      if (folderOrFilePath && fs.existsSync(folderOrFilePath)) {
        const stat = fs.statSync(folderOrFilePath);
        if (stat.isDirectory()) {
          await shell.openPath(folderOrFilePath);
        } else {
          shell.showItemInFolder(folderOrFilePath);
        }
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error("[Main] Erro ao abrir pasta/arquivo:", err);
      return { success: false };
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
  ipcMain.handle("vox:open-accessibility-preferences", () => {
    if (process.platform === "darwin") {
      try {
        if (systemPreferences && systemPreferences.isTrustedAccessibilityClient) {
          systemPreferences.isTrustedAccessibilityClient(true);
        } else {
          shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
        }
      } catch (err) {
        console.error("[Main] Erro ao abrir Preferências de Acessibilidade:", err);
      }
    }
    return { success: true };
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
    if (recorder.getIsRecording()) return;
    console.log('[Main] 🎙️ Wake Word "Vox" detectada! Capturando janela ativa e iniciando ditado por voz...');
    captureActiveWindow();
    showDock();
    wakewordDetector.pause();
    recorder.startRecording({ autoStopOnSilence: true });
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
    hideDock();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vox:toggle-recording", false);
    }
    const buffer = recorder.stopRecording();
    wakewordDetector.resume();
    if (!buffer || buffer.length === 0) return;
    const result = await transcribeAudio(buffer);
    console.log("[Main] Transcrição bruta:", result.text);
    if (result.text && !result.text.startsWith("[Erro")) {
      result.text = await correctTranscription(result.text);
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
      console.log("[Main] Injetando texto no cursor da janela ativa:", targetWindowRef, ")...");
      const injectRes = await injectText(result.text, targetWindowRef || void 0);
      if (!injectRes.success) {
        if (injectRes.error === "accessibility-required") {
          mainWindow?.webContents.send("vox:accessibility-required");
        } else if (injectRes.error === "xdotool-missing" || injectRes.error === "wtype-missing") {
          mainWindow?.webContents.send("vox:xdotool-missing", { isWayland: process.env.WAYLAND_DISPLAY !== void 0 });
        }
      }
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
