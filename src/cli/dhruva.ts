import { ProjectRegistry } from '../registry/ProjectRegistry';

const command = process.argv[2] || 'status';

console.log(`\n=======================================================`);
console.log(`   DHRUVA: Autonomous Quality Engineering Platform      `);
console.log(`=======================================================\n`);

if (command === 'status') {
  console.log(`Active Projects in Registry:`);
  const projects = ProjectRegistry.listProjects();
  projects.forEach((proj) => {
    console.log(`  - [${proj.id}] ${proj.projectName} | Active Env: ${proj.activeEnvironment}`);
  });
  console.log(`\nSystem Status: Operational & Ready for Execution.\n`);
} else if (command === 'run') {
  console.log(`Initiating Playwright MAP Execution Engine...\n`);
  // Invoked via npm test / npx playwright test
} else {
  console.log(`Command [${command}] received.\n`);
}
