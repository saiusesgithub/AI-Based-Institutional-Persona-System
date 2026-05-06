# Backend

FastAPI service layer for orchestration and integrations.

## Run

1. cd backend
2. python -m venv .venv
3. .\.venv\Scripts\Activate.ps1  (Windows PowerShell)
4. pip install -r requirements.txt
5. copy .env.example .env
6. set GEMINI_API_KEY in .env
7. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

macOS or Linux activation:

- source .venv/bin/activate

## Endpoints

- GET /health
- POST /chat
- POST /tts
- POST /lipsync

### POST /chat

Request:

```json
{
  "message": "What are today's department office hours?",
  "persona": "hod"
}
```

Response:

```json
{
  "response": "Please contact the department office for today's exact hours. I can also guide you on whom to approach for academic queries."
}
```

## Gemini setup

Create an API key in Google AI Studio, then set it in `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
EDGE_TTS_VOICE=en-US-AriaNeural
TTS_CLEANUP_AFTER_SECONDS=1800
RHUBARB_PATH=C:\tools\rhubarb\rhubarb.exe
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Personas are configured in `app/personas.json`. The chat route loads the selected persona and builds a system prompt before calling Gemini.

## Edge TTS setup

The backend uses `edge-tts` to generate MP3 files and serves them from `/audio`.

```env
EDGE_TTS_VOICE=en-US-AriaNeural
TTS_CLEANUP_AFTER_SECONDS=1800
```

Generated MP3 files are stored temporarily in `app/generated_audio` and cleaned up on later TTS requests.

### POST /tts

Request:

```json
{
  "text": "Welcome to the institution. How may I assist you today?",
  "persona": "reception-assistant"
}
```

Response:

```json
{
  "audio_url": "http://127.0.0.1:8000/audio/generated-file.mp3",
  "audio_base64": null,
  "duration_seconds": null
}
```

Independent test:

```bash
curl -X POST http://127.0.0.1:8000/tts -H "Content-Type: application/json" -d "{\"text\":\"Welcome to the institution.\",\"persona\":\"reception-assistant\"}"
```

## Rhubarb lip sync setup

Install Rhubarb Lip Sync and point the backend to the executable:

```env
RHUBARB_PATH=C:\tools\rhubarb\rhubarb.exe
```

The frontend converts returned TTS audio into WAV, sends it to `POST /lipsync`, and the backend returns Rhubarb mouth cues.

### POST /lipsync

Request:

```json
{
  "audio_base64": "...",
  "audio_format": "wav"
}
```

Response:

```json
{
  "phonemes": [
    { "start": 0.0, "end": 0.08, "value": "X" },
    { "start": 0.08, "end": 0.2, "value": "A" }
  ]
}
```
