# API generation

`api/openapi.yaml` is the canonical HTTP contract. Generated transport code is
separate from handwritten server code and is committed to version control.
Change the contract and regenerate instead of editing generated artifacts.

## TypeScript server types

The root `package.json` pins `openapi-typescript` to 7.13.0.
`api/generators/typescript.json` records its expected version and output path.
The generated schema supplies the handwritten health handler's return type;
TypeScript declarations alone do not validate network data at runtime.

From the repository root:

```sh
npm ci
node api/scripts/generate.mjs typescript
node api/scripts/generate.mjs typescript --check
```

Generation first writes into a temporary directory. Normal generation replaces
only `typescript/src/web-server/generated/schema.ts`. Check mode compares the
temporary artifact with the committed file and exits nonzero if it is stale or
missing. Temporary files are removed on success and failure. Neither mode writes
to handwritten files.

Repeated generation and check mode pass for the initial health contract. The
handwritten TypeScript entry point's SHA-256 was unchanged after regeneration.

## Python transport models

Java 21 is used for OpenAPI Generator 7.26.0. The version and SHA-256 are pinned in
`api/generators/openapi-generator.json`; the setup command downloads the official
Maven artifact into the ignored `.api-tools/` directory and verifies the hash.

From the repository root:

```sh
node api/scripts/setup-generator.mjs
java -jar .api-tools/openapi-generator-cli-7.26.0.jar validate -i api/openapi.yaml
node api/scripts/generate.mjs python
node api/scripts/generate.mjs python --check
```

`api/generators/python.json` selects `python-fastapi` with the global properties
`models,modelTests=false,modelDocs=false`. It generates only transport models in
`web_server.generated.models`; the initial contract produces `health_response.py`.
Generation runs in a temporary directory and copies the generated package to
`python/src/web_server/generated/`. It produces no router, API base classes,
implementation discovery or server startup code.

The handwritten `web_server/app.py` imports the generated model and declares
the health route directly. Runtime dependencies belong in the project's own
`python/pyproject.toml` and `uv.lock`. Repeated generation preserves all handwritten
sources, check mode passes, and the generated model runs on Python 3.12.0.
Reference: [python-fastapi generator options](https://openapi-generator.tech/docs/generators/python-fastapi/).

## Browser client generation

`api/generators/client.json` selects the same pinned OpenAPI Generator version
with `typescript-fetch` and `withInterfaces=true`.

```sh
node api/scripts/generate.mjs client
node api/scripts/generate.mjs client --check
```

Only runtime, models and API source files are copied into
`web-client/src/generated/`. Generated project scaffolding is discarded.
`api/generators/templates/typescript-fetch/runtime.mustache` is a versioned copy of
the 7.26.0 runtime template with explicit public interfaces added to its classes,
including error and response wrappers. This implements the project's class
contract rule. API classes use the generator's own interfaces. When upgrading
the generator, compare this template with the new upstream runtime template.
Repeated generation preserves all handwritten React code and produces identical
output. The client build typechecks generated and handwritten code together.

## All artifacts and stale output

```sh
node api/scripts/generate.mjs all
node api/scripts/generate.mjs all --check
node api/scripts/verify-generation.mjs
```

The final command regenerates all targets, checks current output, deliberately
changes one artifact per target, and requires check mode to fail without
overwriting that change. Each artifact is restored in a `finally` block. It also
compares hashes of every handwritten source file before and after regeneration.
Use it when changing generation configuration or templates. For routine stale
output checks, `all --check` is sufficient and changes no committed files.
