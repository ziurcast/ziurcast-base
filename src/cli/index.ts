#!/usr/bin/env node
import { runCreateProject } from '../commands/create-project/index.js';
import { runGenerateCommand } from '../commands/generate/index.js';
import { runGenerateApiCommand } from '../commands/generate/run-generate-api.js';
import { runGeneratePageCommand } from '../commands/generate/run-generate-page.js';
import { runGenerateHookCommand } from '../commands/generate/run-generate-hook.js';
import { parseGenerateModuleArguments, runGenerateModuleCommand } from '../commands/generate/run-generate-module.js';

const runCli = async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args[0] === 'generate') {
    if (args[1] === 'component' && args.length === 3) {
      await runGenerateCommand(args[1], args[2]);
      return;
    }

    if (args[1] === 'module') {
      const { domain, selections } = parseGenerateModuleArguments(args.slice(2));
      await runGenerateModuleCommand(domain, selections);
      return;
    }

    if (
      args[1] === 'page' &&
      args.length === 7 &&
      args[3] === '--scope' &&
      args[5] === '--route'
    ) {
      await runGeneratePageCommand(args[2], args[4], args[6]);
      return;
    }

    if (
      args[1] === 'api' &&
      args.length === 5 &&
      args[3] === '--scope'
    ) {
      await runGenerateApiCommand(args[2], args[4]);
      return;
    }

    if (
      args[1] === 'hook' &&
      args.length === 5 &&
      args[3] === '--scope'
    ) {
      await runGenerateHookCommand(args[2], args[4]);
      return;
    }

    throw new Error(
      'Usage: create-base-app generate component <ComponentName> | create-base-app generate module <Domain> [--page <PageName> --route /<path>] [--api <ApiName>] [--hook <HookName>] | create-base-app generate hook <HookName> --scope <scope> | create-base-app generate api <ApiName> --scope <scope> | create-base-app generate page <PageName> --scope modules/<domain> --route /<path>',
    );
  }

  if (args.length > 1) {
    throw new Error('Usage: create-base-app [project-name]');
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
