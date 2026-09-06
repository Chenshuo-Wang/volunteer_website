const { execSync } = require('child_process');
const fs = require('fs');

console.log('--- Step 1: Building frontend ---');
execSync('npm install && npm run build', { cwd: 'frontend', stdio: 'inherit' });

console.log('--- Step 2: Syncing build artifacts to dist and public ---');
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('frontend/dist', 'dist', { recursive: true });

fs.rmSync('public', { recursive: true, force: true });
fs.cpSync('frontend/dist', 'public', { recursive: true });

console.log('--- Build successfully completed ---');
