import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from web_server.generated.models.health_response import HealthResponse

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("WEB_ORIGIN", "http://localhost:3000")])


@app.get("/health")
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")
