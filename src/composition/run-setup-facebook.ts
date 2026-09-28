import { ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import { createFacebookGraph } from '../infra/facebook-graph.ts';
import { createTtyTerminal } from '../infra/tty-terminal.ts';
import type { FacebookSetupCommand } from '../presenter/cli.ts';
import { FACEBOOK_PUBLISH_NOTE, FACEBOOK_SETUP_STEPS } from '../presenter/facebook-setup-steps.ts';
import { setupGuide } from '../presenter/setup-guide.ts';
import { renderStepText } from '../presenter/setup-steps-text.ts';
import { createConnectFacebook } from '../use-cases/connect-facebook.ts';
import type { ConnectFacebook, ConnectFacebookSummary } from '../use-cases/connect-facebook.ts';
import { createGuideFacebookSetup } from '../use-cases/guide-facebook-setup.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { answer, succeed } from './answer.ts';
import { readStdin } from './cli-io.ts';
import type { CliIo } from './cli-io.ts';

// A saved Page comes with the reminder that an unpublished app's posts stay private.
const withPublishNote = (result: Result<ConnectFacebookSummary, StepError>): Result<unknown, StepError> =>
  result.ok ? ok({ ...result.value, note: FACEBOOK_PUBLISH_NOTE }) : result;

// A human at a terminal: the guide runs on stderr, so stdout keeps its one JSON line.
const runGuided = async (streams: NonNullable<CliIo['terminal']>, command: FacebookSetupCommand, connectFacebook: ConnectFacebook): ReturnType<ConnectFacebook> => {
  const terminal = createTtyTerminal({ input: streams.input, output: streams.output, terminal: true, renderStep: renderStepText });
  const result = await createGuideFacebookSetup({ terminal, steps: FACEBOOK_SETUP_STEPS, connectFacebook })({ profile: command.profile, pageId: command.pageId });
  terminal.close();
  return result;
};

// The same three ways in as the other setups: a piped token, a terminal, or the steps as JSON.
export const runSetupFacebook = async (io: CliIo, command: FacebookSetupCommand, credentialsFile: string): Promise<number> => {
  const connectFacebook = createConnectFacebook({
    facebookFor: (token) => createFacebookGraph({ token }),
    store: createCredentialStoreFile(credentialsFile),
    now: () => new Date(),
  });
  if (command.tokenFromStdin) {
    const piped = await readStdin(io);
    const connected = await connectFacebook({ profile: command.profile, userToken: piped.trim(), pageId: command.pageId });
    return answer(io, withPublishNote(connected));
  }
  if (io.terminal === undefined) return succeed(io, setupGuide('facebook', command.profile, FACEBOOK_SETUP_STEPS));
  return answer(io, withPublishNote(await runGuided(io.terminal, command, connectFacebook)));
};
