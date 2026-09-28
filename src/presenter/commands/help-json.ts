import type { CommandSpec } from '../command-spec.ts';

export const HELP_JSON: CommandSpec = {
  name: 'help-json',
  summary: 'Describe every command, option, example and error code as JSON. Start here.',
  description:
    'The manifest an agent reads on first contact: the output contract, the global flags, every command with its usage line, parameters, examples and error codes, and the next step for every error code. The same manifest ships as docs/commands.json.',
  arguments: [],
  options: [],
  examples: [{ argv: ['help-json'], explanation: 'Read the whole command surface in one call.' }],
  output: 'The manifest: `{"name","version","bin","contract","flags":[...],"commands":[...],"errors":[{"code","hint"}]}`.',
  mutates: false,
  errors: ['unknown-option', 'unexpected-argument'],
};
