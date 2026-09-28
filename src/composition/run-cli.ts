import type { Writable } from 'node:stream';
import { createWinstonLogger } from '../infra/logger.ts';
import { createThreadsGraph } from '../infra/threads-graph.ts';
import { parseCliArgs, renderFailure, renderSuccess } from '../presenter/cli.ts';
import type { Failure } from '../presenter/cli.ts';
import { hintFor } from '../presenter/hints.ts';
import { createPublishPost } from '../use-cases/publish-post.ts';
import { readConfig } from './env.ts';

// Everything the process owns arrives as a parameter, so a whole run is testable
// in-process: argv and env in, one JSON line out, logs to their own stream.
export type CliIo = {
  readonly argv: ReadonlyArray<string>;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly writeOut: (line: string) => void;
  readonly logStream: Writable;
};

const fail = (io: CliIo, failure: Failure): number => {
  io.writeOut(renderFailure(failure));
  return 1;
};

export const runCli = async (io: CliIo): Promise<number> => {
  const command = parseCliArgs(io.argv);
  if (!command.ok) return fail(io, command.error);
  const config = readConfig(io.env);
  if (!config.ok) return fail(io, { ...config.error, hint: hintFor(config.error.code) });
  const logger = createWinstonLogger(config.value.logLevel, io.logStream);
  const publishPost = createPublishPost({ threads: createThreadsGraph({ token: config.value.threadsToken }), logger });
  const published = await publishPost({ text: command.value.text });
  if (!published.ok) return fail(io, { code: published.error.cause, message: published.error.message, hint: hintFor(published.error.cause) });
  io.writeOut(renderSuccess(published.value));
  return 0;
};
