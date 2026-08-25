import * as fs from 'fs';
import * as path from 'path';
import { EventLedger } from './EventLedger';
import { HealedPatchRecord, HealingDiffStager, patchDirectory } from './HealingDiffStager';

export type PatchDecision = 'APPROVE' | 'REJECT';

/**
 * WHAT: Resolves a staged healing patch by applying or rejecting it, with a full audit trail.
 * WHY: Managed by RAKSHA (Sentinel-Agent) and SANJEEV (Healer-Agent) - the gate HealingDiffStager
 *      opened only closes here, on an explicit human decision, never automatically.
 * HOW: Reads the patch record, optionally rewrites the target source file, then records the
 *      decision on both the patch file and the tamper-evident event ledger.
 */
export class HealingDiffResolver {
  static listPendingPatches(): HealedPatchRecord[] {
    return this.readAllPatches().filter(patch => patch.approvalStatus === 'PENDING_APPROVAL');
  }

  static listAllPatches(): HealedPatchRecord[] {
    return this.readAllPatches();
  }

  static resolvePatch(patchId: string, decision: PatchDecision, reviewerName: string): HealedPatchRecord {
    const patch = this.readPatch(patchId);
    if (patch.approvalStatus !== 'PENDING_APPROVAL') {
      throw new Error(`HealingDiffResolver: patch [${patchId}] is not PENDING_APPROVAL (current: ${patch.approvalStatus})`);
    }

    if (decision === 'APPROVE') {
      this.applyPatchToSource(patch);
    }

    const resolvedPatch: HealedPatchRecord = {
      ...patch,
      approvalStatus: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewerName,
      resolutionTimestamp: new Date().toISOString(),
    };
    HealingDiffStager.writePatchFile(resolvedPatch);
    this.recordResolutionEvent(resolvedPatch, reviewerName);
    return resolvedPatch;
  }

  /**
   * WHAT: Replaces the stale locator snippet with the healed one in the target source file.
   * WHY: Approval is the only path from a staged proposal to a real source-code change.
   * HOW: A string replace, but only when the stale snippet appears exactly once - a first-match
   *      replace would silently rewrite the wrong occurrence (e.g. a nearby comment or metadata
   *      field containing the same text) rather than the real locator, so an ambiguous match
   *      refuses to apply rather than guessing.
   */
  private static applyPatchToSource(patch: HealedPatchRecord): void {
    const sourceContent = fs.readFileSync(patch.targetFile, 'utf-8');
    const occurrences = sourceContent.split(patch.staleLocator).length - 1;
    if (occurrences === 0) {
      throw new Error(`HealingDiffResolver: stale locator not found in ${patch.targetFile}; patch [${patch.patchId}] cannot be applied`);
    }
    if (occurrences > 1) {
      throw new Error(
        `HealingDiffResolver: stale locator appears ${occurrences} times in ${patch.targetFile}; ` +
        `patch [${patch.patchId}] is ambiguous and requires manual resolution`
      );
    }
    const updatedContent = sourceContent.replace(patch.staleLocator, patch.healedLocator);
    fs.writeFileSync(patch.targetFile, updatedContent, 'utf-8');
  }

  private static recordResolutionEvent(patch: HealedPatchRecord, reviewerName: string): void {
    EventLedger.recordEvent(
      'RAKSHA',
      patch.approvalStatus === 'APPROVED' ? 'HEALED_PATCH_APPROVED' : 'HEALED_PATCH_REJECTED',
      process.env.APPLICATION_NAME || 'DHRUVA-Quality-OS',
      process.env.ENV || 'qa',
      { patchId: patch.patchId, targetFile: patch.targetFile, reviewerName },
      { staleLocator: patch.staleLocator, healedLocator: patch.healedLocator, approvalStatus: patch.approvalStatus },
      patch.approvalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED'
    );
  }

  private static readPatch(patchId: string): HealedPatchRecord {
    const filePath = path.join(patchDirectory, `${patchId}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  private static readAllPatches(): HealedPatchRecord[] {
    if (!fs.existsSync(patchDirectory)) {
      return [];
    }
    return fs.readdirSync(patchDirectory)
      .filter(name => name.endsWith('.json'))
      .map(name => JSON.parse(fs.readFileSync(path.join(patchDirectory, name), 'utf-8')));
  }
}
