import { randomUUID } from 'node:crypto';

export interface EvalScore {
  expectationId?: string;
  expectationName?: string;
  evaluatorType?: string;
  threshold?: number;
  value?: number;
  scaleMin?: number;
  scaleMax?: number;
  feedback: string;
  passed: boolean;
  error?: string;
}

export interface IEvalResult {
  readonly testId: string;
  readonly output?: string;
  readonly error?: string;
  readonly scores: EvalScore[];
  readonly passed: boolean;
  addScore(score: EvalScore): void;
}

export interface IEvalRun {
  readonly id: string;
  readonly suiteId: string;
  readonly startedAt: string;
  readonly providerName: string;
  readonly modelName: string;
  readonly results: IEvalResult[];
  addResult(result: IEvalResult): void;
}

export class EvalResult implements IEvalResult {
  readonly scores: EvalScore[] = [];

  constructor(
    readonly testId: string,
    readonly output?: string,
    readonly error?: string,
  ) {}

  addScore(score: EvalScore): void {
    this.scores.push(score);
  }

  get passed(): boolean {
    return this.error === undefined && this.output !== undefined
      && this.scores.length > 0 && this.scores.every(score => score.passed);
  }
}

export class EvalRun implements IEvalRun {
  readonly id = randomUUID();
  readonly startedAt = new Date().toISOString();
  readonly results: IEvalResult[] = [];

  constructor(
    readonly suiteId: string,
    readonly providerName: string,
    readonly modelName: string,
  ) {}

  addResult(result: IEvalResult): void {
    this.results.push(result);
  }
}
