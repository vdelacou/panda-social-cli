import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { COMMANDS, findCommand } from './command-registry.ts';
import type { CommandName, CommandSpec } from './command-spec.ts';
import { didYouMean } from './did-you-mean.ts';
import type { Failure } from './failure.ts';
import { BIN } from './usage.ts';

// The words an MCP client reads: the server instructions, and the name, title and
// description of each tool (D49). The text is in Simplified Technical English.

export type ToolName = 'list-commands' | 'get-command-docs' | 'get-setup-guide' | 'run-command' | 'run-write-command';
export type RunTool = 'run-command' | 'run-write-command';

export type ToolText = { readonly title: string; readonly description: string };

export const MCP_INSTRUCTIONS =
  `${BIN} publishes to the Threads, X and Instagram accounts and the Facebook Page of the user. ` +
  'Start with list-commands, and read get-command-docs for a command before you run it. ' +
  'Before each call of run-write-command, show the full text of the post, or the post to delete, to the user, and get a yes. ' +
  'A post is public immediately, and after a timeout, the user must look at the profile before you publish again. ' +
  `To connect an account, call get-setup-guide, then tell the user to run \`${BIN} setup <platform>\` in a terminal. ` +
  'Do not tell the user to give you a token or a key.';

const RESULT = 'The result is the JSON line that the CLI prints, `{"ok":true,"data":...}` or `{"ok":false,"error":{"code","message","hint"}}`. On an error, obey the hint.';

export const TOOL_TEXT: Readonly<Record<ToolName, ToolText>> = {
  'list-commands': {
    title: 'List the commands',
    description:
      'Start here. Gives each command that this server can run: its name, its summary and the tool that runs it. Then call get-command-docs for the params of a command.',
  },
  'get-command-docs': {
    title: 'Get the docs of a command',
    description:
      'Gives the Markdown page of one command: its params, examples, output and error codes. In an example, `--name value` is the param "name" of run-command or run-write-command. Read the page before you run a command for the first time.',
  },
  'get-setup-guide': {
    title: 'Get the setup steps of a platform',
    description: `Gives the steps that connect a Threads, X, Facebook or Instagram account, as JSON. Tell the steps to the user one at a time. At the end, the user runs \`${BIN} setup <platform>\` in a terminal, and pastes the token or the keys there. Do not tell the user to give you a token or a key: these must not go through the chat.`,
  },
  'run-command': {
    title: 'Run a command that reads',
    description: `Runs a command that does not publish or delete: status. ${RESULT} \`status x\` uses approximately $0.01 of the X credits of the user.`,
  },
  'run-write-command': {
    title: 'Run a command that publishes or deletes',
    description: `Runs post, update or delete. A post is public immediately, and a deleted post cannot come back. Before each call, show the full text of the post, or the post to delete, to the user, and get a yes. After a timeout, tell the user to look at the profile before you call again. ${RESULT}`,
  },
};

export const PARAM_TEXT = {
  command: 'The name of the command, from list-commands.',
  params:
    'The arguments and the options of the command, each by its name without the dashes, for example {"to":"threads","text":"Hello"} or {"platform":"threads"}. A text or an id is a string, and a flag is true or false.',
  docsCommand: 'The name of the command, for example post.',
  platform: 'threads, x, facebook or instagram.',
  profile: 'The profile that gets the account. If you do not give one, the profile is "default".',
} as const;

// The commands that run only in the CLI, and the tool that an MCP client calls in their place.
const IN_PLACE_OF: Readonly<Partial<Record<CommandName, ToolName>>> = {
  setup: 'get-setup-guide',
  'help-json': 'list-commands',
  docs: 'get-command-docs',
  mcp: 'list-commands',
};

const toolFor = (spec: CommandSpec): ToolName => IN_PLACE_OF[spec.name] ?? (spec.mutates ? 'run-write-command' : 'run-command');

// What list-commands gives: each command that an MCP client can use, and the tool for it.
// help-json, docs and mcp are left out: the tools themselves do their work.
export const listedCommands = (): ReadonlyArray<{ readonly name: CommandName; readonly summary: string; readonly tool: ToolName }> =>
  COMMANDS.filter((spec) => toolFor(spec) !== 'list-commands' && toolFor(spec) !== 'get-command-docs').map((spec) => ({
    name: spec.name,
    summary: spec.summary,
    tool: toolFor(spec),
  }));

const NEXT_STEP: Readonly<Record<ToolName, string>> = {
  'run-command': 'Call run-command with the same params.',
  'run-write-command': 'Call run-write-command with the same params, after you get a yes from the user.',
  'get-setup-guide': `Call get-setup-guide for the steps. Then tell the user to run \`${BIN} setup <platform>\` in a terminal, because a token must not go through the chat.`,
  'list-commands': 'Call list-commands to see the commands.',
  'get-command-docs': 'Call get-command-docs with the name of the command.',
};

// The command that a run tool can run, or the failure that gives the tool to call (D49).
export const commandForTool = (tool: RunTool, name: string): Result<CommandSpec, Failure> => {
  const spec = findCommand(name);
  if (spec === undefined) {
    const names = listedCommands().map((command) => command.name);
    return err({ code: 'unknown-command', message: `Unknown command: "${name}".`, hint: `${didYouMean(name, names)}${NEXT_STEP['list-commands']}` });
  }
  const right = toolFor(spec);
  return right === tool ? ok(spec) : err({ code: 'wrong-tool', message: `${tool} cannot run "${spec.name}".`, hint: NEXT_STEP[right] });
};

export type Params = Readonly<Record<string, string | boolean>>;

const flagFor = (name: string, value: string | boolean): ReadonlyArray<string> => {
  if (value === true) return [`--${name}`];
  if (value === false) return [];
  return [`--${name}=${value}`];
};

// The words of the CLI for the params of a call (D50): an argument by its name, a string as
// --name=value (a value that starts with a dash stays a value), a true boolean as the flag
// and a false boolean as no flag. A name can start with dashes.
export const argvFor = (spec: CommandSpec, params: Params): ReadonlyArray<string> => {
  const entries = Object.entries(params).map(([key, value]) => [key.replace(/^-+/, ''), value] as const);
  const isArgument = (key: string, value: string | boolean): boolean => typeof value === 'string' && spec.arguments.some((argument) => argument.name === key);
  const positionals = spec.arguments.flatMap((argument) => entries.filter(([key, value]) => key === argument.name && isArgument(key, value)).map(([, value]) => String(value)));
  const flags = entries.filter(([key, value]) => !isArgument(key, value)).flatMap(([key, value]) => flagFor(key, value));
  return [spec.name, ...positionals, ...flags];
};
