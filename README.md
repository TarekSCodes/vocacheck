# VocaCheck

**AI-powered flashcard learning — 100 % local, no cloud, no account.**

VocaCheck runs entirely on your machine. Your data stays on your device.  
An AI model evaluates your spoken or typed answers and gives instant feedback.

---

## Features

- **Deck & card management** — create decks, add cards manually or import from text (Quizlet-compatible)
- **Voice input** — dictate questions, answers, and study responses via microphone
- **AI evaluation** — answers are scored by a local LLM (Ollama); synonyms, paraphrases and flexible word order are accepted
- **Leitner spaced repetition** — cards advance through 5 levels; only due cards are shown each session
- **Fully local** — Ollama (LLM) and Whisper (speech-to-text) run in Docker containers on your machine
- **GPU acceleration** — NVIDIA GPUs are used automatically if available; falls back to CPU

---

## Requirements

| Tool | Notes |
|------|-------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Free, available for Windows / macOS / Linux |
| ~5 GB free disk space | For the AI model (downloaded on first run) |
| Microphone (optional) | Only needed for voice input |

No Node.js, Python, or other runtimes needed on your host machine.

---

## Quick Start

### Option A — Double-click (Windows)

1. Download and extract the latest release ZIP from [Releases](https://github.com/TarekSCodes/vocacheck/releases)
2. Make sure Docker Desktop is running
3. Double-click **`start.bat`**
4. A browser window opens at `http://localhost:8080`

### Option B — Terminal (macOS / Linux)

```bash
# Make the script executable once
chmod +x start.sh

./start.sh
```

### Option C — Manual

```bash
docker compose up -d
```

Then open **http://localhost:8080** in your browser.

---

## First-Time Setup

On first launch you are guided through a short setup:

1. **Pull a language model** — enter a model name and click *Download*. Recommended:
   - `llama3.2:3b` — fast, ~2 GB, good quality (recommended for most users)
   - `llama3.1:8b` — higher quality, ~5 GB, slower on CPU
2. Wait for the download to complete (progress is shown in real time)
3. Click **Open VocaCheck** — you are ready to go

---

## Using VocaCheck

### Create a deck

1. On the home screen click **New Deck**
2. Enter a name and optional description, click **Create**

### Add cards

**Manually:**  
Open a deck → click **Manage** → fill in question and answer → **Save**

**Import from text:**  
Open a deck → click **Import** → paste your text (e.g. copied from Quizlet or a spreadsheet) → configure separators → click **Import**

### Study

1. Click **Start** on any deck
2. A card is shown — answer it by speaking into the microphone or typing
3. Click **Check** — the AI evaluates your answer and shows feedback
4. Continue until all due cards for the session are done

Cards advance through 5 Leitner levels. A correct answer moves a card up; a wrong answer resets it to level 1.

---

## Settings

Open **Settings** (gear icon) to configure:

| Setting | Description |
|---------|-------------|
| Active Ollama model | Select from installed models |
| Download new model | Pull any model from the Ollama library |
| Whisper model size | Trade speed for accuracy (`small` is recommended) |
| System prompt | Customize how the AI evaluates answers. Use *Reset* to restore the default |

---

## Stopping VocaCheck

```bash
docker compose down
```

Your cards and decks are saved in the `data/` folder and persist across restarts.

---

## Updating

```bash
docker compose pull
docker compose up -d
```

---

## Troubleshooting

**The page does not load** — make sure Docker Desktop is running and all three containers are up:
```bash
docker compose ps
```

**Voice input does not work** — the browser requires a secure context for microphone access.  
Use `http://localhost:8080` (not an IP address or external hostname).

**Ollama is slow** — without a GPU, large models run on CPU and may be slow.  
Switch to `llama3.2:3b` in Settings for faster responses.

**Whisper transcription fails** — open Settings and click *Save & Restart* on the Whisper section to reload the model.
