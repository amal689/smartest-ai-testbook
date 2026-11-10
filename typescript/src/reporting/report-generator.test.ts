import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EvalResult, EvalRun } from '../execution/eval-run.js';
import { ReportGenerator } from './report-generator.js';

test('report preserves the run, outcomes and errors without aggregation', () => {
  const run = new EvalRun('suite', 'provider', 'model');
  const passed = new EvalResult('passed', 'original prompt', 'answer');
  passed.addScore({ feedback: 'ok', passed: true, value: 1, scaleMin: 0, scaleMax: 1 });
  const failed = new EvalResult('failed', 'prompt', 'answer');
  failed.addScore({ expectationId: 'exp', expectationName: 'check', evaluatorType: 'exact', threshold: 1, value: 0, scaleMin: 0, scaleMax: 1, feedback: 'mismatch', passed: false });
  const error = new EvalResult('error', 'prompt', undefined, 'provider failed');
  run.addResult(passed);
  run.addResult(failed);
  run.addResult(error);

  const report = new ReportGenerator().generate(run);
  assert.notStrictEqual(report.results, run.results);
  assert.deepEqual(report.results.map(result => result.passed), [true, false, false]);
  assert.equal(report.results[1]?.scores[0]?.expectationName, 'check');
  assert.equal(report.results[2]?.error, 'provider failed');
  run.results[0]!.scores[0]!.feedback = 'changed';
  run.addResult(new EvalResult('later', 'prompt'));
  assert.equal(report.results.length, 3);
  assert.equal(report.results[0]?.prompt, 'original prompt');
  assert.equal(report.results[0]?.scores[0]?.feedback, 'ok');
});

test('report preserves an empty run', () => {
  const run = new EvalRun('suite', 'provider', 'model');
  assert.deepEqual(new ReportGenerator().generate(run).results, []);
  assert.deepEqual(run.results, []);
});
