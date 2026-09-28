import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import { createThreadsGraph } from '../infra/threads-graph.ts';
import type { ThreadsDeleteCommand, ThreadsPostCommand, ThreadsPostContent, ThreadsStatusCommand, ThreadsUpdateCommand } from '../presenter/cli.ts';
import { createDeletePost } from '../use-cases/delete-post.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { createPublishPost } from '../use-cases/publish-post.ts';
import type { PublishPostDeps, PublishPostInput } from '../use-cases/publish-post.ts';
import { createThreadsStatus } from '../use-cases/threads-status.ts';
import type { TokenOrigin } from '../use-cases/threads-status.ts';
import { createUpdatePost } from '../use-cases/update-post.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveThreadsToken } from './threads-token.ts';

// Every command that acts on a Threads account.
export type ThreadsCommand = ThreadsPostCommand | ThreadsUpdateCommand | ThreadsDeleteCommand | ThreadsStatusCommand;

type ThreadsDeps = PublishPostDeps & { readonly origin: TokenOrigin };

// The logger, the profile's token (refreshed first when due) and the Threads adapter for it.
const threadsDeps = async (io: CliIo, config: Config, profile: ProfileName): Promise<Result<ThreadsDeps, StepError>> => {
  const logger = createWinstonLogger(config.logLevel, io.logStream);
  const token = await resolveThreadsToken(config, profile, logger);
  if (!token.ok) return token;
  return ok({ threads: createThreadsGraph({ token: token.value.token }), logger, origin: token.value.origin });
};

const contentOf = (command: ThreadsPostContent): PublishPostInput => ({ text: command.text, imageUrl: command.imageUrl, split: command.split });

const act = async (deps: ThreadsDeps, command: ThreadsCommand, profile: ProfileName): Promise<Result<unknown, StepError>> => {
  if (command.command === 'delete') return createDeletePost(deps)({ id: command.id });
  if (command.command === 'update') return createUpdatePost(deps)({ ...contentOf(command), id: command.id, repost: command.repost });
  if (command.command === 'status') return createThreadsStatus({ threads: deps.threads, now: () => new Date() })({ profile, origin: deps.origin });
  return createPublishPost(deps)(contentOf(command));
};

export const threadsOutcome = async (io: CliIo, command: ThreadsCommand, config: Config): Promise<Result<unknown, StepError>> => {
  const profile = command.profile ?? DEFAULT_PROFILE;
  const deps = await threadsDeps(io, config, profile);
  return deps.ok ? act(deps.value, command, profile) : deps;
};
