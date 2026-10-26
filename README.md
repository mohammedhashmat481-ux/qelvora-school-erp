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

## License

MIT
