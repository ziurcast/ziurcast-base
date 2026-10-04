import { describe, expect, it } from 'vitest';
import { normalizePackageName, validateProjectName } from './project-name.js';

describe('project name validation', () => {
  it('accepts a simple project name', () => {
    expect(validateProjectName('my-project')).toEqual({
      valid: true,
      projectName: 'my-project',
      packageName: 'my-project',
    });
  });

  it('rejects empty and path-like names', () => {
    expect(validateProjectName(' ').valid).toBe(false);
    expect(validateProjectName('../other').valid).toBe(false);
    expect(validateProjectName('name/child').valid).toBe(false);
    expect(validateProjectName('invalid?name').valid).toBe(false);
    expect(validateProjectName('CON').valid).toBe(false);
  });

  it('rejects npm reserved package names', () => {
    expect(validateProjectName('node_modules').valid).toBe(false);
  });
});

describe('package name normalization', () => {
  it('lowercases and converts spaces and unsupported characters to hyphens', () => {
    expect(normalizePackageName('My Project!')).toBe('my-project');
  });

  it('collapses repeated separators and trims invalid edge punctuation', () => {
    expect(normalizePackageName(' ..My__Project-- ')).toBe('my__project');
  });
});
