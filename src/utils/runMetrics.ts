import * as fs from 'fs';
import * as path from 'path';

export interface RunMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  flakyTests: number;
  skippedTests: number;
  passRatePercent: number;
  lastRunStartTime: string | null;
}

const resultsFilePath = path.resolve(__dirname, '../../test-results/results.json');
const eventLedgerFilePath = path.resolve(__dirname, '../../logs/event-ledger.json');
const bugsFilePath = path.resolve(__dirname, '../../documents/bugs.md');

const emptyMetrics: RunMetrics = {
  totalTests: 0, passedTests: 0, failedTests: 0, flakyTests: 0, skippedTests: 0,
  passRatePercent: 0, lastRunStartTime: null,
};

/**
 * WHAT: Reads aggregate pass/fail metrics from Playwright's native JSON reporter output.
 * WHY: A single canonical stats source, no fragile parsing of the HTML/Allure report internals.
 * HOW: Reads test-results/results.json (configured in playwright.config.ts) and derives a pass rate.
 */
export function readLastRunMetrics(): RunMetrics {
  if (!fs.existsSync(resultsFilePath)) {
    return emptyMetrics;
  }
  try {
    const { stats } = JSON.parse(fs.readFileSync(resultsFilePath, 'utf-8'));
    const totalTests = stats.expected + stats.unexpected + stats.flaky + stats.skipped;
    const passRatePercent = totalTests > 0 ? Math.round((stats.expected / totalTests) * 100) : 0;

    return {
      totalTests,
      passedTests: stats.expected,
      failedTests: stats.unexpected,
      flakyTests: stats.flaky,
      skippedTests: stats.skipped,
      passRatePercent,
      lastRunStartTime: stats.startTime,
    };
  } catch {
    return emptyMetrics;
  }
}

/**
 * WHAT: Counts self-healing resolutions recorded in the tamper-evident event ledger.
 * WHY: Surfaces SANJEEV's auto-recovery activity as a first-class telemetry metric.
 * HOW: Filters ledger entries by actionType.
 */
export function readHealedEventCount(): number {
  if (!fs.existsSync(eventLedgerFilePath)) {
    return 0;
  }
  try {
    const events: Array<{ actionType: string }> = JSON.parse(fs.readFileSync(eventLedgerFilePath, 'utf-8'));
    return events.filter(event => event.actionType === 'SELF_HEALING_LOCATOR_RESOLUTION').length;
  } catch {
    return 0;
  }
}

/**
 * WHAT: Counts bugs in documents/bugs.md whose Current Status is not "Verified Fixed".
 * WHY: Surfaces outstanding defects as a first-class telemetry metric alongside test health.
 * HOW: Parses the executive-summary table's Current Status column (bug tracking in this
 *      codebase is not yet project-scoped, so this is a whole-suite total, not per-project).
 */
export function readOpenBugsCount(): number {
  if (!fs.existsSync(bugsFilePath)) {
    return 0;
  }
  try {
    const rows = fs.readFileSync(bugsFilePath, 'utf-8')
      .split('\n')
      .filter(line => /^\|\s*BUG-\d+\s*\|/.test(line));
    return rows.filter(row => {
      const cells = row.split('|').map(cell => cell.trim());
      const status = cells[cells.length - 3];
      return status !== 'Verified Fixed';
    }).length;
  } catch {
    return 0;
  }
}
