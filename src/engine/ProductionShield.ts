const mutatingTags = ['create', 'update', 'delete', 'crud'];

/**
 * WHAT: Blocks mutating tests from ever running against the production environment.
 * WHY: Managed by RAKSHA (Sentinel-Agent) - a self-healing, autonomous framework must have a
 *      hard guardrail that no amount of retries or healing can route around.
 * HOW: Compares process.env.ENV against the test's tags; throws before any real action runs.
 */
export class ProductionShield {
  static enforceProductionSafety(testTitle: string, tags: string[]): void {
    const isProduction = process.env.ENV === 'prod';
    if (!isProduction) {
      return;
    }

    const normalizedTags = tags.map(tag => tag.replace(/^@/, ''));
    const isReadOnly = normalizedTags.includes('read-only');
    const isMutating = mutatingTags.some(tag => normalizedTags.includes(tag));

    if (isMutating && !isReadOnly) {
      throw new Error(
        `PRODUCTION SAFETY SHIELD: Mutating test blocked against production environment. ` +
        `Test: "${testTitle}" | Tags: [${normalizedTags.join(', ')}]`
      );
    }
  }
}
