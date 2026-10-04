import { parseCliArgs } from '../presenter/cli.ts';
import { renderCommandPage } from '../presenter/command-docs.ts';
import { specFor } from '../presenter/command-registry.ts';
import { buildManifest } from '../presenter/manifest.ts';
import { accountOutcome } from './account-outcome.ts';
import { answer, fail, succeed } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import { readConfig } from './env.ts';
import { PACKAGE_NAME, PACKAGE_VERSION } from './package-info.ts';
import { runCrossPost } from './run-cross-post.ts';
import { runMcp } from './run-mcp.ts';
import { runSetup } from './run-setup.ts';

export type { CliIo } from './cli-io.ts';

export const runCli = async (io: CliIo): Promise<number> => {
  const parsed = parseCliArgs(io.argv);
  if (!parsed.ok) return fail(io, parsed.error);
  const command = parsed.value;
  switch (command.command) {
    case 'setup': {
      return runSetup(io, command, readConfig(io.env));
    }
    case 'help-json': {
      return succeed(io, { name: PACKAGE_NAME, version: PACKAGE_VERSION, ...buildManifest() });
    }
    case 'docs': {
      return succeed(io, { command: command.target, markdown: renderCommandPage(specFor(command.target)) });
    }
    case 'version': {
      return succeed(io, { name: PACKAGE_NAME, version: PACKAGE_VERSION });
    }
    case 'cross-post': {
      return runCrossPost(io, command, readConfig(io.env));
    }
    case 'mcp': {
      return runMcp(io, runCli);
    }
    // The commands that act on an account, by platform: the type narrows to them, so a new
    // command that is not one of them fails to compile here until it gets its own case.
    default: {
      return answer(io, await accountOutcome(io, command, readConfig(io.env)));
    }
  }
};
