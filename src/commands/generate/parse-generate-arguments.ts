export type ParsedGenerateArguments = {
  name: string;
  options: Map<string, string>;
};

export const parseGenerateArguments = (
  args: string[],
  allowedFlags: readonly string[],
  usage: string,
): ParsedGenerateArguments => {
  const name = args[0];

  if (!name || name.startsWith('-')) {
    throw new Error(usage);
  }

  const options = new Map<string, string>();

  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];

    if (!flag || !allowedFlags.includes(flag) || !value || value.startsWith('--')) {
      throw new Error(`Invalid option: ${flag ?? ''}\n${usage}`);
    }

    if (options.has(flag)) {
      throw new Error(`Option may only be provided once: ${flag}`);
    }

    options.set(flag, value);
  }

  return { name, options };
};
