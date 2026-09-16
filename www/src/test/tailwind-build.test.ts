import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('tailwind config', () => {
  it('uses the tw- prefix to avoid Bootstrap collisions', () => {
    const cfg = fs.readFileSync(
      path.resolve(__dirname, '../../tailwind.config.js'),
      'utf8',
    );
    expect(cfg).toContain("prefix: 'tw-'");
  });
});
