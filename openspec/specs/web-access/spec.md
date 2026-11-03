# web-access Specification

## Purpose

Allow users to access the same web application through either system implementation using a shared HTTP contract.

## Requirements

### Requirement: Shared web interface
The system SHALL provide a single web application through a server dedicated to its static files.

#### Scenario: Open the application
- **WHEN** a user opens the web interface server address
- **THEN** the browser receives and displays the web application

### Requirement: Select the backend implementation
The system SHALL allow the backend address to be changed through public runtime configuration, without rebuilding the web application or restarting its static hosting. Reloading the page SHALL use the configured address. Public configuration MUST contain no secrets.

#### Scenario: Switch backends
- **WHEN** the served configuration changes from the TypeScript backend address to the Python backend address and the user reloads the page
- **THEN** the same application build sends requests to Python without restarting static hosting
- **AND** changing the address back and reloading selects TypeScript again

#### Scenario: Invalid runtime configuration
- **WHEN** runtime configuration is missing, cannot be loaded, or contains a missing or invalid HTTP or HTTPS backend address
- **THEN** the application displays an understandable configuration error

### Requirement: Shared HTTP contract
Both backends SHALL expose available operations according to `api/openapi.yaml`, with the same contract-defined data and observable behavior. The initial contract SHALL contain only `GET /health`, returning HTTP 200 with JSON `{"status":"ok"}`. This operation SHALL check connectivity only, without claiming readiness of persistence, providers or domain features. Routing and errors not specified by the contract MAY follow framework defaults.

#### Scenario: Check connectivity
- **WHEN** the contract's connectivity request is sent to either backend
- **THEN** both respond with the same success status code, format, and content defined by the contract

#### Scenario: Interface checks the configured backend
- **WHEN** the web application requests a connectivity check from the configured backend
- **THEN** it shows success only when the response contains status `ok`
- **AND** request failures, invalid health responses and requests exceeding five seconds produce an understandable connection failure

#### Scenario: Repeat the connectivity check
- **WHEN** the user requests another connectivity check using the interface button
- **THEN** the application checks the same configured backend again and updates the displayed result

### Requirement: Browser access from the configured origin
Both backends SHALL support browser requests from the configured web origin, including GET preflight. The default web origin SHALL be `http://localhost:3000`. CORS SHALL control browser access without requiring a custom rejection response for ordinary HTTP clients.

#### Scenario: Allowed browser origin
- **WHEN** a browser at the configured origin sends a health request or its GET preflight to either backend
- **THEN** the backend provides the CORS response headers needed for the browser to read the health response

#### Scenario: Different browser origin
- **WHEN** a browser at another origin requests health
- **THEN** the backend does not grant that origin permission to read the response

### Requirement: Safe and reproducible API generation
The project SHALL version generated transport artifacts for both backends and the shared client, using pinned generation tooling and configuration based on the shared HTTP contract. Regeneration SHALL preserve handwritten files. Check mode SHALL report stale or missing generated artifacts without overwriting committed artifacts.

#### Scenario: Repeat generation
- **WHEN** generation runs repeatedly with the same contract, configuration and tooling
- **THEN** generated artifacts are identical and handwritten files remain unchanged

#### Scenario: Detect stale output
- **WHEN** a generated artifact is missing or differs from freshly generated output
- **THEN** generation check mode fails without replacing the committed artifacts or changing handwritten files
