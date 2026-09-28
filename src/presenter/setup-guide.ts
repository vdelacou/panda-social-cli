import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { SetupStep } from '../domain/setup-step.ts';

export type SetupGuide = {
  readonly platform: 'threads' | 'x';
  readonly profile: ProfileName;
  readonly steps: ReadonlyArray<SetupStep & { readonly step: number }>;
  readonly finish: string;
};

// The command that finishes each setup; {profile} becomes the --profile flag when one is given.
const FINISH: Readonly<Record<SetupGuide['platform'], string>> = {
  threads: 'When the token is copied, run: panda-social setup threads --token-stdin{profile}, then paste it and press Enter (or pipe it in).',
  x: 'When the four keys are copied, run panda-social setup x{profile} in your own terminal and paste them when asked, or pipe them one per line (API Key, API Key Secret, Access Token, Access Token Secret) into panda-social setup x --keys-stdin{profile}.',
};

// What an agent relays to its human: every step numbered, then the one command that finishes the setup.
export const setupGuide = (platform: SetupGuide['platform'], profile: ProfileName, steps: ReadonlyArray<SetupStep>): SetupGuide => ({
  platform,
  profile,
  steps: steps.map((step, index) => ({ step: index + 1, ...step })),
  finish: FINISH[platform].split('{profile}').join(profile === DEFAULT_PROFILE ? '' : ` --profile ${profile}`),
});
