import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { createInstagramGraph } from '../infra/instagram-graph.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import type { InstagramStatusCommand } from '../presenter/cli.ts';
import { createInstagramStatus } from '../use-cases/instagram-status.ts';
import { answer } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveInstagramToken } from './instagram-token.ts';

// Every command that acts on an Instagram account: the status until posting arrives (5.2).
export type InstagramCommand = InstagramStatusCommand;

// The profile's token (the environment first, a saved one renewed when due), then Instagram with it.
export const runInstagram = async (io: CliIo, command: InstagramCommand, config: Config): Promise<number> => {
  const profile = command.profile ?? DEFAULT_PROFILE;
  const token = await resolveInstagramToken(config, profile, createWinstonLogger(config.logLevel, io.logStream));
  if (!token.ok) return answer(io, token);
  const status = createInstagramStatus({ instagram: createInstagramGraph({ token: token.value.token }), now: () => new Date() });
  return answer(io, await status({ profile, origin: token.value.origin }));
};
