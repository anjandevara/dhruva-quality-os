import * as fs from 'fs';
import * as path from 'path';

export interface ProjectRecord {
  id: string;
  projectName: string;
  repositoryPath: string;
  activeEnvironment: string;
  s3BucketPrefix?: string;
  createdAt: string;
  targetUrl?: string;
}

const seedProjects: ProjectRecord[] = [
  {
    id: 'PRJ-001',
    projectName: 'E-Commerce Web Portal',
    repositoryPath: process.cwd(),
    activeEnvironment: 'qa',
    s3BucketPrefix: 'ecommerce-web',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'PRJ-002',
    projectName: 'Weekday Talent Sourcing Portal',
    repositoryPath: process.cwd(),
    activeEnvironment: 'staging',
    s3BucketPrefix: 'weekday-portal',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'PRJ-003',
    projectName: 'Automation Exercise Live Store',
    repositoryPath: process.cwd(),
    activeEnvironment: 'qa',
    s3BucketPrefix: 'ecommerce-store',
    createdAt: new Date(0).toISOString(),
    targetUrl: 'https://automationexercise.com',
  },
];

/**
 * WHAT: Multi-project isolation registry, seeded with defaults and mirrored to disk.
 * WHY: Code is canonical; this registry is a reflection cache so CLI-registered projects
 *      survive across separate process invocations without becoming a source-of-truth file.
 * HOW: Reads/writes registry-cache.json alongside the seeded defaults.
 */
export class ProjectRegistry {
  private static readonly cacheFilePath = path.resolve(__dirname, '../../registry-cache.json');
  private static projects: Map<string, ProjectRecord> = ProjectRegistry.loadProjects();

  static listProjects(): ProjectRecord[] {
    return Array.from(this.projects.values());
  }

  static getProject(projectId: string): ProjectRecord | undefined {
    return this.projects.get(projectId);
  }

  static registerProject(project: ProjectRecord): void {
    this.projects.set(project.id, project);
    this.persistProjects();
  }

  private static loadProjects(): Map<string, ProjectRecord> {
    const projects = new Map<string, ProjectRecord>(seedProjects.map(project => [project.id, project]));

    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const cached: ProjectRecord[] = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf-8'));
        cached.forEach(project => projects.set(project.id, project));
      } catch {
        // Corrupt or unreadable cache; fall back to seed defaults only.
      }
    }

    return projects;
  }

  private static persistProjects(): void {
    fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.listProjects(), null, 2), 'utf-8');
  }
}
