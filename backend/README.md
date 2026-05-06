# Backend

FastAPI service layer for orchestration and integrations.

## Run

1. cd backend
2. python -m venv .venv
3. .\.venv\Scripts\Activate.ps1  (Windows PowerShell)
4. pip install -r requirements.txt
5. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

macOS or Linux activation:

- source .venv/bin/activate

## Endpoints

- GET /health
