<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**高精度 AI 语音听写，直接输入到活动光标处**

<br />

[![English](https://img.shields.io/badge/English-README-blue?style=flat-square&logo=github)](README.md)
[![Português](https://img.shields.io/badge/Portugu%C3%AAs-README-green?style=flat-square&logo=github)](README.pt.md)
[![Español](https://img.shields.io/badge/Espa%C3%B1ol-README-orange?style=flat-square&logo=github)](README.es.md)
[![Français](https://img.shields.io/badge/Fran%C3%A7ais-README-blueviolet?style=flat-square&logo=github)](README.fr.md)
[![Deutsch](https://img.shields.io/badge/Deutsch-README-yellow?style=flat-square&logo=github)](README.de.md)
[![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-README-red?style=flat-square&logo=github)](README.zh-CN.md)
[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-README-crimson?style=flat-square&logo=github)](README.ja.md)
[![Italiano](https://img.shields.io/badge/Italiano-README-darkgreen?style=flat-square&logo=github)](README.it.md)

<br />

[![Electron](https://img.shields.io/badge/Electron-33-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-black?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-black?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Platform](https://img.shields.io/badge/Platform-Windows-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vox 界面预览" width="850" />
</div>

<br />

## ◈ 什么是 Vox？

**Vox** 是一款基于 Electron 构建的 **Windows** AI 语音听写助手。它常驻系统托盘，通过全局快捷键（`F9`/`F10`）、语音剪贴板历史（`F11`）或唤醒词（**"Vox"**）触发，录制您的语音，在检测到静音时自动停止，通过 **Whisper** 进行高精度转写，使用大语言模型（LLM）修正标点与错别字，并将文本**直接注入到任意应用程序的活动光标处**。

> 体验如系统级原生听写：无论您在 VS Code、Word、邮件客户端还是 Slack 中，只需说出 *"Vox"* 并开始讲话，停止讲话后文本即刻出现在光标所在位置。

> **Vox 是 [Wispr Flow](https://wisprflow.ai) 的开源替代方案** —— 拥有 AI 语音听写、全局快捷键、免提**语音指令系统**、上下文感知校正、结构化格式模板以及基于 Win32 原生 API 的无缝文本注入。

---

## ◈ 功能对比：Vox 与 Wispr Flow

| 功能特性 | **Vox** | **Wispr Flow** |
|---|---|---|
| **开源与授权** | 100% 开源 (MIT), 永久免费 | 商业专有软件 |
| **费用模式** | 免费使用 (Groq/OpenAI/本地模型) | 免费版限制 2000 词/周 (Pro: $9~$29+/月) |
| **语音触发** | 唤醒词 "Vox" + 全局快捷键 + 语音指令 | 仅依赖快捷键/专有云 |
| **模型服务商** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | 仅限其专有云端 |
| **隐私与安全** | API 直连无中间商；本地可审计日志 | 专有云端集中处理 |
| **支持平台** | Windows | Mac, Windows, iOS |
| **静音自动停止 (VAD)** | 支持，检测到说话停顿后自动上屏 | 支持 |
| **上下文感知校正** | 支持 (自动识别代码编辑器、邮件、文档等) | 不支持 |
| **结构化听写模板** | 支持 (邮件、列表、会议纪要、Commit 信息…) | 不支持 |
| **语音指令系统** | 支持 (标点、编辑、导航、系统控制及自定义) | 不支持 |
| **专属热词词典** | 支持 (自定义技术术语与人名，防识别错误) | 不支持 |
| **语音剪贴板历史** | 支持 (通过 F11 快速重新插入最近 10 条听写) | 不支持 |

#### 核心优势

* **100% 免费与开源** — 无任何订阅费用，代码完全公开可审计。
* **模型自由选择** — 支持配置 Groq、OpenAI、Azure，或通过 **Ollama** / **LM Studio** 实现 100% 离线运行，零成本且保障隐私。
* **上下文感知校正** — Vox 自动检测当前前台应用并调整格式输出（例如在代码编辑器中保持代码注释风格）。
* **免提语音指令** — 直接说出标点符号与编辑命令（如 "逗号"、"换行"、"撤销"），支持自定义指令。
* **习惯模式学习** — 在听写超过 25 次后，Vox 会自动学习并应用您的常见修正习惯。
* **专属热词词典** — 录入专有名词与缩写，确保 Whisper 听写万无一失。
* **审计级隐私日志** — 本地完整记录每次 API 请求的端点与传输字节数。

---

## ◈ 全局快捷键

| 快捷键 | 模式 | 操作说明 |
|---|---|---|
| `F9` | 按住说话 (Push-to-Talk) | 按住按键录音，松开按键即刻转写 |
| `F10` | 切换模式 (Toggle) | 按一下开始录音，再按一下停止 |
| `F11` | 语音历史 (Clipboard) | 唤出最近 10 条听写记录并快捷重新输入 |

所有快捷键均可在设置中**自定义**，即使关闭主窗口，后台常驻托盘依然有效。

---

## ◈ 安装与运行

### 环境要求

- **Node.js** 20+
- **npm** 10+
- **操作系统**：Windows 10 / 11

### 开发环境启动

```bash
# 安装依赖
npm install

# 启动开发服务器 (支持热重载)
npm run dev
```

### 生产打包

```bash
# 编译项目
npm run build

# 构建 Windows 安装包 / 便携可执行文件
npx electron-builder --win
# 输出目录：dist-build/
```

---

## ◈ 开源许可

本项目遵循 **MIT 许可证**。详情请参阅 [LICENSE](LICENSE) 文件。

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
