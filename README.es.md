<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### Dictado por Voz con IA y Máxima Precisión — Directo en su Cursor Activo

*Un sistema de dictado por voz privado, de código abierto y diseñado para Windows.*

<br />

[Español](README.es.md) &nbsp;·&nbsp; [English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [Italiano](README.it.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interfaz de Vox" width="820" />
</div>

<br />

## Por qué Vox

Las aplicaciones comerciales de dictado imponen suscripciones mensuales, limitan el volumen de palabras y envían sus grabaciones privadas a servidores externos para entrenar sus propios modelos.

**Vox representa una alternativa arquitectónica independiente.** Ofrece una experiencia de dictado a nivel de sistema operativo, transcribiendo mediante Whisper, corrigiendo la puntuación con modelos de lenguaje e insertando el texto directamente en la posición de su cursor en cualquier aplicación Windows.

<br />

## Principios Fundamentales

### Autonomía Arquitectónica Total (BYOK)
Conéctese directamente con proveedores de inferencia líderes — como Groq, OpenAI y Azure OpenAI — utilizando sus propias credenciales de API, o ejecute todo de forma 100% local y offline con **Ollama** y **LM Studio**. Sin intermediarios ni retención de datos.

### Precisión Multilingüe Nativa
Diseñado para reconocer y dar formato al dictado en **8 idiomas principales** — Español, Inglés, Portugués, Francés, Alemán, Chino Mandarín, Japonés e Italiano — respetando la entonación natural sin traducciones forzadas.

### Corrección Semántica según el Contexto
Vox analiza el entorno de la aplicación activa. Al programar en un editor de código, redactar un correo o tomar notas rápidas, el corrector ajusta puntuación, mayúsculas y términos técnicos según corresponda.

### Inserción Instantánea en el Cursor
Inicie el dictado mediante atajos globales (`F10` / `F9`) o comando de voz (*"Vox"*). La detección inteligente de pausas (VAD) detecta el fin de la frase y pega el texto de inmediato donde esté el cursor.

### Código Abierto e Ilimitado
Distribuido bajo la Licencia MIT. Libre de mensualidades, cuotas artificiales o barreras de pago.

<br />

---

## Comparativa

| Dimensión | Vox | Soluciones Comerciales |
|:---|:---|:---|
| **Licencia** | Código Abierto (MIT) | Propietaria / Comercial |
| **Costo** | Gratuito y Libre | $180 – $360 anuales |
| **Flujo de Datos** | Directo al Proveedor o 100% Local | Intermediado en nubes externas |
| **Inferencia Offline** | Compatible (Ollama / LM Studio) | No disponible |
| **Límite de Palabras** | Ilimitado | Cuotas restringidas |
| **Modelos de Voz** | Familia Whisper completa + LLMs | Modelos cerrados |
| **Inserción en Cursor** | Inyección Nativa Win32 | Variable |

<br />

---

## Atajos Globales

| Atajo | Modo | Acción |
|:---|:---|:---|
| `F10` | **Alternar** | Presione para iniciar; presione de nuevo o haga silencio para insertar |
| `F9` | **Push-to-Talk** | Mantenga presionado mientras habla; suelte para insertar |
| `F11` | **Historial** | Acceda a los últimos dictados para reinserción rápida |
| *"Vox"* | **Palabra Clave** | Activación manos libres por voz |

<br />

---

## Instalación y Uso

### Requisitos
* Windows 10 u 11 (64-bit)
* [Node.js](https://nodejs.org) (v20+) y npm

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/vox.git
cd vox/code

# Instalar dependencias
npm install

# Iniciar entorno de desarrollo
npm run dev
```

### Compilación para Producción

```bash
npm run build:win
```

<br />

---

## Licencia

Distribuido bajo la **Licencia MIT**. Consulte el archivo [LICENSE](LICENSE) para más detalles.

<div align="center">
<br />

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
