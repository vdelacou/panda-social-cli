import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseXKeys } from '../domain/x-keys.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import { createTtyTerminal } from '../infra/tty-terminal.ts';
import { createXApi } from '../infra/x-api.ts';
import type { XSetupCommand } from '../presenter/cli.ts';
import { setupGuide } from '../presenter/setup-guide.ts';
import { renderStepText } from '../presenter/setup-steps-text.ts';
import { X_CREDITS_NOTE, X_SETUP_STEPS } from '../presenter/x-setup-steps.ts';
import { createConnectX } from '../use-cases/connect-x.ts';
import type { ConnectX, ConnectXSummary } from '../use-cases/connect-x.ts';
import { createGuideXSetup } from '../use-cases/guide-x-setup.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { answer, succeed } from './answer.ts';
import { readStdin } from './cli-io.ts';
import type { CliIo } from './cli-io.ts';

// Saved keys come with the reminder that every later command spends X credits.
const withCreditsNote = (result: Result<ConnectXSummary, StepError>): Result<unknown, StepError> => (result.ok ? ok({ ...result.value, note: X_CREDITS_NOTE }) : result);

// A human at a terminal: the guide runs on stderr, so stdout keeps its one JSON line.
const runGuided = async (streams: NonNullable<CliIo['terminal']>, profile: ProfileName, connectX: ConnectX): ReturnType<ConnectX> => {
  const terminal = createTtyTerminal({ input: streams.input, output: streams.output, terminal: true, renderStep: renderStepText });
  const result = await createGuideXSetup({ terminal, steps: X_SETUP_STEPS, connectX })({ profile });
  terminal.close();
  return result;
};

// Four keys piped in, one per line, in the order the console shows them.
const connectPiped = async (io: CliIo, profile: ProfileName, connectX: ConnectX): ReturnType<ConnectX> => {
  const piped = await readStdin(io);
  const keys = parseXKeys(piped.trim().split(/\r?\n/));
  if (!keys.ok) return err({ step: 'read', cause: keys.error.kind, message: keys.error.message });
  return connectX({ profile, keys: keys.value });
};

// The same three ways in as setup threads: piped keys, a terminal, or the steps as JSON.
export const runSetupX = async (io: CliIo, command: XSetupCommand, credentialsFile: string): Promise<number> => {
  const connectX = createConnectX({ xFor: (keys) => createXApi({ keys }), store: createCredentialStoreFile(credentialsFile), now: () => new Date() });
  if (command.keysFromStdin) return answer(io, withCreditsNote(await connectPiped(io, command.profile, connectX)));
  if (io.terminal === undefined) return succeed(io, setupGuide('x', command.profile, X_SETUP_STEPS));
  return answer(io, withCreditsNote(await runGuided(io.terminal, command.profile, connectX)));
};
