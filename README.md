# Autoflow.space - Marketing Automation System

A robust, scalable WhatsApp marketing automation platform running on Oracle Cloud (ARM64). It features a secure reverse proxy, a headless CMS for management, an API gateway for WhatsApp connection, and an intelligent worker for batch processing.

## 🏗️ Architecture

### 1. Infrastructure & Domain
- **Domain:** `autoflow.space`
- **Reverse Proxy:** Caddy (Automatic SSL/HTTPS)
    - `https://cms.autoflow.space` -> Directus (Port 8055)
    - `https://api.autoflow.space` -> Evolution API (Port 8080)
- **Containerization:** Docker & Docker Compose (Host Network Mode)

### 2. Data Model (Directus)
The system uses a relational schema to manage campaigns and contacts:
- **`configuracoes_gerais` (Singleton):** Central control for delays, active hours, and active instances.
- **`campanhas`:** Campaign management with status workflow (`Draft` -> `Calculando` -> `Pronta` -> `Enviando` -> `Concluída`).
- **`contatos`:** Contact database with M2M tagging support.
- **`tags`:** Segmentation labels (e.g., "VIP", "Lead Frio").
- **`fila_envios`:** Job queue log tracking the status of every single message dispatch.

### 3. Worker Service (The Brain)
The Node.js worker operates in two distinct modes:

#### Mode A: The Calculator (`calculator.ts`)
- **Trigger:** Campaign status set to `Calculando`.
- **Action:**
    1.  Identifies target contacts based on Campaign Tags.
    2.  Populates `fila_envios` with pending jobs.
    3.  Calculates estimated time based on configured delays.
    4.  Updates Campaign status to `Pronta`.

#### Mode B: The Dispatcher V2 (`dispatcher_v2.ts`)
- **Trigger:** Campaign status set to `Enviando`.
- **Action:**
    1.  Checks `configuracoes_gerais` for allowed sending windows (Start/End time).
    2.  Polls `fila_envios` for pending jobs.
    3.  Dispatches jobs to the Redis Queue (`wpp-queue`).

#### Mode C: The Processor (`processor.ts`)
- **Action:**
    1.  Consumes jobs from Redis.
    2.  Applies dynamic delays (randomized within min/max range).
    3.  **AI Rewrite:** Uses Llama 3.3 (via Groq) to rewrite messages per contact (optional).
    4.  **Sending:** Dispatches via Evolution API.
    5.  **Logging:** Updates `fila_envios` with success/failure logs.

---

## 🚀 Usage Guide

### 1. Initial Setup
1.  Access **Directus** (`https://cms.autoflow.space`).
2.  Go to **Configurações Gerais** and set:
    - **Delay Min/Max:** e.g., 30s / 120s.
    - **Horário:** e.g., 08:00 to 20:00.
    - **Instâncias Ativas:** List of Evolution instance names (e.g., `["Chip01"]`).

### 2. Creating a Campaign
1.  **Create Tags:** Define your segments in the `tags` collection.
2.  **Import Contacts:** Add contacts to `contatos` and assign Tags.
3.  **Draft Campaign:** Create a new campaign in `campanhas`.
    - Select **Tags Alvo**.
    - Write **Msg Base**.
    - Set Status to **Calculando**.
4.  **Review:** Wait for the Worker to calculate stats. Status will change to **Pronta**.
5.  **Launch:** Change Status to **Enviando**.

---

## 🛠️ Technical Commands

### Logs
Monitor the worker logic:
```bash
docker compose logs -f worker
```

### Restart Services
```bash
docker compose restart worker
```

### Full Rebuild
```bash
docker compose up -d --build
```
