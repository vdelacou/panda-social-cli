export type CommandName = 'post' | 'update' | 'delete' | 'setup' | 'status' | 'help-json' | 'docs' | 'mcp';

// The order commands appear in the manifest and in docs/COMMANDS.md.
export const COMMAND_NAMES: ReadonlyArray<CommandName> = ['post', 'update', 'delete', 'setup', 'status', 'help-json', 'docs', 'mcp'];

export type OptionSpec = {
  // The flag without its dashes, as node:util parseArgs reads it.
  readonly name: string;
  readonly type: 'string' | 'boolean';
  // Shown as `--name <placeholder>`; string options only.
  readonly placeholder?: string;
  readonly required: boolean;
  readonly description: string;
  readonly values?: ReadonlyArray<string>;
};

export type ArgumentSpec = {
  readonly name: string;
  readonly required: boolean;
  readonly description: string;
  readonly values: ReadonlyArray<string>;
};

// Examples are argument lists, so a test can run each one through the real parser.
export type ExampleSpec = {
  readonly argv: ReadonlyArray<string>;
  readonly explanation: string;
};

export type CommandSpec = {
  readonly name: CommandName;
  readonly summary: string;
  readonly description: string;
  readonly arguments: ReadonlyArray<ArgumentSpec>;
  readonly options: ReadonlyArray<OptionSpec>;
  readonly examples: ReadonlyArray<ExampleSpec>;
  // What the `data` field holds on success, in markdown.
  readonly output: string;
  // True when the command publishes, deletes or connects an account. Refreshing a saved token,
  // which every Threads command may do, does not count.
  readonly mutates: boolean;
  readonly errors: ReadonlyArray<string>;
};
