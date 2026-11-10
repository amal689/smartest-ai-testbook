import type { IEvalRun } from '../execution/eval-run.js';
import { EvalReport, type IEvalReport } from './eval-report.js';

export interface IReportGenerator {
  generate(run: IEvalRun): IEvalReport;
}

export class ReportGenerator implements IReportGenerator {
  generate(run: IEvalRun): IEvalReport {
    return new EvalReport(run);
  }
}
