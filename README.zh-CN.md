<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### 精准 AI 语音听写 — 直接输入至活动光标处

*专为 Windows 设计的私密、开源、高保真语音输入系统。*

<br />

[简体中文](README.zh-CN.md) &nbsp;·&nbsp; [English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [Italiano](README.it.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vox 界面" width="820" />
</div>

<br />

## 为何选择 Vox

传统商业语音输入软件收取高昂订阅费用，限制每日字数，并将您的私密音频上传至其专有云端用于模型训练。

**Vox 是一次架构上的革新。** 它提供系统底层的语音输入体验，通过 Whisper 转写语音，借助前沿大语言模型修正标点符号，并将格式化后的文本直接输入至任意 Windows 应用程序的光标位置。

<br />

## 核心特性

### 彻底的架构自主权 (BYOK)
直接连接主流推理服务商（包括 Groq、OpenAI 及 Azure OpenAI），或通过 **Ollama** 和 **LM Studio** 实现 100% 本地离线运行。无中间服务器，无数据驻留。

### 原生多语言高精度识别
支持 **8 种主要语言**（中文、英语、葡萄牙语、西班牙语、法语、德语、日语及意大利语）的自然听写与格式化，杜绝生硬翻译。

### 上下文感知语义校正
Vox 能够感知当前活动程序。无论是在 IDE 中编写代码、撰写正式邮件还是记录笔记，校正器都会根据使用场景调整大小写、标点和术语格式。

### 无缝光标即时输入
通过全局快捷键（`F10` / `F9`）或语音唤醒词（*"Vox"*）启动。智能静音检测 (VAD) 会在发音停止后自动完成文本并直接上屏。

### 永久免费与开源
基于 MIT 许可证分发。无订阅制，无字数限制，无任何隐藏门槛。

<br />

---

## 对比

| 维度 | Vox | 商业闭源方案 |
|:---|:---|:---|
| **许可协议** | 开源 (MIT) | 商业专有 |
| **资费模式** | 完全免费 | 每年 $180 至 $360 美元 |
| **数据链路** | 直连服务商或 100% 本地 | 经由第三方云端中转 |
| **离线推理** | 支持 (Ollama / LM Studio) | 不支持 |
| **字数限制** | 无限制 | 阶梯配额限制 |
| **模型支持** | Whisper 全系列 + 任意 LLM | 封闭式固定模型 |
| **输入机制** | 原生 Win32 光标直接注入 | 参差不齐 |

<br />

---

## 全局快捷键

| 快捷键 | 模式 | 操作说明 |
|:---|:---|:---|
| `F10` | **切换模式** | 按下开始听写；再次按下或停顿自动上屏 |
| `F9` | **按住说话** | 按住时录音；松开后自动转写上屏 |
| `F11` | **历史记录** | 调出最近听写记录以便快速复用 |
| *"Vox"* | **唤醒词** | 免提语音激活 |

<br />

---

## 快速上手

### 环境要求
* Windows 10 或 11 (64 位)
* [Node.js](https://nodejs.org) (v20+) 与 npm

### 安装与运行

```bash
# 克隆代码仓库
git clone https://github.com/your-username/vox.git
cd vox/code

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

### 构建安装包

```bash
npm run build:win
```

<br />

---

## 开源协议

本项目遵循 **MIT 许可证**。详情请参阅 [LICENSE](LICENSE) 文件。

<div align="center">
<br />

Cristóvão Carvalho 倾心打造 &nbsp;·&nbsp; **Vox**

</div>
