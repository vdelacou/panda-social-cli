import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import { createThreadsGraph } from '../infra/threads-graph.ts';
import type { PostCommand } from '../presenter/cli.ts';
import { createPublishPost } from '../use-cases/publish-post.ts';
import { answer, fail } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveThreadsToken } from './threads-token.ts';

export const runPost = async (io: CliIo, command: PostCommand, config: Config): Promise<number> => {
  const token = await resolveThreadsToken(config, command.profile ?? DEFAULT_PROFILE);
  if (!token.ok) return fail(io, token.error);
  const logger = createWinstonLogger(config.logLevel, io.logStream);
  const publishPost = createPublishPost({ threads: createThreadsGraph({ token: token.value }), logger });
  return answer(io, await publishPost({ text: command.text }));
};
