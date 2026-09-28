import { parseCliArgs } from '../presenter/cli.ts';
import { renderCommandPage } from '../presenter/command-docs.ts';
import { specFor } from '../presenter/command-registry.ts';
import { buildManifest } from '../presenter/manifest.ts';
import { fail, succeed } from './answer.ts';
import type { CliIo } from './cli-io.ts';
import { readConfig } from './env.ts';
import { PACKAGE_NAME, PACKAGE_VERSION } from './package-info.ts';
import { runPost } from './run-post.ts';
import { runSetup } from './run-setup.ts';

export type { CliIo } from './cli-io.ts';

export const runCli = async (io: CliIo): Promise<number> => {
  const parsed = parseCliArgs(io.argv);
  if (!parsed.ok) return fail(io, parsed.error);
  const command = parsed.value;
  switch (command.command) {
    case 'post': {
      return runPost(io, command, readConfig(io.env));
    }
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
  }
};
