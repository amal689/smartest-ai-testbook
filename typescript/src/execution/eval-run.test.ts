import assert from 'node:assert/strict';
import test from 'node:test';
import { EvalResult, EvalRun } from './eval-run.js';

test('derives pass/fail from execution and every score', () => {
  const result = new EvalResult('test-1', 'Paris');
  assert.equal(result.passed, false);
  result.addScore({ value: 1, scaleMin: 0, scaleMax: 1, passed: true, feedback: 'Match' });
  assert.equal(result.passed, true);
  result.addScore({ passed: false, feedback: 'Failed', error: 'Evaluation failed' });
  assert.equal(result.passed, false);
  assert.equal(new EvalResult('test-2', undefined, '').passed, false);
});

test('a run records identity, start time and results', () => {
  const run = new EvalRun('suite-1', 'Test provider', 'Test model');
  const result = new EvalResult('test-1', 'Paris');
  run.addResult(result);
  assert.match(run.id, /^[0-9a-f-]{36}$/);
  assert.equal(run.suiteId, 'suite-1');
  assert.equal(run.providerName, 'Test provider');
  assert.equal(run.modelName, 'Test model');
  assert(Number.isFinite(Date.parse(run.startedAt)));
  assert.deepEqual(run.results, [result]);
});
