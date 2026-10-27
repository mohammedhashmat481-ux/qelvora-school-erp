# Qelvora School CRM Platform & AI Assistant Portal

A unified, self-contained educational portal featuring secure Face Recognition Authentication for school management and the **Qelvora AI Assistant** (NCERT dynamic selectors, Question Paper Generator, and Topic Summary Generator).

---

## Architecture Overview

This repository integrates two powerful systems into a single codebase:
1. **Main Portal**:
   - **Frontend**: React (Vite) running on port `3000`.
   - **Backend**: Node.js running on port `8000`, connected to MongoDB.
2. **Qelvora AI Assistant** (located in the `vidya-ai/` subdirectory):
   - **Frontend**: React (Craco) running on port `3001` (rendered inside an iframe in the main portal).
   - **Backend**: Python (FastAPI/Uvicorn) running on port `8081` (calls the Gemini API).

---

## Features

- **Dual-Factor Authentication** — Secure password + real-time face verification with liveness checking.
- **Teacher Section** — Dedicated side menu and top navigation links for:
  - **Question Paper** (powered by Qelvora AI).
  - **Summary** (generates rich textbook-style summaries using Gemini, with copy-to-clipboard and PDF print actions).
- **Auto-Startup Orchestrator** - Node.js backend automatically detects and spawns Qelvora AI services on startup.
- **Self-Healing DB Connection** — Backend gracefully handles database unavailability (e.g. if MongoDB IP is not whitelisted yet), allowing local trial runs.

---

## Getting Started & Setup

Follow these simple steps to set up and run the entire project on any laptop.

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB** (local server running, or a MongoDB Atlas cloud database connection)
- **Webcam** (for Face Recognition login/registration)

---

### Step 1: Install Dependencies
Run the following commands in the root directory of the project:

```bash
# 1. Install root orchestrator dependencies
npm install

# 2. Automatically install all dependencies for the Node backend, React portal, and Qelvora AI frontend
npm run install:all
```

---

### Step 2: Set Up Python Virtual Environment
Set up the Python environment required by the Qelvora AI backend service inside the `vidya-ai` subdirectory:

```bash
cd vidya-ai/backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (CMD):
.venv\Scripts\activate.bat
# On macOS/Linux:
source .venv/bin/activate

# Install required python packages
pip install -r requirements.txt
```

---

### Step 3: Configure Environment Variables
1. Create a `.env` file inside `backend/` by copying `backend/.env.example` and set:
   - `MONGODB_URL` (your MongoDB connection string)
   - `JWT_SECRET_KEY` (any secure random string)
   - `EMBEDDING_ENCRYPTION_KEY` (AES encryption key for facial data)
2. Create a `.env` file inside `vidya-ai/backend/` by copying `vidya-ai/backend/.env.example` and set:
   - `EMERGENT_LLM_KEY` (your Gemini API Key)

---

### Step 4: Run the Application
Start the entire stack concurrently using a single command in the project root:

```bash
npm start
```

This will concurrently run:
- Main Portal Frontend: [http://localhost:3000](http://localhost:3000)
- Node Backend API: [http://localhost:8000](http://localhost:8000) (Spawned automatically by Node backend)
- Qelvora AI Python Backend: http://localhost:8081 (Spawned automatically by Node backend)
- Qelvora AI Frontend Portal: http://localhost:3001 (Spawned automatically by Node backend)

Logs from the auto-spawned processes will be written to `backend/school_crm_backend.log` and `backend/school_crm_frontend.log`.

---

## AI Assistant (Voice & Text School-Wide Copilot)

The **AI Assistant** is an intelligent assistant accessible across the entire Qelvora School CRM for Principals, Admins, Teachers, Parents, and Students. It supports simultaneous voice and text interactions, multi-lingual operation (English, Hindi, Kannada), and live read-only querying of the school database.

### Free Tier vs. Premium Tier (Gemini 3.5 Flash)
The assistant supports dynamic tier switching via configuration or the Admin Panel without restarting or redeploying the server:

| Feature | Free Tier | Premium Tier |
|---|---|---|
| **LLM Model** | Configured via `LLM_MODEL_FREE` (e.g., `gemini-1.5-flash`) | Configured via `LLM_MODEL_PREMIUM` (default: **Gemini 3.5 Flash** `gemini-3.5-flash`) |
| **TTS Audio** | Native Browser `speechSynthesis` (Zero API / bandwidth cost) | Gemini / Google Cloud / ElevenLabs TTS with natural prosody and SSML pauses |
| **Voice Streaming** | Full paragraph utterance | First-sentence queue streaming (speaks sentence 1 immediately with zero delay) |
| **Quota / 429 Handling** | Automatic exponential backoff + friendly busy response | Dedicated priority tier capacity |
| **Audio Fallback** | Native browser | Automatic fallback to browser synthesis if cloud TTS fails |
| **Daily Quotas** | Configurable (Default: 50 / user, 500 school total) | Configurable (Default: 200 / user, 5000 school total) |

### How to Switch Tiers in the Admin Panel
1. Log in as an Administrator or Principal.
2. Navigate to **Admin Panel** -> click **AI Assistant & Usage** tab (or direct URL `http://localhost:3600/admin?tab=ai_settings`).
3. Click either the **Free Tier** card or **Premium Tier** card.
4. The active tier changes immediately for all CRM users across the school with zero downtime.

### Cost Control & Rate Limiting
- **60-Second Query Cache**: Identical database queries (such as "teachers absent today") are cached in-memory for 60 seconds to eliminate redundant DB queries and LLM token usage.
- **Truncated History**: Limits prompt history to the last 6 turns (3 exchanges).
- **Text-Only Mode Savings**: Skips TTS audio generation completely when the user selects `Text only` reply mode.
- **Usage & Cost Dashboard**: Displays real-time KPIs for tokens processed, TTS characters, and estimated cost (USD / INR) with an audit log of recent inquiries.

### Configuration (`services/gateway/.env`)
```bash
# Active AI Tier ('free' | 'premium')
AI_TIER="free"

# Google Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# Per-Tier Model IDs (Never hardcoded in code)
LLM_MODEL_FREE="gemini-1.5-flash"
LLM_MODEL_PREMIUM="gemini-3.5-flash"

# TTS Providers ('browser' | 'gemini' | 'elevenlabs')
TTS_PROVIDER_FREE="browser"
TTS_PROVIDER_PREMIUM="gemini"

# Optional ElevenLabs integration
ELEVENLABS_API_KEY=""
ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"

# Language Voices
AI_VOICE_EN="en-US-Journey-F"
AI_VOICE_HI="hi-IN-Neural2-D"
AI_VOICE_KN="kn-IN-Standard-A"

# Daily Limits & Caching
AI_USER_LIMIT_FREE="50"
AI_USER_LIMIT_PREMIUM="200"
AI_SCHOOL_LIMIT_FREE="500"
AI_SCHOOL_LIMIT_PREMIUM="5000"
AI_CACHE_TTL_SEC="60"
```

### Benchmark Test Questions
Test all three reply modes (`Voice only`, `Text only`, `Voice + Text`) with:
1. *"How many teachers are absent today?"*
2. *"Which students of class 10A are absent?"*
3. *"Who has pending fees?"*
4. *"What is the timetable of class 8B on Monday?"*

---

## License

MIT


