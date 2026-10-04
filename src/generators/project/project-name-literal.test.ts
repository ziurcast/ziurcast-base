import { describe, expect, it } from 'vitest';
import { toProjectNameLiteral } from './project-name-literal.js';

describe('project name literal', () => {
  it('uses single quotes by default', () => {
    expect(toProjectNameLiteral('my-project')).toBe("'my-project'");
  });

  it('uses double quotes when the name contains an apostrophe', () => {
    expect(toProjectNameLiteral("Tom's app")).toBe(`"Tom's app"`);
  });
});
