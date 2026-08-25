import * as http from 'http';
import { spawn } from 'child_process';
import { ProjectRegistry, ProjectRecord } from '../registry/ProjectRegistry';
import { readLastRunMetrics, readHealedEventCount, RunMetrics } from '../utils/runMetrics';
import { HealingDiffResolver, PatchDecision } from '../engine/HealingDiffResolver';
import { HealedPatchRecord } from '../engine/HealingDiffStager';
import { TraceabilityGenerator, TraceabilityRow } from '../engine/TraceabilityGenerator';

const hudPort = 4173;
const hudHost = '127.0.0.1';

const server = http.createServer(handleRequest);
server.listen(hudPort, hudHost, () => {
  console.log(`\nDHRUVA Command HUD running at http://${hudHost}:${hudPort}\n`);
});

function handleRequest(request: http.IncomingMessage, response: http.ServerResponse): void {
  const url = new URL(request.url || '/', `http://${hudHost}:${hudPort}`);
  const resolveMatch = url.pathname.match(/^\/api\/patches\/([^/]+)\/resolve$/);

  if (url.pathname === '/' && request.method === 'GET') {
    serveDashboard(response);
  } else if (url.pathname === '/launch/playwright-report' && request.method === 'GET') {
    launchDetached(response, 'npx', ['playwright', 'show-report']);
  } else if (url.pathname === '/launch/allure-report' && request.method === 'GET') {
    launchAllureReport(response);
  } else if (url.pathname === '/api/patches' && request.method === 'GET') {
    serveJson(response, getPatchesPayload());
  } else if (url.pathname === '/api/traceability' && request.method === 'GET') {
    serveJson(response, { rows: TraceabilityGenerator.generate() });
  } else if (resolveMatch && request.method === 'POST') {
    handleResolvePatchRequest(request, response, resolveMatch[1]);
  } else {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not Found');
  }
}

function serveDashboard(response: http.ServerResponse): void {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(renderDashboardHtml());
}

function serveJson(response: http.ServerResponse, payload: unknown): void {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function getPatchesPayload(): { pending: HealedPatchRecord[]; resolved: HealedPatchRecord[] } {
  const allPatches = HealingDiffResolver.listAllPatches();
  return {
    pending: allPatches.filter(patch => patch.approvalStatus === 'PENDING_APPROVAL'),
    resolved: allPatches.filter(patch => patch.approvalStatus !== 'PENDING_APPROVAL'),
  };
}

/**
 * WHAT: Resolves a staged patch (approve or reject) triggered from the HUD's own buttons.
 * WHY: The HUD is the reviewer's console for RAKSHA's gate; this is where the gate closes.
 * HOW: Reads the JSON request body, delegates to HealingDiffResolver, and returns the outcome.
 */
function handleResolvePatchRequest(request: http.IncomingMessage, response: http.ServerResponse, patchId: string): void {
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    try {
      const { decision, reviewerName } = JSON.parse(body || '{}') as { decision: PatchDecision; reviewerName?: string };
      const resolved = HealingDiffResolver.resolvePatch(patchId, decision, reviewerName || 'hud-operator');
      serveJson(response, { resolved });
    } catch (error: any) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * WHAT: Spawns a detached child process and responds once it has launched.
 * WHY: Trace Viewer and Allure Report are themselves long-running local servers;
 *      the HUD must not block waiting on them.
 * HOW: spawn with detached + unref so the child survives independently of this process.
 */
function launchDetached(response: http.ServerResponse, command: string, args: string[]): void {
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ launched: true, command: `${command} ${args.join(' ')}` }));
}

function launchAllureReport(response: http.ServerResponse): void {
  const generate = spawn('npx', ['allure', 'generate', 'allure-results', '--clean', '-o', 'allure-report'], { stdio: 'ignore' });
  generate.on('close', () => {
    const viewer = spawn('npx', ['allure', 'open', 'allure-report'], { detached: true, stdio: 'ignore' });
    viewer.unref();
  });
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ launched: true, command: 'allure generate && allure open' }));
}

function renderDashboardHtml(): string {
  const metrics = readLastRunMetrics();
  const healedCount = readHealedEventCount();
  const projects = ProjectRegistry.listProjects();
  const { pending, resolved } = getPatchesPayload();
  const traceabilityRows = TraceabilityGenerator.generate();

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>DHRUVA Command HUD</title>${renderStyles()}</head>
<body>
  <h1>DHRUVA Command HUD</h1>
  <p class="subtitle">Autonomous Quality Engineering Platform</p>
  <section class="metrics">
    ${renderRadialMetric('Total Tests', metrics.totalTests, Math.max(metrics.totalTests, 1), '')}
    ${renderRadialMetric('Pass Rate', metrics.passRatePercent, 100, '%')}
    ${renderRadialMetric('Healed Actions', healedCount, Math.max(healedCount, 1), '')}
  </section>
  <section class="projects">${projects.map(project => renderProjectCard(project, metrics)).join('')}</section>
  <section class="launchers">
    <button onclick="fetch('/launch/playwright-report')">Launch Playwright Trace Viewer</button>
    <button onclick="fetch('/launch/allure-report')">Open Allure Report</button>
  </section>
  <h2 class="section-title">Pending Gated Approvals (${pending.length})</h2>
  <section class="patches">${renderPendingPatchesSection(pending, resolved)}</section>
  <h2 class="section-title">Traceability Matrix (${traceabilityRows.length} scenarios)</h2>
  <section class="traceability">${renderTraceabilityTable(traceabilityRows)}</section>
  ${renderResolveScript()}
</body>
</html>`;
}

function renderPendingPatchesSection(pending: HealedPatchRecord[], resolved: HealedPatchRecord[]): string {
  if (pending.length === 0 && resolved.length === 0) {
    return '<p class="empty-state">No healed-locator patches staged yet.</p>';
  }
  const pendingCards = pending.map(renderPatchCard).join('');
  const resolvedSummary = resolved.length > 0
    ? `<p class="resolved-summary">${resolved.length} patch(es) already resolved.</p>`
    : '';
  return `<div class="patch-list">${pendingCards}</div>${resolvedSummary}`;
}

function renderPatchCard(patch: HealedPatchRecord): string {
  return `<div class="patch-card">
    <div class="patch-id">${patch.patchId}</div>
    <div class="patch-file">${patch.targetFile}</div>
    <div class="patch-diff">
      <div class="stale">- ${patch.staleLocator}</div>
      <div class="healed">+ ${patch.healedLocator}</div>
    </div>
    <div class="patch-actions">
      <button class="approve" onclick="resolvePatch('${patch.patchId}', 'APPROVE')">Approve &amp; Apply</button>
      <button class="reject" onclick="resolvePatch('${patch.patchId}', 'REJECT')">Reject</button>
    </div>
  </div>`;
}

function renderTraceabilityTable(rows: TraceabilityRow[]): string {
  if (rows.length === 0) {
    return '<p class="empty-state">No test scenarios found.</p>';
  }
  const bodyRows = rows.map(renderTraceabilityRow).join('');
  return `<table class="trace-table">
    <thead><tr><th>Story ID</th><th>Epic / Feature</th><th>Spec File</th><th>Scenario Title</th><th>Tags</th><th>Last Run</th><th>Linked Defects</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

function renderTraceabilityRow(row: TraceabilityRow): string {
  const statusClass = `status-${row.lastRunStatus.toLowerCase().replace(/\s+/g, '-')}`;
  return `<tr>
    <td>${row.storyId}</td>
    <td>${row.epic} / ${row.feature}</td>
    <td>${row.specFile}</td>
    <td>${row.scenarioTitle}</td>
    <td>${row.tags.map(tag => `@${tag}`).join(', ')}</td>
    <td><span class="${statusClass}">${row.lastRunStatus}</span></td>
    <td>${row.linkedDefects.join(', ') || 'None'}</td>
  </tr>`;
}

function renderResolveScript(): string {
  return `<script>
    async function resolvePatch(patchId, decision) {
      const response = await fetch('/api/patches/' + patchId + '/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: decision, reviewerName: 'HUD Operator' })
      });
      if (response.ok) {
        location.reload();
      } else {
        const error = await response.json();
        alert('Failed to resolve patch: ' + error.error);
      }
    }
  </script>`;
}

function renderRadialMetric(label: string, value: number, max: number, suffix: string): string {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return `<div class="radial" style="--pct:${percent}">
    <div class="radial-ring"><span>${value}${suffix}</span></div>
    <p>${label}</p>
  </div>`;
}

function renderProjectCard(project: ProjectRecord, metrics: RunMetrics): string {
  const statusLabel = metrics.totalTests === 0
    ? 'NO RUNS YET'
    : metrics.failedTests > 0 ? 'FAILING' : 'PASSING';
  const statusClass = statusLabel.toLowerCase().replace(/\s+/g, '-');

  return `<div class="card">
    <div class="card-header"><span class="project-id">${project.id}</span><span class="badge ${statusClass}">${statusLabel}</span></div>
    <h2>${project.projectName}</h2>
    <p>Environment: <strong>${project.activeEnvironment}</strong></p>
  </div>`;
}

function renderStyles(): string {
  return `<style>
    :root { color-scheme: dark; }
    body { background: #0b0f17; color: #e6ebf5; font-family: -apple-system, Segoe UI, sans-serif; margin: 0; padding: 2.5rem; }
    h1 { margin: 0; font-size: 1.75rem; letter-spacing: 0.04em; }
    .subtitle { color: #7d8aa8; margin: 0.25rem 0 2rem; }
    .section-title { font-size: 1.1rem; margin: 2rem 0 1rem; letter-spacing: 0.03em; }
    .metrics { display: flex; gap: 2.5rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
    .radial { text-align: center; }
    .radial-ring {
      width: 110px; height: 110px; border-radius: 50%;
      background: conic-gradient(#5eead4 calc(var(--pct) * 1%), #1c2333 0);
      display: flex; align-items: center; justify-content: center; margin: 0 auto;
    }
    .radial-ring span {
      width: 82px; height: 82px; border-radius: 50%; background: #0b0f17;
      display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 600;
    }
    .radial p { color: #7d8aa8; margin-top: 0.75rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .projects { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2.5rem; }
    .card { background: #131a29; border: 1px solid #232c42; border-radius: 12px; padding: 1.25rem; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .project-id { color: #7d8aa8; font-size: 0.8rem; font-family: monospace; }
    .badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; }
    .badge.passing { background: #113b2f; color: #5eead4; }
    .badge.failing { background: #3b1414; color: #f87171; }
    .badge.no-runs-yet { background: #232c42; color: #7d8aa8; }
    .card h2 { font-size: 1.05rem; margin: 0.25rem 0; }
    .card p { color: #b6c0d6; font-size: 0.9rem; margin: 0.25rem 0; }
    .launchers { display: flex; gap: 1rem; }
    button {
      background: #1c2333; color: #e6ebf5; border: 1px solid #2c3550; border-radius: 8px;
      padding: 0.75rem 1.25rem; font-size: 0.9rem; cursor: pointer;
    }
    button:hover { background: #232c42; }
    .empty-state { color: #7d8aa8; font-size: 0.9rem; }
    .patch-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem; }
    .patch-card { background: #131a29; border: 1px solid #3b2f14; border-radius: 12px; padding: 1.25rem; }
    .patch-id { font-family: monospace; color: #7d8aa8; font-size: 0.75rem; margin-bottom: 0.5rem; }
    .patch-file { font-family: monospace; color: #b6c0d6; font-size: 0.75rem; margin-bottom: 0.75rem; word-break: break-all; }
    .patch-diff { font-family: monospace; font-size: 0.85rem; margin-bottom: 1rem; }
    .patch-diff .stale { color: #f87171; }
    .patch-diff .healed { color: #5eead4; }
    .patch-actions { display: flex; gap: 0.75rem; }
    .patch-actions .approve { background: #113b2f; border-color: #1c5c46; }
    .patch-actions .reject { background: #3b1414; border-color: #5c2020; }
    .resolved-summary { color: #7d8aa8; font-size: 0.85rem; margin-top: 1rem; }
    .trace-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .trace-table th, .trace-table td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #232c42; }
    .trace-table th { color: #7d8aa8; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; }
    .status-passed { color: #5eead4; }
    .status-failed { color: #f87171; }
    .status-flaky { color: #fbbf24; }
    .status-not-run, .status-skipped { color: #7d8aa8; }
  </style>`;
}
