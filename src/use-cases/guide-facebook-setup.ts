import { parseFacebookPageId } from '../domain/facebook-page.ts';
import type { FacebookPageId } from '../domain/facebook-page.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { SetupStep } from '../domain/setup-step.ts';
import type { ConnectFacebook, ConnectFacebookSummary } from './connect-facebook.ts';
import type { StepError } from './ports/step-error.ts';
import type { Terminal } from './ports/terminal.ts';
import { guideCancelled, walkThenAskSecret } from './walk-setup-steps.ts';

export type GuideFacebookSetupInput = {
  readonly profile: ProfileName;
  readonly pageId?: FacebookPageId;
};

export type GuideFacebookSetup = (input: GuideFacebookSetupInput) => Promise<Result<ConnectFacebookSummary, StepError>>;

export type GuideFacebookSetupDeps = {
  readonly terminal: Terminal;
  readonly steps: ReadonlyArray<SetupStep>;
  readonly connectFacebook: ConnectFacebook;
};

const TOKEN_QUESTION = 'Paste the extended token from step 5 (it stays hidden), then press Enter.';
const PAGE_QUESTION = 'Paste the id of the Page this profile posts to, then press Enter.';

// The refusal already names every Page the token grants; the answer picks one of them.
const askForPage = async (deps: GuideFacebookSetupDeps, profile: ProfileName, userToken: string, refusal: StepError): ReturnType<ConnectFacebook> => {
  const answer = await deps.terminal.ask(`${refusal.message} ${PAGE_QUESTION}`, { hidden: false });
  if (!answer.ok) return guideCancelled(answer.error);
  const pageId = parseFacebookPageId(answer.value.trim());
  if (!pageId.ok) return err({ step: 'guide', cause: pageId.error.kind, message: pageId.error.message });
  return deps.connectFacebook({ profile, userToken, pageId: pageId.value });
};

// Every step waits for Enter, then the token is asked with the input hidden. A token that
// grants several Pages and no --page, or not the Page --page names, gets one more question:
// which Page to keep.
export const createGuideFacebookSetup =
  (deps: GuideFacebookSetupDeps): GuideFacebookSetup =>
  async (input) => {
    const token = await walkThenAskSecret(deps.terminal, deps.steps, TOKEN_QUESTION);
    if (!token.ok) return guideCancelled(token.error);
    const userToken = token.value.trim();
    const connected = await deps.connectFacebook({ profile: input.profile, userToken, pageId: input.pageId });
    if (connected.ok || connected.error.cause !== 'choose-page') return connected;
    return askForPage(deps, input.profile, userToken, connected.error);
  };
