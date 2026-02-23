import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const scriptName = process.argv[2];

if (!scriptName) {
  console.error('Missing script name. Usage: node scripts/run-workspaces.mjs <script>');
  process.exit(1);
}

const packagesDir = path.resolve('packages');
const workspaceDirs = [];

if (existsSync(packagesDir)) {
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const workspacePkgJson = path.join(packagesDir, entry.name, 'package.json');
    if (existsSync(workspacePkgJson)) {
      workspaceDirs.push(entry.name);
    }
  }
}

if (workspaceDirs.length === 0) {
  console.log(`No workspaces found under packages/*; skipping ${scriptName}.`);
  process.exit(0);
}

const result = spawnSync(
  'npm',
  ['run', scriptName, '--workspaces', '--if-present'],
  { stdio: 'inherit' }
);

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
