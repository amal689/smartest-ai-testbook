import type { Expectation, ITestCase } from '../testCreation/test-suite.js';
import type { EvalScore } from './eval-run.js';

export interface Evaluator {
  evaluate(test: ITestCase, output: string, expectation: Expectation): Promise<EvalScore>;
}

export class ExactMatchEvaluator implements Evaluator {
  async evaluate(test: ITestCase, output: string, expectation: Expectation): Promise<EvalScore> {
    const value = output === test.goldenReference ? 1 : 0;
    return {
      value, scaleMin: 0, scaleMax: 1, passed: value >= expectation.threshold,
      feedback: value === 1
        ? 'Output matches the golden reference.'
        : 'Output does not match the golden reference.',
    };
  }
}
