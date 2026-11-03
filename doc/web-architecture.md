# Web architecture

The shared HTTP contract is `api/openapi.yaml`. It currently exposes only
`GET /health`, returning HTTP 200 with `{"status":"ok"}`. This checks connectivity.
It does not check persistence, providers, evaluation or other business features.

## TypeScript backend

- `typescript/src/index.ts`: process entry point.
- `typescript/src/web-server/app.ts`: Express app, standard CORS middleware and the health route.
- `typescript/src/web-server/generated/schema.ts`: generated contract types.
- Future domain classes belong directly in `typescript/src/` and must not import HTTP code.

The server is supporting glue for the exercise: create the app, enable CORS,
register the route and start listening. It needs no handwritten class, interface,
factory or separate health handler. There are currently no domain classes or
domain tests in either implementation.
The handwritten app and entry point together occupy 14 lines in TypeScript and
19 lines in Python, including imports and blank lines; generated models and tests
are separate.

From `typescript/`, using Node 24.22.1:

```sh
npm ci
npm test
npm run typecheck
npm run dev
```

The default address is `http://localhost:3001`. `PORT` overrides the listening port
and `WEB_ORIGIN` defaults to `http://localhost:3000`. The entry point binds to
`0.0.0.0` for both local and container use. Configuration is read directly, without
custom validation; invalid startup values are handled by the runtime.

The standard `cors` package handles browser origin headers and preflight.
CORS determines which browser origins can read the response; it does not reject
ordinary HTTP requests with a custom 403. Default routing and HTTP error responses
are left to Express.

## Python backend

- `python/src/web_server/__main__.py`: process entry point.
- `python/src/web_server/app.py`: FastAPI app, standard CORS middleware and the health route.
- `python/src/web_server/generated/models/`: generated transport models only.
- Future domain classes belong directly in `python/src/` and must not import HTTP code.

The route is declared directly on the app and returns a generated `HealthResponse`.
There is no generated router, API base class or implementation discovery. The
`CORSMiddleware` supplied by FastAPI handles browser access; routing and error
responses use framework defaults. Transport models are not domain entities.

From `python/`, using Python 3.12 or later (PowerShell):

```powershell
$env:PYTHONPATH = "src"
uv sync --locked
uv run --no-sync python -m unittest discover -s tests -v
uv run --no-sync python -m web_server
```

In a POSIX shell, use `export PYTHONPATH=src` instead of the PowerShell assignment.
uv manages `.venv`; `package = false` means the sources are not installed as a
package, so `PYTHONPATH` is needed for the generated absolute imports.
The default port is 3002. `PORT`, `WEB_ORIGIN` and the fixed bind address have the
same meaning as in TypeScript. FastAPI and Uvicorn are pinned in `pyproject.toml`, and `uv.lock`
locks all transitive dependencies. HTTPX is a development dependency for tests.

## Shared web client

`web-client/src/main.tsx` contains the React connection screen.
`web-client/src/generated/` contains the generated Fetch client.
The UI uses that client for `GET /health` and checks that the returned status is
`ok`. It displays connection success, connection failure or an understandable
configuration error. A button repeats the connectivity check. Requests have a
five-second timeout.

`web-client/public/configuration.js` is a plain JavaScript module:

```js
export const apiBaseUrl = 'http://localhost:3001';
```

Vite copies it unchanged to `dist/configuration.js`. The application loads it
with a runtime `import()` before constructing the generated API client.
`@vite-ignore` keeps this import outside the bundle; `/configuration.js` resolves
at the static site's root, even though the application bundle lives in `assets/`.
The module contains only the API address. It is public and must contain no
secrets. The address must be reachable by the browser.

This is externalized configuration: the client uses the same implementation
and changes its destination through configuration. Selecting an address does
not introduce a Strategy with interchangeable behavior.

From `web-client/`, in PowerShell:

```powershell
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. `npm start` uses Vite Preview for local static hosting.
To select Python without rebuilding, edit only the served `dist/configuration.js`
to export `http://localhost:3002`, then reload the page. Edit the source module in
`public/` when choosing the default for the next build. No custom server is needed.
When using a different browser origin, set both backends' `WEB_ORIGIN` to that
exact origin. HTTPS pages require an HTTPS API address to avoid mixed content.

## Verification

Install root dependencies with `npm ci`, install each backend's dependencies as
above, and build the client. From the repository root:

```sh
node api/scripts/verify-web.mjs --http-only
node api/scripts/verify-web.mjs
```

The first command starts both backends on temporary local ports and runs the same
HTTP checks against each: health status/content, browser origin headers and
successful GET preflight. They do not compare unspecified framework defaults
such as 404/405 bodies, HEAD behavior or slash/case handling. The second also starts the
Vite Preview server and uses Playwright with locally installed Chrome. Set
`BROWSER_CHANNEL=msedge` to use installed Microsoft Edge instead.
Each command stops its child processes after success or failure.

The browser checks cover both backends and repeat requests; unreachable backend;
missing/invalid address; missing/malformed configuration module; and denied browser
origin. The checks rewrite only the served `configuration.js` and compare SHA-256
hashes of the other built files to prove the same client build was used. The
original configuration is restored afterwards.

Verified locally on 2026-10-30: both shared HTTP checks and all eight browser
scenarios pass with Node 24.22.1, Python 3.12.0 and installed Chrome. TypeScript's
HTTP test and typechecking pass; Python's HTTP test and generated model imports pass.
No domain suites exist in this checkout.

## Containers

Compose builds independent TypeScript, Python and static-client images without
mounting host dependencies into them. Nginx 1.30.6 serves the client, with
`web-client/public/configuration.js` mounted read-only over its configuration module.
From the root, with Docker Desktop running:

```powershell
docker compose up --build -d
docker compose run --rm typescript npm test
docker compose run --rm typescript npm run typecheck
docker compose run --rm python uv run --no-sync python -m unittest discover -s tests -v
node api/scripts/contract-check.mjs http://localhost:3001 http://localhost:3000
node api/scripts/contract-check.mjs http://localhost:3002 http://localhost:3000
Set-Content web-client/public/configuration.js "export const apiBaseUrl = 'http://localhost:3002';"
docker compose stop
```

The initial client configuration defaults to TypeScript. Editing only the mounted
module selects Python; reload `http://localhost:3000`. No image rebuild or
container restart is needed. Change the URL back to port 3001 to restore TypeScript.

Verified on 2026-10-30: the Nginx client image builds, and Chrome connects to both
backends after changing only the mounted `configuration.js`. The compiled client
bundle remains identical and the container keeps running throughout the switch.
The source configuration is restored to TypeScript afterwards. The build and all
eight local browser scenarios also pass with the runtime module.
After the server simplification, both backend images build; their HTTP tests and
TypeScript typechecking pass inside containers. Shared contract/CORS checks pass
against both published ports, and Chrome connects the unchanged static client to
each backend by changing only `configuration.js`. The original configuration is
restored afterwards. Python uses 3.12.16 in its image. The client pins Vite 7.3.7.
Verification services are stopped after the checks.
