from fastapi import FastAPI

app = FastAPI(title="Institutional Persona API")


@app.get("/")
def root():
    return {"message": "Institutional Persona API"}


@app.get("/health")
def health():
    return {"status": "ok"}
