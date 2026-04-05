# VocaCheck — UML Diagrams

All source files are stored as `.mermaid` files in this directory for version control.
GitHub renders the diagrams below natively.

---

## Architecture Overview

System components and their communication paths.

```mermaid
graph LR
  subgraph Browser["Browser (Frontend)"]
    HTML["HTML Pages\nindex / review / manage\nimport / settings / setup"]
    Services["ES Module Services\nCardService · DeckService\nEvaluationService · ImportService\nLeitnerService · SettingsService\nOllamaService · WhisperService"]
  end

  subgraph DockerCompose["Docker Compose"]
    Backend["Node.js Backend\n:8080\n(Express)"]
    Ollama["Ollama\n:11434\n(LLM inference)"]
    Whisper["Whisper\n:9000\n(Speech-to-text)"]
  end

  DataVol[("data/\ncards.json\ndecks.json")]
  LogsVol[("logs/\napp.log")]
  OllamaVol[("ollama/\nmodel weights")]

  HTML --> Services
  Services -->|"REST API (HTTP)"| Backend
  Backend -->|"LLM chat · model pull"| Ollama
  Backend -->|"Audio transcription\n(multipart/form-data)"| Whisper
  Backend --- DataVol
  Backend --- LogsVol
  Ollama --- OllamaVol
```

---

## Data Model

Entity-relationship diagram for the two persistent data types.

```mermaid
erDiagram
  Deck {
    string id PK "UUID v4"
    string name "Display name"
    string description "Optional description"
    int sessionCount "Total completed sessions (used for Leitner scheduling)"
    string createdAt "ISO 8601"
    string updatedAt "ISO 8601"
  }

  Card {
    string id PK "UUID v4"
    string deckId FK "References Deck.id"
    string question "Question shown to learner"
    string answer "Reference answer for AI evaluation"
    int level "Leitner level 1–5 (interval = 2^(level-1) sessions)"
    int correctStreak "Consecutive correct answers"
    string lastReviewed "ISO 8601 or null"
    string createdAt "ISO 8601"
    string updatedAt "ISO 8601"
  }

  Deck ||--o{ Card : "contains"
```

---

## Use Case Diagram

All user interactions supported by the application.

```mermaid
graph LR
  User(["User"])
  Admin(["User (Admin)"])

  subgraph Deck_Management["Deck Management"]
    UC1["Create deck"]
    UC2["Edit deck"]
    UC3["Delete deck"]
    UC4["View deck overview"]
  end

  subgraph Card_Management["Card Management"]
    UC5["Add card manually"]
    UC6["Edit card"]
    UC7["Delete card"]
    UC8["Import cards from text"]
    UC9["Skip duplicate cards on import"]
  end

  subgraph Study_Session["Study Session"]
    UC10["Start review session"]
    UC11["Answer by voice (speech input)"]
    UC12["Answer by typing"]
    UC13["AI evaluates answer"]
    UC14["View feedback"]
    UC15["Advance Leitner level (correct)"]
    UC16["Reset Leitner level (incorrect)"]
    UC17["Enable shuffle mode"]
  end

  subgraph Settings["Settings"]
    UC18["Select Ollama model"]
    UC19["Download new Ollama model"]
    UC20["Change Whisper model size"]
    UC21["Change keyboard scheme"]
    UC22["Edit AI system prompt"]
    UC23["Reset system prompt to default"]
  end

  subgraph Setup["First-Run Setup"]
    UC24["Check Ollama status"]
    UC25["Pull initial LLM model"]
  end

  User --> UC1
  User --> UC2
  User --> UC3
  User --> UC4
  User --> UC5
  User --> UC6
  User --> UC7
  User --> UC8
  UC8 -.->|"optional"| UC9
  User --> UC10
  UC10 --> UC11
  UC10 --> UC12
  UC11 --> UC13
  UC12 --> UC13
  UC13 --> UC14
  UC13 --> UC15
  UC13 --> UC16
  User --> UC17
  User --> UC18
  User --> UC19
  User --> UC20
  User --> UC21
  User --> UC22
  UC22 -.->|"optional"| UC23
  Admin --> UC24
  Admin --> UC25
```

---

## Sequence: Card Review

Full data flow for a single review card — from voice input through AI evaluation to Leitner update.

```mermaid
sequenceDiagram
  actor User
  participant Browser
  participant Backend
  participant Whisper
  participant Ollama

  User->>Browser: clicks "Start" on a deck
  Browser->>+Backend: GET /api/cards?deckId
  Backend-->>-Browser: Card[]
  Browser->>+Backend: GET /api/admin/status
  Backend-->>-Browser: { ollamaReachable, models }
  Note over Browser: LeitnerService.getDueCards(cards, sessionCount)
  Browser-->>User: shows first due card (question)

  alt Voice input
    User->>Browser: clicks microphone, speaks answer
    Browser->>+Backend: POST /api/whisper/v1/audio/transcriptions (audio blob)
    Backend->>+Whisper: proxy — multipart/form-data
    Whisper-->>-Backend: { text }
    Backend-->>-Browser: { text }
    Browser-->>User: transcription shown in answer field
  else Text input
    User->>Browser: types answer into field
  end

  User->>Browser: clicks "Check"
  Note over Browser: EvaluationService.evaluate(question, modelAnswer, userAnswer)
  Browser->>+Backend: POST /api/ollama/api/chat (prompt + system prompt)
  Backend->>+Ollama: POST /api/chat
  Ollama-->>-Backend: { message: { content: '{"correct":true,"feedback":"..."}' } }
  Backend-->>-Browser: JSON response
  Note over Browser: EvaluationService.parseResponse(raw)

  alt Correct answer
    Note over Browser: LeitnerService.updateCardLevel(card, true) → level++
  else Wrong answer
    Note over Browser: LeitnerService.updateCardLevel(card, false) → level=1
  end

  Browser->>Backend: PUT /api/cards/:id { level, correctStreak, lastReviewed }
  Browser-->>User: feedback displayed (correct/incorrect + explanation)

  alt More due cards remain
    Browser-->>User: shows next card
  else All cards done
    Browser->>Backend: PUT /api/decks/:id { sessionCount: sessionCount+1 }
    Browser-->>User: session complete screen
  end
```

---

## Sequence: First-Run Setup

Flow when no LLM model is installed yet.

```mermaid
sequenceDiagram
  actor User
  participant Browser
  participant Backend
  participant Ollama

  User->>Browser: opens http://localhost:8080
  Browser->>+Backend: GET /api/admin/status
  Backend->>+Ollama: GET /api/tags (5 s timeout)
  Ollama-->>-Backend: { models: [] }
  Backend-->>-Browser: { ollamaReachable: true, modelInstalled: false }

  Note over Browser: modelInstalled === false → redirect to setup.html

  Browser-->>User: Setup assistant shown
  Browser->>+Backend: GET /api/admin/gpu-status
  Backend->>Backend: inspect Ollama container via Docker socket
  Backend-->>-Browser: { gpuAvailable: true/false }
  Browser-->>User: GPU status indicator shown

  User->>Browser: enters model name (e.g. llama3.2:3b), clicks "Download"
  Browser->>+Backend: POST /api/admin/pull-model { model: "llama3.2:3b" }
  Backend->>Ollama: POST /api/pull { model, stream: true }

  loop SSE progress events
    Ollama-->>Backend: { status, completed, total, digest }
    Backend-->>Browser: data: { status, completed, total }
    Browser-->>User: progress bar updates in real time
  end

  Backend-->>-Browser: data: {"status":"complete"}
  Browser-->>User: "Download complete"

  User->>Browser: clicks "Open VocaCheck"
  Browser-->>User: navigates to index.html (deck overview)
```

---

## Sequence: Whisper Model Change

Flow when the user changes the Whisper transcription model in Settings.

```mermaid
sequenceDiagram
  actor User
  participant Browser
  participant Backend
  participant Docker

  User->>Browser: opens Settings page
  Note over Browser: SettingsService.getWhisperModel() reads localStorage
  Browser-->>User: current model size shown (e.g. "small")

  User->>Browser: selects new Whisper model size (e.g. "medium")
  Note over Browser: SettingsService.setWhisperModel("medium")\nstored in localStorage under vocacheck_whisper_model

  User->>Browser: clicks "Save & Restart"
  Browser->>+Backend: POST /api/admin/restart-whisper
  Backend->>Backend: findContainerByService("whisper") via Docker socket
  Backend->>+Docker: GET /containers/json?filters=... (find whisper container)
  Docker-->>-Backend: container object { Id, ... }
  Backend->>+Docker: POST /containers/{Id}/restart
  Docker-->>-Backend: 204
  Backend-->>-Browser: { success: true }
  Browser-->>User: "Whisper wird neu gestartet…"

  Note over Docker: Whisper container restarts with WHISPER_MODEL env var\nset in docker-compose.yml (reflects chosen model size)
  Note over Browser: Next transcription request will use the new model
```

---

## Sequence: Import with Duplicate Filter

Flow for the text import feature including the optional duplicate-skipping logic.

```mermaid
sequenceDiagram
  actor User
  participant Browser
  participant Backend

  User->>Browser: opens import.html
  Browser->>+Backend: GET /api/decks
  Backend-->>-Browser: Deck[]
  Browser-->>User: target deck selector populated

  User->>Browser: pastes text into textarea
  User->>Browser: selects separator (tab / semicolon / custom)
  Note over Browser: ImportService.parseText(text, separator)
  Browser-->>User: live preview shows parsed Q&A pairs

  User->>Browser: selects target deck
  User->>Browser: toggle "Identische Karten überspringen" (default: ON)

  User->>Browser: clicks "Import"

  opt Skip-duplicates toggle is ON
    Browser->>+Backend: GET /api/cards?deckId={targetDeckId}
    Backend-->>-Browser: existingCards[]
    Note over Browser: ImportService.filterDuplicates(parsed, existing)\ncase-insensitive · trim · both Q+A must match
  end

  alt All cards are duplicates
    Browser-->>User: "Alle X Karten bereits vorhanden — nichts importiert."
  else Cards to import remain
    loop for each card to import
      Browser->>+Backend: POST /api/cards { deckId, question, answer }
      Backend-->>-Browser: Card (201)
      Browser-->>User: "Importiere N / Total …"
    end
    Browser-->>User: "X Karten importiert. Y identische übersprungen."
  end
```

---

## Activity: AI Evaluation Logic

Decision flow for evaluating a user's answer via the LLM.

```mermaid
flowchart TD
  A([User clicks Check]) --> B{Answer source?}
  B -->|Voice input| C[Use Whisper transcription]
  B -->|Text input| D[Use typed text]
  C --> E[Build evaluation prompt\nquestion + model answer + user answer]
  D --> E

  E --> F[POST /api/ollama/api/chat\nwith system prompt from SettingsService]
  F --> G{LLM response\nreceived?}
  G -->|Timeout / network error| H[Show connection error\nto user]
  G -->|Response received| I{Valid JSON?\ncorrect + feedback fields?}
  I -->|No — InvalidResponseError| J[Show parsing error\nto user]
  I -->|Yes| K{correct === true?}

  K -->|true| L["LeitnerService.updateCardLevel(card, true)\nlevel = min(level+1, 5)\ncorrectStreak++"]
  K -->|false| M["LeitnerService.updateCardLevel(card, false)\nlevel = 1\ncorrectStreak = 0"]

  L --> N["PUT /api/cards/:id\n{ level, correctStreak, lastReviewed: now }"]
  M --> N
  N --> O[Show feedback to user\ncorrect/incorrect + explanation]

  O --> P{More due cards?}
  P -->|Yes| Q([Show next card])
  P -->|No| R["PUT /api/decks/:id\n{ sessionCount: sessionCount+1 }"]
  R --> S([Session complete])

  H --> T([End with error])
  J --> T
```

---

## Activity: GPU Detection

Decision flow for the `/api/admin/gpu-status` endpoint.

```mermaid
flowchart TD
  A([GET /api/admin/gpu-status]) --> B[Connect to Docker socket\n/var/run/docker.sock]
  B --> C{Docker socket\nreachable?}
  C -->|No — AdminCommandError| D[Return gpuAvailable: false]
  C -->|Yes| E["List containers\nGET /containers/json\nfilter: compose.service=ollama"]
  E --> F{Ollama container\nfound?}
  F -->|No — GpuNotAvailableError| G[Return gpuAvailable: false]
  F -->|Yes| H["Inspect container\nGET /containers/:id/json"]
  H --> I{HostConfig.\nDeviceRequests\nexists?}
  I -->|No or empty| J[Return gpuAvailable: false]
  I -->|Yes| K{Any DeviceRequest\nhas Capabilities\ncontaining gpu?}
  K -->|No| J
  K -->|Yes| L[Return gpuAvailable: true]
  D --> M([Response: 200 gpuAvailable])
  G --> M
  J --> M
  L --> M
```

---

## Activity: Leitner Scheduling

How cards are selected and updated during a review session.

```mermaid
flowchart TD
  A([Session Start\nUser clicks deck Start]) --> B["Load all cards for deck\nGET /api/cards?deckId\nGET /api/decks → sessionCount"]

  B --> C["LeitnerService.getDueCards(cards, sessionCount)\nFor each card: interval = 2^(level−1)"]

  C --> D{"card.level → interval\n1 → every session\n2 → every 2nd\n3 → every 4th\n4 → every 8th\n5 → every 16th"}

  D -->|"sessionCount % interval === 0"| E[Card is DUE → add to queue]
  D -->|"sessionCount % interval ≠ 0"| F[Card skipped this session]

  E --> G{Queue empty?}
  G -->|Yes — no cards due| H([Show no-cards-due message])
  G -->|No| I[Show card question to user]

  I --> J[User answers\nvoice or text]
  J --> K[AI evaluation\nsee act-evaluation diagram]
  K --> L{Correct?}

  L -->|Yes| M["level = min(level+1, 5)\ncorrectStreak++"]
  L -->|No| N["level = 1\ncorrectStreak = 0"]

  M --> O["PUT /api/cards/:id\n(updated level + lastReviewed)"]
  N --> O

  O --> P{More due cards\nin queue?}
  P -->|Yes| I
  P -->|No| Q["PUT /api/decks/:id\nsessionCount++"]
  Q --> R([Session complete])
```

---

## Activity: Error Handling

How errors propagate through the Express backend.

```mermaid
flowchart TD
  A([Error thrown in route handler]) --> B["Route calls next(err)\nor throws synchronously"]
  B --> C[Global error-handling middleware\napp.use on err, req, res, next]

  C --> D{err instanceof\nVocaCheckError?}

  D -->|Yes| E{Which subclass?}
  E -->|CardStorageError| F["HTTP 500\n{ error: name, message, context }"]
  E -->|DeckStorageError| F
  E -->|OllamaConnectionError| F
  E -->|OllamaModelNotFoundError| F
  E -->|InvalidResponseError| F
  E -->|GpuNotAvailableError| F
  E -->|AdminCommandError| F
  E -->|WhisperConnectionError| F

  D -->|No — unknown error| G["HTTP 500\n{ error: 'InternalServerError',\nmessage: 'An unexpected error occurred' }"]

  F --> H["Winston logger.error\nwith err.name, err.message, err.context"]
  G --> I["Winston logger.error\n'Unexpected error'"]

  H --> J([JSON response sent to client])
  I --> J
```
