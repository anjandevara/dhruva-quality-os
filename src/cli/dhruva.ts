import { spawnSync } from 'child_process';
import { ProjectRegistry, ProjectRecord } from '../registry/ProjectRegistry';
import { readLastRunMetrics, readHealedEventCount } from '../utils/runMetrics';
import { QaDocSync } from '../utils/qaDocSync';
import { HealingDiffResolver, PatchDecision } from '../engine/HealingDiffResolver';
import { HealedPatchRecord } from '../engine/HealingDiffStager';
import { TraceabilityGenerator } from '../engine/TraceabilityGenerator';

const [, , commandName, ...commandArgs] = process.argv;

printBanner();
routeCommand(commandName || 'status', commandArgs);

function printBanner(): void {
  console.log(`\n=======================================================`);
  console.log(`   DHRUVA: Autonomous Quality Engineering Platform      `);
  console.log(`=======================================================\n`);
}

function routeCommand(command: string, args: string[]): void {
  if (command === 'status') {
    printStatusReport();
  } else if (command === 'add-project') {
    addProjectFromArgs(args);
  } else if (command === 'run-project') {
    runProjectSuite(args[0]);
  } else if (command === 'sync-docs') {
    syncDocsFromArgs(args);
  } else if (command === 'patches') {
    printPendingPatches();
  } else if (command === 'approve-patch') {
    resolvePatchFromArgs(args[0], 'APPROVE');
  } else if (command === 'reject-patch') {
    resolvePatchFromArgs(args[0], 'REJECT');
  } else if (command === 'sync-matrix') {
    syncTraceabilityMatrix();
  } else if (command === 'run') {
    console.log(`Initiating Playwright MAP Execution Engine...\n`);
  } else {
    console.log(`Command [${command}] received.\n`);
  }
}

function printStatusReport(): void {
  console.log(`Registered Projects:\n`);
  console.log(formatProjectsTable(ProjectRegistry.listProjects()));
  printLastRunHealth();
  console.log(`\nSystem Status: Operational & Ready for Execution.\n`);
}

function formatProjectsTable(projects: ProjectRecord[]): string {
  const idWidth = Math.max(2, ...projects.map(project => project.id.length));
  const nameWidth = Math.max(12, ...projects.map(project => project.projectName.length));
  const header = `  ${'ID'.padEnd(idWidth)}  ${'PROJECT NAME'.padEnd(nameWidth)}  ACTIVE ENV`;
  const rows = projects.map(project =>
    `  ${project.id.padEnd(idWidth)}  ${project.projectName.padEnd(nameWidth)}  ${project.activeEnvironment}`
  );
  return [header, ...rows].join('\n');
}

function printLastRunHealth(): void {
  const metrics = readLastRunMetrics();
  const healedCount = readHealedEventCount();

  console.log(`\nLast Run Health:`);
  if (metrics.totalTests === 0) {
    console.log(`  No test run recorded yet. Run 'npm test' to populate this report.`);
    return;
  }
  console.log(`  Started At     : ${metrics.lastRunStartTime}`);
  console.log(`  Total Tests    : ${metrics.totalTests}`);
  console.log(`  Passed         : ${metrics.passedTests}`);
  console.log(`  Failed         : ${metrics.failedTests}`);
  console.log(`  Flaky          : ${metrics.flakyTests}`);
  console.log(`  Pass Rate      : ${metrics.passRatePercent}%`);
  console.log(`  Healed Actions : ${healedCount}`);
}

function addProjectFromArgs(args: string[]): void {
  const [id, name, repositoryPath, environment] = args;
  if (!id || !name || !repositoryPath || !environment) {
    console.log('Usage: add-project <id> <name> <repoPath> <env>\n');
    return;
  }

  ProjectRegistry.registerProject({
    id, projectName: name, repositoryPath, activeEnvironment: environment,
    createdAt: new Date().toISOString(),
  });
  console.log(`Registered project [${id}] "${name}" (env: ${environment}).\n`);
}

function syncDocsFromArgs(args: string[]): void {
  const [docType, recordId, ...rest] = args;
  if (docType === 'bug') {
    syncBugDocFromArgs(recordId, rest);
  } else if (docType === 'rec') {
    syncRecommendationDocFromArgs(recordId, rest);
  } else {
    console.log('Usage: sync-docs bug <bugId> <PASSED|FAILED> [commitSha]');
    console.log('       sync-docs rec <recId> <true|false>\n');
  }
}

function syncBugDocFromArgs(bugId: string, rest: string[]): void {
  const [testStatus, commitSha] = rest;
  if (!bugId || (testStatus !== 'PASSED' && testStatus !== 'FAILED')) {
    console.log('Usage: sync-docs bug <bugId> <PASSED|FAILED> [commitSha]\n');
    return;
  }
  const resolvedCommitSha = commitSha || process.env.GIT_COMMIT_SHA || 'local-uncommitted-dev';
  const updated = QaDocSync.syncBugStatus(bugId, testStatus, resolvedCommitSha);
  console.log(updated
    ? `documents/bugs.md updated for [${bugId}].\n`
    : `No transition applied for [${bugId}] (check current status).\n`);
}

function syncRecommendationDocFromArgs(recId: string, rest: string[]): void {
  const [isImplementedArg] = rest;
  if (!recId || (isImplementedArg !== 'true' && isImplementedArg !== 'false')) {
    console.log('Usage: sync-docs rec <recId> <true|false>\n');
    return;
  }
  const updated = QaDocSync.syncRecommendationStatus(recId, isImplementedArg === 'true');
  console.log(updated
    ? `documents/recommendations.md updated for [${recId}].\n`
    : `No transition applied for [${recId}].\n`);
}

function printPendingPatches(): void {
  const patches = HealingDiffResolver.listPendingPatches();
  if (patches.length === 0) {
    console.log('No pending healed-locator patches awaiting review.\n');
    return;
  }
  console.log(`Pending Healed-Locator Patches (${patches.length}):\n`);
  console.log(formatPatchesTable(patches));
  console.log(`\nApprove: npx ts-node src/cli/dhruva.ts approve-patch <patchId>`);
  console.log(`Reject:  npx ts-node src/cli/dhruva.ts reject-patch <patchId>\n`);
}

function formatPatchesTable(patches: HealedPatchRecord[]): string {
  const idWidth = Math.max(8, ...patches.map(patch => patch.patchId.length));
  const header = `  ${'PATCH ID'.padEnd(idWidth)}  TARGET FILE -> STALE => HEALED`;
  const rows = patches.map(patch =>
    `  ${patch.patchId.padEnd(idWidth)}  ${patch.targetFile} :: ${patch.staleLocator} => ${patch.healedLocator}`
  );
  return [header, ...rows].join('\n');
}

function resolvePatchFromArgs(patchId: string, decision: PatchDecision): void {
  if (!patchId) {
    console.log(`Usage: ${decision === 'APPROVE' ? 'approve-patch' : 'reject-patch'} <patchId>\n`);
    return;
  }
  const reviewerName = process.env.REVIEWER_NAME || process.env.USER || 'cli-operator';
  try {
    const resolved = HealingDiffResolver.resolvePatch(patchId, decision, reviewerName);
    console.log(`Patch [${patchId}] ${resolved.approvalStatus} by ${reviewerName}.\n`);
  } catch (error: any) {
    console.log(`Failed to resolve patch [${patchId}]: ${error.message}\n`);
  }
}

function syncTraceabilityMatrix(): void {
  const rows = TraceabilityGenerator.generate();
  console.log(`documents/traceability-matrix.md regenerated with ${rows.length} scenario(s).\n`);
}

function runProjectSuite(projectId: string): void {
  const project = projectId ? ProjectRegistry.getProject(projectId) : undefined;
  if (!project) {
    console.log(`Usage: run-project <id>. Unknown project id: [${projectId}]\n`);
    return;
  }

  console.log(`Running test suite for [${project.id}] ${project.projectName} (env: ${project.activeEnvironment})...\n`);
  const result = spawnSync('npx', ['playwright', 'test'], {
    stdio: 'inherit',
    env: { ...process.env, ENV: project.activeEnvironment },
  });
  process.exit(result.status ?? 1);
}
