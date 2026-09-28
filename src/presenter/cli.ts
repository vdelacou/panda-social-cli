import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CliCommand } from './cli-command.ts';
import { BUILDERS, unknownCommand } from './command-builders.ts';
import { findCommand } from './command-registry.ts';
import type { Failure } from './failure.ts';
import { readFlags } from './read-flags.ts';

export type {
  CliCommand,
  CrossPostCommand,
  DocsCommand,
  FacebookSetupCommand,
  FacebookStatusCommand,
  InstagramSetupCommand,
  InstagramStatusCommand,
  SetupCommand,
  StatusCommand,
  ThreadsSetupCommand,
  ThreadsStatusCommand,
  XSetupCommand,
  XStatusCommand,
} from './cli-command.ts';
export type {
  DeleteCommand,
  FacebookDeleteCommand,
  FacebookPostCommand,
  FacebookPostContent,
  FacebookUpdateCommand,
  InstagramDeleteCommand,
  InstagramPostCommand,
  InstagramPostContent,
  InstagramUpdateCommand,
  PostCommand,
  ThreadsDeleteCommand,
  ThreadsPostCommand,
  ThreadsPostContent,
  ThreadsUpdateCommand,
  UpdateCommand,
  XDeleteCommand,
  XPostCommand,
  XPostContent,
  XUpdateCommand,
} from './post-command.ts';
export type { Failure } from './failure.ts';

export const parseCliArgs = (argv: ReadonlyArray<string>): Result<CliCommand, Failure> => {
  const [first = '', ...rest] = argv;
  if (first === '--version') return ok({ command: 'version' });
  if (first === '' || first === '--help') return ok({ command: 'help-json' });
  const spec = findCommand(first);
  if (spec === undefined) return err(unknownCommand(`Unknown command: "${first}".`));
  if (rest.includes('--help')) return ok({ command: 'docs', target: spec.name });
  const flags = readFlags(spec, rest);
  if (!flags.ok) return flags;
  return BUILDERS[spec.name](flags.value);
};

export const renderSuccess = (data: unknown): string => JSON.stringify({ ok: true, data });

export const renderFailure = (failure: Failure): string => JSON.stringify({ ok: false, error: failure });
