import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';
import { EventLedger } from './EventLedger';
import { HealingDiffStager } from './HealingDiffStager';

export interface SemanticLocatorCandidate {
  description: string;
  locatorSnippet: string;
  getLocator: (page: Page) => Locator;
}

export interface MapAnalysisContext {
  marketEnvironment: string;
  targetUrl: string;
  userPersona: string;
  businessGoal: string;
}

export class MapExecutionEngine {
  private static readonly maxRetryCount: number = 3;

  /**
   * WHAT: Prints structured [MAP-ANALYSIS] telemetry block.
   * WHY: Documents business context, user persona, and scope boundaries.
   * HOW: Formats context values into standardized log output.
   */
  static logMapAnalysis(context: MapAnalysisContext, processSteps: string[]): void {
    const { marketEnvironment, targetUrl, userPersona, businessGoal } = context;
    const formattedSteps = processSteps.map((step, index) => `  ${index + 1}. ${step}`).join('\n');

    console.log(`
[MAP-ANALYSIS]
Market Environment : ${marketEnvironment}
Target URL         : ${targetUrl}
User Persona       : ${userPersona}
Business Goal      : ${businessGoal}
Process Flow       :
${formattedSteps}
--------------------------------------------------------------------------------`);
  }

  /**
   * WHAT: Executes an atomic action with auto-healing and circuit breaker retries.
   * WHY: Prevents test failure due to minor DOM shifts while capping retries to 3.
   * HOW: Tries primary semantic locator, falls back to alternative candidates, and logs status.
   */
  static async executeSelfHealingAction(
    page: Page,
    actionName: string,
    targetFile: string,
    candidates: SemanticLocatorCandidate[],
    actionCallback: (locator: Locator) => Promise<void>
  ): Promise<void> {
    let attempt = 0;
    let lastError: Error | null = null;

    for (const candidate of candidates) {
      attempt++;
      if (attempt > this.maxRetryCount) {
        break;
      }

      try {
        const locator = candidate.getLocator(page);
        await expect(locator).toBeVisible({ timeout: 5000 });
        await actionCallback(locator);

        const statusMessage = attempt === 1
          ? `SUCCESS: Executed [${actionName}] via primary locator (${candidate.description})`
          : `HEALED: Executed [${actionName}] via fallback candidate (${candidate.description}) on attempt ${attempt}`;

        this.logExecutionStep(actionName, statusMessage, 'PASS');
        if (attempt > 1) {
          this.recordHealingEvent(actionName, targetFile, candidates[0], candidate, attempt);
        }
        return;
      } catch (error: any) {
        lastError = error;
        this.logExecutionStep(
          actionName,
          `RETRY ${attempt}/${this.maxRetryCount}: Primary candidate failed (${candidate.description}). Inspecting DOM for semantic alternative.`,
          'WARN'
        );
      }
    }

    const failureMessage = `CIRCUIT_BREAKER_TRIPPED: [${actionName}] failed after ${attempt} attempts. Root error: ${lastError?.message}`;
    this.logExecutionStep(actionName, failureMessage, 'FAIL');
    throw new Error(failureMessage);
  }

  /**
   * WHAT: Stages a gated healing patch and appends the event to the tamper-evident ledger.
   * WHY: SANJEEV proposes the fix, RAKSHA gates it - a healed locator is never auto-committed
   *      to source; it is a PENDING_APPROVAL artifact until a human reviews it.
   * HOW: Delegates to HealingDiffStager for the patch file, then EventLedger for the audit trail.
   */
  private static recordHealingEvent(
    actionName: string,
    targetFile: string,
    failedCandidate: SemanticLocatorCandidate,
    healedCandidate: SemanticLocatorCandidate,
    attempt: number
  ): void {
    const patch = HealingDiffStager.stagePatch(targetFile, failedCandidate.locatorSnippet, healedCandidate.locatorSnippet);

    EventLedger.recordEvent(
      'SANJEEV',
      'SELF_HEALING_LOCATOR_RESOLUTION',
      process.env.APPLICATION_NAME || 'DHRUVA-Quality-OS',
      process.env.ENV || 'qa',
      { actionName, targetFile, failedCandidateDescription: failedCandidate.description, healingAttempt: attempt },
      { healedCandidateDescription: healedCandidate.description, resolutionStatus: 'HEALED', stagedPatchId: patch.patchId },
      'PENDING_APPROVAL'
    );
  }

  /**
   * WHAT: Prints real-time [EXECUTION_LOG] entries.
   * WHY: Provides live execution tracking and self-healing visibility.
   * HOW: Formats step name, message, and pass/warn/fail status.
   */
  static logExecutionStep(stepName: string, message: string, status: 'PASS' | 'WARN' | 'FAIL'): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`[EXECUTION_LOG] [${timestamp}] [${status}] Step: ${stepName} -> ${message}`);
  }

  /**
   * WHAT: Prints structured [STATE_VERIFICATION] output.
   * WHY: Validates business rules, outcome metrics, and assertion states.
   * HOW: Outputs structured verification key-value pairs.
   */
  static logStateVerification(metrics: Record<string, string | number | boolean>): void {
    const metricLines = Object.entries(metrics)
      .map(([key, val]) => `  - ${key}: ${val}`)
      .join('\n');

    console.log(`
[STATE_VERIFICATION]
Business Resolution Metrics:
${metricLines}
--------------------------------------------------------------------------------`);
  }
}
