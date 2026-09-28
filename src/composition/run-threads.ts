import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import { createThreadsGraph } from '../infra/threads-graph.ts';
import type { DeleteCommand, PostCommand, PostContent, UpdateCommand } from '../presenter/cli.ts';
import { createDeletePost } from '../use-cases/delete-post.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { createPublishPost } from '../use-cases/publish-post.ts';
import type { PublishPostDeps, PublishPostInput } from '../use-cases/publish-post.ts';
import { createUpdatePost } from '../use-cases/update-post.ts';
import { answer } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveThreadsToken } from './threads-token.ts';

// Every command that acts on a Threads account.
export type ThreadsCommand = PostCommand | UpdateCommand | DeleteCommand;

// The logger, the profile's token (refreshed first when due) and the Threads adapter for it.
const threadsDeps = async (io: CliIo, config: Config, profile: ProfileName): Promise<Result<PublishPostDeps, StepError>> => {
  const logger = createWinstonLogger(config.logLevel, io.logStream);
  const token = await resolveThreadsToken(config, profile, logger);
  if (!token.ok) return token;
  return ok({ threads: createThreadsGraph({ token: token.value.token }), logger });
};

const contentOf = (command: PostContent): PublishPostInput => ({ text: command.text, imageUrl: command.imageUrl, split: command.split });

const act = async (deps: PublishPostDeps, command: ThreadsCommand): Promise<Result<unknown, StepError>> => {
  if (command.command === 'delete') return createDeletePost(deps)({ id: command.id });
  if (command.command === 'update') return createUpdatePost(deps)({ ...contentOf(command), id: command.id, repost: command.repost });
  return createPublishPost(deps)(contentOf(command));
};

export const runThreads = async (io: CliIo, command: ThreadsCommand, config: Config): Promise<number> => {
  const deps = await threadsDeps(io, config, command.profile ?? DEFAULT_PROFILE);
  if (!deps.ok) return answer(io, deps);
  return answer(io, await act(deps.value, command));
};
