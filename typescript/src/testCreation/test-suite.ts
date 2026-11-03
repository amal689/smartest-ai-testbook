import { randomUUID } from 'node:crypto';

export interface Expectation {
  id: string;
  name: string;
  evaluatorType: string;
  threshold: number;
  options: Record<string, unknown>;
}

export interface ITestCase {
  readonly id: string;
  readonly prompt: string;
  readonly variables: Record<string, string>;
  readonly goldenReference?: string;
  readonly rubric?: string;
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
