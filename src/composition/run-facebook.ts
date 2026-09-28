import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { createFacebookGraph } from '../infra/facebook-graph.ts';
import type { FacebookStatusCommand } from '../presenter/cli.ts';
import { createFacebookStatus } from '../use-cases/facebook-status.ts';
import { answer } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveFacebookPage } from './facebook-page.ts';

// Every command that acts on a Facebook Page: the status now, posting with 4.2.
export type FacebookCommand = FacebookStatusCommand;

// The profile's Page (the environment first), then Meta with that Page's own token.
export const runFacebook = async (io: CliIo, command: FacebookCommand, config: Config): Promise<number> => {
  const profile = command.profile ?? DEFAULT_PROFILE;
  const page = await resolveFacebookPage(config, profile);
  if (!page.ok) return answer(io, page);
  const facebook = createFacebookGraph({ token: page.value.token });
  return answer(io, await createFacebookStatus({ facebook })({ profile, origin: page.value.origin }));
};
