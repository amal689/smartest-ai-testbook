# Minimal Class Diagram — MVP

The domain has four logical subsystems: **test creation → execution → reporting**, plus independent **exporting**.
They communicate through public contracts in the same application, without additional subsystem wrapper classes.
Only essential fields and operations are shown. The [requirements](./requirements.md) remain the reference.

## 1. Subsystems and public contracts

| Subsystem | Public entry points | Output |
|---|---|---|
| Test creation | `ITestCaseBuilder`, `ITestSuite` | A configured `ITestSuite`. |
| Execution | `IEvalRunner.run(suite, model)` | A completed `IEvalRun`, including results and scores. |
| Reporting | `IReportGenerator.generate(run)` | An `IEvalReport` exposing the recorded results. |
| Exporting | `ISuiteExporter.exportSuite(suite, runs)` | A JSON string containing the suite, tests and run/result history. |

The diagram shows public contracts rather than duplicating every interface and its implementation. Namespaces represent logical subsystems, not deployment units or required directory layers. Arrows show structural dependencies; the sequence below shows execution order.

```mermaid
classDiagram
    direction TB

    namespace TestCreation {
        class ITestCaseBuilder {
            <<interface>>
            +withPrompt(prompt: String) ITestCaseBuilder
            +build() ITestCase
        }
        class ITestSuite {
            <<interface>>
            +id: String
            +name: String
            +tests: List~ITestCase~
            +addTest(test: ITestCase)
        }
        class ITestCase {
            <<interface>>
            +id: String
            +prompt: String
            +variables: Map
            +goldenReference: String?
            +rubric: String?
            +expectations: List~Expectation~
        }
        class Expectation {
            <<record>>
            +id: String
            +name: String
            +evaluatorType: String
            +threshold: Number
            +options: Map
        }
    }

    namespace Execution {
        class ModelProvider {
            <<interface>>
            +getModel(modelName: String) Model
        }
        class Model {
            <<interface>>
            +providerName: String
            +modelName: String
            +generateResponse(prompt: String, variables: Map) Promise~String~
        }
        class IEvalRunner {
            <<interface>>
            +run(suite: ITestSuite, model: Model) Promise~IEvalRun~
        }
        class IEvalRun {
            <<interface>>
            +id: String
            +suiteId: String
            +results: List~IEvalResult~
            +addResult(result: IEvalResult)
        }
        class IEvalResult {
            <<interface>>
            +testId: String
            +prompt: String
            +output: String?
            +error: String?
            +passed: Boolean
            +scores: List~EvalScore~
            +addScore(score: EvalScore)
        }
        class EvalScore {
            <<record>>
            +expectationId: String?
            +value: Number?
            +scaleMin: Number?
            +scaleMax: Number?
            +threshold: Number?
            +passed: Boolean?
            +error: String?
        }
    }

    namespace Reporting {
        class IReportGenerator {
            <<interface>>
            +generate(run: IEvalRun) IEvalReport
        }
        class IEvalReport {
            <<interface>>
            +id: String
            +suiteId: String
            +startedAt: DateTime
            +providerName: String
            +modelName: String
            +results: List~ReportResult~
        }
    }

    namespace Exporting {
        class ISuiteExporter {
            <<interface>>
            +exportSuite(suite: ITestSuite, runs: List~IEvalRun~) String
        }
    }

    ITestCaseBuilder ..> ITestCase : builds
    ITestSuite "1" *-- "1..*" ITestCase : tests
    ITestCase "1" *-- "1..*" Expectation : expectations
    IEvalRunner ..> ITestSuite : reads definitions
    ModelProvider ..> Model : supplies selected model
    IEvalRunner ..> Model : generates responses
    IEvalRunner ..> IEvalRun : creates and returns
    IEvalRun "1" *-- "1..*" IEvalResult : results
    IEvalResult "1" *-- "0..*" EvalScore : scores
    IReportGenerator ..> IEvalRun : reads completed results
    IReportGenerator ..> IEvalReport : creates and returns
    IEvalReport "1" *-- "0..*" ReportResult : snapshots
    ISuiteExporter ..> ITestSuite : reads suite and tests
    ISuiteExporter ..> IEvalRun : reads run and result history
```

Concrete domain classes explicitly implement these contracts:

| Public contract | Implementation |
|---|---|
| `ITestCaseBuilder` | `TestCaseBuilder` |
| `ITestSuite` | `TestSuite` |
| `ITestCase` | `TestCase` |
| `IEvalRunner` | `EvalRunner` |
| `IEvalRun` | `EvalRun` |
| `IEvalResult` | `EvalResult` |
| `IReportGenerator` | `ReportGenerator` |
| `IEvalReport` | `EvalReport` |
| `ISuiteExporter` | `JsonSuiteExporter` |

### Responsibilities and dependency direction

- **Test creation:** the builder validates a test and assigns its UUID; `suite.addTest(test)` assembles the suite. `TestCase` defines input and criteria and has no `run` method. This subsystem knows no providers, runners or reports.
- **Execution:** `EvalRunner` coordinates the suite. The application obtains a `Model` through `ModelProvider.getModel(modelName)` and passes it to `run(suite, model)`. For each test the runner awaits the model response, creates an `EvalResult`, awaits every configured evaluator on a successful output, adds the returned scores and stores the result in `EvalRun`. It returns the completed run and knows no report classes. `EvalRun` records execution data and provides `addResult`; it does not execute tests.
- **Reporting:** `ReportGenerator` creates an `EvalReport` from the completed run. The report exposes the recorded results without aggregation. This subsystem knows no runner, builder or provider implementations.
- **Exporting:** `JsonSuiteExporter` reads `ITestSuite` and its related `IEvalRun` objects and returns JSON containing the suite, tests, expectations, runs, results and scores. The caller retrieves the suite and its complete stored run history, which may be empty, and supplies them to `exportSuite`. Exporting is independent of execution and report generation and has no dependency on `EvalRunner` or `ReportGenerator`. The web interface handles downloading the returned JSON.

The application supplies available evaluators to the runner, keyed by evaluator type. An `Expectation` describes a configured check; an `Evaluator` is the algorithm that performs it. The runner selects that algorithm through the `evaluatorType` property. An expectation neither creates nor depends on evaluator implementations. Multiple expectations may use the same evaluator type with different parameters.

Each run also records its start time and provider/model names. It links to the suite through `suiteId`, and each result retains `testId`; neither requires a reference to the live suite or test object. Errors stay in their test's result and do not stop the following tests. A failed execution has no output to evaluate, so it may have no scores.

Each result records the prompt template used at execution time. The report copies run metadata, results and scores into an independent snapshot. It does not retain test versions or all test definition fields.

### Test inputs and expectations

`ITestCase.variables` supplies values for placeholders in the prompt. `goldenReference` is the expected reference answer; `rubric` describes judgment criteria, for example for an LLM judge. The selected model receives the prompt and variables unchanged; its adapter handles variable substitution. Evaluators read the reference and rubric when needed. The builder checks that the selected expectations have their required criteria before creating the test.

`Expectation` is a plain configuration record with these properties:

| Property | Meaning |
|---|---|
| `id` | Stable identifier linking this check to its recorded outcome. |
| `name` | Readable label shown in reports and exports. |
| `evaluatorType` | Key selecting the evaluator algorithm. |
| `threshold` | Required minimum score to pass, on the evaluator's own scale. |
| `options` | Evaluator-specific parameters, such as a JSON schema; an empty map when unnecessary. |

For example:

```json
{
  "id": "EXP-01",
  "name": "Similarity to the reference answer",
  "evaluatorType": "semanticSimilarity",
  "threshold": 0.85,
  "options": {}
}
```

The reference answer and rubric remain on the test; options configure an individual expectation. Scale bounds belong to the returned score, not to the expectation.

### Recorded outcomes and pass/fail

`EvalScore` is also a plain record. The diagram shows a subset of its fields:

| Record | Fields |
|---|---|
| `EvalScore` | Expectation ID and name, evaluator type, value, scale minimum/maximum, applied threshold, pass/fail outcome, feedback and optional error. |

For each expectation, the runner records its ID, name, evaluator type and applied threshold with the outcome. A successful evaluation supplies the numeric value and scale; it passes when `value >= threshold`. An evaluator error produces a failed outcome with an error message and no numeric value or scale. The runner catches that error and continues with the remaining expectations.

A test passes only when execution succeeds and **all its expectations pass**. Every test has at least one expectation. `IEvalResult.passed` is derived from this rule, rather than set independently. A provider error fails the test and leaves its scores empty. A failed expectation never stops the remaining checks or tests.

Reports and JSON exports expose each test's pass/fail outcome and clearly identify every failed expectation by ID, name and evaluator type, with its score and threshold or error message. Recorded labels and thresholds remain available even if the test definition is later edited.

Each expectation outcome retains its own score and scale. The report does not calculate an overall score or aggregate results.

## 2. Application flows

### Execution and reporting

The application is the caller, for example an HTTP handler, not an additional domain class. It first prepares a suite through the creation contracts, then calls execution and reporting separately.

```mermaid
sequenceDiagram
    actor App as Application
    participant Runner as EvalRunner
    participant Provider as ModelProvider
    participant Model
    participant Evaluator
    participant Generator as ReportGenerator

    Note over App: Suite prepared through ITestCaseBuilder and ITestSuite
    App->>Provider: getModel(modelName)
    Provider-->>App: Model
    App->>Runner: await run(suite, model)
    Note over Runner: Create EvalRun
    loop For each test in suite.tests
        Runner->>Model: await generateResponse(test.prompt, test.variables)
        Model-->>Runner: output or execution error
        Note over Runner: Create EvalResult with testId, prompt and output or error
        opt Execution succeeded
            loop For each expectation in test.expectations
                Note over Runner: Select evaluator by expectation.evaluatorType
                Runner->>Evaluator: await evaluate(test, output, expectation)
                Evaluator-->>Runner: EvalScore or evaluation error
                Note over Runner: Record expectation identity, threshold and pass/fail or error
                Note over Runner: result.addScore(score), continue even after failure
            end
        end
        Note over Runner: Test passes only if execution and all expectations pass
        Note over Runner: run.addResult(result)
    end
    Runner-->>App: IEvalRun
    App->>Generator: generate(run)
    Note over Generator: Copy run metadata and results into EvalReport
    Generator-->>App: IEvalReport
```

`EvalRunner` owns the two loops. Its public asynchronous `run` method iterates over tests and delegates each iteration to a private asynchronous `runTest` method. Evaluators receive the test definition, output and expectation, and return `Promise<EvalScore>`; they do not receive or modify an `EvalResult`. The runner awaits each evaluation, records the expectation metadata and applies the threshold rule. Rejected promises are isolated per expectation. Reporting consumes the recorded results without calling the model or repeating individual evaluations.

### Independent export

Export can be requested for an existing suite at any time, including before its first run. It does not require a new execution or report.

```mermaid
sequenceDiagram
    actor App as Application
    participant Exporter as JsonSuiteExporter

    Note over App: Retrieve the suite and its stored run history
    App->>Exporter: exportSuite(suite, runs)
    Note over Exporter: Serialize suite, tests, runs, results and scores
    Exporter-->>App: JSON string
    Note over App: Deliver JSON as a downloadable file
```

## 3. Required patterns

```mermaid
classDiagram
    direction LR

    class ITestCaseBuilder {
        <<interface>>
        +withPrompt(prompt: String) ITestCaseBuilder
        +build() ITestCase
    }
    class TestCaseBuilder
    TestCaseBuilder ..|> ITestCaseBuilder : Builder

    class ModelProvider {
        <<interface>>
        +getModel(modelName: String) Model
    }
    class Model {
        <<interface>>
        +generateResponse(prompt: String, variables: Map) Promise~String~
    }
    class ProviderAdapter {
        +generateResponse(prompt: String, variables: Map) Promise~String~
    }
    class ProviderAPI {
        <<external>>
    }
    ModelProvider ..> Model : supplies selected model
    ProviderAdapter ..|> Model : Adapter
    ProviderAdapter --> ProviderAPI : calls SUT

    class EvalRunner
    EvalRunner ..> Model : calls for each test
    class Evaluator {
        <<interface>>
        +evaluate(test: ITestCase, output: String, expectation: Expectation) Promise~EvalScore~
    }
    class ExactMatchEvaluator
    class SemanticSimilarityEvaluator
    class LlmJudgeEvaluator
    EvalRunner ..> Evaluator : selects by expectation.evaluatorType
    ExactMatchEvaluator ..|> Evaluator : Strategy
    SemanticSimilarityEvaluator ..|> Evaluator : Strategy
    LlmJudgeEvaluator ..|> Evaluator : Strategy

```

- **Builder:** create a valid test before adding it to the suite. Optional setters are omitted; a suite needs no builder of its own.
- **Adapter:** translate the external provider API into `Model`, supplied by `ModelProvider`. The selected model is the **SUT (System Under Test)**. A provider selects a model; it does not forward generation calls.
- **Strategy:** evaluator implementations vary the evaluation algorithm while the runner keeps the same loop. No factory or resolver class is needed.

## Implementation boundaries

Every TypeScript class and every Python domain class must explicitly implement the public contracts required by [AGENTS.md](../AGENTS.md). The table lists the core contracts; strategy and adapter contracts are shown in the pattern view. Plain records are data types. Both languages implement this same model.

The [execution POC](../typescript/src/execution/plan.md) implements a TypeScript-only subset to validate the domain flow: test creation, sequential execution, asynchronous exact-match evaluation and recorded outcomes. Its deterministic provider/model is test support, not an external integration. Python parity and the remaining MVP capabilities are deferred until the experiment is accepted. The POC builder exposes only prompt, golden reference and expectation setters; variables default to an empty map and rubric is optional in the test contract.

Database storage remains required for suites, tests, runs and results. The exporting subsystem owns JSON serialization through `ISuiteExporter`; HTTP delivery, file download, database details and accessors are outside this domain view.
