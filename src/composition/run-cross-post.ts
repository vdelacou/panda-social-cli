import type { CrossPostCommand, Failure, PostCommand } from '../presenter/cli.ts';
import { hintFor } from '../presenter/hints.ts';
import { createCrossPost } from '../use-cases/cross-post.ts';
import type { CrossPostError } from '../use-cases/cross-post.ts';
import { accountOutcome } from './account-outcome.ts';
import { fail, succeed } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';

// D40: each failed platform carries the next step its own code names.
const withHints = (error: CrossPostError): Failure => ({
  code: error.cause,
  message: error.message,
  hint: hintFor(error.cause),
  details: { published: error.details.published, failed: error.details.failed.map((failure) => ({ ...failure, hint: hintFor(failure.code) })) },
});

// The same post on several platforms, one after another, answered once for them all.
export const runCrossPost = async (io: CliIo, command: CrossPostCommand, config: Config): Promise<number> => {
  const outcome = await createCrossPost<PostCommand>({ post: async (post) => accountOutcome(io, post, config) })(command.posts);
  return outcome.ok ? succeed(io, outcome.value) : fail(io, withHints(outcome.error));
};
