import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { ProjectRegistry, ProjectRecord } from '../registry/ProjectRegistry';
import {
  readLastRunMetrics, readHealedEventCount, readOpenBugsCount,
  readAgentActivity, readRecentExecutionLogLines, RunMetrics,
} from '../utils/runMetrics';
import { HealingDiffResolver, PatchDecision } from '../engine/HealingDiffResolver';
import { HealedPatchRecord } from '../engine/HealingDiffStager';
import { TraceabilityGenerator, TraceabilityRow } from '../engine/TraceabilityGenerator';
import { FlakyQuarantine } from '../engine/FlakyQuarantine';

const hudPort = 4173;
const hudHost = '127.0.0.1';
const repoRoot = path.resolve(__dirname, '../..');
const reportDirectory = path.resolve(repoRoot, 'playwright-report');

const agentRoster = [
  { name: 'DHRUVA', role: 'Commander', color: '#A78BFA' },
  { name: 'KAVI', role: 'Coder', color: '#60A5FA' },
  { name: 'RAKSHA', role: 'Sentinel', color: '#FB923C' },
  { name: 'SANJEEV', role: 'Healer', color: '#5EEAD4' },
  { name: 'LEKHA', role: 'Auditor', color: '#FBBF24' },
];

const mimeTypesByExtension: Record<string, string> = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json', '.zip': 'application/zip', '.map': 'application/json',
};

const server = http.createServer(handleRequest);
server.listen(hudPort, hudHost, () => {
  console.log(`\nDHRUVA Command HUD running at http://${hudHost}:${hudPort}\n`);
});

function handleRequest(request: http.IncomingMessage, response: http.ServerResponse): void {
  const url = new URL(request.url || '/', `http://${hudHost}:${hudPort}`);
  const resolveMatch = url.pathname.match(/^\/api\/patches\/([^/]+)\/resolve$/);
  const runProjectMatch = url.pathname.match(/^\/run-project\/([^/]+)$/);

  if (url.pathname === '/' && request.method === 'GET') {
    serveDashboard(response);
  } else if (url.pathname.startsWith('/report/') && request.method === 'GET') {
    serveReportAsset(response, url.pathname.replace(/^\/report\//, ''));
  } else if (url.pathname === '/launch/allure-report' && request.method === 'GET') {
    launchAllureReport(response);
  } else if (url.pathname === '/api/patches' && request.method === 'GET') {
    serveJson(response, getPatchesPayload());
  } else if (url.pathname === '/api/traceability' && request.method === 'GET') {
    serveJson(response, { rows: TraceabilityGenerator.generate() });
  } else if (url.pathname === '/api/quarantine' && request.method === 'GET') {
    serveJson(response, { quarantined: FlakyQuarantine.listQuarantinedTests() });
  } else if (resolveMatch && request.method === 'POST') {
    handleResolvePatchRequest(request, response, resolveMatch[1]);
  } else if (runProjectMatch && request.method === 'GET') {
    runProjectSuite(response, runProjectMatch[1]);
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

/**
 * WHAT: Serves the real Playwright HTML report (and its embedded trace viewer) as static files.
 * WHY: The "View Trace" modal embeds this same-origin, rather than spawning `playwright show-report`
 *      as a second process with an unpredictable port - this is the actual local report and trace
 *      data, just delivered through the HUD's own server instead of an external one.
 * HOW: Resolves the requested path under playwright-report/, then verifies containment via
 *      realpath + a path.relative boundary check - a plain resolvedPath.startsWith(reportDirectory)
 *      is a classic prefix-bypass (a sibling directory like "playwright-report-evil" would also
 *      pass that check), and symlinks inside the report directory could otherwise escape it too.
 */
function serveReportAsset(response: http.ServerResponse, relativePath: string): void {
  const decodedPath = decodeURIComponent(relativePath || 'index.html');
  const resolvedPath = path.resolve(reportDirectory, decodedPath);

  if (!isContainedInReportDirectory(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Report asset not found. Run npm test first to generate a report.');
    return;
  }

  const contentType = mimeTypesByExtension[path.extname(resolvedPath)] || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(resolvedPath).pipe(response);
}

function isContainedInReportDirectory(candidatePath: string): boolean {
  if (!fs.existsSync(reportDirectory) || !fs.existsSync(candidatePath)) {
    return false;
  }
  const realBase = fs.realpathSync(reportDirectory);
  const realCandidate = fs.realpathSync(candidatePath);
  const relative = path.relative(realBase, realCandidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
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

function runProjectSuite(response: http.ServerResponse, projectId: string): void {
  if (!ProjectRegistry.getProject(projectId)) {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: `Unknown project id: ${projectId}` }));
    return;
  }
  const child = spawn('npx', ['ts-node', 'src/cli/dhruva.ts', 'run-project', projectId], { detached: true, stdio: 'ignore' });
  child.unref();
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ launched: true, projectId }));
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

function toRelativePath(absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/');
}

function renderDashboardHtml(): string {
  const metrics = readLastRunMetrics();
  const healedCount = readHealedEventCount();
  const openBugsCount = readOpenBugsCount();
  const agentActivity = readAgentActivity();
  const projects = ProjectRegistry.listProjects();
  const { pending, resolved } = getPatchesPayload();
  const traceabilityRows = TraceabilityGenerator.generate();
  const logLines = readRecentExecutionLogLines(40);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DHRUVA Command HUD</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  ${renderStyles()}
</head>
<body>
  ${renderHeader(agentActivity)}
  <div class="app-shell">
    ${renderSidebar()}
    <main class="app-main">
      <section id="dashboard" class="metrics-row">
        ${renderRadialMetric('Total Tests', metrics.totalTests, Math.max(metrics.totalTests, 1), '')}
        ${renderRadialMetric('Pass Rate', metrics.passRatePercent, 100, '%')}
        ${renderRadialMetric('Healed Actions', healedCount, Math.max(healedCount, 1), '')}
        ${renderRadialMetric('Open Bugs', openBugsCount, Math.max(openBugsCount, 1), '')}
      </section>
      <div class="grid-3col">
        <section id="studio" class="col col-projects">
          <h2 class="col-title">Registered Projects</h2>
          <div class="col-body">${projects.map(project => renderProjectCard(project, metrics, openBugsCount)).join('')}</div>
        </section>
        <section class="col col-telemetry">
          <h2 class="col-title">Live Trace Arena</h2>
          <div class="col-body">
            <div class="terminal">${logLines.map(line => `<div class="terminal-line">${escapeHtml(line)}</div>`).join('') || '<div class="terminal-line dim">No execution log yet. Run npm test to populate this feed.</div>'}</div>
          </div>
        </section>
        <section id="execution" class="col col-approvals">
          <h2 class="col-title">Gated Approvals <span class="count-badge">${pending.length}</span></h2>
          <div class="col-body">${renderApprovalsDrawer(pending, resolved)}</div>
        </section>
      </div>
      <section id="matrix" class="full-width-section">
        <h2 class="col-title">Traceability Matrix <span class="count-badge">${traceabilityRows.length}</span></h2>
        ${renderTraceabilityTable(traceabilityRows)}
      </section>
      <section id="settings" class="full-width-section">
        <h2 class="col-title">Settings</h2>
        <div class="settings-panel">
          <p>Environment: <strong>${process.env.ENV || 'qa'}</strong></p>
          <p>Application: <strong>${process.env.APPLICATION_NAME || 'DHRUVA-Quality-OS'}</strong></p>
          <p>Report directory: <strong>${fs.existsSync(reportDirectory) ? 'available' : 'not generated yet - run npm test'}</strong></p>
        </div>
      </section>
    </main>
  </div>
  ${renderTraceModal()}
  ${renderCommandPalette(projects)}
  ${renderScripts()}
</body>
</html>`;
}

function renderHeader(agentActivity: Record<string, boolean>): string {
  const environment = process.env.ENV || 'qa';
  return `<header class="app-header">
    <div class="header-left">
      <span class="brand">DHRUVA</span>
      <span class="brand-subtitle">Command HUD</span>
    </div>
    <div class="agent-orbit">${agentRoster.map(agent => renderAgentIndicator(agent, agentActivity[agent.name])).join('')}</div>
    <div class="header-right">
      <span class="env-badge env-${environment}">${environment.toUpperCase()}</span>
      <button class="cmd-k-trigger" onclick="toggleCommandPalette()">Command <kbd>&#8984;K</kbd></button>
    </div>
  </header>`;
}

function renderAgentIndicator(agent: { name: string; role: string; color: string }, isActive: boolean): string {
  const activeClass = isActive ? 'agent-active' : 'agent-idle';
  return `<div class="agent-dot ${activeClass}" style="--agent-color:${agent.color}" title="${agent.name} - ${agent.role} (${isActive ? 'active' : 'idle'})">
    <span class="agent-glyph">${agent.name.charAt(0)}</span>
  </div>`;
}

function renderSidebar(): string {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'studio', label: 'Studio' },
    { id: 'execution', label: 'Execution' },
    { id: 'matrix', label: 'Matrix' },
    { id: 'settings', label: 'Settings' },
  ];
  const links = navItems.map(item => `<a href="#${item.id}" class="nav-item" data-nav="${item.id}">${item.label}</a>`).join('');
  return `<nav class="app-sidebar">${links}</nav>`;
}

function renderRadialMetric(label: string, value: number, max: number, suffix: string): string {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return `<div class="radial" style="--pct:${percent}">
    <div class="radial-ring"><span>${value}${suffix}</span></div>
    <p>${label}</p>
  </div>`;
}

/**
 * WHAT: Renders one project's status card with health, open bugs, and action buttons.
 * WHY: This is a single-suite framework instance, so Last Run Health and the report button
 *      reflect the one shared last run, not a truly isolated per-project run; Run Suite is the
 *      one action that genuinely re-runs scoped to this project's environment.
 * HOW: Formats project metadata plus shared run metrics into one compact card.
 */
function renderProjectCard(project: ProjectRecord, metrics: RunMetrics, openBugsCount: number): string {
  const statusLabel = metrics.totalTests === 0 ? 'NO RUNS YET' : metrics.failedTests > 0 ? 'FAILING' : 'PASSING';
  const statusClass = statusLabel.toLowerCase().replace(/\s+/g, '-');
  const targetUrl = project.targetUrl || 'Not configured';

  return `<div class="card">
    <div class="card-header"><span class="project-id">${project.id}</span><span class="badge ${statusClass}">${statusLabel}</span></div>
    <h3>${project.projectName}</h3>
    <p class="meta-line">${targetUrl}</p>
    <p class="meta-line">Env: <strong>${project.activeEnvironment}</strong> &middot; Bugs: <strong>${openBugsCount}</strong></p>
    <p class="meta-line">Health: <strong>${metrics.passedTests}/${metrics.totalTests} (${metrics.passRatePercent}%)</strong></p>
    <div class="project-actions">
      <button onclick="runProjectSuite('${project.id}', this)">Run Suite</button>
      <button onclick="openTraceModal()">View Trace</button>
      <button onclick="fetch('/launch/allure-report')">Allure Report</button>
    </div>
  </div>`;
}

function renderApprovalsDrawer(pending: HealedPatchRecord[], resolved: HealedPatchRecord[]): string {
  if (pending.length === 0 && resolved.length === 0) {
    return '<p class="empty-state">No healed-locator patches staged yet.</p>';
  }
  const tabs = `<div class="tabs">
    <button class="tab-btn active" data-tab="pending" onclick="switchPatchTab('pending', this)">Pending (${pending.length})</button>
    <button class="tab-btn" data-tab="resolved" onclick="switchPatchTab('resolved', this)">Resolved (${resolved.length})</button>
  </div>`;
  const pendingPane = `<div class="tab-pane" data-pane="pending">${pending.map(renderPatchCard).join('') || '<p class="empty-state">Nothing pending review.</p>'}</div>`;
  const resolvedPane = `<div class="tab-pane hidden" data-pane="resolved">${resolved.map(renderPatchCard).join('') || '<p class="empty-state">Nothing resolved yet.</p>'}</div>`;
  return `${tabs}<div class="patch-scroll">${pendingPane}${resolvedPane}</div>`;
}

function renderPatchCard(patch: HealedPatchRecord): string {
  const statusClass = patch.approvalStatus.toLowerCase().replace(/_/g, '-');
  const actions = patch.approvalStatus === 'PENDING_APPROVAL'
    ? `<div class="patch-actions">
        <button class="approve" onclick="resolvePatch('${patch.patchId}', 'APPROVE')">Approve &amp; Apply</button>
        <button class="reject" onclick="resolvePatch('${patch.patchId}', 'REJECT')">Reject</button>
      </div>`
    : `<div class="patch-resolved-label ${statusClass}">${patch.approvalStatus}${patch.reviewerName ? ` by ${patch.reviewerName}` : ''}</div>`;

  return `<div class="patch-card">
    <div class="patch-id">${patch.patchId}</div>
    <div class="patch-file">${toRelativePath(patch.targetFile)}</div>
    <div class="patch-diff">
      <div class="diff-line diff-removed">- ${escapeHtml(patch.staleLocator)}</div>
      <div class="diff-line diff-added">+ ${escapeHtml(patch.healedLocator)}</div>
    </div>
    ${actions}
  </div>`;
}

function renderTraceabilityTable(rows: TraceabilityRow[]): string {
  if (rows.length === 0) {
    return '<p class="empty-state">No test scenarios found.</p>';
  }
  const bodyRows = rows.map(renderTraceabilityRow).join('');
  return `<div class="table-scroll"><table class="trace-table">
    <thead><tr><th>Story ID</th><th>Epic / Feature</th><th>Spec File</th><th>Scenario Title</th><th>Tags</th><th>Last Run</th><th>Linked Defects</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table></div>`;
}

function renderTraceabilityRow(row: TraceabilityRow): string {
  const statusClass = `status-${row.lastRunStatus.toLowerCase().replace(/\s+/g, '-')}`;
  return `<tr>
    <td>${row.storyId}</td>
    <td>${row.epic} / ${row.feature}</td>
    <td class="mono">${row.specFile}</td>
    <td>${row.scenarioTitle}</td>
    <td>${row.tags.map(tag => `@${tag}`).join(', ')}</td>
    <td><span class="${statusClass}">${row.lastRunStatus}</span></td>
    <td>${row.linkedDefects.join(', ') || 'None'}</td>
  </tr>`;
}

function renderTraceModal(): string {
  return `<div id="traceModal" class="modal-overlay hidden">
    <div class="modal-panel">
      <div class="modal-header">
        <span>Trace Viewer</span>
        <button class="modal-close" onclick="closeTraceModal()" aria-label="Close">&times;</button>
      </div>
      <iframe id="traceFrame" class="modal-iframe" src="about:blank"></iframe>
    </div>
  </div>`;
}

function renderCommandPalette(projects: ProjectRecord[]): string {
  const projectCommands = projects.map(project =>
    `<button class="palette-item" onclick="runProjectSuite('${project.id}', this); toggleCommandPalette()">Run Suite: ${project.projectName}</button>`
  ).join('');
  return `<div id="commandPalette" class="modal-overlay hidden">
    <div class="palette-panel">
      <div class="palette-header">Command Palette</div>
      <button class="palette-item" onclick="location.hash='#dashboard'; toggleCommandPalette()">Go to Dashboard</button>
      <button class="palette-item" onclick="location.hash='#studio'; toggleCommandPalette()">Go to Studio</button>
      <button class="palette-item" onclick="location.hash='#execution'; toggleCommandPalette()">Go to Execution</button>
      <button class="palette-item" onclick="location.hash='#matrix'; toggleCommandPalette()">Go to Matrix</button>
      <button class="palette-item" onclick="openTraceModal(); toggleCommandPalette()">Open Trace Viewer</button>
      ${projectCommands}
    </div>
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderScripts(): string {
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

    async function runProjectSuite(projectId, buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = 'Running...';
      await fetch('/run-project/' + projectId);
      alert('Suite launched for ' + projectId + '. Refresh this page after it completes to see updated results.');
      buttonEl.disabled = false;
      buttonEl.textContent = 'Run Suite';
    }

    function openTraceModal() {
      document.getElementById('traceFrame').src = '/report/index.html';
      document.getElementById('traceModal').classList.remove('hidden');
    }

    function closeTraceModal() {
      document.getElementById('traceModal').classList.add('hidden');
      document.getElementById('traceFrame').src = 'about:blank';
    }

    function toggleCommandPalette() {
      document.getElementById('commandPalette').classList.toggle('hidden');
    }

    function switchPatchTab(tabName, buttonEl) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      buttonEl.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('hidden', pane.dataset.pane !== tabName);
      });
    }

    document.addEventListener('keydown', event => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCmdK) {
        event.preventDefault();
        toggleCommandPalette();
      }
      if (event.key === 'Escape') {
        document.getElementById('traceModal').classList.add('hidden');
        document.getElementById('commandPalette').classList.add('hidden');
      }
    });

    const sections = document.querySelectorAll('main section[id]');
    const navItems = document.querySelectorAll('.nav-item');
    const scrollObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navItems.forEach(item => item.classList.toggle('active', item.dataset.nav === entry.target.id));
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach(section => scrollObserver.observe(section));
  </script>`;
}

function renderStyles(): string {
  return `<style>
    :root {
      color-scheme: dark;
      --bg: #0B0F19;
      --panel: rgba(255, 255, 255, 0.04);
      --panel-border: rgba(255, 255, 255, 0.12);
      --text: #E6EBF5;
      --text-dim: #7D8AA8;
      --accent: #5EEAD4;
      --accent-violet: #A78BFA;
      --danger: #F87171;
      --warning: #FBBF24;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--bg); color: var(--text); margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .app-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.75rem; position: sticky; top: 0; z-index: 20;
      background: rgba(11, 15, 25, 0.75); backdrop-filter: blur(24px);
      border-bottom: 1px solid var(--panel-border);
    }
    .header-left { display: flex; align-items: baseline; gap: 0.6rem; }
    .brand { font-weight: 700; font-size: 1.15rem; letter-spacing: 0.06em; }
    .brand-subtitle { color: var(--text-dim); font-size: 0.8rem; }
    .agent-orbit { display: flex; gap: 0.85rem; }
    .agent-dot {
      width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--agent-color); background: color-mix(in srgb, var(--agent-color) 12%, transparent);
      color: var(--agent-color); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 600;
    }
    .agent-dot.agent-active { box-shadow: 0 0 12px var(--agent-color); animation: agentPulse 2.4s ease-in-out infinite; }
    .agent-dot.agent-idle { opacity: 0.4; }
    @keyframes agentPulse {
      0%, 100% { box-shadow: 0 0 8px var(--agent-color); }
      50% { box-shadow: 0 0 18px var(--agent-color); }
    }
    .header-right { display: flex; align-items: center; gap: 0.85rem; }
    .env-badge { font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px; letter-spacing: 0.05em; }
    .env-badge.env-prod { background: rgba(248, 113, 113, 0.18); color: var(--danger); }
    .env-badge.env-qa, .env-badge.env-staging, .env-badge.env-localhost, .env-badge.env-dev {
      background: rgba(94, 234, 212, 0.14); color: var(--accent);
    }
    .cmd-k-trigger {
      background: var(--panel); border: 1px solid var(--panel-border); color: var(--text);
      border-radius: 8px; padding: 0.45rem 0.85rem; font-size: 0.8rem; cursor: pointer;
    }
    .cmd-k-trigger kbd { font-family: 'JetBrains Mono', monospace; color: var(--text-dim); margin-left: 0.3rem; }
    .app-shell { display: flex; min-height: calc(100vh - 66px); }
    .app-sidebar {
      width: 200px; flex-shrink: 0; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.35rem;
      border-right: 1px solid var(--panel-border); position: sticky; top: 66px; height: calc(100vh - 66px);
    }
    .nav-item {
      color: var(--text-dim); text-decoration: none; padding: 0.6rem 0.85rem; border-radius: 8px;
      font-size: 0.9rem; border-left: 2px solid transparent; transition: color 0.15s, border-color 0.15s;
    }
    .nav-item.active { color: var(--accent); border-left-color: var(--accent); background: rgba(94, 234, 212, 0.08); }
    .app-main { flex: 1; padding: 1.75rem; min-width: 0; }
    .metrics-row { display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
    .radial { text-align: center; }
    .radial-ring {
      width: 92px; height: 92px; border-radius: 50%;
      background: conic-gradient(var(--accent) calc(var(--pct) * 1%), rgba(255,255,255,0.06) 0);
      display: flex; align-items: center; justify-content: center; margin: 0 auto;
    }
    .radial-ring span {
      width: 70px; height: 70px; border-radius: 50%; background: var(--bg);
      display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 600;
    }
    .radial p { color: var(--text-dim); margin-top: 0.6rem; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .grid-3col { display: grid; grid-template-columns: 1.1fr 1fr 1.1fr; gap: 1.25rem; align-items: start; }
    @media (max-width: 1100px) { .grid-3col { grid-template-columns: 1fr; } }
    .col {
      background: var(--panel); border: 1px solid var(--panel-border); border-radius: 16px;
      backdrop-filter: blur(24px); box-shadow: 0 8px 32px rgba(0,0,0,0.35); padding: 1.25rem;
      display: flex; flex-direction: column; min-height: 320px;
    }
    .col-title {
      font-size: 0.95rem; margin: 0 0 1rem; letter-spacing: 0.03em; display: flex; align-items: center; gap: 0.5rem;
    }
    .count-badge {
      background: rgba(94, 234, 212, 0.16); color: var(--accent); font-size: 0.72rem; font-weight: 700;
      padding: 0.1rem 0.5rem; border-radius: 999px;
    }
    .col-body { flex: 1; overflow-y: auto; max-height: 460px; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 12px; padding: 1rem; margin-bottom: 0.85rem; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
    .project-id { color: var(--text-dim); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }
    .badge { font-size: 0.68rem; padding: 0.18rem 0.55rem; border-radius: 999px; font-weight: 600; }
    .badge.passing { background: rgba(94, 234, 212, 0.16); color: var(--accent); }
    .badge.failing { background: rgba(248, 113, 113, 0.16); color: var(--danger); }
    .badge.no-runs-yet { background: rgba(255,255,255,0.08); color: var(--text-dim); }
    .card h3 { font-size: 0.98rem; margin: 0.2rem 0; }
    .meta-line { color: var(--text-dim); font-size: 0.82rem; margin: 0.2rem 0; word-break: break-word; }
    .project-actions { display: flex; gap: 0.4rem; margin-top: 0.75rem; flex-wrap: wrap; }
    button {
      background: rgba(255,255,255,0.05); color: var(--text); border: 1px solid var(--panel-border); border-radius: 8px;
      padding: 0.5rem 0.8rem; font-size: 0.78rem; cursor: pointer; font-family: inherit;
    }
    button:hover { background: rgba(255,255,255,0.1); }
    button:disabled { opacity: 0.5; cursor: default; }
    .terminal {
      background: #05070C; border: 1px solid var(--panel-border); border-radius: 10px; padding: 0.85rem;
      font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; line-height: 1.55; max-height: 420px; overflow-y: auto;
    }
    .terminal-line { color: #9CE6D6; white-space: pre-wrap; word-break: break-all; }
    .terminal-line.dim { color: var(--text-dim); }
    .empty-state { color: var(--text-dim); font-size: 0.85rem; }
    .tabs { display: flex; gap: 0.4rem; margin-bottom: 0.85rem; }
    .tab-btn {
      background: transparent; border: 1px solid var(--panel-border); font-size: 0.75rem; padding: 0.4rem 0.75rem;
    }
    .tab-btn.active { background: rgba(94, 234, 212, 0.14); color: var(--accent); border-color: var(--accent); }
    .patch-scroll { max-height: 380px; overflow-y: auto; }
    .hidden { display: none !important; }
    .patch-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(251,146,60,0.25); border-radius: 10px; padding: 0.85rem; margin-bottom: 0.75rem; }
    .patch-id { font-family: 'JetBrains Mono', monospace; color: var(--text-dim); font-size: 0.68rem; margin-bottom: 0.35rem; }
    .patch-file { font-family: 'JetBrains Mono', monospace; color: #B6C0D6; font-size: 0.72rem; margin-bottom: 0.6rem; word-break: break-all; }
    .patch-diff {
      font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; border-radius: 6px; overflow: hidden; margin-bottom: 0.6rem;
    }
    .diff-line { padding: 0.3rem 0.5rem; white-space: pre-wrap; word-break: break-all; }
    .diff-removed { background: rgba(248, 113, 113, 0.14); color: #FCA5A5; }
    .diff-added { background: rgba(94, 234, 212, 0.14); color: #99F6E4; }
    .patch-actions { display: flex; gap: 0.5rem; }
    .patch-actions .approve { background: rgba(94, 234, 212, 0.14); border-color: #1c5c46; }
    .patch-actions .reject { background: rgba(248, 113, 113, 0.14); border-color: #5c2020; }
    .patch-resolved-label { font-size: 0.72rem; font-weight: 600; }
    .patch-resolved-label.approved { color: var(--accent); }
    .patch-resolved-label.rejected { color: var(--danger); }
    .full-width-section {
      background: var(--panel); border: 1px solid var(--panel-border); border-radius: 16px;
      backdrop-filter: blur(24px); box-shadow: 0 8px 32px rgba(0,0,0,0.35); padding: 1.25rem; margin-top: 1.25rem;
    }
    .table-scroll { overflow-x: auto; }
    .trace-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .trace-table th, .trace-table td { text-align: left; padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--panel-border); white-space: nowrap; }
    .trace-table td.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
    .trace-table th { color: var(--text-dim); text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.05em; }
    .status-passed { color: var(--accent); }
    .status-failed { color: var(--danger); }
    .status-flaky { color: var(--warning); }
    .status-not-run, .status-skipped { color: var(--text-dim); }
    .settings-panel p { color: var(--text-dim); font-size: 0.88rem; margin: 0.35rem 0; }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(5, 7, 12, 0.7); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .modal-panel {
      width: min(1100px, 92vw); height: min(760px, 88vh); background: rgba(17, 22, 34, 0.92);
      border: 1px solid var(--panel-border); border-radius: 16px; backdrop-filter: blur(24px);
      box-shadow: 0 24px 64px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.1rem;
      border-bottom: 1px solid var(--panel-border); font-size: 0.9rem;
    }
    .modal-close { background: transparent; border: none; font-size: 1.3rem; line-height: 1; padding: 0.2rem 0.5rem; }
    .modal-iframe { flex: 1; border: none; background: #05070C; }
    .palette-panel {
      width: min(480px, 90vw); background: rgba(17, 22, 34, 0.94); border: 1px solid var(--panel-border);
      border-radius: 14px; backdrop-filter: blur(24px); box-shadow: 0 24px 64px rgba(0,0,0,0.5);
      padding: 0.5rem; display: flex; flex-direction: column; gap: 0.2rem;
    }
    .palette-header { color: var(--text-dim); font-size: 0.75rem; padding: 0.5rem 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .palette-item { background: transparent; border: none; text-align: left; padding: 0.6rem 0.75rem; border-radius: 8px; }
    .palette-item:hover { background: rgba(94, 234, 212, 0.1); }
  </style>`;
}
