import os
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from smartest_ai_testbook.web_server.generated.models.health_response import HealthResponse
from smartest_ai_testbook.test_creation.test_suite import TestCaseBuikder, TestSuite

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("WEB_ORIGIN", "http://localhost:3000")])

class PrepareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference_id: str | None = None
    prompt: str | None = None
    goldenReference: str | None = None
    variables: dict[str, str] = Field(default_factory=dict)
    expectations: list[dict] = Field(default_factory=list)


class BuildRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference_id: str


builders: dict[str, TestCaseBuikder] = {}


@app.get("/health")
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/test-suite", status_code=201)
def create_test_suite():
    return jsonable_encoder(TestSuite())


@app.post("/test-case/prepare")
def prepare_test_case(request: PrepareRequest):
    if request.reference_id is None:
        reference_id = str(uuid4())
        builder = TestCaseBuikder()
        builders[reference_id] = builder
    else:
        reference_id = request.reference_id
        builder = builders.get(reference_id)
        if builder is None:
            raise HTTPException(status_code=404, detail="Reference not found")

    if request.prompt is not None:
        builder.set_prompt(request.prompt)
    if request.goldenReference is not None:
        builder.set_golden_reference(request.goldenReference)
    for key, value in request.variables.items():
        builder.add_variable(key, value)
    for expectation in request.expectations:
        builder.add_expectation(expectation)
    return {"reference_id": reference_id}


@app.post("/test-case/build")
def build_test_case(request: BuildRequest):
    builder = builders.get(request.reference_id)
    if builder is None:
        raise HTTPException(status_code=404, detail="Reference not found")
    try:
        return jsonable_encoder(builder.build())
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
