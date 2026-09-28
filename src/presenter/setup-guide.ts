import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { SetupStep } from '../domain/setup-step.ts';

export type SetupGuide = {
  readonly platform: 'threads';
  readonly profile: ProfileName;
  readonly steps: ReadonlyArray<SetupStep & { readonly step: number }>;
  readonly finish: string;
};

// What an agent relays to its human: every step numbered, then the one command that finishes the setup.
export const setupGuide = (profile: ProfileName, steps: ReadonlyArray<SetupStep>): SetupGuide => {
  const profileFlag = profile === DEFAULT_PROFILE ? '' : ` --profile ${profile}`;
  return {
    platform: 'threads',
    profile,
    steps: steps.map((step, index) => ({ step: index + 1, ...step })),
    finish: `When the token is copied, run: panda-social setup threads --token-stdin${profileFlag}, then paste it and press Enter (or pipe it in).`,
  };
};
