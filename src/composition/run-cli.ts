import { parseCliArgs } from '../presenter/cli.ts';
import { fail } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import { readConfig } from './env.ts';
import { runPost } from './run-post.ts';
import { runSetup } from './run-setup.ts';

export type { CliIo } from './cli-io.ts';

export const runCli = async (io: CliIo): Promise<number> => {
  const command = parseCliArgs(io.argv);
  if (!command.ok) return fail(io, command.error);
  const config = readConfig(io.env);
  if (command.value.command === 'setup') return runSetup(io, command.value, config);
  return runPost(io, command.value, config);
};
