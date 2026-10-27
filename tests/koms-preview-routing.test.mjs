import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('routes KOMS preview paths through the personal domain', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(config.rewrites, [
    {
      source: '/koms',
      destination: 'https://caelan-previews.vercel.app/koms',
    },
    {
      source: '/koms/:path*',
      destination: 'https://caelan-previews.vercel.app/koms/:path*',
    },
  ]);
});
