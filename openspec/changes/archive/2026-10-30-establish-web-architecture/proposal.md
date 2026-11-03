# Proposal

## Why

The exercise needs a small HTTP bridge between a shared web client and two interchangeable backends. A shared contract makes the boundary visible to students, while minimal handwritten apps keep framework glue from distracting from object-oriented domain design.

## What Changes

- Add one OpenAPI contract, versioned generation configuration and generated artifacts for the React client, TypeScript API types and Python transport models.
- Add one static React application with deployment-time API configuration and its own static server, plus Express and FastAPI servers with the same initial connectivity operation.
- Keep domain code directly under each backend's `src/` directory. Place TypeScript HTTP server code under `typescript/src/web-server/` and Python HTTP server code under `python/src/web_server/`; place generated server API code in each server's `generated/` subdirectory.
- Verify the same HTTP contract against both backends, safe regeneration and switching backends without rebuilding the client.
- Document the architecture and generation workflow in `doc/`. Existing domain imports and test paths may need migration.
- Scope is the foundation and a minimal connectivity operation; test creation, execution, reporting, exporting and persistence described in `doc/` remain outside this change.
- Keep each backend to a small handwritten app and an entry point, with direct routes and standard CORS middleware. Leave unspecified HTTP errors and routing details to the frameworks.

## Capabilities

### New Capabilities

- `web-access`: a shared web client can connect to either implementation through the same HTTP contract.

### Modified Capabilities

None. There are currently no main capability specifications under `openspec/specs/`. The domain documented in `doc/domain-design.md` requires a separate change; this web foundation does not specify or implement it.

## Impact

New `api/` and `web-client/` directories; TypeScript domain code remains directly in `typescript/src/`, with server code in `typescript/src/web-server/` and generated API code in `typescript/src/web-server/generated/`. Python follows the same layout using `python/src/`, `python/src/web_server/` and `python/src/web_server/generated/`. Dependencies, development and deployment configuration, tests and documentation are also affected. No existing domain behavior is intentionally changed.
