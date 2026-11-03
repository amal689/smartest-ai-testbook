# MVP Requirements — Smartest AI Testbook

## Goal and core value

The system enables a team to define tests for an LLM-based application, run them against a model, and obtain readable evaluations of the responses. Its core value is turning variable LLM outputs into measurable, reviewable results.

This project describes an MVP. Design only features needed to define a suite, run it, evaluate responses, review results, or export data.

## Functional requirements

### FR-1 — Manage test suites and test cases

- Users can create and edit a `TestSuite` with a name and description.
- A suite contains one or more `TestCase` objects.
- Each `TestCase` has a stable ID, a prompt, optional variables, and evaluation criteria (a golden reference and/or a rubric).
- Users can configure one or more evaluators and their thresholds for a test.
- Tests are editable, but the system **does not manage test versions or prompt snapshots**. Historical results retain the test ID and recorded outcome; they cannot reconstruct the test contents at the time of an earlier run.

### FR-2 — Run a suite

- Users can start a suite run by selecting a `ModelProvider`.
- The system sends the test prompt and its variables to the provider and collects the generated output.
- Each execution is represented by an `EvalRun` linked to the suite and its results.
- An error on one test is recorded in its `EvalResult` and does not discard the other results in the run.

### FR-3 — Evaluate responses

- Each generated output can be evaluated by one or more `Evaluator` implementations.
- Each score records a value, scale, feedback, and, when configured, a threshold with a pass/fail outcome.
- The MVP starts with three strategies:
  - `ExactMatchEvaluator`: deterministic content or schema checks;
  - `SemanticSimilarityEvaluator`: semantic similarity against the golden reference;
  - `LlmJudgeEvaluator`: rubric-based evaluation using an LLM.
- Individual scores retain their own scales; different scales are not assumed to be directly comparable.

### FR-4 — Review the report

- At the end of a run, `EvalReport` aggregates its `EvalResult` objects and presents an overall judgment produced by a dedicated strategy (`OverallScoreEvaluator`).
- The report makes the suite, run date, model/provider, test ID, generated output, applied evaluators, scores and scales, thresholds and outcomes, and feedback available for review.
- The overall value is produced by the strategy, but its aggregation formula is part of the design exercise and is not specified here.

### FR-5 — Persistence and export

- Suites, test cases, runs, and results are stored in a database.
- Users can export a suite as JSON. The export includes the suite, its tests, and the related run and result history.
- The exported file can be stored and versioned outside the system; individual tests are not versioned inside the application.

## Essential non-functional requirements

- **Extensibility:** an evaluator or provider adapter can be added without changing the runner's core logic.
- **Error isolation:** an error for one test is recorded without losing other results in the run.
- **Minimum traceability:** each run records its date/time and provider/model; each result retains the test ID, output, and evaluations.

## Outside the MVP scope

Internal test versioning or snapshots, automatic baseline/regression comparison, dashboards and live updates, accounts and permissions, CSV import/export, CI/CD and CLI, concurrent execution, retries/backoff, cost optimization, and selection of specific database or queue technologies.
