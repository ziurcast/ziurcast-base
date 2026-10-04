#!/usr/bin/env node
import { runCreateProject } from '../commands/create-project/index.js';
import { generateComponentUsage, runGenerateCommand } from '../commands/generate/index.js';
import { parseGenerateArguments } from '../commands/generate/parse-generate-arguments.js';
import { generateApiUsage, runGenerateApiCommand } from '../commands/generate/run-generate-api.js';
import { generatePageUsage, runGeneratePageCommand } from '../commands/generate/run-generate-page.js';
import { generateHookUsage, runGenerateHookCommand } from '../commands/generate/run-generate-hook.js';
import {
  generateModuleUsage,
  parseGenerateModuleArguments,
  runGenerateModuleCommand,
} from '../commands/generate/run-generate-module.js';
import { readGeneratorVersion } from '../generators/project/generator-version.js';

const createProjectUsage = 'Usage: ziurcast-base [project-name]';

const helpText = [
  createProjectUsage,
  generateComponentUsage,
  generateHookUsage,
  generateApiUsage,
  generatePageUsage,
  generateModuleUsage,
  'Usage: ziurcast-base --help | --version',
].join('\n');

const runGenerate = async (args: string[]): Promise<void> => {
  const [artifact, ...artifactArgs] = args;

  if (artifact === 'component') {
    const { name } = parseGenerateArguments(artifactArgs, [], generateComponentUsage);
    await runGenerateCommand(artifact, name);
    return;
  }

  if (artifact === 'module') {
    const { domain, selections } = parseGenerateModuleArguments(artifactArgs);
    await runGenerateModuleCommand(domain, selections);
    return;
  }

  if (artifact === 'page') {
    const { name, options } = parseGenerateArguments(
      artifactArgs,
      ['--scope', '--route'],
      generatePageUsage,
    );
    await runGeneratePageCommand(name, options.get('--scope'), options.get('--route'));
    return;
  }

  if (artifact === 'api') {
    const { name, options } = parseGenerateArguments(artifactArgs, ['--scope'], generateApiUsage);
    await runGenerateApiCommand(name, options.get('--scope'));
    return;
  }

  if (artifact === 'hook') {
    const { name, options } = parseGenerateArguments(artifactArgs, ['--scope'], generateHookUsage);
    await runGenerateHookCommand(name, options.get('--scope'));
    return;
  }

  throw new Error(helpText);
};

const runCli = async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(helpText);
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(readGeneratorVersion());
    return;
  }

  if (args[0] === 'generate') {
    await runGenerate(args.slice(1));
    return;
  }

  if (args.length > 1 || args[0]?.startsWith('-')) {
    throw new Error(helpText);
  }

  await runCreateProject(args[0]);
};

runCli().catch((error: unknown) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('\nCancelled. No files were created.');
    process.exitCode = 0;
    return;
  }

  const message = error instanceof Error ? error.message : 'An unknown error occurred.';
  console.error(`\nError: ${message}`);
  process.exitCode = 1;
});
