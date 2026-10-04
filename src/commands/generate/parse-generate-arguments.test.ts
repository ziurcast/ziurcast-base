import { describe, expect, it } from 'vitest';
import { parseGenerateArguments } from './parse-generate-arguments.js';

const usage = 'Usage: test';

describe('generate command arguments', () => {
  it('parses the artifact name and options in any order', () => {
    const { name, options } = parseGenerateArguments(
      ['UsersPage', '--route', '/users', '--scope', 'modules/users'],
      ['--scope', '--route'],
      usage,
    );

    expect(name).toBe('UsersPage');
    expect(Object.fromEntries(options)).toEqual({
      '--route': '/users',
      '--scope': 'modules/users',
    });
  });

  it('rejects a missing name, unknown, duplicate, or incomplete options', () => {
    for (const args of [
      [],
      ['--scope', 'modules/users'],
      ['useUsers', '--unknown', 'value'],
      ['useUsers', '--scope', 'modules/users', '--scope', 'core'],
      ['useUsers', '--scope'],
      ['useUsers', '--scope', '--route'],
    ]) {
      expect(() => parseGenerateArguments(args, ['--scope', '--route'], usage)).toThrow();
    }
  });
});
