# Minimal Test and Report Examples

These examples show the data needed to define tests and review a run. Test IDs remain stable; the system allows test contents to be edited but does not manage versions or prompt snapshots.

## `TestCase` examples

| ID | Prompt and variables | Expected criterion | Configured evaluation |
|---|---|---|---|
| **TC-01** | Prompt: “Answer the question `{{query}}` using only `{{context}}`.” Query: “How can I reset my password?” Context: “Go to Settings > Security and click Reset.” | State `Settings > Security` and `Reset` without adding information absent from the context. | `ExactMatchEvaluator`, scale 0–1, threshold 1; `SemanticSimilarityEvaluator`, scale 0–1, threshold 0.85. |
| **TC-02** | Prompt: “Extract valid JSON from `{{email_text}}` with name, email, and amount.” Email: “I am Mario Rossi (mario@test.it) and request a refund of 150 euros.” | `{"name":"Mario Rossi","email":"mario@test.it","amount":150}` | `ExactMatchEvaluator` with a JSON schema, scale 0–1, threshold 1. |
| **TC-03** | Prompt: “Respond with empathy and professionalism to a customer whose package is three days late.” | Apologize clearly, use a professional tone, and offer assistance; do not promise compensation not authorized by the prompt. | `LlmJudgeEvaluator`, scale 1–5, threshold 4. |
| **TC-04** | Prompt: “What is the phone number of OpenAI’s CEO?” | Say the number is unknown; do not invent one. | `LlmJudgeEvaluator` for hallucination detection, scale 1–5, threshold 4. |

Scales remain attached to individual scores: a value of `0.9` on a 0–1 scale must not be confused with `0.9` on another scale. Pass/fail is derived by comparing the score with its configured threshold.

## Short example of an LLM judge prompt

```text
Evaluate the model response using the supplied rubric.
Assign an integer from 1 to 5 and provide brief feedback.
Evaluate only the requested criterion; do not reward unsupported claims.
Return JSON: {"score": 1, "feedback": "..."}
```

For TC-03, for example, `5` means the response is very empathetic, apologizes clearly, uses a professional tone, and offers practical assistance; `1` means it is rude or ignores the issue.

## Run report format

`EvalReport` shows a run summary and one row per test. When a test uses multiple evaluators, its row lists every score, scale, threshold, and outcome.

| Test ID | Generated output | Score per evaluator | Outcome | Feedback |
|---|---|---|---|---|
| **TC-01** | “Go to Settings > Security and press Reset.” | Exact Match `1/1`; Similarity `0.92/1.00` (threshold `0.85`) | PASS | Includes the requested steps and exceeds the semantic threshold. |
| **TC-02** | `{"name":"Mario Rossi","amount":"150€"}` | Exact Match `0/1` (threshold `1`) | FAIL | `email` is missing; `amount` has the wrong type. |
| **TC-03** | “We are sorry for the delay. We understand the inconvenience and are happy to help.” | LLM Judge `4/5` (threshold `4`) | PASS | Empathetic and professional, with an offer of assistance. |
| **TC-04** | “You can reach him at +1-555-0199.” | LLM Judge `1/5` (threshold `4`) | FAIL | The response invents a phone number. |

The report also includes the run ID, suite, date/time, provider/model, counts of passed and failed tests, and the overall score. `OverallScoreEvaluator` produces the overall score; its formula is not defined by these examples.

## MVP history limitation

Runs and results are saved and exported with the stable `TestCase` ID. If a test is edited, the system does not retain the previous prompt: a historical report keeps recorded outputs and evaluations but cannot reconstruct the exact input used by an earlier run.
