import { randomUUID } from 'node:crypto';

export interface Expectation {
  /** Stable identifier used to link this check to its recorded score. */
  id: string;
  /** Human-readable label shown when reviewing the result. */
  name: string;
  /** Key that selects the evaluator algorithm for this check. */
  evaluatorType: string;
  /** Minimum score required to pass, on the evaluator's scale. */
  threshold: number;
  /** Evaluator-specific settings, such as a JSON schema. */
  options: Record<string, unknown>;
}

export interface ITestCase {
  /** Stable identifier used to associate the test with its results. */
  readonly id: string;
  /** Instruction sent to the model, potentially containing placeholders. */
  readonly prompt: string;
  /** Named values supplied for placeholders in the prompt. */
  readonly variables: Record<string, string>;
  /** Optional reference answer used by evaluators for comparison. */
  readonly goldenReference?: string;
  /** Optional criteria used by evaluators to judge the response. */
  readonly rubric?: string;
  /** Checks configured to evaluate the model response. */
  readonly expectations: Expectation[];
}

export interface ITestSuite {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tests: ITestCase[];
  addTest(test: ITestCase): void;
}

export interface ITestCaseBuilder {
  withPrompt(prompt: string): ITestCaseBuilder;
  withGoldenReference(reference: string): ITestCaseBuilder;
  withExpectation(expectation: Expectation): ITestCaseBuilder;
  build(): ITestCase;
}

class TestCase implements ITestCase {
  readonly id = randomUUID();
  readonly variables: Record<string, string> = {};

  constructor(
    readonly prompt: string,
    readonly goldenReference: string | undefined,
    readonly expectations: Expectation[],
  ) {}
}

export class TestCaseBuilder implements ITestCaseBuilder {
  private prompt = '';
  private goldenReference: string | undefined;
  private expectations: Expectation[] = [];

  withPrompt(prompt: string): ITestCaseBuilder {
    this.prompt = prompt;
    return this;
  }

  withGoldenReference(reference: string): ITestCaseBuilder {
    this.goldenReference = reference;
    return this;
  }

  withExpectation(expectation: Expectation): ITestCaseBuilder {
    this.expectations.push(expectation);
    return this;
  }

  build(): ITestCase {
    if (!this.prompt.trim()) throw new Error('A test needs a prompt.');
    if (this.expectations.length === 0) throw new Error('A test needs an expectation.');
    if (this.expectations.some(item => item.evaluatorType === 'exactMatch')
      && this.goldenReference === undefined) {
      throw new Error('Exact match needs a golden reference.');
    }
    return new TestCase(this.prompt, this.goldenReference, [...this.expectations]);
  }
}

export class TestSuite implements ITestSuite {
  readonly id = randomUUID();
  readonly tests: ITestCase[] = [];

  constructor(readonly name: string, readonly description = '') {}

  addTest(test: ITestCase): void {
    this.tests.push(test);
  }
}
