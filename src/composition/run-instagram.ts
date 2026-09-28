import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { Result } from '../domain/result.ts';
import { createInstagramGraph } from '../infra/instagram-graph.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import type { InstagramDeleteCommand, InstagramPostCommand, InstagramStatusCommand, InstagramUpdateCommand } from '../presenter/cli.ts';
import { refuseInstagramChange } from '../use-cases/instagram-changes.ts';
import { createInstagramStatus } from '../use-cases/instagram-status.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { createPublishInstagramPost } from '../use-cases/publish-instagram-post.ts';
import type { InstagramPostDeps } from '../use-cases/publish-instagram-post.ts';
import { answer } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveInstagramToken } from './instagram-token.ts';
import type { ActiveInstagramToken } from './instagram-token.ts';

// Every command that acts on an Instagram account.
export type InstagramCommand = InstagramStatusCommand | InstagramPostCommand | InstagramUpdateCommand | InstagramDeleteCommand;

const act = async (
  deps: InstagramPostDeps,
  token: ActiveInstagramToken,
  command: InstagramStatusCommand | InstagramPostCommand,
  profile: ProfileName
): Promise<Result<unknown, StepError>> => {
  if (command.command === 'status') return createInstagramStatus({ instagram: deps.instagram, now: () => new Date() })({ profile, origin: token.origin });
  return createPublishInstagramPost(deps)({ imageUrl: command.imageUrl, caption: command.text });
};

// D37: delete and update stop before the token is read. Otherwise the profile's token (the
// environment first, a saved one renewed when due), then Instagram with it.
export const runInstagram = async (io: CliIo, command: InstagramCommand, config: Config): Promise<number> => {
  if (command.command === 'delete' || command.command === 'update') return answer(io, refuseInstagramChange(command.command));
  const profile = command.profile ?? DEFAULT_PROFILE;
  const logger = createWinstonLogger(config.logLevel, io.logStream);
  const token = await resolveInstagramToken(config, profile, logger);
  if (!token.ok) return answer(io, token);
  return answer(io, await act({ instagram: createInstagramGraph({ token: token.value.token }), logger }, token.value, command, profile));
};
