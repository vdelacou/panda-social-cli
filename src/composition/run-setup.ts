import type { ProfileName } from '../domain/profile-name.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import { createThreadsGraph } from '../infra/threads-graph.ts';
import { createTtyTerminal } from '../infra/tty-terminal.ts';
import type { SetupCommand } from '../presenter/cli.ts';
import { hintFor } from '../presenter/hints.ts';
import { setupGuide } from '../presenter/setup-guide.ts';
import { renderStepText } from '../presenter/setup-steps-text.ts';
import { THREADS_SETUP_STEPS } from '../presenter/threads-setup-steps.ts';
import { createConnectThreads } from '../use-cases/connect-threads.ts';
import type { ConnectThreads } from '../use-cases/connect-threads.ts';
import { createGuideThreadsSetup } from '../use-cases/guide-threads-setup.ts';
import { answer, fail, succeed } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';

// A human at a terminal: the guide runs on stderr, so stdout keeps its one JSON line.
const runGuided = async (streams: NonNullable<CliIo['terminal']>, profile: ProfileName, connectThreads: ConnectThreads): ReturnType<ConnectThreads> => {
  const terminal = createTtyTerminal({ input: streams.input, output: streams.output, terminal: true, renderStep: renderStepText });
  const result = await createGuideThreadsSetup({ terminal, steps: THREADS_SETUP_STEPS, connectThreads })({ profile });
  terminal.close();
  return result;
};

const readStdin = async (io: CliIo): Promise<string> => (io.readStdin ? io.readStdin() : '');

// Three ways in: a piped token (agents, scripts), a terminal (a human, step by step),
// or neither (an agent asking what to tell its human: the steps as JSON).
export const runSetup = async (io: CliIo, command: SetupCommand, config: Config): Promise<number> => {
  if (config.credentialsFile === undefined) return fail(io, { code: 'no-home', message: 'No home folder is set, so the token has nowhere to be saved.', hint: hintFor('no-home') });
  const connectThreads = createConnectThreads({
    threadsFor: (token) => createThreadsGraph({ token }),
    store: createCredentialStoreFile(config.credentialsFile),
    now: () => new Date(),
  });
  if (command.tokenFromStdin) {
    const piped = await readStdin(io);
    return answer(io, await connectThreads({ profile: command.profile, token: piped.trim() }));
  }
  if (io.terminal === undefined) return succeed(io, setupGuide(command.profile, THREADS_SETUP_STEPS));
  return answer(io, await runGuided(io.terminal, command.profile, connectThreads));
};
