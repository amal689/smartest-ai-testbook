import type { ITestCase, ITestSuite } from '../testCreation/test-suite.js';
import { EvalResult, EvalRun, type IEvalResult, type IEvalRun } from './eval-run.js';
import type { Evaluator } from './exact-match-evaluator.js';
import type { Model } from './model.js';

export interface IEvalRunner {
  run(suite: ITestSuite, model: Model): Promise<IEvalRun>;
}

export class EvalRunner implements IEvalRunner {
  constructor(private readonly evaluators: Readonly<Record<string, Evaluator>>) { }

  async run(suite: ITestSuite, model: Model): Promise<IEvalRun> {
    if (suite.tests.length === 0) throw new Error('Cannot run an empty suite.');
    const run = new EvalRun(suite.id, model.providerName, model.modelName);
    for (const test of suite.tests) {
      const result = await this.runTest(test, model);
      run.addResult(result);
    }
    return run;
  }

  private async runTest(test: ITestCase, model: Model): Promise<IEvalResult> {
    const prompt = test.prompt;
    let output: string;
    try {
      output = await model.generateResponse(prompt, test.variables);
    } catch (error) {
      return new EvalResult(test.id, prompt, undefined, error instanceof Error ? error.message : String(error));
    }

    const result = new EvalResult(test.id, prompt, output);
    for (const expectation of test.expectations) {
      const metadata = {
        expectationId: expectation.id,
        expectationName: expectation.name,
        evaluatorType: expectation.evaluatorType,
        threshold: expectation.threshold,
      };
      try {
        if (!Object.hasOwn(this.evaluators, expectation.evaluatorType)) {
          throw new Error(`Unknown evaluator type: ${expectation.evaluatorType}`);
        }
        const score = await this.evaluators[expectation.evaluatorType].evaluate(test, output, expectation);
        result.addScore({
          ...score, ...metadata,
          passed: score.error === undefined && score.value !== undefined && score.value >= metadata.threshold,
        });
      } catch (error) {
        result.addScore({
          ...metadata, passed: false, feedback: 'Evaluation failed.',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return result;
  }
}
