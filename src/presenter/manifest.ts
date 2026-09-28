import { COMMANDS, GLOBAL_FLAGS } from './command-registry.ts';
import type { ArgumentSpec, CommandSpec, OptionSpec } from './command-spec.ts';
import { CONTRACT } from './contract.ts';
import { documentedHints } from './hints.ts';
import { BIN, commandLine, usageLine } from './usage.ts';

export type ManifestOption = {
  readonly flag: string;
  readonly value?: string;
  readonly required: boolean;
  readonly description: string;
  readonly values?: ReadonlyArray<string>;
};

export type ManifestCommand = {
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly usage: string;
  readonly arguments: ReadonlyArray<ArgumentSpec>;
  readonly options: ReadonlyArray<ManifestOption>;
  readonly examples: ReadonlyArray<{ readonly command: string; readonly explanation: string }>;
  readonly output: string;
  readonly mutates: boolean;
  readonly errors: ReadonlyArray<string>;
};

export type Manifest = {
  readonly bin: string;
  readonly contract: string;
  readonly flags: ReadonlyArray<{ readonly flag: string; readonly description: string }>;
  readonly commands: ReadonlyArray<ManifestCommand>;
  readonly errors: ReadonlyArray<{ readonly code: string; readonly hint: string }>;
};

const toOption = (option: OptionSpec): ManifestOption => ({
  flag: `--${option.name}`,
  ...(option.type === 'string' && { value: `<${option.placeholder ?? option.name}>` }),
  required: option.required,
  description: option.description,
  ...(option.values && { values: option.values }),
});

const toCommand = (spec: CommandSpec): ManifestCommand => ({
  name: spec.name,
  summary: spec.summary,
  description: spec.description,
  usage: usageLine(spec),
  arguments: spec.arguments,
  options: spec.options.map((option) => toOption(option)),
  examples: spec.examples.map((example) => ({ command: commandLine(example.argv), explanation: example.explanation })),
  output: spec.output,
  mutates: spec.mutates,
  errors: spec.errors,
});

// Versionless on purpose: docs/commands.json is generated from it, and a release bump must
// not make the committed docs stale. help-json adds the name and version at run time.
export const buildManifest = (): Manifest => ({
  bin: BIN,
  contract: CONTRACT,
  flags: GLOBAL_FLAGS,
  commands: COMMANDS.map((command) => toCommand(command)),
  errors: documentedHints(),
});
