# Smartest AI Testbook

> Domain modeling and object-oriented design for an MVP that evaluates LLM-generated responses.
> Loosely inspired by [yTestbook](https://ytestbook.intesys.it/)

## Scenario

A team is building an application powered by a language model. Responses can vary, and checking only that the program does not crash is not enough: the team needs test examples, a way to run them against a model, and explicit evaluation criteria.

**Problem to explore:** how can response quality be made observable and measurable?

Formulate the application's **core value** before proposing components or features. A suite, run, and report are useful only if they help achieve that value.

## MVP scope

Users create and edit a test suite, run it against an LLM provider, review outputs and their evaluations, and export suites and results as JSON. The system persists the data.

Tests have stable identities and can be edited, but the system does not version their contents or keep prompt snapshots. History retains the test ID and run results, not the exact configuration used in the past.

Do not design dashboards, login, distributed queues, live reports, CI/CD, CLI, concurrency, or retry strategies: they are unnecessary to demonstrate the MVP's core value.

## Work for the two practical sessions

### Part 1 — Understand the domain

- Start from the typical user's tasks (Prompt / AI Engineer): define tests, start a run, and interpret results; identify needs and where the interface should help.
- Identify the problem and formulate the core value.
- Identify the actor, use cases, persisted data, and main flow.
- Analyze which information the run report needs to contain.
- Sketch a low-fidelity wireframe of the main flow and conduct a brief peer UX review.
- Draw the conceptual domain model and discuss its relationships.

### Part 2 — Design classes and interfaces

- Turn the domain model into classes and responsibilities.
- Define the runner interface and its boundary with the provider.
- Derive Strategy from interchangeable evaluators.
- Derive Adapter from the need to isolate provider APIs.
- Explain design choices and leave out details that are unnecessary for the MVP.

### Wireframe and UX review

The wireframe checks whether the user flow is understandable and whether domain and report data appear when needed. A sketch of the main screens is enough: manage suites and tests, start a run, and review its report. A polished UI or visual design is not required.

Check that the next step, required input, score scale and outcome, and provider errors are clear. Every wireframe element must correspond to a use case or MVP requirement; do not add features just to fill a screen.

## Materials

- [requirements.md](./doc/requirements.md): MVP requirements and boundaries;
- [test-case-examples.md](./doc/test-case-examples.md): tests, evaluators, and a sample report.
- [glossary.md](./doc/glossary.md): definitions of the project's main terms.

## Run the web foundation

Specifications in `openspec/` and documents in `doc/` are shared. Implementations and their dependencies are in `typescript/` and `python/`.

This foundation provides a React connection screen and interchangeable Express
and FastAPI backends exposing `GET /health`. Domain features described in the MVP
are not implemented in this checkout.

Each backend is a small framework app and a separate entry point. Routes are
handwritten, CORS uses standard middleware, and OpenAPI supplies TypeScript types
and Python transport models. The HTTP server needs no handwritten classes.

Use Node 24.22.1 and Python 3.12 or later with uv. In separate terminals:

1. In `typescript/`, run `npm ci` and `npm run dev` to start the API on port 3001.
2. In `python/`, run `uv sync --locked`, then run
   `uv run --no-sync python -m smartest_ai_testbook.web_server` to start the API on port 3002.
3. In `web-client/`, run `npm ci`, `npm run build` and `npm start`.

Open `http://localhost:3000`. The client imports the static `configuration.js`
module at runtime. It contains only `export const apiBaseUrl = 'http://localhost:3001';`.
Change the URL to port 3002 in the served `web-client/dist/configuration.js` and
reload to select Python without rebuilding. The default copied during a build
is in `web-client/public/configuration.js`.
Both backends default to accepting
browser requests from `http://localhost:3000`; set `WEB_ORIGIN` for another origin.
Runtime client configuration is public and must contain no secrets.

See [web-architecture.md](./doc/web-architecture.md) for the actual layout, commands and
recorded verification results, and [api-generation.md](./doc/api-generation.md)
for generator versions, ownership and safe regeneration.

## Verification and generation

- At the repository root, `npm ci` installs OpenSpec and generation/browser tooling;
  `npx openspec validate --all` validates specifications.
- In `typescript/`, `npm test` runs HTTP tests and `npm run typecheck` checks types.
- In `python/`, after `uv sync --locked`,
  `uv run --no-sync python -m unittest discover -s tests -v` runs HTTP tests.
- At the root, `npm run api:setup` downloads the pinned generator (requires Java 21),
  `npm run api:generate` regenerates all artifacts, and `npm run api:check` detects
  stale output without writing to committed files.
- With both implementations installed and the client built, `npm run verify:http`
  starts both servers and applies shared HTTP checks. `npm run verify:browser`
  also uses installed Chrome to check the same client build with both backends,
  configuration failures, connection failures and browser origin handling.
- `npm run verify:generation` proves that regeneration preserves handwritten
  sources and that checks reject deliberately stale output, restoring artifacts
  afterwards. There are currently no domain test suites.

## Containers

Compose builds complete server images; it does not mount the host's `.venv` or
`node_modules` into containers. With Docker running, start the TypeScript API and
static client using `docker compose up --build typescript web-client`.
Nginx serves the client and mounts `web-client/public/configuration.js` read-only.
To use Python, change `apiBaseUrl` to `http://localhost:3002` in that file, start
`docker compose up --build python web-client`, and reload the page. Further URL
changes require no rebuild or container restart.
The API URL is a browser address; use `localhost`, rather than a Compose service
name, when opening the app locally. The two APIs can also run together.

When changing a specification, tasks must cover implementation and verification in each language and make any difference in progress explicit.
