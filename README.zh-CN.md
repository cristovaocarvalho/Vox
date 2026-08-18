<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### 桌面端旗舰级主权语音听写与自动化操作系统

*专为 Windows 与 macOS 打造的不受拘束、高度私密、卓越领先的语音听写与工作流自动化系统。*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [Italiano](README.it.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vox 界面" width="840" />
</div>

<br />

## 告别订阅制的主权之选

传统的商业语音听写软件往往将专业用户困在昂贵的按月订阅中，强制实行字数配额，并将私密想法与专有代码传输至第三方云端服务器。

**Vox 树立了全新架构标准。** 采用奢华极简的毛玻璃（Glassmorphism）美学设计，依托原生高性能核心，Vox 通过 Whisper 实时将语音转录为精准文本，经由用户自选的大语言模型智能优化标点与语义，并直接注入任意应用的光标所在位置 — 零订阅费、零数据追踪、终身私密。

<br />

---

## 核心功能与特性体系

### 原生跨平台卓越运行
专为 **Windows 10/11 (64-bit)** 与 **macOS (Apple Silicon M1/M2/M3/M4 及 Intel)** 原生构建。Vox 深度融入操作系统，无缝支持系统无障碍层、前台窗口识别与全局快捷键。

### 内置本地 Whisper 模型管理 (100% 离线)
在 Vox 界面内一键下载、配置和运行 Whisper GGML 模型（Tiny, Base, Small, Medium, Large v3, Distil-Whisper）。无需配置复杂 Python 环境，完全在本地离线运行，零网络延迟，享受极致的数据加密与隐私主权。

### 自带密钥模式 (BYOK) 与模型自由选择
您可以完全自由地决定使用哪款模型来驱动工作流。直接直连业界顶级 AI 推理服务，或接入本地推理引擎：
* **云端服务商:** Groq, OpenAI, Azure OpenAI, Deepgram, Cerebras, Mistral, Together AI.
* **本地环境:** Ollama, LM Studio, vLLM, LocalAI.
* **模型完全自由:** 随意选择已连接服务商或本地服务器支持的任意语音识别模型 (STT) 与语言模型 (LLM)。

### 智能语义润色与自动纠错
原始语音识别通常缺乏标点符号或出现同音字错词。Vox 结合自选语言模型的智能校对引擎，自动添加规范标点、大小写与术语修正，呈现流畅自然的思考表达。

### 语音指令与即时启动应用
无需双手即可执行复杂的操作系统自动化操作。Vox 支持丰富的语音指令以直接启动电脑上的任意软件：
* **启动应用:** “打开 VSCode”、“打开 Chrome”、“打开 Slack”、“打开终端”、“打开记事本”、“打开计算器”，或通过名称启动任意已安装程序。
* **网络与知识检索:** “打开 Chrome 搜索 React 开发文档”、“在 YouTube 搜索放松音乐”。
* **文本编辑与导航:** “换行”、“新段落”、“删除上一句话”、“删除词语”、“全选”、“撤销”、“复制”、“粘贴”。
* **Vox 控制:** “代码模式”、“文本模式”、“邮件模式”、“自由听写”、“重复上一句”、“取消”。

### 应用程序上下文自适应感知
Vox 在转录前自动检测当前活动窗口。在 VS Code 或终端中编写代码时，自动格式化标识符与编程语法；在撰写邮件或文档时，自动排版为流畅段落。

### 语音快捷文本片段 (Snippets)
将常用文本块与语音触发词关联。只要说出“我的签名”、“插入邮箱”或“我的地址”，即可瞬间在光标处展开多行预设文本。

### 自定义听写模板 (Templates)
创建带有特定排版提示与语音激活指令的专用模板。只需说出模板名称，即可在会议纪要、技术缺陷报告、提纲摘要与自由听写之间无缝切换。

### 全天候免提唤醒词 (*"Vox"*)
由本地运行的 ONNX OpenWakeWord 神经模型驱动。任何时刻直接说出 “Vox” 即可唤醒系统并开始听写，完全无需触碰键盘。

### 智能语音活动检测 (VAD) 与音频静音保护
内置 VAD 算法自动识别自然的语音停顿并结束听写。在讲话期间，Vox 可自动将电脑系统音频静音以消除回音干扰，说完后即刻恢复。

### 自定义技术专有词库
添加专业术语、公司名称、编程缩写与人名至个人词典，确保所有听写转录的用词准确与统一。

### 生产力看板与活跃度热力图
实时追踪打字提速倍率、已听写总字数与节省的时间，并通过 GitHub 风格的每日活动热力图直观掌握输入习惯。

### 隐私保险箱与透明审计日志
所有设置、模板、文本片段与会话记录均严格保存在本地 SQLite 数据库中。每一笔 API 调用均可在透明隐私日志中随时查阅。

<br />

---

## 架构对比

| 维度 | Vox | 商业闭源 SaaS 软件 |
|:---|:---|:---|
| **开源许可** | 开源协议 (MIT) | 商业闭源 |
| **使用成本** | 永久免费 (BYOK / 本地模式) | 每年 $180 – $360 持续订阅 |
| **数据隐私** | 100% 本地运行或 API 直连 | 数据经由第三方服务器中转 |
| **本地离线模型** | 软件内一键下载运行 (Whisper) | 通常锁定在昂贵高阶套餐 |
| **模型自由度** | 完全自由 (任意云端/本地 LLM & STT) | 锁定固定闭源模型 |
| **语音指令与应用启动** | 打开任意应用、网页搜索与系统控制 | 仅支持基础标点输入 |
| **平台支持** | Windows 10/11 与 macOS (通用包) | 局限于单一操作系统 |
| **自定义词库** | 本地 SQLite 无限存储 | 受到严格限制 |
| **使用限制** | 彻底无限制 | 严格的每月字数配额 |

<br />

---

## 默认快捷键

| 快捷键 (Win / Mac) | 模式 | 功能说明 |
|:---|:---|:---|
| `F10` / `Control+Space` | **切换听写** | 按下开始录音；停顿或再次按下以结束并注入文本 |
| `F9` / `Option+Space` | **按住说话** | 按住说话，松开后立即识别并粘贴至光标处 |
| `F11` / `Command+Shift+V` | **剪贴板历史** | 打开悬浮窗口查看并快速重新使用历史听写内容 |
| *"Vox"* | **唤醒词** | 通过本地神经模型免提后台唤醒 |

<br />

---

## 快速开始

### 环境要求
* **Windows:** Windows 10 或 11 (64-bit)
* **macOS:** macOS 12 Monterey 或更高版本 (Apple Silicon M1/M2/M3/M4 或 Intel x64)
* **Node.js:** Node.js 20+ 及 npm

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/cristovaocarvalho/Vox.git
cd Vox/code

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

### 构建与打包

```bash
# 类型检查与编译
npm run build

# 打包 Windows 安装程序 (.exe)
npm run build:win

# 打包 macOS 安装程序 (.dmg 及 .zip)
npm run build:mac

# 打包 Apple Silicon 原生版本
npm run build:mac:arm64
```

<br />

---

## 许可证

基于 **MIT License** 发布。由 [Cristovão Carvalho](https://github.com/cristovaocarvalho) 及开源社区精心打造。
