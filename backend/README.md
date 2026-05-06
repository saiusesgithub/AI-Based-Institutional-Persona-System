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
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Personas are configured in `app/personas.json`. The chat route loads the selected persona and builds a system prompt before calling Gemini.
