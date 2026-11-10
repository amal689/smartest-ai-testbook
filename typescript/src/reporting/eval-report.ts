import type { EvalScore, IEvalRun } from '../execution/eval-run.js';

export interface ReportResult {
  readonly testId: string;
  readonly prompt: string;
  readonly output: string | undefined;
  readonly error: string | undefined;
  readonly passed: boolean;
  readonly scores: ReadonlyArray<Readonly<EvalScore>>;
}

export interface IEvalReport {
  readonly id: string;
  readonly suiteId: string;
  readonly startedAt: string;
  readonly providerName: string;
  readonly modelName: string;
  readonly results: ReadonlyArray<ReportResult>;
}

export class EvalReport implements IEvalReport {
  readonly id: string;
  readonly suiteId: string;
  readonly startedAt: string;
  readonly providerName: string;
  readonly modelName: string;
  readonly results: ReadonlyArray<ReportResult>;

  constructor(run: IEvalRun) {
    this.id = run.id;
    this.suiteId = run.suiteId;
    this.startedAt = run.startedAt;
    this.providerName = run.providerName;
    this.modelName = run.modelName;
    this.results = run.results.map(result => ({
      testId: result.testId,
      prompt: result.prompt,
      output: result.output,
      error: result.error,
      passed: result.passed,
      scores: result.scores.map(score => ({ ...score })),
    }));
  }
}
