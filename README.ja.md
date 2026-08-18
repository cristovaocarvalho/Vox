<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**高精度な音声ディクテーション、アクティブなカーソル位置へ直接入力**

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
  <img src="src/assets/Vox - UI.png" alt="Vox 画面プレビュー" width="850" />
</div>

<br />

## ◈ Vox とは？

**Vox** は、Electron で構築された **Windows** 向けの AI 音声ディクテーションアシスタントです。システムトレイに常駐し、グローバルショートカット（`F9`/`F10`）、音声クリップボード履歴（`F11`）、またはウェイクワード（**「Vox」**）によって起動します。発話を録音し、無音を検知して自動停止、**Whisper** で文字起こしを行い、LLM で句読点や誤字を校正して、あらゆるアプリの**アクティブなカーソル位置へ直接テキストを挿入**します。

> OS ネイティブな音声入力のような使い心地です。VS Code、Word、メール、Slack などの画面で「Vox」と発話して話すだけで、話し終えるとカーソル位置にテキストが即座に反映されます。

> **Vox は [Wispr Flow](https://wisprflow.ai) のオープンソース代替アプリです** — AI 音声入力、グローバルショートカット、ハンズフリーな**音声コマンドシステム**、コンテキスト認識校正、定型テンプレート、Win32 ネイティブ API による高速テキスト挿入を提供します。

---

## ◈ 比較：Vox vs Wispr Flow

| 機能・特徴 | **Vox** | **Wispr Flow** |
|---|---|---|
| **ライセンス形態** | 100% オープンソース (MIT)、完全無料 | 商用・プロプライエタリ |
| **利用料金** | 日常利用無料 (Groq/OpenAI/ローカルモデル) | 無料枠は週2,000語まで (Pro: $9〜$29+/月) |
| **音声起動** | ウェイクワード「Vox」+ ショートカット + 音声コマンド | ショートカット/クラウド依存 |
| **利用プロバイダー** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | 専用クラウドのみ |
| **プライバシー** | 中継サーバーなしの直接API通信、監査ログ保存 | 専用クラウドでの集中処理 |
| **対応OS** | Windows | Mac, Windows, iOS |
| **無音自動停止 (VAD)** | 対応、発話終了時に自動で停止・貼り付け | 対応 |
| **コンテキスト認識校正** | 対応 (コードエディタ、メール、文書などを自動判別) | 非対応 |
| **構造化テンプレート** | 対応 (メール、箇条書き、議事録、Commit文など) | 非対応 |
| **音声コマンド** | 対応 (句読点、編集、操作、カスタムコマンド) | 非対応 |
| **ユーザー辞書** | 対応 (専門用語や固有名詞を校正モデルへ登録) | 非対応 |
| **音声履歴 (F11)** | 対応 (直近10件のディクテーションを再挿入可能) | 非対応 |

#### 主なメリット

* **完全無料＆オープンソース** — サブスクリプション不要、コードは完全に監査可能。
* **プロバイダーの自由度** — Groq、OpenAI、Azure に加え、**Ollama** や **LM Studio** による完全ローカル実行（無料・プライバシー保護）に対応。
* **コンテキスト認識校正** — 作業中のアプリに応じて適切なスタイルへ整形（コードエディタ vs メール）。
* **音声コマンドシステム** — 「コンマ」「改行」「取り消し」などのコマンドを声で操作可能。
* **ユーザー辞書登録** — 略語や専門用語を登録して認識精度を向上。
* **監査ログ** — すべての API 呼び出し履歴がローカルに記録されます。

---

## ◈ グローバルショートカット

| ショートカット | モード | 動作 |
|---|---|---|
| `F9` | プッシュ・トゥ・トーク | キーを押している間録音、離すと文字起こし |
| `F10` | トグル | 1回押して録音開始、もう1回押して停止 |
| `F11` | 履歴 | 直近10件の入力履歴を開いて選択入力 |

すべてのショートカットは設定画面で**カスタマイズ可能**です。

---

## ◈ インストールと起動

### 動作要件

- **Node.js** 20+
- **npm** 10+
- **OS**: Windows 10/11

### 開発環境での実行

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (ホットリロード対応)
npm run dev
```

### 本番用ビルド

```bash
# プロジェクトのコンパイル
npm run build

# Windows用インストーラー / ポータブル版のビルド
npx electron-builder --win
# 出力先: dist-build/
```

---

## ◈ ライセンス

本プロジェクトは **MIT ライセンス** のもとで公開されています。詳細は [LICENSE](LICENSE) をご覧ください。

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
