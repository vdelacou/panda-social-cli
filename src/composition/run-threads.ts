import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import { createThreadsGraph } from '../infra/threads-graph.ts';
import type { Failure, PostCommand, PostContent } from '../presenter/cli.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { createPublishPost } from '../use-cases/publish-post.ts';
import type { PublishPostDeps, PublishPostInput } from '../use-cases/publish-post.ts';
import { answer, fail } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveThreadsToken } from './threads-token.ts';

// Every command that acts on a Threads account.
export type ThreadsCommand = PostCommand;

// The Threads adapter and the logger for the account saved in a profile.
const threadsDeps = async (io: CliIo, config: Config, profile: ProfileName | undefined): Promise<Result<PublishPostDeps, Failure>> => {
  const token = await resolveThreadsToken(config, profile ?? DEFAULT_PROFILE);
  if (!token.ok) return token;
  return ok({ threads: createThreadsGraph({ token: token.value }), logger: createWinstonLogger(config.logLevel, io.logStream) });
};

const contentOf = (command: PostContent): PublishPostInput => ({ text: command.text, imageUrl: command.imageUrl, split: command.split });

const act = async (deps: PublishPostDeps, command: ThreadsCommand): Promise<Result<unknown, StepError>> => {
  return createPublishPost(deps)(contentOf(command));
};

export const runThreads = async (io: CliIo, command: ThreadsCommand, config: Config): Promise<number> => {
  const deps = await threadsDeps(io, config, command.profile);
  if (!deps.ok) return fail(io, deps.error);
  return answer(io, await act(deps.value, command));
};
