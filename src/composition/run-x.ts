import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { Result } from '../domain/result.ts';
import { createImageFiles } from '../infra/image-files.ts';
import { createWinstonLogger } from '../infra/logger.ts';
import { createXApi } from '../infra/x-api.ts';
import type { XDeleteCommand, XPostCommand, XStatusCommand, XUpdateCommand } from '../presenter/cli.ts';
import { createDeleteXPost } from '../use-cases/delete-x-post.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import { createPublishXPost } from '../use-cases/publish-x-post.ts';
import { createUpdateXPost } from '../use-cases/update-x-post.ts';
import type { XPublishDeps } from '../use-cases/x-posting.ts';
import { createXStatus } from '../use-cases/x-status.ts';
import type { XKeysOrigin } from '../use-cases/x-status.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { resolveXKeys } from './x-keys.ts';

// Every command that acts on an X account.
export type XCommand = XStatusCommand | XPostCommand | XUpdateCommand | XDeleteCommand;

type XDeps = XPublishDeps & { readonly origin: XKeysOrigin };

const act = async (deps: XDeps, command: XCommand, profile: ProfileName): Promise<Result<unknown, StepError>> => {
  if (command.command === 'status') return createXStatus({ x: deps.x })({ profile, origin: deps.origin });
  if (command.command === 'delete') return createDeleteXPost(deps)({ id: command.id });
  const content = { text: command.text, imagePath: command.imagePath, split: command.split };
  if (command.command === 'update') return createUpdateXPost(deps)({ ...content, id: command.id, repost: command.repost });
  return createPublishXPost(deps)(content);
};

// The profile's keys (the environment first), then X, the local image files and the logger.
export const xOutcome = async (io: CliIo, command: XCommand, config: Config): Promise<Result<unknown, StepError>> => {
  const profile = command.profile ?? DEFAULT_PROFILE;
  const keys = await resolveXKeys(config, profile);
  if (!keys.ok) return keys;
  const logger = createWinstonLogger(config.logLevel, io.logStream);
  return act({ x: createXApi({ keys: keys.value.keys }), files: createImageFiles(), logger, origin: keys.value.origin }, command, profile);
};
