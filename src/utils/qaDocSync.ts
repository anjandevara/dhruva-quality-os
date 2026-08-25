import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

interface SectionBounds {
  start: number;
  end: number;
}

/**
 * WHAT: Synchronizes documents/bugs.md and documents/recommendations.md with real test outcomes.
 * WHY: Managed by LEKHA (Auditor-Agent) - QA documentation must reflect verified reality,
 *      not manually-typed claims that drift from what automation actually proved.
 * HOW: Locates the markdown section and executive-summary table row for an ID and rewrites them in place.
 */
export class QaDocSync {
  private static readonly bugsFilePath = path.resolve(__dirname, '../../documents/bugs.md');
  private static readonly recommendationsFilePath = path.resolve(__dirname, '../../documents/recommendations.md');

  static syncBugStatus(bugId: string, testStatus: 'PASSED' | 'FAILED', commitSha: string): boolean {
    const lines = fs.readFileSync(this.bugsFilePath, 'utf-8').split('\n');
    const bounds = this.findSectionBounds(lines, bugId);
    if (!bounds) {
      Logger.info(`QaDocSync: bug [${bugId}] not found in documents/bugs.md`);
      return false;
    }

    const currentStatus = this.readCurrentStatus(lines, bounds);
    const newStatus = this.resolveBugStatusTransition(testStatus, currentStatus);
    if (!newStatus) {
      Logger.info(`QaDocSync: no transition for [${bugId}] (status: ${currentStatus}, testStatus: ${testStatus})`);
      return false;
    }

    this.applyBugTransition(lines, bounds, bugId, newStatus, testStatus, commitSha);
    fs.writeFileSync(this.bugsFilePath, lines.join('\n'), 'utf-8');
    Logger.info(`QaDocSync: [${bugId}] status updated to [${newStatus}]`);
    return true;
  }

  static syncRecommendationStatus(recId: string, isImplemented: boolean): boolean {
    if (!isImplemented) {
      Logger.info(`QaDocSync: [${recId}] not marked implemented, no transition applied`);
      return false;
    }

    const lines = fs.readFileSync(this.recommendationsFilePath, 'utf-8').split('\n');
    const bounds = this.findSectionBounds(lines, recId);
    if (!bounds) {
      Logger.info(`QaDocSync: recommendation [${recId}] not found in documents/recommendations.md`);
      return false;
    }

    const newStatus = 'Implemented by Developers & Automated';
    this.updateCurrentStatusField(lines, bounds, newStatus);
    this.updateExecutiveSummaryRow(lines, recId, [newStatus]);
    fs.writeFileSync(this.recommendationsFilePath, lines.join('\n'), 'utf-8');
    Logger.info(`QaDocSync: [${recId}] status updated to [${newStatus}]`);
    return true;
  }

  private static resolveBugStatusTransition(testStatus: 'PASSED' | 'FAILED', currentStatus: string): string | null {
    if (testStatus === 'PASSED' && currentStatus === 'Open') {
      return 'Verified Fixed';
    }
    if (testStatus === 'FAILED' && currentStatus === 'Verified Fixed') {
      return 'Reopened';
    }
    return null;
  }

  private static applyBugTransition(
    lines: string[],
    bounds: SectionBounds,
    bugId: string,
    newStatus: string,
    testStatus: 'PASSED' | 'FAILED',
    commitSha: string
  ): void {
    const today = new Date().toISOString().substring(0, 10);
    this.updateCurrentStatusField(lines, bounds, newStatus);
    this.updateExecutiveSummaryRow(lines, bugId, [newStatus, today]);

    const outcome = testStatus === 'PASSED'
      ? 'Test passed. Verified by DHRUVA automated test runner.'
      : 'Regression detected. Automated test failed after prior verification; status reopened by DHRUVA automated test runner.';

    this.appendVerificationHistoryEntry(lines, bounds, [
      `* Date: ${today}`,
      `* Commit SHA: ${commitSha}`,
      `* Outcome: ${outcome}`,
    ]);
  }

  /**
   * WHAT: Finds the line range of a "## <ID>: ..." section, up to the next "## " heading or EOF.
   * WHY: Shared by both bug and recommendation documents, which use the same section layout.
   * HOW: Scans for the heading line, then the next top-level heading after it.
   */
  private static findSectionBounds(lines: string[], recordId: string): SectionBounds | null {
    const start = lines.findIndex(line => line.trim().startsWith(`## ${recordId}:`));
    if (start === -1) {
      return null;
    }
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith('## ')) {
        end = i;
        break;
      }
    }
    return { start, end };
  }

  private static readCurrentStatus(lines: string[], bounds: SectionBounds): string {
    for (let i = bounds.start; i < bounds.end; i++) {
      if (lines[i].trim().startsWith('* **Current Status**:')) {
        return lines[i].split(':').slice(1).join(':').trim();
      }
    }
    return '';
  }

  private static updateCurrentStatusField(lines: string[], bounds: SectionBounds, newStatus: string): void {
    for (let i = bounds.start; i < bounds.end; i++) {
      if (lines[i].trim().startsWith('* **Current Status**:')) {
        lines[i] = `* **Current Status**: ${newStatus}`;
        return;
      }
    }
  }

  /**
   * WHAT: Replaces the trailing cells of a "| <ID> | ... |" executive-summary table row.
   * WHY: The table and the per-record section must stay in sync as a single source of truth.
   * HOW: Splits the row on "|" and overwrites the last N cells (excluding the trailing empty cell).
   */
  private static updateExecutiveSummaryRow(lines: string[], recordId: string, trailingValues: string[]): void {
    const rowIndex = lines.findIndex(line => line.trim().startsWith(`| ${recordId} |`));
    if (rowIndex === -1) {
      return;
    }
    const cells = lines[rowIndex].split('|');
    trailingValues.forEach((value, offset) => {
      const cellIndex = cells.length - 1 - trailingValues.length + offset;
      cells[cellIndex] = ` ${value} `;
    });
    lines[rowIndex] = cells.join('|');
  }

  private static appendVerificationHistoryEntry(lines: string[], bounds: SectionBounds, entryLines: string[]): void {
    const historyHeadingIndex = this.findHistoryHeadingIndex(lines, bounds);
    if (historyHeadingIndex === -1) {
      const needsLeadingBlank = bounds.end > 0 && lines[bounds.end - 1].trim() !== '';
      const leadingBlank = needsLeadingBlank ? [''] : [];
      lines.splice(bounds.end, 0, ...leadingBlank, '### Verification History', ...entryLines);
      return;
    }

    let insertAt = bounds.end;
    for (let i = historyHeadingIndex + 1; i < bounds.end; i++) {
      if (lines[i].trim().startsWith('### ')) {
        insertAt = i;
        break;
      }
    }
    lines.splice(insertAt, 0, ...entryLines, '');
  }

  private static findHistoryHeadingIndex(lines: string[], bounds: SectionBounds): number {
    for (let i = bounds.start; i < bounds.end; i++) {
      if (lines[i].trim() === '### Verification History') {
        return i;
      }
    }
    return -1;
  }
}
