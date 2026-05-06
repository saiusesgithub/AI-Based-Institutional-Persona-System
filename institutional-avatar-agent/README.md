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
5. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

macOS or Linux activation:

- source .venv/bin/activate

## Notes

- Frontend components are placeholders only.
- Backend exposes a simple health endpoint.
