import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { Result } from '../domain/result.ts';
import { createFacebookGraph } from '../infra/facebook-graph.ts';
import { createImageFiles } from '../infra/image-files.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import type { FacebookDeleteCommand, FacebookPostCommand, FacebookStatusCommand, FacebookUpdateCommand } from '../presenter/cli.ts';
import { createDeleteFacebookPost } from '../use-cases/delete-facebook-post.ts';
import type { FacebookPublishDeps } from '../use-cases/facebook-posting.ts';
import { createFacebookStatus } from '../use-cases/facebook-status.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { createPublishFacebookPost } from '../use-cases/publish-facebook-post.ts';
import { createUpdateFacebookPost } from '../use-cases/update-facebook-post.ts';
import { answer } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveFacebookPage } from './facebook-page.ts';
import type { ActiveFacebookPage } from './facebook-page.ts';

// Every command that acts on a Facebook Page.
export type FacebookCommand = FacebookStatusCommand | FacebookPostCommand | FacebookUpdateCommand | FacebookDeleteCommand;

const act = async (deps: FacebookPublishDeps, page: ActiveFacebookPage, command: FacebookCommand, profile: ProfileName): Promise<Result<unknown, StepError>> => {
  if (command.command === 'status') return createFacebookStatus(deps)({ profile, origin: page.origin });
  if (command.command === 'delete') return createDeleteFacebookPost(deps)({ id: command.id });
  if (command.command === 'update') return createUpdateFacebookPost(deps)({ ...command, pageId: page.pageId });
  return createPublishFacebookPost(deps)({ ...command, pageId: page.pageId });
};

// The profile's Page (the environment first), then Meta with that Page's own token, the local
// image files and the logger.
export const runFacebook = async (io: CliIo, command: FacebookCommand, config: Config): Promise<number> => {
  const profile = command.profile ?? DEFAULT_PROFILE;
  const page = await resolveFacebookPage(config, profile);
  if (!page.ok) return answer(io, page);
  const deps = { facebook: createFacebookGraph({ token: page.value.token }), files: createImageFiles(), logger: createWinstonLogger(config.logLevel, io.logStream) };
  return answer(io, await act(deps, page.value, command, profile));
};
