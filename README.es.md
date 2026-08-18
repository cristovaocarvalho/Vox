<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### La Capa Operativa Soberana de Dictado por Voz para Escritorio

*Un sistema de dictado por voz y automatización de flujo de trabajo intransigente, privado y de última generación, diseñado para Windows y macOS.*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [Italiano](README.it.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interfaz de Vox" width="840" />
</div>

<br />

## La Alternativa Soberana a las Suscripciones

Los programas tradicionales de dictado comercial atrapan a los profesionales en suscripciones mensuales recurrentes, imponen cuotas arbitrarias de palabras y desvían pensamientos privados y código propietario a través de servidores de terceros.

**Vox es un estándar arquitectónico.** Diseñado con una estética de glassmorphism minimalista y lujosa, y respaldado por un núcleo nativo de alto rendimiento, Vox transcribe la voz con Whisper, refina el flujo semántico y la puntuación con el modelo de lenguaje de su elección e inyecta el resultado directamente en su cursor activo en cualquier aplicación — sin suscripciones, sin rastreo y con total privacidad.

<br />

---

## Conjunto Completo de Funcionalidades

### Ejecución Nativa Multiplataforma
Diseñado nativamente para **Windows 10/11 (64-bit)** y **macOS (Apple Silicon M1/M2/M3/M4 e Intel)**. Vox se integra profundamente con el sistema operativo, respetando capas nativas de accesibilidad, detección de procesos en primer plano y atajos globales.

### Gestor de Whisper Local Integrado (100% Offline)
Descargue, configure y ejecute modelos Whisper GGML (Tiny, Base, Small, Medium, Large v3, Distil-Whisper) directamente desde la interfaz de Vox con un solo clic. Sin configuraciones de Python ni terminales. Funcione completamente fuera de línea con cero latencia y aislamiento criptográfico absoluto.

### Traiga Sus Propias Claves (BYOK) y Libertad Total de Modelos
Usted tiene total libertad para elegir qué modelos impulsan su flujo de trabajo. Conéctese directamente a los proveedores de inferencia de IA líderes o ejecute modelos localmente:
* **Proveedores en la Nube:** Groq, OpenAI, Azure OpenAI, Deepgram, Cerebras, Mistral, Together AI.
* **Entornos Locales:** Ollama, LM Studio, vLLM, LocalAI.
* **Libertad Absoluta:** Seleccione cualquier modelo de voz (STT) y cualquier modelo de lenguaje (LLM) disponible en su proveedor o servidor local.

### Refinamiento Semántico y Corrección Inteligente
El reconocimiento de voz automático tradicional suele generar texto sin puntuación o con errores fonéticos. Vox combina el dictado con correctores LLM inteligentes — impulsados por el modelo que usted elija — para insertar puntuación natural, ajustar mayúsculas y respetar la fluidez del discurso.

### Comandos de Voz y Apertura Instantánea de Aplicaciones
Ejecute acciones del sistema operativo y automatizaciones de escritorio totalmente manos libres. Vox reconoce comandos de voz para abrir cualquier programa instalado en su equipo:
* **Apertura de Aplicaciones:** *"Abrir VSCode"*, *"Abrir Chrome"*, *"Abrir Slack"*, *"Abrir Terminal"*, *"Abrir Bloc de notas"*, *"Abrir Calculadora"*, o cualquier software por su nombre.
* **Búsqueda Web y Conocimiento:** *"Abrir Chrome y buscar documentación de React"*, *"Buscar en YouTube música relajante"*, *"Buscar física cuántica"*.
* **Navegación y Edición:** *"Nueva línea"*, *"Nuevo párrafo"*, *"Borrar última frase"*, *"Borrar palabra"*, *"Seleccionar todo"*, *"Deshacer"*, *"Copiar"*, *"Pegar"*.
* **Controles de Vox:** *"Modo Código"*, *"Modo Texto"*, *"Modo Email"*, *"Dictado libre"*, *"Repetir última transcripción"*, *"Cancelar"*.

### Adaptación Inteligente al Contexto de la Aplicación
Vox analiza la ventana activa antes de transcribir. Al programar en VS Code o la Terminal, Vox formatea identificadores y sintaxis limpia. Al redactar un correo o documento, genera párrafos conversacionales fluidos.

### Snippets de Texto por Voz
Configure bloques de texto recurrentes asociados a disparadores hablados. Decir *"Mi firma"*, *"Insertar correo"*, *"Mi dirección"* o frases personalizadas inyecta textos multilínea preformateados de manera instantánea.

### Plantillas de Dictado Personalizadas
Cree plantillas con directrices de formato y disparadores de voz exclusivos. Cambie entre minutas de reunión, informes técnicos, resúmenes en viñetas y dictado libre diciendo el nombre de la plantilla.

### Activación Manos Libres (*"Vox"*)
Impulsado por modelos neuronales locales ONNX OpenWakeWord. Diga *"Vox"* en cualquier momento para despertar el sistema e iniciar el dictado sin tocar el teclado.

### Detección de Actividad de Voz (VAD) y Protección de Audio
El algoritmo VAD integrado detecta las pausas naturales de su voz y finaliza el dictado automáticamente. Mientras habla, Vox puede silenciar el audio del ordenador para evitar ecos, restaurándolo al instante al terminar.

### Vocabulario Técnico Personalizado
Agregue nombres propios, términos especializados de su empresa y siglas a su diccionario personal. Vox garantiza una ortografía exacta y consistente en cada transcripción.

### Panel de Productividad y Mapa de Actividad
Supervise la aceleración en su velocidad de escritura, palabras totales dictadas, horas ahorradas y visualice su constancia diaria mediante un mapa de calor estilo GitHub.

### Bóveda de Privacidad y Registro Transparente
Todas las configuraciones, snippets, plantillas e historiales se almacenan estrictamente en una base de datos SQLite local en su equipo. Revise cada solicitud de API en los registros de privacidad transparentes.

<br />

---

## Comparativa de Arquitectura

| Dimensión | Vox | Soluciones Comerciales SaaS |
|:---|:---|:---|
| **Licencia** | Código Abierto (MIT) | Comercial Propietaria |
| **Costo** | Gratuito para Siempre (BYOK / Local) | $180 – $360 / año recurrente |
| **Privacidad de Datos** | 100% Local o Directo al Proveedor | Enviado a servidores de terceros |
| **Modelos Locales Offline** | Descarga con 1 Clic en la App (Whisper) | Frecuentemente bloqueados en planes caros |
| **Selección de Modelos** | Libertad Total (Cualquier LLM/STT Cloud o Local) | Modelos cerrados y bloqueados |
| **Comandos de Voz y Apertura de Apps** | Abre Cualquier App, Busca en la Web y Controla el SO | Solo puntuación básica |
| **Soporte Multiplataforma** | Windows 10/11 y macOS (Universal) | Limitado a una sola plataforma |
| **Vocabulario Personalizado** | Ilimitado en SQLite Local | Restringido |
| **Límites de Uso** | Ilimitado | Techos mensuales estrictos |

<br />

---

## Atajos Predeterminados

| Atajo (Win / Mac) | Modo | Descripción |
|:---|:---|:---|
| `F10` / `Control+Space` | **Alternar Dictado** | Pulse para iniciar; pause o vuelva a pulsar para finalizar e insertar texto |
| `F9` / `Option+Space` | **Push-to-Talk** | Mantenga presionado mientras habla; suelte para transcribir e insertar |
| `F11` / `Command+Shift+V` | **Historial del Portapapeles** | Abre la ventana flotante para consultar e insertar transcripciones previas |
| *"Vox"* | **Palabra Clave** | Activación manos libres en segundo plano mediante modelo neural local |

<br />

---

## Primeros Pasos

### Requisitos
* **Windows:** Windows 10 o 11 (64-bit)
* **macOS:** macOS 12 Monterey o superior (Apple Silicon M1/M2/M3/M4 o Intel x64)
* **Node.js:** Node.js 20+ y npm

### Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/cristovaocarvalho/Vox.git
cd Vox/code

# Instalar dependencias
npm install

# Iniciar entorno de desarrollo
npm run dev
```

### Compilación y Empaquetado

```bash
# Verificación de tipos y compilación
npm run build

# Empaquetar para Windows (.exe)
npm run build:win

# Empaquetar para macOS (.dmg y .zip)
npm run build:mac

# Empaquetar para Apple Silicon
npm run build:mac:arm64
```

<br />

---

## Licencia

Distribuido bajo la licencia **MIT**. Creado por [Cristovão Carvalho](https://github.com/cristovaocarvalho) y la comunidad de código abierto.
