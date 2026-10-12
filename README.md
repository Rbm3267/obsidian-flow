# ObsidianFlow

> Intelligent note ingestion, meeting synthesis, account intelligence, and knowledge graphs powered by your choice of LLM.

[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

ObsidianFlow bridges automated meeting transcription with executive knowledge management. It ingests raw voice transcripts and notes, extracts action items and strategic decisions, and automatically links accounts, attendees, and related knowledge graphs using your favorite LLM.

---

## ✨ Features

- **Automated Ingestion Pipeline**: Drop transcripts or notes into `00_Inbox` and run 1-click ingestion to synthesize and categorize them into `raw/meetings/`.
- **Structured Intelligence Extraction**:
  - Executive Summaries
  - Attendees with automatic `[[WikiLinks]]`
  - Strategic Key Decisions
  - Action items formatted as interactive `- [ ]` tasks
- **Multi-LLM Plug-and-Play**:
  - **Google Gemini** (Gemini 1.5 Flash, 1.5 Pro, 2.0)
  - **Anthropic Claude** (Claude 3.5 Sonnet, Haiku, Opus)
  - **OpenAI** (GPT-4o, GPT-4o-mini, o1-mini)
  - **Ollama** (Local air-gapped models)
- **Account Intelligence Hub**: Live overview of tracked accounts, health indicators (Green/Amber/Red), meeting cadence, and open deliverables.
- **Theme-Adaptive**: Respects your active Obsidian theme in both Light and Dark mode.

---

## 🚀 Installation

### Via BRAT
1. Install the **BRAT** plugin in Obsidian.
2. Add Beta plugin: `Rbm3267/obsidian-flow`.
3. Enable **ObsidianFlow** in Settings > Community Plugins.

### Manual Installation
1. Download `manifest.json`, `main.js`, and `styles.css` from the latest [Release](https://github.com/Rbm3267/obsidian-flow/releases).
2. Place them into `<vault>/.obsidian/plugins/obsidian-flow/`.
3. Reload Obsidian and enable in Settings.

---

## ⚙️ Configuration

Open **Settings > ObsidianFlow**:
- Choose your **AI Provider** (Gemini, Claude, OpenAI, Ollama).
- Set your API Key.
- Configure folder paths (`00_Inbox`, `raw/meetings`, `Accounts`).

---

## 🛠️ Development

```bash
git clone https://github.com/Rbm3267/obsidian-flow.git
cd obsidian-flow
npm install
npm run dev # watch mode
npm run build # production bundle
```

---

## 📄 License

MIT License © 2026 [XD Labs](https://xdlabs.io) / Bennett Moore.
