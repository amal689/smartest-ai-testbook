// Run this example with the following command:
// node --import tsx src/examples/run-suite.ts

import { EvalRunner, type IEvalRunner } from '../execution/eval-runner.js';
import { ExactMatchEvaluator } from '../execution/exact-match-evaluator.js';
import type { ModelProvider } from '../execution/model.js';
import { TestCaseBuilder, TestSuite } from '../testCreation/test-suite.js';

async function main(): Promise<void> {
  const suite = new TestSuite('Basic answers');
  suite.addTest(new TestCaseBuilder()
    .withPrompt('Return exactly: Paris')
    .withGoldenReference('Paris')
    .withExpectation({
      id: 'exact', name: 'Exact answer', evaluatorType: 'exactMatch', threshold: 1, options: {},
    })
    .build());

  // Demonstration provider: no external model is called.
  const provider: ModelProvider = {
    getModel(modelName) {
      return {
        providerName: 'Demo provider', modelName,
        async generateResponse() { return 'Paris'; },
      };
    },
  };

  const runner: IEvalRunner = new EvalRunner({ exactMatch: new ExactMatchEvaluator() });
  const model = provider.getModel('constant-paris');
  const run = await runner.run(suite, model);

  console.log(`Suite: ${suite.name}; model: ${run.providerName}/${run.modelName}`);
  console.table(run.results.map(result => ({
    testId: result.testId,
    output: result.output,
    passed: result.passed,
    score: result.scores[0].value,
  })));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
