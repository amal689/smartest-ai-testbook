# Implementation plan: minimal execution POC

## Goal and scope

Validate this flow with the smallest understandable TypeScript implementation:

`TestSuite → EvalRunner.run(suite, model) → EvalRun`

The runner iterates over the suite and delegates each iteration to `runTest(test, model)`. One exact-match check is enough to demonstrate that a generated response can be evaluated and recorded.

The TypeScript POC is implemented. The reference is the [domain design](../../../doc/domain-design.md), especially the execution contracts, responsibilities and error-isolation rules, together with the [requirements](../../../doc/requirements.md) and [project rules](../../../AGENTS.md).

The checkout had no domain implementations when this plan was written. The POC defines the minimum inputs in [test-suite.ts](../testCreation/test-suite.ts).

The requested scope is a TypeScript experiment. Python parity is deferred until the experiment is accepted; this does not claim completion of the shared feature. Do not implement the remaining MVP or settle the final architecture as part of this experiment.

## Smallest useful example

- Suite: “Basic answers”.
- Test: prompt “Return exactly: Paris”, golden reference “Paris”.
- Expectation: type `exactMatch`, threshold `1`, empty options.
- Selected model: a deterministic test double that returns “Paris”.
- Outcome: one run with one result, output “Paris”, score `1` on scale `0..1`, and `passed = true`.

The test double validates the execution and evaluation flow. It does not validate an external LLM integration. No SDK, credentials or network access are needed for this first experiment.

## Contracts and responsibilities

### Suite and test inputs

Define these in the test-creation subsystem, not as execution-owned copies:

| Contract | Minimum data or operation |
|---|---|
| `ITestSuite` | `id`, `name`, `description`, `tests: ITestCase[]`, `addTest(test)` |
| `ITestCase` | `id`, `prompt`, `variables: Record<string, string>`, optional `goldenReference` and `rubric`, `expectations: Expectation[]` |
| `Expectation` | Plain record: `id`, `name`, `evaluatorType`, `threshold`, `options: Record<string, unknown>` |
| `ITestCaseBuilder` | `withPrompt`, `withGoldenReference`, `withExpectation`, `build` for the example |

Use `TestSuite implements ITestSuite`, `TestCase implements ITestCase` and `TestCaseBuilder implements ITestCaseBuilder`. Keep `TestCase` internal to the module and create it through the builder, as specified by the design. The builder assigns a UUID and rejects an empty prompt, missing expectations or a missing golden reference for an exact-match check. Default variables to `{}`; no template parser or optional builder setters are needed for the first example.

The suite owns its UUID and appends tests through `addTest`. The runner rejects an empty suite before starting; no separate readiness service is needed.

### Model selected by a provider

Implemented public signatures:

```typescript
interface Model {
  readonly providerName: string;
  readonly modelName: string;
  generateResponse(
    prompt: string,
    variables: Readonly<Record<string, string>>,
  ): Promise<string>;
}

interface ModelProvider {
  getModel(modelName: string): Model;
}

interface IEvalRunner {
  run(suite: ITestSuite, model: Model): Promise<IEvalRun>;
}
```

The caller obtains the model once with `provider.getModel(name)` and passes it to the runner. `Model` represents an already selected SUT; `ModelProvider` supplies that selection. The runner neither selects a provider nor creates a model.

This refines the original design, where `ModelProvider` itself exposed `generateResponse` and was passed to `run`. The domain design now records the distinction. Generation belongs to `Model`; the provider has no forwarding generation method. A future external adapter can implement `Model` directly. For this experiment, structural object literals in the tests implement both contracts; no production provider factory, catalog or adapter class is necessary.

Generation receives prompt and variables unchanged. Variable substitution belongs to the model adapter; the initial demonstration uses no placeholders.

### Recorded outcomes

- `EvalRun implements IEvalRun`: UUID `id`, `suiteId`, `startedAt` as an ISO timestamp, `providerName`, `modelName`, `results`, and `addResult(result)`.
- `EvalResult implements IEvalResult`: `testId`, optional `output`, optional `error`, `scores`, `addScore(score)`, and a derived `passed` getter.
- `EvalScore`: plain record with expectation ID/name/type, applied threshold, optional numeric value and scale bounds, feedback, pass/fail and optional error. Keep expectation fields optional in the shared record as specified for future overall scores, but always populate them for individual outcomes.

Record IDs, labels and thresholds at execution time. Do not retain live test/suite references or introduce prompt snapshots. A result passes only if generation succeeded, it has at least one score, and every score passed.

### One evaluator

Keep the documented Strategy boundary with `Evaluator` and `ExactMatchEvaluator implements Evaluator`. The contract is asynchronous from the start: `evaluate(test, output, expectation): Promise<EvalScore>`. `ExactMatchEvaluator` implements it with an `async` method: strict string equality with `goldenReference` gives `1`, otherwise `0`, on scale `0..1`. No trimming, case folding, semantic similarity or schema validation.

Supply the runner with the available evaluator keyed by `exactMatch`, using a plain object. No registry class, resolver or factory. The runner records expectation metadata and derives score pass/fail using `value >= threshold`. An unsupported evaluator type is recorded as an evaluation error, never silently skipped.

## The two execution operations

Use `EvalRunner implements IEvalRunner` to preserve the documented domain responsibility. The requested functions are methods of that class; a standalone wrapper would add no behavior.

**`run(suite, model): Promise<IEvalRun>`**

1. Reject an empty suite, then create `EvalRun` with suite and model metadata.
2. Use a sequential `for...of` over `suite.tests`.
3. For each test, await `runTest(test, model)` and call `run.addResult(result)`.
4. Return the completed run.

**`private runTest(test, model): Promise<IEvalResult>`**

1. Await `model.generateResponse(test.prompt, test.variables)`.
2. On generation failure, return a result containing `testId`, an error message, no output and no scores. Preserve a useful message even if the thrown value is not an `Error`.
3. On success, create a result containing the output, then iterate over its expectations.
4. Select the evaluator and await `evaluate(test, output, expectation)`; record its score with the expectation metadata and threshold outcome.
5. Catch each evaluation failure separately and add a failed score with its error and no numeric value or scale. Continue the remaining expectations.
6. Return the result. The result getter derives the test outcome.

Keep the generation catch separate from evaluation catches: evaluation errors must not be mistaken for model errors. A failed score must not interrupt the expectation loop or the suite loop. No concurrency, retries, cancellation, event bus or additional orchestration layer.

## Ordered implementation tasks

Use this single checklist for the experiment; do not create duplicate planning artifacts. Paths below are relative to this document. Each task depends on the preceding task.

### 1. Establish the minimum inputs and result objects

**Files:** `../testCreation/test-suite.ts`, `model.ts`, `eval-run.ts` (contracts and their small implementations may share a module).

- [x] Implement only the input and outcome contracts described above, with explicit `implements` on every class.
- [x] Verify that the builder creates the example test, rejects invalid exact-match inputs, and that the suite accepts it.
- [x] Verify result pass/fail for successful scores, failed scores and generation errors; `npm run typecheck` passes from `typescript/`.

Focused checks are in [test-suite.test.ts](../testCreation/test-suite.test.ts) and [eval-run.test.ts](./eval-run.test.ts).

### 2. Complete the execution slice

**Files:** `exact-match-evaluator.ts`, `eval-runner.ts`, `eval-runner.test.ts`.

- [x] Implement the asynchronous evaluator contract and the two runner methods, awaiting every evaluation, with no extra domain services.
- [x] Add a deterministic provider/model test double and execute the one-test example through `provider.getModel(name)` and `runner.run(suite, model)`.
- [x] Assert suite/test IDs, model/provider names, start time, output, score metadata and final pass/fail. Run `node --import tsx --test src/execution/eval-runner.test.ts` from `typescript/`.

**Checkpoint:** the example returns a readable, completed `EvalRun` without external services. Inspect the object through the test; a CLI or HTTP endpoint is unnecessary.

### 3. Verify isolation and record the experiment's conclusion

**Files:** the same test module and the shared domain-design document.

- [x] Cover a mismatch, two tests executed in suite order, and a model failure on the first test followed by a successful second test. Assert that prompt and variables reach the model unchanged and each test is called once.
- [x] Cover an unsupported expectation and a rejected evaluator promise, each followed by a valid expectation on the same test: both scores are recorded and the test fails. Verify that delayed evaluations complete before the run returns. Cover empty-suite rejection.
- [x] Reconcile the provider/model distinction in the domain design without expanding the POC; run `npm test` and `npm run typecheck` from `typescript/`.

**Decision checkpoint:** inspect whether the returned run identifies the test and model, records what came back and explains which check failed and why, and whether the two-method execution flow is easy to explain in class. Prompts remain in the test definitions, not in historical snapshots. If useful, plan equivalent Python behavior next, followed by one real model adapter. Reconsider the domain before expanding it if the experiment exposes unclear responsibilities.

## Verification and experiment outcome

The automated checks demonstrate the complete deterministic flow, exact-match scoring, sequential execution, awaited evaluations and error isolation. `npm test` passes all 12 tests, including the existing HTTP health test; `npm run typecheck` passes. Inverting the runner's threshold comparison makes six execution tests fail; the correct comparison was restored before final verification.

The runnable example is the first test in [eval-runner.test.ts](./eval-runner.test.ts). The POC records sufficient result metadata to inspect success and failure without introducing reporting or persistence. Whether this domain is suitable for the teaching exercise remains the user's decision; neither a Python port nor an external model adapter has been implemented.

## Explicit exclusions and limits

Database storage, reporting, overall scoring, JSON export, web changes, other evaluator strategies, real provider integration and a definitive architecture are outside this experiment. They remain part of the broader MVP where specified. The deterministic model establishes domain-flow correctness only; external API behavior and LLM answer quality remain unverified.
