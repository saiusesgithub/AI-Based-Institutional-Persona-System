# Backend

FastAPI service layer for orchestration and integrations.

## Run

1. cd backend
2. python -m venv .venv
3. .\.venv\Scripts\Activate.ps1  (Windows PowerShell)
4. pip install -r requirements.txt
5. copy .env.example .env
6. set GEMINI_API_KEY and ELEVENLABS_API_KEY in .env
7. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

macOS or Linux activation:

- source .venv/bin/activate

## Endpoints

- GET /health
- POST /chat
- POST /tts

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
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Personas are configured in `app/personas.json`. The chat route loads the selected persona and builds a system prompt before calling Gemini.

## ElevenLabs setup

Create an ElevenLabs API key in your ElevenLabs account settings, then set it in `.env`:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

Persona voice IDs live in `app/personas.json` under `elevenlabs_voice_id`. Replace those IDs with voices from your ElevenLabs Voice Library when you are ready.

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
  "audio_url": "data:audio/mpeg;base64,...",
  "audio_base64": "..."
}
```

Independent test:

```bash
curl -X POST http://127.0.0.1:8000/tts -H "Content-Type: application/json" -d "{\"text\":\"Welcome to the institution.\",\"persona\":\"reception-assistant\"}"
```
