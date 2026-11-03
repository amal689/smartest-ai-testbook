# Design

## Context

The repository provides a shared React client and equivalent HTTP backends for a school exercise. The HTTP layer is a small bridge to the interface; domain modeling remains the core teaching subject. This checkout currently contains no domain classes or domain tests. Shared specifications and any future domain behavior must remain independent of HTTP code.

The documentation in `doc/` is the source of truth for this reconciliation. `doc/web-architecture.md` and `doc/api-generation.md` define this foundation. `doc/domain-design.md` describes the future test creation, execution, reporting and exporting subsystems, including expectations and their outcomes; those capabilities require a separate change and are not implemented by this foundation. Its latest expectation rules require a threshold for every check, despite the older optional-threshold wording still present in `doc/requirements.md`.

## Goals / Non-Goals

**Goals:** establish an understandable, executable boundary for one shared client and two equivalent servers; prove generation and regeneration with a minimal operation.

**Non-Goals:** expose suite management or implement storage, evaluation, provider integration or report functionality. A connectivity check is not a readiness check for those future capabilities.

## Decisions

- Place the canonical contract at `api/openapi.yaml`, with pinned generator versions and configuration in `api/generators/` and commands in `api/scripts/`. Use `GET /health` with `200` and JSON `{"status":"ok"}` as the initial connectivity operation; it checks that the server responds, not that dependencies or business features are ready. A single operation is sufficient to exercise generation without inventing a suite API.
- Place the shared React app in `web-client/`, served by standard static hosting: Vite Preview locally and Nginx in its container. Keep `public/configuration.js` as a plain module containing only `export const apiBaseUrl = 'http://localhost:3001';`. Copy it unchanged during the build and load the served module using runtime `import()` with `@vite-ignore`; do not bundle it or generate it through a custom server. Change only the served module to select either backend without rebuilding the client. Compose mounts the source module read-only into Nginx. Missing or invalid configuration and connection failures must produce an understandable error. This is externalized configuration, and the public module must contain no secrets. Configure CORS for the client origin in both APIs, including preflight where needed, and verify the actual browser path.
- Use `typescript-fetch` for the React client, `openapi-typescript` for TypeScript API types, and `python-fastapi` restricted to transport model generation. Keep generated TypeScript types in `typescript/src/web-server/generated/` and Python models in `python/src/web_server/generated/`. Handwrite both apps and their routes in the corresponding parent directories. Do not generate Python routing, base API classes or implementation discovery. Pin generator and runtime versions and verify the generated output works with the actual OpenAPI contract.
- Version generated files and keep them under the server-specific `generated/` directories. Regenerate into a temporary directory for comparison. Generation and verification commands must never overwrite handwritten files; prove this with repeat generation and a deliberately stale generated file.
- Keep TypeScript domain classes directly under `typescript/src/` and Python domain classes directly under `python/src/`. Keep handwritten HTTP server code under `typescript/src/web-server/` and `python/src/web_server/`, respectively. Put generated server API code under `typescript/src/web-server/generated/` and `python/src/web_server/generated/`. Update imports and tests sequentially: TypeScript first, then Python. Domain code must not depend on HTTP, generated models or web frameworks.
- HTTP handlers translate transport data and delegate business operations to domain classes directly; do not add an application service layer for this foundation. The health operation may be a direct transport-level handler because it has no business behavior. Generated transport models are not domain entities. Both implementations retain the same functionality and domain architecture.
- Keep server glue small enough to explain in class: export one framework app, configure standard CORS middleware and register health directly. Keep startup in a separate tiny entry point. Do not introduce handwritten server classes or interfaces. Read `PORT` and `WEB_ORIGIN` with defaults; let the runtime handle invalid startup configuration. Bind to `0.0.0.0` for local and container use. Preserve the health contract and browser origin behavior; leave unspecified routing and HTTP error details to each framework instead of normalizing them.
- Write `doc/web-architecture.md` and `doc/api-generation.md` in English for engineers, explaining actual structure, boundaries, runtime configuration, commands, generation ownership, versioning, and the common HTTP checks. Update existing startup instructions to match the implemented services. Do not describe planned patterns as already implemented.

## Risks / Trade-offs

- [Generator output] The FastAPI generator is beta. Generate only models into an isolated directory and verify their imports and regeneration; handwritten routing must remain independent of generator scaffolding.
- [Contract drift] Type declarations do not validate HTTP at runtime. Run the same health contract checks against both servers and verify browser CORS behavior. Do not create application code merely to normalize unspecified framework defaults. Future documented operations and errors must have corresponding contract checks.
- [Browser origins] A direct API URL can trigger CORS. Verify from the actual static client in both configurations and document the chosen routing and allowed origin.
- [Migration] Moving domain files can break imports and existing commands. Preserve their behavior and run each language's existing checks immediately after its migration.
