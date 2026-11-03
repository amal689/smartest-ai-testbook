import assert from 'node:assert/strict';
import test from 'node:test';
import { TestCaseBuilder, TestSuite, type Expectation } from './test-suite.js';

const expectation: Expectation = {
  id: 'exact', name: 'Exact answer', evaluatorType: 'exactMatch', threshold: 1, options: {},
};

test('builds a test and adds it to a suite with separate identities', () => {
  const builder = new TestCaseBuilder()
    .withPrompt('Return exactly: Paris')
    .withGoldenReference('Paris')
    .withExpectation(expectation);
  const first = builder.build();
  const second = builder.build();
  const suite = new TestSuite('Basic answers', 'A deterministic example');
  suite.addTest(first);

  assert.match(first.id, /^[0-9a-f-]{36}$/);
  assert.match(suite.id, /^[0-9a-f-]{36}$/);
  assert.notEqual(first.id, second.id);
  assert.equal(first.prompt, 'Return exactly: Paris');
  assert.equal(first.goldenReference, 'Paris');
  assert.deepEqual(first.variables, {});
  assert.deepEqual(first.expectations, [expectation]);
  builder.withExpectation({ ...expectation, id: 'another' });
  assert.equal(first.expectations.length, 1);
  assert.deepEqual(suite.tests, [first]);
});

test('rejects a blank prompt, missing expectations and a missing exact-match reference', () => {
  assert.throws(() => new TestCaseBuilder().withPrompt('  ').build(), /prompt/i);
  assert.throws(() => new TestCaseBuilder().withPrompt('Hello').build(), /expectation/i);
  assert.throws(() => new TestCaseBuilder()
    .withPrompt('Hello').withExpectation(expectation).build(), /golden reference/i);
  assert.doesNotThrow(() => new TestCaseBuilder()
    .withPrompt('Return an empty string').withGoldenReference('')
    .withExpectation(expectation).build());
});
