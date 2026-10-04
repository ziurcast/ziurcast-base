import { describe, expect, it } from 'vitest';
import { createDefaultComponentSource } from './default-component.js';

describe('default component source', () => {
  it('marks Next.js components as client components', () => {
    expect(createDefaultComponentSource('Card', 'next')).toMatch(/^'use client';/);
  });

  it('omits the client directive in React projects', () => {
    const source = createDefaultComponentSource('Card', 'react');

    expect(source).not.toContain('use client');
    expect(source).toContain('export const Card = (');
  });
});
