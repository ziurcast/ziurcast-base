import { spawn } from 'node:child_process';

export const runCommand = async (
  command: string,
  args: string[],
  cwd: string,
): Promise<void> =>
  new Promise((resolve, reject) => {
    // En Windows, npm es un script .cmd que solo puede ejecutarse a través de la shell.
    // Los argumentos son fijos del generador, por lo que se unen sin escapar.
    const child =
      process.platform === 'win32'
        ? spawn([command, ...args].join(' '), { cwd, stdio: 'inherit', shell: true })
        : spawn(command, args, { cwd, stdio: 'inherit' });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`,
        ),
      );
    });
  });
