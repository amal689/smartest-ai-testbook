# Tasks

## 1. Shared contract

- [x] 1.1 Create `api/openapi.yaml` with the agreed `GET /health` response and validate the contract with the chosen pinned tooling.

## 2. TypeScript backend

- [x] 2.1 If any, keep domain classes directly under `typescript/src/`, update imports and tests as needed, and verify existing tests and TypeScript typechecking pass.
- [x] 2.2 Configure pinned `openapi-typescript` generation into `typescript/src/web-server/generated/`, version the output, and verify repeated generation is reproducible and does not overwrite handwritten files.
- [x] 2.3 Add handwritten Express server and health handler under `typescript/src/web-server/`; verify status, JSON body and browser-origin policy against the contract.
- [x] 2.4 Document TypeScript layout, startup and generation commands in `doc/web-architecture.md` and `doc/api-generation.md`; run the documented commands and existing tests.

## 3. Python backend

- [x] 3.1 Keep domain classes directly under `python/src/`, update imports and tests as needed, and verify the existing Python test suite passes.
- [x] 3.2 Configure pinned `python-fastapi` models-only generation into `python/src/web_server/generated/` and keep the handwritten app under `python/src/web_server/`; verify repeat generation preserves handwritten files and generated models import and run on the project's Python version.
- [x] 3.3 Implement the same health response and browser-origin policy in the FastAPI server under `python/src/web_server/`; verify the same status and JSON body as the TypeScript server and rerun Python tests.
- [x] 3.4 Extend the architecture and generation documentation with Python layout, startup and commands; run the documented commands and record any difference in implementation progress.

## 4. Shared web client

- [x] 4.1 Configure pinned `typescript-fetch` generation, version the isolated client output and verify regeneration is reproducible without changing handwritten files.
- [x] 4.2 Create the React application served by standard static hosting, importing `configuration.js` at runtime with its exported `apiBaseUrl`; verify that a missing or invalid configuration produces a clear error.
- [x] 4.3 Connect the generated client to the health operation and show success or connection failure; support repeated checks and a five-second request timeout; verify these behaviors and document client setup, configuration and generation in `doc/`.

## 5. Integration

- [x] 5.1 Provide shared HTTP contract checks and run the same checks against both servers, comparing health status, JSON content and browser CORS behavior; preserve any existing domain test suites.
- [x] 5.2 Start static hosting and each backend, change only the served `configuration.js` and reload the page to use the same built client with each backend without restarting static hosting, and verify connectivity in a browser including origin handling; record commands and results in the documentation.
- [x] 5.3 Add a regeneration check that fails on stale generated output without overwriting handwritten files; verify it passes for current output and fails after deliberately changing an artifact, then restore that artifact.
- [x] 5.4 Update repository startup and verification instructions and validate OpenSpec; run the documented commands and confirm both implementations have equivalent functionality.

## 6. Minimal servers for classroom use

- [x] 6.1 Simplify TypeScript first: export the Express app, register health directly, use standard CORS middleware and a minimal entry point; remove server wrappers and configuration validators; run its HTTP test and typecheck.
- [x] 6.2 Simplify Python next: generate only transport models, export the FastAPI app with a direct health route and standard CORS, and keep a minimal entry point; remove wrappers and generated routing/implementation scaffolding; run Python tests.
- [x] 6.3 Limit shared HTTP checks to the health contract and browser CORS behavior, then verify both backends and the existing runtime-configured client in the browser.
- [x] 6.4 Verify models-only Python generation, repeatable output, handwritten-file preservation and stale artifact detection for all generation targets.
- [x] 6.5 Update architecture, generation and startup documentation and align OpenSpec planning with the minimal handwritten apps; validate OpenSpec.
- [x] 6.6 Build the final backend images and verify HTTP and browser connectivity through Compose, keeping the existing static client and runtime configuration module.
