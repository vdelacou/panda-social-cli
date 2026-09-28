import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { createXApi } from '../infra/x-api.ts';
import type { XStatusCommand } from '../presenter/cli.ts';
import { createXStatus } from '../use-cases/x-status.ts';
import { answer } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveXKeys } from './x-keys.ts';

// Every command that acts on an X account.
export type XCommand = XStatusCommand;

export const runX = async (io: CliIo, command: XCommand, config: Config): Promise<number> => {
  const profile = command.profile ?? DEFAULT_PROFILE;
  const keys = await resolveXKeys(config, profile);
  if (!keys.ok) return answer(io, keys);
  return answer(io, await createXStatus({ x: createXApi({ keys: keys.value.keys }) })({ profile, origin: keys.value.origin }));
};
