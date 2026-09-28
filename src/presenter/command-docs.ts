import { COMMANDS, GLOBAL_FLAGS } from './command-registry.ts';
import type { CommandSpec } from './command-spec.ts';
import { CONTRACT } from './contract.ts';
import { documentedHints, hintFor } from './hints.ts';
import { argumentUsage, BIN, commandLine, optionFlag, usageLine } from './usage.ts';

const withValues = (description: string, values: ReadonlyArray<string> | undefined): string => (values ? `${description} One of: ${values.join(', ')}.` : description);

const parameterRows = (spec: CommandSpec): ReadonlyArray<string> => [
  ...spec.arguments.map((argument) => `| \`${argumentUsage(argument)}\` | ${argument.required ? 'yes' : 'no'} | ${withValues(argument.description, argument.values)} |`),
  ...spec.options.map((option) => `| \`${optionFlag(option)}\` | ${option.required ? 'yes' : 'no'} | ${withValues(option.description, option.values)} |`),
];

const parametersSection = (spec: CommandSpec): ReadonlyArray<string> => {
  const rows = parameterRows(spec);
  if (rows.length === 0) return ['### Parameters', '', 'None.', ''];
  return ['### Parameters', '', '| Parameter | Required | Description |', '| --- | --- | --- |', ...rows, ''];
};

const examplesSection = (spec: CommandSpec): ReadonlyArray<string> => [
  '### Examples',
  '',
  '```bash',
  ...spec.examples.flatMap((example) => [`# ${example.explanation}`, commandLine(example.argv)]),
  '```',
  '',
];

const errorsTable = (spec: CommandSpec): ReadonlyArray<string> => [
  '### Errors',
  '',
  '| Code | Next step |',
  '| --- | --- |',
  ...spec.errors.map((code) => `| \`${code}\` | ${hintFor(code)} |`),
  '',
];

export const renderCommandPage = (spec: CommandSpec): string =>
  [
    `## ${spec.name}`,
    '',
    spec.description,
    '',
    '### Usage',
    '',
    '```bash',
    usageLine(spec),
    '```',
    '',
    ...parametersSection(spec),
    ...examplesSection(spec),
    '### Output',
    '',
    spec.output,
    '',
    ...errorsTable(spec),
  ].join('\n');

const commandsTable = (): ReadonlyArray<string> => [
  '| Command | What it does |',
  '| --- | --- |',
  ...COMMANDS.map((command) => `| [\`${command.name}\`](#${command.name}) | ${command.summary} |`),
];

const errorsSection = (): ReadonlyArray<string> => [
  '## Error codes',
  '',
  'Every failure carries one of these codes. Its `hint` says what to do next.',
  '',
  '| Code | Next step |',
  '| --- | --- |',
  ...documentedHints().map((entry) => `| \`${entry.code}\` | ${entry.hint} |`),
  '',
];

// docs/COMMANDS.md, written by scripts/gen-docs.ts; CI fails when the file drifts from this.
export const renderCommandsReference = (): string =>
  [
    `# ${BIN} commands`,
    '',
    '<!-- Generated from src/presenter/command-registry.ts by scripts/gen-docs.ts. Edit the registry, then run `bun run docs:gen`. -->',
    '',
    CONTRACT,
    '',
    ...commandsTable(),
    '',
    '| Flag | What it does |',
    '| --- | --- |',
    ...GLOBAL_FLAGS.map((flag) => `| \`${BIN} ${flag.flag}\` | ${flag.description} |`),
    '',
    ...COMMANDS.map((command) => renderCommandPage(command)),
    ...errorsSection(),
  ].join('\n');
