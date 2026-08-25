import * as fs from 'fs';
import * as path from 'path';

export interface TraceabilityRow {
  storyId: string;
  epic: string;
  feature: string;
  specFile: string;
  scenarioTitle: string;
  description: string;
  tags: string[];
  lastRunStatus: string;
  linkedDefects: string[];
}

interface ScannedScenario {
  title: string;
  epic: string;
  feature: string;
  story: string;
  description: string;
  tags: string[];
}

const repoRoot = path.resolve(__dirname, '../..');

/**
 * WHAT: Regenerates documents/traceability-matrix.md from the live test suite, last run, and bug log.
 * WHY: A traceability matrix drifts from reality the moment it's hand-maintained; this one is
 *      derived every time from the same TypeScript in Git that "Code is Canonical" already treats
 *      as the master truth.
 * HOW: Regex-scans allure.epic/feature/story/description calls per test(), joins against the
 *      Playwright JSON reporter's per-spec status and documents/bugs.md's active defects.
 */
export class TraceabilityGenerator {
  private static readonly testsDirectory = path.resolve(repoRoot, 'tests');
  private static readonly matrixFilePath = path.resolve(repoRoot, 'documents/traceability-matrix.md');
  private static readonly resultsFilePath = path.resolve(repoRoot, 'test-results/results.json');
  private static readonly bugsFilePath = path.resolve(repoRoot, 'documents/bugs.md');

  static generate(): TraceabilityRow[] {
    const runStatusByKey = this.readRunStatusByKey();
    const activeDefectsBySpecFile = this.readActiveDefectsBySpecFile();
    const rows = this.findSpecFiles(this.testsDirectory)
      .flatMap(specFile => this.buildRowsForFile(specFile, runStatusByKey, activeDefectsBySpecFile))
      .map((row, index) => ({ ...row, storyId: `TC-${String(index + 1).padStart(3, '0')}` }));

    this.writeMatrixFile(rows);
    return rows;
  }

  private static buildRowsForFile(
    specFile: string,
    runStatusByKey: Map<string, string>,
    activeDefectsBySpecFile: Map<string, string[]>
  ): TraceabilityRow[] {
    const relativePath = path.relative(repoRoot, specFile).replace(/\\/g, '/');
    const scenarios = this.extractScenarios(fs.readFileSync(specFile, 'utf-8'));

    return scenarios.map(scenario => ({
      storyId: '',
      epic: scenario.epic,
      feature: scenario.feature,
      specFile: relativePath,
      scenarioTitle: scenario.title,
      description: scenario.description,
      tags: scenario.tags,
      lastRunStatus: runStatusByKey.get(`${relativePath}::${scenario.title}`) || 'NOT RUN',
      linkedDefects: activeDefectsBySpecFile.get(relativePath) || [],
    }));
  }

  private static findSpecFiles(directory: string): string[] {
    if (!fs.existsSync(directory)) {
      return [];
    }
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return this.findSpecFiles(fullPath);
      }
      return entry.name.endsWith('.spec.ts') ? [fullPath] : [];
    });
  }

  /**
   * WHAT: Regex-extracts one scenario per top-level test() call in a spec file.
   * WHY: This codebase consistently opens every test with allure.epic/feature/story/description
   *      calls, so a lightweight per-block scan is reliable without a full AST parse.
   * HOW: Slices the file at each test() boundary, then searches each slice for the allure calls
   *      and combines describe-level and test-level @tags.
   */
  private static extractScenarios(content: string): ScannedScenario[] {
    const describeTags = this.extractTags(this.matchFirst(content, /test\.describe(?:\.serial)?\(\s*'([^']+)'/) || '');
    const testStarts = [...content.matchAll(/\btest\(\s*'([^']+)'/g)];

    return testStarts.map((match, index) => {
      const blockStart = match.index ?? 0;
      const blockEnd = index + 1 < testStarts.length ? testStarts[index + 1].index! : content.length;
      const block = content.slice(blockStart, blockEnd);
      const title = match[1];

      return {
        title,
        epic: this.matchFirst(block, /allure\.epic\(\s*'([^']+)'/) || '',
        feature: this.matchFirst(block, /allure\.feature\(\s*'([^']+)'/) || '',
        story: this.matchFirst(block, /allure\.story\(\s*'([^']+)'/) || '',
        description: this.extractDescription(block),
        tags: [...new Set([...describeTags, ...this.extractTags(title)])],
      };
    });
  }

  private static extractDescription(block: string): string {
    const descriptionMatch = block.match(/allure\.description\(\s*([\s\S]*?)\s*\);/);
    if (!descriptionMatch) {
      return '';
    }
    return descriptionMatch[1]
      .split('+')
      .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
      .join(' ')
      .replace(/\\n/g, ' ')
      .trim();
  }

  private static extractTags(source: string): string[] {
    return [...source.matchAll(/@([\w-]+)/g)].map(match => match[1]);
  }

  private static matchFirst(source: string, pattern: RegExp): string | null {
    return source.match(pattern)?.[1] ?? null;
  }

  private static readRunStatusByKey(): Map<string, string> {
    const statusByKey = new Map<string, string>();
    if (!fs.existsSync(this.resultsFilePath)) {
      return statusByKey;
    }
    try {
      const report = JSON.parse(fs.readFileSync(this.resultsFilePath, 'utf-8'));
      this.collectSpecStatuses(report.suites || [], statusByKey);
    } catch {
      // Unreadable report; every scenario falls back to NOT RUN.
    }
    return statusByKey;
  }

  private static collectSpecStatuses(suites: any[], statusByKey: Map<string, string>): void {
    for (const suite of suites) {
      const relativeFile = suite.file ? suite.file.replace(/\\/g, '/') : null;
      for (const spec of suite.specs || []) {
        if (relativeFile) {
          statusByKey.set(`tests/${relativeFile}::${spec.title}`, this.formatRunStatus(spec));
        }
      }
      this.collectSpecStatuses(suite.suites || [], statusByKey);
    }
  }

  private static formatRunStatus(spec: any): string {
    const status = spec.tests?.[0]?.status;
    const statusLabels: Record<string, string> = {
      expected: 'PASSED', unexpected: 'FAILED', flaky: 'FLAKY', skipped: 'SKIPPED',
    };
    return statusLabels[status] || 'UNKNOWN';
  }

  private static readActiveDefectsBySpecFile(): Map<string, string[]> {
    const defectsBySpecFile = new Map<string, string[]>();
    if (!fs.existsSync(this.bugsFilePath)) {
      return defectsBySpecFile;
    }
    const content = fs.readFileSync(this.bugsFilePath, 'utf-8');
    const bugSections = content.split(/(?=^## BUG-)/m).filter(section => section.startsWith('## BUG-'));

    for (const section of bugSections) {
      this.linkActiveBugToSpecFile(section, defectsBySpecFile);
    }
    return defectsBySpecFile;
  }

  private static linkActiveBugToSpecFile(section: string, defectsBySpecFile: Map<string, string[]>): void {
    const bugId = this.matchFirst(section, /^## (BUG-\d+):/m);
    const status = this.matchFirst(section, /\*\*Current Status\*\*:\s*(.+)/);
    const specFile = this.matchFirst(section, /\*\*Test Spec File\*\*:\s*`([^`]+)`/);

    if (!bugId || !specFile || status?.trim() === 'Verified Fixed') {
      return;
    }
    const existing = defectsBySpecFile.get(specFile) || [];
    defectsBySpecFile.set(specFile, [...existing, bugId]);
  }

  private static writeMatrixFile(rows: TraceabilityRow[]): void {
    const header = '| Story ID | Epic / Feature | Spec File | Scenario Title | Tags | Last Run Status | Linked Defects |';
    const divider = '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |';
    const tableRows = rows.map(row => this.formatRow(row));
    const generatedAt = new Date().toISOString();

    const content = [
      '# Traceability Matrix',
      '',
      `Generated: ${generatedAt}`,
      '',
      header,
      divider,
      ...tableRows,
      '',
    ].join('\n');

    fs.writeFileSync(this.matrixFilePath, content, 'utf-8');
  }

  private static formatRow(row: TraceabilityRow): string {
    const epicFeature = `${row.epic} / ${row.feature}`;
    const tags = row.tags.map(tag => `@${tag}`).join(', ') || 'none';
    const linkedDefects = row.linkedDefects.join(', ') || 'None';
    return `| ${row.storyId} | ${epicFeature} | ${row.specFile} | ${row.scenarioTitle} | ${tags} | ${row.lastRunStatus} | ${linkedDefects} |`;
  }
}
