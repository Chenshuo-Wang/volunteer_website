const { execSync } = require('child_process');
const fs = require('fs');

const path = require('path');

const nodeDir = path.dirname(process.execPath);
const pathEnv = process.env.PATH || process.env.Path || '';
const env = {
  ...process.env,
  PATH: `${nodeDir}${path.delimiter}${pathEnv}`,
  Path: `${nodeDir}${path.delimiter}${pathEnv}`,
};
const shell = process.platform === 'win32' ? 'powershell.exe' : undefined;

console.log('--- Step 1: Building frontend ---');
execSync('npm install', { cwd: 'frontend', stdio: 'inherit', env, shell });
execSync('npm run build', { cwd: 'frontend', stdio: 'inherit', env, shell });

console.log('--- Step 2: Syncing build artifacts to dist and public ---');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('frontend/dist', 'dist', { recursive: true });

fs.rmSync('public', { recursive: true, force: true });
fs.cpSync('frontend/dist', 'public', { recursive: true });

console.log('--- Build successfully completed ---');
