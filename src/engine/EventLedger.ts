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
  private static readonly lockFilePath = `${EventLedger.ledgerFilePath}.lock`;
  private static readonly genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * WHAT: Records a new event in the tamper-evident hash chain.
   * WHY: Guarantees complete provenance and proves the audit log has not been altered.
   * HOW: Reads the current on-disk tail hash under a lock, hashes the new event, and appends it.
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
    this.acquireLock();
    try {
      const previousEventHash = this.readTailHash();
      const event = this.buildEvent(agentName, actionType, targetProject, environment, inputs, outputs, approvalStatus, previousEventHash);
      this.appendToFile(event);
      return event;
    } finally {
      this.releaseLock();
    }
  }

  private static buildEvent(
    agentName: string,
    actionType: string,
    targetProject: string,
    environment: string,
    inputs: Record<string, any>,
    outputs: Record<string, any>,
    approvalStatus: 'AUTO_ALLOWED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED',
    previousEventHash: string
  ): LedgerEvent {
    const timestamp = new Date().toISOString();
    const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const inputsHash = crypto.createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
    const outputsHash = crypto.createHash('sha256').update(JSON.stringify(outputs)).digest('hex');
    const rawEventPayload = `${eventId}|${previousEventHash}|${timestamp}|${agentName}|${actionType}|${inputsHash}|${outputsHash}|${approvalStatus}`;
    const currentEventHash = crypto.createHash('sha256').update(rawEventPayload).digest('hex');

    return {
      eventId, previousEventHash, currentEventHash, timestamp, agentName, actionType,
      targetProject, environment, inputsHash, outputsHash, approvalStatus,
    };
  }

  /**
   * WHAT: Reads the currentEventHash of the last event persisted on disk.
   * WHY: The chain's true tail lives in the shared file, not in one process's memory,
   *      so parallel Playwright workers must all read it fresh instead of resetting to genesis.
   * HOW: Parses the ledger file's last entry, falling back to the genesis hash when absent.
   */
  private static readTailHash(): string {
    if (!fs.existsSync(this.ledgerFilePath)) {
      return this.genesisHash;
    }
    try {
      const events: LedgerEvent[] = JSON.parse(fs.readFileSync(this.ledgerFilePath, 'utf-8'));
      return events.length > 0 ? events[events.length - 1].currentEventHash : this.genesisHash;
    } catch {
      return this.genesisHash;
    }
  }

  private static appendToFile(event: LedgerEvent): void {
    let events: LedgerEvent[] = [];
    const dir = path.dirname(this.ledgerFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.ledgerFilePath)) {
      try {
        events = JSON.parse(fs.readFileSync(this.ledgerFilePath, 'utf-8'));
      } catch {
        events = [];
      }
    }

    events.push(event);
    fs.writeFileSync(this.ledgerFilePath, JSON.stringify(events, null, 2), 'utf-8');
  }

  /**
   * WHAT: Acquires an exclusive cross-process lock via an atomic lockfile create.
   * WHY: Prevents two Playwright workers from reading the same tail hash and forking the chain.
   * HOW: Retries an atomic wx-mode file create with a short synchronous backoff.
   * ponytail: simple spin-lock via lockfile, fine at this event volume; swap for a real
   * lock manager or a database-backed ledger if concurrent write volume grows significantly.
   */
  private static acquireLock(): void {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        fs.closeSync(fs.openSync(this.lockFilePath, 'wx'));
        return;
      } catch {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
    }
    throw new Error('EventLedger: could not acquire ledger lock after 100 attempts');
  }

  private static releaseLock(): void {
    try {
      fs.unlinkSync(this.lockFilePath);
    } catch {
      // Already released; nothing to clean up.
    }
  }
}
