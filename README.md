# WhatsApp Blast Marketing System

A turnkey WhatsApp marketing system running on Oracle Cloud (ARM64), featuring a Caddy reverse proxy, Directus CMS, Evolution API v2, and a custom Node.js Worker for intelligent message dispatching.

## Stack
- **Proxy**: Caddy (Auto SSL)
- **CMS**: Directus (Headless)
- **Gateway**: Evolution API v2
- **Worker**: Node.js + BullMQ + Groq AI
- **Database**: Postgres + Redis

## Prerequisites
- Docker & Docker Compose installed.
- Oracle Cloud ARM64 instance (or any Linux server).
- A valid domain name (optional, but recommended for SSL).

## Setup Instructions

### 1. Configuration
Copy the example environment file and edit it:
```bash
cp .env.example .env
nano .env
```
**Critical Variables:**
- `PUBLIC_URL`: The URL where Directus will be accessible (e.g., `http://your-ip:8055` or `https://painel.yourdomain.com`).
- `EVOLUTION_API_KEY`: Set a strong master key for Evolution API.
- `GROQ_API_KEY`: Your Groq API key for AI message rewriting.
- `DIRECTUS_STATIC_TOKEN`: Set a static token for the Worker to authenticate with Directus.

### 2. Start the System
Run the following command to start all services:
```bash
docker compose up -d
```

### 3. Evolution API Configuration (CRITICAL)
The system cannot automatically login to WhatsApp. You must do this manually:
1.  Access Evolution API at `http://<YOUR_IP>:8080` (or your configured domain).
2.  Login with the `AUTHENTICATION_API_KEY` you set in `.env`.
3.  **Create a new Instance** named `Chip01` (or whatever you prefer, but match it in Directus later).
4.  **Scan the QR Code** with your WhatsApp app.
5.  **Copy the API Token** for this specific instance.

### 4. Directus Setup
1.  Access Directus at `http://<YOUR_IP>:8055`.
2.  Login with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3.  The Worker should have automatically created the collections: `campanhas`, `instancias`, `contatos`.

### 5. Connect Instance
1.  In Directus, go to the `instancias` collection.
2.  Create a new item:
    - **Nome**: `Chip Principal`
    - **Evolution Instance Name**: `Chip01` (Must match what you created in Evolution API)
    - **Token Evolution**: Paste the token you copied in Step 3.
    - **Status Ativo**: Checked (True).

## Usage

### Sending a Campaign
1.  **Create Contacts**: Add contacts to the `contatos` collection.
2.  **Create Campaign**: Add a campaign in `campanhas`.
    - **Prompt IA**: Instructions for the AI (e.g., "Rewrite this to be friendly and professional").
    - **Msg Base**: The core message (can use `{{variavel}}`).
3.  **Dispatch**: The current worker implementation processes jobs from a queue. You will need to trigger the jobs.
    *Note: The current setup requires a mechanism to push jobs to the queue. You can add a Directus Hook or a simple script to push jobs to Redis `wpp-queue`.*

## Troubleshooting
- **Logs**: Check logs with `docker compose logs -f worker` or `docker compose logs -f evolution`.
- **Persistence**: Data is saved in the `./volumes` directory (mapped in docker-compose).
