import type { ProfileName } from '../domain/profile-name.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import { createInstagramGraph } from '../infra/instagram-graph.ts';
import { createTtyTerminal } from '../infra/tty-terminal.ts';
import type { InstagramSetupCommand } from '../presenter/cli.ts';
import { INSTAGRAM_SETUP_STEPS } from '../presenter/instagram-setup-steps.ts';
import { setupGuide } from '../presenter/setup-guide.ts';
import { renderStepText } from '../presenter/setup-steps-text.ts';
import { createConnectInstagram } from '../use-cases/connect-instagram.ts';
import type { ConnectInstagram } from '../use-cases/connect-instagram.ts';
import { createGuideInstagramSetup } from '../use-cases/guide-instagram-setup.ts';
import { answer, succeed } from './answer.ts';
import { readStdin } from './cli-io.ts';
import type { CliIo } from './cli-io.ts';

// A human at a terminal: the guide runs on stderr, so stdout keeps its one JSON line.
const runGuided = async (streams: NonNullable<CliIo['terminal']>, profile: ProfileName, connectInstagram: ConnectInstagram): ReturnType<ConnectInstagram> => {
  const terminal = createTtyTerminal({ input: streams.input, output: streams.output, terminal: true, renderStep: renderStepText });
  const result = await createGuideInstagramSetup({ terminal, steps: INSTAGRAM_SETUP_STEPS, connectInstagram })({ profile });
  terminal.close();
  return result;
};

// The same three ways in as the other setups: a piped token, a terminal, or the steps as JSON.
export const runSetupInstagram = async (io: CliIo, command: InstagramSetupCommand, credentialsFile: string): Promise<number> => {
  const connectInstagram = createConnectInstagram({
    instagramFor: (token) => createInstagramGraph({ token }),
    store: createCredentialStoreFile(credentialsFile),
    now: () => new Date(),
  });
  if (command.tokenFromStdin) {
    const piped = await readStdin(io);
    return answer(io, await connectInstagram({ profile: command.profile, token: piped.trim() }));
  }
  if (io.terminal === undefined) return succeed(io, setupGuide('instagram', command.profile, INSTAGRAM_SETUP_STEPS));
  return answer(io, await runGuided(io.terminal, command.profile, connectInstagram));
};
