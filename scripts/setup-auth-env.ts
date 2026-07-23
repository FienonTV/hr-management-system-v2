import 'dotenv/config';
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

const envPath = '.env';
let content = '';
try {
  content = readFileSync(envPath, 'utf-8');
} catch {
  // file does not exist
}

const lines = content.split('\n').filter((line) => line.trim() !== '');
const map = new Map<string, string>();

for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
  }
}

if (!map.has('AUTH_SECRET')) {
  map.set('AUTH_SECRET', randomBytes(32).toString('hex'));
}

map.set('NEXTAUTH_URL', 'http://localhost:3002');

const newContent = Array.from(map.entries())
  .map(([key, value]) => `${key}=${value}`)
  .join('\n') + '\n';

writeFileSync(envPath, newContent);
console.log('AUTH_SECRET set:', map.has('AUTH_SECRET'));
console.log('NEXTAUTH_URL set:', map.get('NEXTAUTH_URL'));
