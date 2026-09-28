import { describe, expect, it } from 'bun:test';
import { parseCliArgs } from './cli.ts';
import { COMMANDS, GLOBAL_ERRORS } from './command-registry.ts';
import { documentedHints } from './hints.ts';

const alphabetical = (left: string, right: string): number => left.localeCompare(right);

describe('the command registry', () => {
  it('every example in the documentation is a command line the CLI accepts', () => {
    const examples = COMMANDS.flatMap((command) => command.examples.map((example) => example.argv));

    expect(examples.length).toBeGreaterThan(0);
    for (const argv of examples) {
      expect({ argv, accepted: parseCliArgs(argv).ok }).toEqual({ argv, accepted: true });
    }
  });

  it('every error code a command can return has a documented next step, and every documented code belongs to a command', () => {
    const returned = new Set([...GLOBAL_ERRORS, ...COMMANDS.flatMap((command) => command.errors)]);
    const documented = new Set(documentedHints().map((entry) => entry.code));

    expect([...returned].toSorted(alphabetical)).toEqual([...documented].toSorted(alphabetical));
  });
});
