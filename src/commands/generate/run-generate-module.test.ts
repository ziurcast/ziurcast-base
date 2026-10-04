import { describe, expect, it } from 'vitest';
import {
  parseGenerateModuleArguments,
  runGenerateModuleCommand,
} from './run-generate-module.js';

describe('generate module command arguments', () => {
  it('parses selected artifacts and allows options in any order', () => {
    expect(
      parseGenerateModuleArguments([
        'users',
        '--route',
        '/users',
        '--api',
        'getUsers',
        '--page',
        'UserList',
        '--hook',
        'useUsers',
      ]),
    ).toEqual({
      domain: 'users',
      selections: {
        route: '/users',
        api: 'getUsers',
        page: 'UserList',
        hook: 'useUsers',
      },
    });
  });

  it('rejects duplicate, unknown, or incomplete options', () => {
    for (const args of [
      ['users', '--api', 'getUsers', '--api', 'getOtherUsers'],
      ['users', '--component', 'Button'],
      ['users', '--api'],
      ['users', '--api', '--hook', 'useUsers'],
    ]) {
      expect(() => parseGenerateModuleArguments(args)).toThrow();
    }
  });

  it('rejects no artifact and route without page before reading project context', async () => {
    await expect(runGenerateModuleCommand('users', {}, '/non-project')).rejects.toThrow(
      'Select at least one module artifact',
    );
    await expect(
      runGenerateModuleCommand('users', { route: '/users' }, '/non-project'),
    ).rejects.toThrow('--page and --route must be provided together');
  });
});
