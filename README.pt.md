<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### A Camada Operacional Soberana de Ditado por Voz para Desktop

*Um sistema de ditado por voz e automação de fluxo de trabalho intransigente, privado e de última geração, desenvolvido para Windows e macOS.*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [Italiano](README.it.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interface do Vox" width="840" />
</div>

<br />

## A Alternativa Soberana às Assinaturas

Os softwares tradicionais de ditado comercial prendem profissionais em cobranças mensais recorrentes, impõem limites artificiais de palavras e transmitem pensamentos privados e códigos confidenciais para servidores de terceiros.

**O Vox é um novo padrão de arquitetura.** Projetado com estética minimalista e luxuosa em glassmorphism e equipado com um núcleo nativo de altíssimo desempenho, o Vox transcreve a fala com Whisper, refina a pontuação e coesão textual por meio do modelo de inteligência artificial de sua escolha e injeta o resultado formatado diretamente no seu cursor ativo em qualquer aplicativo — com zero assinaturas, zero rastreamento e total privacidade.

<br />

---

## Conjunto Completo de Recursos

### Execução Nativa Multiplataforma
Arquitetado nativamente para **Windows 10/11 (64-bit)** e **macOS (Apple Silicon M1/M2/M3/M4 e Intel)**. O Vox integra-se profundamente ao sistema operacional, respeitando acessibilidade nativa, detecção de processos em primeiro plano e atalhos globais.

### Gerenciador de Whisper Local Integrado (100% Offline)
Baixe, configure e execute modelos Whisper GGML (Tiny, Base, Small, Medium, Large v3, Distil-Whisper) diretamente de dentro do aplicativo, com barra de progresso em tempo real e ativação com um clique. Funcione 100% offline, com zero latência de rede e isolamento criptográfico absoluto.

### Traga Suas Próprias Chaves (BYOK) e Liberdade de Modelos
Você tem total controle sobre quais modelos utilizar. Conecte-se diretamente aos provedores líderes de inteligência artificial ou utilize servidores locais:
* **Provedores Cloud:** Groq, OpenAI, Azure OpenAI, Deepgram, Cerebras, Mistral, Together AI.
* **Ambientes Locais:** Ollama, LM Studio, vLLM, LocalAI.
* **Liberdade de Escolha:** Selecione qualquer modelo de voz (STT) e qualquer modelo de linguagem (LLM) disponível no provedor conectado ou no seu servidor local.

### Refinamento Semântico e Correção Inteligente
O reconhecimento de fala puro frequentemente gera textos sem pontuação ou com homófonos. O Vox combina a transcrição a corretores neurais inteligentes — utilizando o modelo de linguagem configurado por você — para inserir pontuação elegante, ajustar maiúsculas e minúsculas e preservar a cadência natural do pensamento.

### Comandos de Voz e Abertura Instantânea de Aplicativos
Execute automações completas do sistema operacional sem tocar no teclado. O Vox reconhece comandos de voz para abrir qualquer programa instalado no seu computador:
* **Abertura de Aplicativos:** *"Abrir VSCode"*, *"Abrir Chrome"*, *"Abrir Slack"*, *"Abrir Terminal"*, *"Abrir Bloco de Notas"*, *"Abrir Calculadora"*, ou qualquer app instalado pelo nome.
* **Busca Web e Conhecimento:** *"Abrir Chrome e pesquisar documentação do React"*, *"Pesquisar no YouTube músicas relaxantes"*, *"Pesquisar computação quântica"*.
* **Navegação e Edição:** *"Nova linha"*, *"Novo parágrafo"*, *"Apagar última frase"*, *"Apagar palavra"*, *"Selecionar tudo"*, *"Desfazer"*, *"Copiar"*, *"Colar"*.
* **Controles do Vox:** *"Modo Código"*, *"Modo Texto"*, *"Modo Email"*, *"Ditado livre"*, *"Repetir última transcrição"*, *"Cancelar"*.

### Adaptação Inteligente ao Contexto da Janela
O Vox analisa a janela ativa antes de transcrever. Ao escrever código no VS Code ou Terminal, o Vox formata identificadores e sintaxe de desenvolvimento. Ao redigir um e-mail ou artigo, produz parágrafos conversacionais fluidos.

### Snippets de Texto por Voz
Configure blocos de texto frequentes associados a gatilhos falados. Dizer *"Minha assinatura"*, *"Inserir email"*, *"Meu endereço"* ou *"Inserir CNPJ"* injeta textos multilinhas pré-formatados instantaneamente.

### Templates de Ditado Personalizados
Crie modelos com diretrizes de formatação e gatilhos exclusivos de ativação por voz. Alterne entre atas de reunião estruturadas, relatórios técnicos, resumos em tópicos e ditado livre apenas falando o nome do template.

### Ativação por Palavra de Despertar (*"Vox"*)
Alimentado por modelos neurais locais ONNX OpenWakeWord. Diga *"Vox"* em qualquer momento para despertar o sistema e iniciar o ditado de forma 100% mãos-livres.

### Detecção de Atividade de Voz (VAD) e Proteção de Áudio
O algoritmo integrado de VAD detecta o término natural da sua fala e finaliza o processamento automaticamente. Enquanto você fala, o Vox pode silenciar o áudio do computador para evitar eco acústico, restaurando o som imediatamente ao terminar.

### Dicionário e Vocabulário Técnico Personalizado
Cadastre nomes próprios, jargões da sua empresa, termos de programação e siglas ao seu vocabulário. O Vox assegura grafia perfeita e consistente em todas as transcrições.

### Painel de Produtividade e Heatmap de Contribuições
Acompanhe sua aceleração de digitação, total de palavras ditadas, horas economizadas e visualize sua constância diária por meio de um mapa de calor no estilo GitHub.

### Cofre de Privacidade e Logs Transparentes
Todas as configurações, snippets, templates e históricos de sessões ficam armazenados estritamente em um banco SQLite local no seu disco. Inspecione cada chamada de API no visualizador de logs de privacidade.

<br />

---

## Comparativo de Arquitetura

| Dimensão | Vox | Soluções Comerciais Fechadas |
|:---|:---|:---|
| **Licença** | Código Aberto (MIT) | Proprietária Fechada |
| **Custo** | Gratuito para Sempre (BYOK / Local) | R$ 100 – R$ 200 / mês recorrente |
| **Privacidade** | 100% Local ou Direto à API | Dados passam por servidores de terceiros |
| **Modelos Locais** | Download In-App com 1 Clique (Whisper) | Frequentemente indisponíveis ou pagos |
| **Escolha de Modelos** | Liberdade Total (Qualquer LLM/STT Cloud ou Local) | Modelos fechados e bloqueados |
| **Comandos de Voz & Abertura de Apps** | Abre Qualquer App, Busca Web e Controla o SO | Apenas pontuações básicas |
| **Multiplataforma** | Windows 10/11 e macOS (Universal) | Restrito a um único ecossistema |
| **Vocabulário Personalizado** | Ilimitado em SQLite Local | Restrito |
| **Limites de Uso** | Sem limites de palavras ou tempo | Tetos mensais rígidos |

<br />

---

## Atalhos Padrão

| Atalho (Win / Mac) | Modo | Descrição |
|:---|:---|:---|
| `F10` / `Control+Space` | **Alternar Ditado** | Pressione para iniciar; pause a fala ou pressione novamente para finalizar |
| `F9` / `Option+Space` | **Push-to-Talk** | Segure enquanto fala; solte para transcrever e injetar imediatamente |
| `F11` / `Command+Shift+V` | **Histórico do Clipboard** | Abre janela flutuante para consultar e reinjetar transcrições anteriores |
| *"Vox"* | **Wake Word** | Despertador por voz em segundo plano sem tocar no teclado |

<br />

---

## Primeiros Passos

### Requisitos
* **Windows:** Windows 10 ou 11 (64-bit)
* **macOS:** macOS 12 Monterey ou superior (Apple Silicon M1/M2/M3/M4 ou Intel x64)
* **Node.js:** Node.js 20+ e npm

### Desenvolvimento Local

```bash
# Clonar o repositório
git clone https://github.com/cristovaocarvalho/Vox.git
cd Vox/code

# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento
npm run dev
```

### Compilação e Empacotamento

```bash
# Verificação de tipos e compilação
npm run build

# Gerar instalador para Windows (.exe)
npm run build:win

# Gerar pacote para macOS (.dmg e .zip)
npm run build:mac

# Gerar pacote para Apple Silicon
npm run build:mac:arm64
```

<br />

---

## Licença

Distribuído sob a licença **MIT**. Criado por [Cristovão Carvalho](https://github.com/cristovaocarvalho) e pela comunidade open-source.
