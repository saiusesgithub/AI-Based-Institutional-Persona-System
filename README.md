# Institutional Avatar Agent

This folder contains the production-style codebase for the AI Institutional Persona System.

## Structure

- frontend/  React + Vite + Tailwind CSS + React Three Fiber
- backend/   FastAPI service layer
- docs/      Architecture notes and planning

## Quick start

### Frontend

1. cd frontend
2. npm install
3. npm run dev

### Backend

1. cd backend
2. python -m venv .venv
3. .\.venv\Scripts\Activate.ps1  (Windows PowerShell)
4. pip install -r requirements.txt
5. copy .env.example .env
6. set GEMINI_API_KEY and ELEVENLABS_API_KEY in backend/.env
7. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

macOS or Linux activation:

- source .venv/bin/activate

## Notes

- Frontend voice transcripts are sent to the backend `/chat` route.
- Backend uses Gemini 2.5 Flash with persona prompts from `backend/app/personas.json`.
- Set `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` in `backend/.env` before using AI responses and voice output.

## Chat flow

1. Browser speech recognition converts speech to text in the frontend.
2. The selected persona key and transcript are sent to `POST /chat`.
3. FastAPI builds a persona-specific Gemini system prompt.
4. Gemini returns a concise institutional response.
5. The frontend appends the AI response to chat history.
6. The frontend sends the AI response text to `POST /tts`.
7. FastAPI generates MP3 speech with ElevenLabs.
8. The frontend converts the returned audio to WAV and requests Rhubarb mouth cues from `POST /lipsync`.
9. The frontend plays the audio and drives avatar mouth blendshapes from Rhubarb timing.

## Environment

Backend:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
RHUBARB_PATH=C:\tools\rhubarb\rhubarb.exe
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
