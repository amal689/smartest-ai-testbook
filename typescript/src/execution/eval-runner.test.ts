import assert from 'node:assert/strict';
import test from 'node:test';
import { TestCaseBuilder, TestSuite, type Expectation } from '../testCreation/test-suite.js';
import { EvalRunner } from './eval-runner.js';
import { ExactMatchEvaluator, type Evaluator } from './exact-match-evaluator.js';
import type { Model, ModelProvider } from './model.js';

const exact: Expectation = {
  id: 'exact', name: 'Exact answer', evaluatorType: 'exactMatch', threshold: 1, options: {},
};

function basicTest(prompt = 'Return exactly: Paris', expectations = [exact]) {
  const builder = new TestCaseBuilder().withPrompt(prompt).withGoldenReference('Paris');
  for (const expectation of expectations) builder.withExpectation(expectation);
  return builder.build();
}

const provider: ModelProvider = {
  getModel(modelName): Model {
    return {
      providerName: 'Deterministic provider', modelName,
      async generateResponse() { return 'Paris'; },
    };
  },
};

function runner() {
  return new EvalRunner({ exactMatch: new ExactMatchEvaluator() });
}

test('executes the basic example with a model supplied by a provider', async () => {
  const suite = new TestSuite('Basic answers');
  const definition = basicTest();
  suite.addTest(definition);
  const run = await runner().run(suite, provider.getModel('constant-paris'));

  assert.equal(run.suiteId, suite.id);
  assert.equal(run.providerName, 'Deterministic provider');
  assert.equal(run.modelName, 'constant-paris');
  assert.equal(run.results.length, 1);
  const result = run.results[0];
  assert.equal(result.testId, definition.id);
  assert.equal(result.output, 'Paris');
  assert.equal(result.error, undefined);
  assert.equal(result.passed, true);
  assert.equal(result.scores.length, 1);
  const { feedback, ...score } = result.scores[0];
  assert(feedback.trim().length > 0);
  assert.deepEqual(score, {
    expectationId: 'exact', expectationName: 'Exact answer', evaluatorType: 'exactMatch',
    threshold: 1, value: 1, scaleMin: 0, scaleMax: 1, passed: true,
  });

  definition.expectations[0] = { ...exact, name: 'Edited', threshold: 0 };
  assert.equal(result.scores[0].expectationName, 'Exact answer');
  assert.equal(result.scores[0].threshold, 1);
});

test('a mismatch fails its expectation without stopping the remaining checks', async () => {
  const suite = new TestSuite('Thresholds');
  suite.addTest(basicTest('Return exactly: Paris', [exact, { ...exact, id: 'zero', threshold: 0 }]));
  const model = { ...provider.getModel('mismatch'), async generateResponse() { return 'paris '; } };
  const run = await runner().run(suite, model);
  const result = run.results[0];
  assert.equal(result.output, 'paris ');
  assert.equal(result.passed, false);
  assert.deepEqual(result.scores.map(score => [score.value, score.passed]), [[0, false], [0, true]]);
});

test('runs tests sequentially once each and forwards prompts and variables unchanged', async () => {
  const suite = new TestSuite('Ordered answers');
  const first = basicTest('Return {{city}}');
  first.variables.city = 'Paris';
  const second = basicTest('Then return Paris');
  suite.addTest(first);
  suite.addTest(second);
  const events: string[] = [];
  const model: Model = {
    ...provider.getModel('ordered'),
    async generateResponse(prompt, variables) {
      events.push(`start: ${prompt}`);
      assert.deepEqual(variables, prompt === first.prompt ? first.variables : second.variables);
      await new Promise<void>(resolve => setImmediate(resolve));
      events.push(`end: ${prompt}`);
      return 'Paris';
    },
  };
  const run = await runner().run(suite, model);
  assert.deepEqual(events, [
    `start: ${first.prompt}`, `end: ${first.prompt}`,
    `start: ${second.prompt}`, `end: ${second.prompt}`,
  ]);
  assert.deepEqual(run.results.map(result => result.testId), [first.id, second.id]);
  assert(run.results.every(result => result.passed));
});

test('records model errors and continues with the following test', async () => {
  for (const failure of [new Error('Model unavailable'), 'Model unavailable']) {
    const suite = new TestSuite('Error isolation');
    suite.addTest(basicTest('Fail'));
    suite.addTest(basicTest('Succeed'));
    const model: Model = {
      ...provider.getModel('fallible'),
      async generateResponse(prompt) {
        if (prompt === 'Fail') throw failure;
        return 'Paris';
      },
    };
    const run = await runner().run(suite, model);
    const [failed, succeeded] = run.results;
    assert.equal(failed.testId, suite.tests[0].id);
    assert.equal(failed.error, 'Model unavailable');
    assert.equal(failed.output, undefined);
    assert.deepEqual(failed.scores, []);
    assert.equal(failed.passed, false);
    assert.equal(succeeded.passed, true);
  }
});

test('records unknown evaluators and rejected evaluations, then continues', async () => {
  const rejecting: Evaluator = {
    async evaluate() { throw new Error('Judge unavailable'); },
  };
  for (const evaluatorType of ['unknown', 'rejecting', 'toString']) {
    const suite = new TestSuite('Evaluation isolation');
    suite.addTest(basicTest('Paris', [{ ...exact, id: 'failed', evaluatorType }, exact]));
    const run = await new EvalRunner({ exactMatch: new ExactMatchEvaluator(), rejecting })
      .run(suite, provider.getModel('constant-paris'));
    const result = run.results[0];
    assert.equal(result.output, 'Paris');
    assert.equal(result.error, undefined);
    assert.equal(result.passed, false);
    assert.equal(result.scores.length, 2);
    const failed = result.scores[0];
    assert.equal(failed.expectationId, 'failed');
    assert.equal(failed.expectationName, exact.name);
    assert.equal(failed.evaluatorType, evaluatorType);
    assert.equal(failed.threshold, 1);
    assert.equal(failed.passed, false);
    assert.equal(failed.error, evaluatorType === 'rejecting'
      ? 'Judge unavailable' : `Unknown evaluator type: ${evaluatorType}`);
    assert.equal(failed.value, undefined);
    assert.equal(failed.scaleMin, undefined);
    assert.equal(failed.scaleMax, undefined);
    assert.equal(result.scores[1].passed, true);
  }
});

test('awaits evaluations and applies the configured threshold to their values', async () => {
  let finished = false;
  const delayed: Evaluator = {
    async evaluate() {
      await new Promise<void>(resolve => setImmediate(resolve));
      finished = true;
      return { value: 0.5, scaleMin: 0, scaleMax: 1, passed: true, feedback: 'Partial match' };
    },
  };
  const suite = new TestSuite('Async evaluations');
  suite.addTest(basicTest('Paris', [{ ...exact, evaluatorType: 'delayed', threshold: 0.75 }]));
  const run = await new EvalRunner({ delayed }).run(suite, provider.getModel('constant-paris'));
  assert.equal(finished, true);
  assert.equal(run.results[0].scores[0].value, 0.5);
  assert.equal(run.results[0].scores[0].passed, false);
  assert.equal(run.results[0].passed, false);
});

test('rejects an empty suite before calling the model', async () => {
  const model: Model = {
    ...provider.getModel('unused'),
    async generateResponse() { assert.fail('The model must not be called'); },
  };
  await assert.rejects(runner().run(new TestSuite('Empty'), model), /empty suite/i);
});
