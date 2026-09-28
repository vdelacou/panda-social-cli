import { COMMAND_NAMES } from '../command-spec.ts';
import type { CommandSpec } from '../command-spec.ts';

export const DOCS: CommandSpec = {
  name: 'docs',
  summary: "Show one command's full documentation as markdown.",
  description:
    'The long form of one command: what it does, its usage line, every parameter, examples ready to paste into a shell, its output and its error codes. docs/COMMANDS.md collects every page.',
  arguments: [{ name: 'command', required: true, description: 'The command to document.', values: COMMAND_NAMES }],
  options: [],
  examples: [{ argv: ['docs', 'post'], explanation: 'Read the post page.' }],
  output: 'The page: `{"command":"<name>","markdown":"<the page>"}`.',
  mutates: false,
  errors: ['unknown-option', 'unexpected-argument', 'unknown-command'],
};
