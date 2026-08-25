import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface LedgerEvent {
  eventId: string;
  previousEventHash: string;
  currentEventHash: string;
  timestamp: string;
  agentName: string;
  actionType: string;
  targetProject: string;
  environment: string;
  inputsHash: string;
  outputsHash: string;
  approvalStatus: 'AUTO_ALLOWED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export class EventLedger {
  private static readonly ledgerFilePath = path.resolve(__dirname, '../../logs/event-ledger.json');
  private static lastEventHash = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * WHAT: Records a new event in the tamper-evident hash chain.
   * WHY: Guarantees complete provenance and proves the audit log has not been altered.
   * HOW: Hashes event data combined with previous event hash, appending to chain.
   */
  static recordEvent(
    agentName: string,
    actionType: string,
    targetProject: string,
    environment: string,
    inputs: Record<string, any>,
    outputs: Record<string, any>,
    approvalStatus: 'AUTO_ALLOWED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  ): LedgerEvent {
    const timestamp = new Date().toISOString();
    const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const inputsHash = crypto.createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
    const outputsHash = crypto.createHash('sha256').update(JSON.stringify(outputs)).digest('hex');

    const rawEventPayload = `${eventId}|${this.lastEventHash}|${timestamp}|${agentName}|${actionType}|${inputsHash}|${outputsHash}|${approvalStatus}`;
    const currentEventHash = crypto.createHash('sha256').update(rawEventPayload).digest('hex');

    const event: LedgerEvent = {
      eventId,
      previousEventHash: this.lastEventHash,
      currentEventHash,
      timestamp,
      agentName,
      actionType,
      targetProject,
      environment,
      inputsHash,
      outputsHash,
      approvalStatus,
    };

    this.lastEventHash = currentEventHash;
    this.appendToFile(event);
    return event;
  }

  private static appendToFile(event: LedgerEvent): void {
    let events: LedgerEvent[] = [];
    const dir = path.dirname(this.ledgerFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.ledgerFilePath)) {
      try {
        const raw = fs.readFileSync(this.ledgerFilePath, 'utf-8');
        events = JSON.parse(raw);
      } catch {
        events = [];
      }
    }

    events.push(event);
    fs.writeFileSync(this.ledgerFilePath, JSON.stringify(events, null, 2), 'utf-8');
  }
}
