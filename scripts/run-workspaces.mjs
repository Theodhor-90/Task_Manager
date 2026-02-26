import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
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

const child = spawn(
  'npm',
  ['run', scriptName, '--workspaces', '--if-present'],
  { stdio: 'inherit', detached: true }
);

function cleanup(signal) {
  try { process.kill(-child.pid, signal); } catch { /* already dead */ }
}

process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));

child.on('close', (code) => {
  process.exit(typeof code === 'number' ? code : 1);
});

child.on('error', () => {
  process.exit(1);
});
