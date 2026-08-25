import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../src/fixtures/testFixtures';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';
import { ArtifactManager } from '../../src/engine/ArtifactManager';
import { EventLedger, LedgerEvent } from '../../src/engine/EventLedger';
import { HealedPatchRecord } from '../../src/engine/HealingDiffStager';

const eventLedgerFilePath = path.resolve(__dirname, '../../logs/event-ledger.json');
const healedPatchDirectory = path.resolve(__dirname, '../../logs/healed-patches');

function readLedgerEvents(): LedgerEvent[] {
  const raw = fs.readFileSync(eventLedgerFilePath, 'utf-8');
  return JSON.parse(raw);
}

function readStagedPatch(patchId: string): HealedPatchRecord {
  const raw = fs.readFileSync(path.join(healedPatchDirectory, `${patchId}.json`), 'utf-8');
  return JSON.parse(raw);
}

test.describe('Self-Healing Engine and Artifact Provenance Verification @smoke', () => {

  test('SANJEEV resolves a stale locator via fallback candidate and logs to the ledger', async ({ page }) => {
    await allure.epic('Autonomous Quality Engine');
    await allure.feature('Self-Healing Diagnostics');
    await allure.story('Stale Locator Recovery via Fallback Candidate');
    await allure.description(
      'WHAT: Verifies MapExecutionEngine.executeSelfHealingAction recovers from a stale primary ' +
      'locator using a valid fallback candidate.\n' +
      'WHY: Proves the SANJEEV Healer-Agent repairs locators live without failing the test.\n' +
      'HOW: Provides an intentionally stale primary candidate and a valid fallback, then asserts ' +
      'the action succeeded and a HEALED event was recorded in the tamper-evident ledger.'
    );

    const healedItemDescription = 'Self-healing verification item';

    await test.step('GIVEN: Guest is on the TodoMVC application route', async () => {
      await page.goto('/todomvc');
    });

    await test.step('WHEN: Action is executed with a stale primary locator and a valid fallback', async () => {
      const eventsBeforeHealing = fs.existsSync(eventLedgerFilePath) ? readLedgerEvents().length : 0;

      await MapExecutionEngine.executeSelfHealingAction(
        page,
        'Locate New Todo Input Field',
        __filename,
        [
          {
            description: 'Stale Primary Locator (deprecated placeholder text)',
            locatorSnippet: "page.getByPlaceholder('Add a new task here')",
            getLocator: () => page.getByPlaceholder('Add a new task here')
          },
          {
            description: 'Valid Fallback Candidate (current placeholder text)',
            locatorSnippet: "page.getByPlaceholder('What needs to be done?')",
            getLocator: () => page.getByPlaceholder('What needs to be done?')
          }
        ],
        async (locator) => {
          await locator.fill(healedItemDescription);
          await locator.press('Enter');
        }
      );

      const eventsAfterHealing = readLedgerEvents();
      expect(eventsAfterHealing.length).toBe(eventsBeforeHealing + 1);
    });

    await test.step('THEN: Healed action must have actually completed against the real page', async () => {
      const healedItem = page.getByRole('listitem').filter({ hasText: healedItemDescription });
      await expect(healedItem).toBeVisible();
    });

    await test.step('THEN: Ledger must record the healing event as PENDING_APPROVAL', async () => {
      const lastEvent = readLedgerEvents().at(-1)!;
      expect(lastEvent.agentName).toBe('SANJEEV');
      expect(lastEvent.actionType).toBe('SELF_HEALING_LOCATOR_RESOLUTION');
      expect(lastEvent.approvalStatus).toBe('PENDING_APPROVAL');
      expect(lastEvent.currentEventHash).toMatch(/^[a-f0-9]{64}$/);
      MapExecutionEngine.logStateVerification({
        'Healing Event Id'   : lastEvent.eventId,
        'Current Event Hash' : lastEvent.currentEventHash,
        'Approval Status'    : lastEvent.approvalStatus
      });
    });

    await test.step('THEN: RAKSHA must have staged a gated patch for human review', async () => {
      const patchFiles = fs.readdirSync(healedPatchDirectory).filter(name => name.endsWith('.json'));
      expect(patchFiles.length).toBeGreaterThan(0);

      const latestPatchFile = patchFiles.sort().at(-1)!;
      const patch = readStagedPatch(latestPatchFile.replace('.json', ''));
      expect(patch.targetFile).toBe(__filename);
      expect(patch.staleLocator).toBe("page.getByPlaceholder('Add a new task here')");
      expect(patch.healedLocator).toBe("page.getByPlaceholder('What needs to be done?')");
      expect(patch.approvalStatus).toBe('PENDING_APPROVAL');
      MapExecutionEngine.logStateVerification({
        'Staged Patch Id' : patch.patchId,
        'Target File'     : patch.targetFile,
        'Approval Status' : patch.approvalStatus
      });
    });
  });

  test('ArtifactManager generates a valid SHA-256 hash and EventLedger chains previousEventHash', async () => {
    await allure.epic('Autonomous Quality Engine');
    await allure.feature('Artifact Provenance');
    await allure.story('SHA-256 Execution Hash and Tamper-Evident Chaining');
    await allure.description(
      'WHAT: Verifies ArtifactManager produces a valid SHA-256 execution hash and EventLedger ' +
      'chains each new record to the previous one via previousEventHash.\n' +
      'WHY: Provenance bundles must be cryptographically verifiable and the audit trail unbroken.\n' +
      'HOW: Generates a provenance bundle, records two sequential ledger events, and asserts the chain.'
    );

    await test.step('WHEN: ArtifactManager builds a provenance bundle for this spec file', async () => {
      const bundle = ArtifactManager.buildProvenanceBundle(
        __filename,
        'ArtifactManager generates a valid SHA-256 hash',
        'PASSED'
      );

      expect(bundle.executionHash).toMatch(/^[a-f0-9]{64}$/);
      expect(bundle.gitCommitSha.length).toBeGreaterThan(0);
      MapExecutionEngine.logStateVerification({
        'Execution Hash' : bundle.executionHash,
        'Exit Status'    : bundle.exitStatus
      });
    });

    await test.step('THEN: Two sequential ledger events must form an unbroken hash chain', async () => {
      const firstEvent = EventLedger.recordEvent(
        'LEKHA',
        'PROVENANCE_CHAIN_VERIFICATION_STEP_ONE',
        'DHRUVA-Quality-OS',
        process.env.ENV || 'qa',
        { verificationStep: 1 },
        { outcome: 'RECORDED' },
        'AUTO_ALLOWED'
      );

      const secondEvent = EventLedger.recordEvent(
        'LEKHA',
        'PROVENANCE_CHAIN_VERIFICATION_STEP_TWO',
        'DHRUVA-Quality-OS',
        process.env.ENV || 'qa',
        { verificationStep: 2 },
        { outcome: 'RECORDED' },
        'AUTO_ALLOWED'
      );

      expect(secondEvent.previousEventHash).toBe(firstEvent.currentEventHash);

      const persistedEvents = readLedgerEvents();
      const persistedSecondEvent = persistedEvents.find(event => event.eventId === secondEvent.eventId);
      expect(persistedSecondEvent?.previousEventHash).toBe(firstEvent.currentEventHash);
    });
  });

});
