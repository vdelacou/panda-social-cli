import type { ArgumentSpec, CommandSpec, OptionSpec } from './command-spec.ts';

export const BIN = 'panda-social';

export const optionFlag = (option: OptionSpec): string => (option.type === 'string' ? `--${option.name} <${option.placeholder ?? option.name}>` : `--${option.name}`);

const optionUsage = (option: OptionSpec): string => (option.required ? optionFlag(option) : `[${optionFlag(option)}]`);

export const argumentUsage = (argument: ArgumentSpec): string => (argument.required ? `<${argument.name}>` : `[<${argument.name}>]`);

export const usageLine = (spec: CommandSpec): string =>
  [BIN, spec.name, ...spec.arguments.map((argument) => argumentUsage(argument)), ...spec.options.map((option) => optionUsage(option))].join(' ');

// A word a POSIX shell reads as-is stays bare; anything else is double-quoted, with the
// four characters that stay special inside double quotes escaped.
const BARE_WORD = /^[\w./:=@%+,-]+$/;
const SPECIAL_IN_QUOTES = /["$\\`]/g;
const escapeInQuotes = (word: string): string => word.replaceAll(SPECIAL_IN_QUOTES, (character) => `\\${character}`);

const shellWord = (word: string): string => (BARE_WORD.test(word) ? word : `"${escapeInQuotes(word)}"`);

export const commandLine = (argv: ReadonlyArray<string>): string => [BIN, ...argv.map((word) => shellWord(word))].join(' ');
