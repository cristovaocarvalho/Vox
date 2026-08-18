<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### Ditado por Voz com Precisão e IA — Diretamente no Cursor Ativo

*Um sistema de ditado por voz aberto, privado e projetado para Windows.*

<br />

[Português](README.pt.md) &nbsp;·&nbsp; [English](README.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [Italiano](README.it.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interface do Vox" width="820" />
</div>

<br />

## Por que o Vox

Softwares comerciais de ditado impõem assinaturas mensais recorrentes, limitam o volume de palavras e roteiam seus áudios privados através de servidores de terceiros para alimentar modelos proprietários.

**O Vox representa uma nova abordagem arquitetural.** Ele oferece uma experiência de digitação por voz nativa no sistema operacional, transcrevendo fala através do Whisper, refinando a pontuação por modelos de linguagem e inserindo o texto formatado diretamente na posição do cursor ativo em qualquer aplicativo Windows — com total autonomia.

<br />

## Princípios Fundamentais

### Autonomia Arquitetural Total (BYOK)
Conecte-se diretamente aos principais provedores de inferência — como Groq, OpenAI e Azure OpenAI — utilizando suas próprias credenciais de API, ou execute o pipeline 100% offline através de **Ollama** e **LM Studio**. Sem telemetria oculta, sem servidores intermediários e sem retenção de dados.

### Precisão Multilíngue Nativa
Projetado para reconhecer e estruturar ditados de forma fluida em **8 idiomas principais** — Português, Inglês, Espanhol, Francês, Alemão, Mandarim, Japonês e Italiano — preservando a cadência natural da fala sem traduções forçadas.

### Refinamento Semântico Sensível ao Contexto
O Vox analisa a janela e o ambiente ativo. Seja digitando código em um editor, respondendo a um e-mail formal ou estruturando um documento técnico, o corretor ajusta pontuação, sintaxe e maiúsculas conforme o contexto de uso.

### Injeção Instantânea no Cursor
Inicie o ditado via atalhos globais (`F10` / `F9`) ou comando de ativação por voz (*"Vox"*). A detecção inteligente de silêncio (VAD) identifica o término da fala e cola o texto polido instantaneamente onde o cursor estiver.

### Código Aberto e Irrestrito
Distribuído sob a licença MIT. Livre de mensalidades, bloqueios comerciais ou cotas sintéticas de uso.

<br />

---

## Comparativo

| Dimensão | Vox | Soluções Comerciais |
|:---|:---|:---|
| **Licenciamento** | Código Aberto (MIT) | Proprietário / Comercial |
| **Modelo Financeiro** | Gratuito e Livre | R$ 90 a R$ 180 mensais |
| **Fluxo de Dados** | Direto ao Provedor ou 100% Local | Intermediado em nuvens de terceiros |
| **Inferência Offline** | Suportada (Ollama / LM Studio) | Não suportada |
| **Limites de Palavras** | Ilimitado | Franquias restritas |
| **Modelos de Voz** | Família Whisper completa + LLMs | Modelos fechados |
| **Entrega de Texto** | Injeção Nativa Win32 no Cursor | Variável |

<br />

---

## Atalhos Globais

| Atalho | Modo | Comportamento |
|:---|:---|:---|
| `F10` | **Alternar** | Pressione para iniciar; pressione novamente ou faça silêncio para inserir |
| `F9` | **Push-to-Talk** | Segure enquanto fala; solte para transcrever e colar |
| `F11` | **Histórico** | Acesse os últimos ditados para reinserção rápida |
| *"Vox"* | **Palavra de Ativação** | Ativação do microfone por comando de voz |

<br />

---

## Inicialização Rápida

### Requisitos
* Windows 10 ou 11 (64-bit)
* [Node.js](https://nodejs.org) (v20+) e npm

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/vox.git
cd vox/code

# Instalar dependências
npm install

# Iniciar ambiente de desenvolvimento
npm run dev
```

### Empacotamento para Produção

```bash
npm run build:win
```

<br />

---

## Licença

Distribuído sob a **Licença MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

<div align="center">
<br />

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
