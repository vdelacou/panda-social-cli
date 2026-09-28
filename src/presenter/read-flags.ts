import { parseArgs } from 'node:util';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CommandSpec } from './command-spec.ts';
import { didYouMean } from './did-you-mean.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import { BIN } from './usage.ts';

export type Flags = {
  readonly values: Readonly<Record<string, string | boolean | undefined>>;
  readonly positionals: ReadonlyArray<string>;
};

// The hint for an option the command does not take: the one meant, when one is close, then all of them.
const optionsHint = (spec: CommandSpec, unknown: string): string => {
  const names = spec.options.map((option) => option.name);
  const flags = names.map((name) => `--${name}`);
  const listed = flags.length === 0 ? `${spec.name} takes no options.` : `Options for ${spec.name}: ${flags.join(', ')}.`;
  return `${didYouMean(unknown, names, '--')}${listed} Run \`${BIN} docs ${spec.name}\` for details.`;
};

// No option takes several values (parseArgs keeps the last one of a repeated flag), so a
// value is a string, a boolean, or absent.
const scalar = (value: unknown): string | boolean | undefined => (typeof value === 'string' || typeof value === 'boolean' ? value : undefined);

// strict: false keeps parseArgs from throwing (try/catch stays out of the presenter,
// rule 17); the registry then refuses what strict mode would have: an option the
// command does not take, and an argument beyond the ones it names.
export const readFlags = (spec: CommandSpec, args: ReadonlyArray<string>): Result<Flags, Failure> => {
  const options = Object.fromEntries(spec.options.map((option) => [option.name, { type: option.type }]));
  const parsed = parseArgs({ args: [...args], options, strict: false, allowPositionals: true });
  const unknown = Object.keys(parsed.values).find((key) => spec.options.every((option) => option.name !== key));
  if (unknown !== undefined) return err({ code: 'unknown-option', message: `${spec.name} has no --${unknown} option.`, hint: optionsHint(spec, unknown) });
  const extra = parsed.positionals.at(spec.arguments.length);
  if (extra !== undefined) return err({ code: 'unexpected-argument', message: `Unexpected argument for ${spec.name}: "${extra}".`, hint: hintFor('unexpected-argument') });
  const values = Object.fromEntries(Object.entries(parsed.values).map(([key, value]) => [key, scalar(value)]));
  return ok({ values, positionals: parsed.positionals });
};
