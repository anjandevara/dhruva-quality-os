import * as fs from 'fs';
import * as path from 'path';
import { EventLedger } from './EventLedger';

export interface QuarantineRecord {
  quarantineId: string;
  testTitle: string;
  specFile: string;
  flakeReason: string;
  quarantinedDate: string;
}

const doubtsFilePath = path.resolve(__dirname, '../../documents/doubts.md');

/**
 * WHAT: Records a flaky test as quarantined in the QA documentation and the event ledger.
 * WHY: Managed by SANJEEV (Healer-Agent) and LEKHA (Auditor-Agent) - a flaky test that keeps
 *      retrying silently erodes trust in the suite; quarantining makes the instability visible
 *      and auditable instead of hidden behind a passing retry.
 * HOW: Appends a QRT-<n> section to documents/doubts.md and a FLAKY_TEST_QUARANTINED ledger event.
 */
export class FlakyQuarantine {
  static quarantineTest(testTitle: string, specFile: string, flakeReason: string): QuarantineRecord {
    const record: QuarantineRecord = {
      quarantineId: this.nextQuarantineId(),
      testTitle,
      specFile,
      flakeReason,
      quarantinedDate: new Date().toISOString().substring(0, 10),
    };
    this.appendDoubtsEntry(record);
    this.recordQuarantineEvent(record);
    return record;
  }

  static listQuarantinedTests(): QuarantineRecord[] {
    if (!fs.existsSync(doubtsFilePath)) {
      return [];
    }
    const content = fs.readFileSync(doubtsFilePath, 'utf-8');
    const sections = content.split(/(?=^## QRT-)/m).filter(section => section.startsWith('## QRT-'));
    return sections
      .map(section => this.parseQuarantineSection(section))
      .filter((record): record is QuarantineRecord => record !== null);
  }

  private static parseQuarantineSection(section: string): QuarantineRecord | null {
    const headingMatch = section.match(/^## (QRT-\d+):\s*(.+)$/m);
    if (!headingMatch) {
      return null;
    }
    return {
      quarantineId: headingMatch[1],
      testTitle: headingMatch[2].trim(),
      specFile: section.match(/\*\*Spec File\*\*:\s*`([^`]+)`/)?.[1] || '',
      flakeReason: section.match(/\*\*Flake Reason\*\*:\s*(.+)/)?.[1]?.trim() || '',
      quarantinedDate: section.match(/\*\*Quarantined Date\*\*:\s*(.+)/)?.[1]?.trim() || '',
    };
  }

  private static nextQuarantineId(): string {
    const nextNumber = this.listQuarantinedTests().length + 1;
    return `QRT-${String(nextNumber).padStart(3, '0')}`;
  }

  private static appendDoubtsEntry(record: QuarantineRecord): void {
    const entry = [
      '',
      `## ${record.quarantineId}: ${record.testTitle}`,
      '',
      `* **Spec File**: \`${record.specFile}\``,
      `* **Quarantined Date**: ${record.quarantinedDate}`,
      `* **Flake Reason**: ${record.flakeReason}`,
      `* **Status**: Quarantined`,
      '',
    ].join('\n');
    fs.appendFileSync(doubtsFilePath, entry, 'utf-8');
  }

  private static recordQuarantineEvent(record: QuarantineRecord): void {
    EventLedger.recordEvent(
      'LEKHA',
      'FLAKY_TEST_QUARANTINED',
      process.env.APPLICATION_NAME || 'DHRUVA-Quality-OS',
      process.env.ENV || 'qa',
      { testTitle: record.testTitle, specFile: record.specFile },
      { quarantineId: record.quarantineId, flakeReason: record.flakeReason },
      'AUTO_ALLOWED'
    );
  }
}
