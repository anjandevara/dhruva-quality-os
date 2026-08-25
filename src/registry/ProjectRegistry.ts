export interface ProjectRecord {
  id: string;
  projectName: string;
  repositoryPath: string;
  activeEnvironment: string;
  s3BucketPrefix?: string;
  createdAt: string;
}

export class ProjectRegistry {
  private static projects: Map<string, ProjectRecord> = new Map([
    [
      'PRJ-001',
      {
        id: 'PRJ-001',
        projectName: 'E-Commerce Web Portal',
        repositoryPath: process.cwd(),
        activeEnvironment: 'qa',
        s3BucketPrefix: 'ecommerce-web',
        createdAt: new Date().toISOString(),
      },
    ],
    [
      'PRJ-002',
      {
        id: 'PRJ-002',
        projectName: 'Weekday Talent Sourcing Portal',
        repositoryPath: process.cwd(),
        activeEnvironment: 'staging',
        s3BucketPrefix: 'weekday-portal',
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  static listProjects(): ProjectRecord[] {
    return Array.from(this.projects.values());
  }

  static getProject(projectId: string): ProjectRecord | undefined {
    return this.projects.get(projectId);
  }

  static registerProject(project: ProjectRecord): void {
    this.projects.set(project.id, project);
  }
}
