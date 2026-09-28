import { COMMAND_NAMES } from './command-spec.ts';
import type { CommandName, CommandSpec } from './command-spec.ts';
import { DELETE } from './commands/delete.ts';
import { DOCS } from './commands/docs.ts';
import { HELP_JSON } from './commands/help-json.ts';
import { POST } from './commands/post.ts';
import { SETUP } from './commands/setup.ts';
import { UPDATE } from './commands/update.ts';

// The one description of the command surface: the parser, help-json, docs <command>
// and the generated docs/COMMANDS.md and docs/commands.json all read it.
const REGISTRY: Readonly<Record<CommandName, CommandSpec>> = { post: POST, update: UPDATE, delete: DELETE, setup: SETUP, 'help-json': HELP_JSON, docs: DOCS };

export const COMMANDS: ReadonlyArray<CommandSpec> = COMMAND_NAMES.map((name) => REGISTRY[name]);

// Codes any invocation can return, whatever the command.
export const GLOBAL_ERRORS: ReadonlyArray<string> = ['unknown-command'];

export const GLOBAL_FLAGS: ReadonlyArray<{ readonly flag: string; readonly description: string }> = [
  { flag: '--version', description: 'Print the package name and version.' },
  { flag: '--help', description: 'Print the manifest, as help-json does. `<command> --help` prints that command page, as `docs <command>` does.' },
];

export const specFor = (name: CommandName): CommandSpec => REGISTRY[name];

export const findCommand = (name: string): CommandSpec | undefined => COMMANDS.find((command) => command.name === name);
