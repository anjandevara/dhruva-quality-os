import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface HealedPatchRecord {
  patchId: string;
  targetFile: string;
  staleLocator: string;
  healedLocator: string;
  timestamp: string;
  commitSha: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  reviewerName?: string;
  resolutionTimestamp?: string;
}

export const patchDirectory = path.resolve(__dirname, '../../logs/healed-patches');

/**
 * WHAT: Stages a healed-locator patch for human review instead of silently rewriting source.
 * WHY: Managed by SANJEEV (Healer-Agent) and RAKSHA (Sentinel-Agent) - a self-healing engine
 *      must never auto-commit a locator change; it proposes one, gated behind approval.
 * HOW: Writes one JSON record per healing event to logs/healed-patches/<patch_id>.json.
 */
export class HealingDiffStager {
  static stagePatch(targetFile: string, staleLocator: string, healedLocator: string): HealedPatchRecord {
    const record: HealedPatchRecord = {
      patchId: `PATCH-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      targetFile,
      staleLocator,
      healedLocator,
      timestamp: new Date().toISOString(),
      commitSha: process.env.GIT_COMMIT_SHA || 'local-uncommitted-dev',
      approvalStatus: 'PENDING_APPROVAL',
    };
    this.writePatchFile(record);
    return record;
  }

  static writePatchFile(record: HealedPatchRecord): void {
    if (!fs.existsSync(patchDirectory)) {
      fs.mkdirSync(patchDirectory, { recursive: true });
    }
    const filePath = path.join(patchDirectory, `${record.patchId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
  }
}
