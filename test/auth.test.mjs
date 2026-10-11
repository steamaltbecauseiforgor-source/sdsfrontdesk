import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('auth.ts exists and exports default and config', () => {
  const content = readFileSync('netlify/edge-functions/auth.ts', 'utf8');
  assert.ok(content.includes('export default async'), 'Should have default export');
  assert.ok(content.includes('export const config'), 'Should have config export');
  assert.ok(
    content.includes('SITE_AUTH_USERNAME') || content.includes('AUTH_USERNAME'),
    'Should reference username environment variable'
  );
  assert.ok(
    content.includes('SITE_AUTH_PASSWORD') || content.includes('AUTH_PASSWORD'),
    'Should reference password environment variable'
  );
  assert.ok(content.includes('sds_auth_session'), 'Should use session cookie');
});

test('auth.ts supports multiple sign out routes and clears cookie with expiration', () => {
  const content = readFileSync('netlify/edge-functions/auth.ts', 'utf8');
  assert.ok(content.includes('/auth/logout'), 'Should support /auth/logout');
  assert.ok(content.includes('/logout'), 'Should support /logout');
  assert.ok(content.includes('/signout'), 'Should support /signout');
  assert.ok(content.includes('/auth/signout'), 'Should support /auth/signout');
  assert.ok(content.includes('Max-Age=0'), 'Should clear cookie with Max-Age=0');
  assert.ok(content.includes('logged_out=1'), 'Should redirect with logged_out parameter');
  assert.ok(
    content.includes('You have been signed out successfully.'),
    'Should display signed out confirmation message'
  );
});

test('index.html has accessible and visible sign out buttons in header and footer', () => {
  const content = readFileSync('index.html', 'utf8');
  assert.ok(content.includes('/auth/logout'), 'Should include logout link');
  assert.ok(content.includes('logout-btn'), 'Should include styled logout button class');
  assert.ok(content.includes('footer-signout-link'), 'Should include footer sign out link');
  assert.ok(content.includes('Sign Out'), 'Should include Sign Out text');
});

test('.gitignore contains environment variable patterns', () => {
  const content = readFileSync('.gitignore', 'utf8');
  assert.ok(content.includes('.env'), 'Should ignore .env');
  assert.ok(content.includes('.env.local'), 'Should ignore .env.local');
  assert.ok(content.includes('.env*.local'), 'Should ignore .env*.local');
});
