import { describe, expect, it } from 'bun:test';
import { renderCommandPage, renderCommandsReference } from './command-docs.ts';
import { COMMANDS, findCommand } from './command-registry.ts';

describe('the command documentation', () => {
  it('the post page shows its usage line, an options table, examples ready to paste into a shell, the output and its error codes', () => {
    const post = findCommand('post');
    const page = post ? renderCommandPage(post) : '';

    expect(page).toContain('## post');
    expect(page).toContain('panda-social post --to <platform> [--text <text>] [--profile <name>] [--image <url>] [--split]');
    expect(page).toContain('| `--to <platform>` | yes |');
    expect(page).toContain('| `--profile <name>` | no |');
    expect(page).toContain('panda-social post --to threads --text "Hello from panda"');
    expect(page).toContain('"platform":"threads"');
    expect(page).toContain('`missing-text`');
  });

  it('the commands reference lists every command, the output contract and the error table', () => {
    const reference = renderCommandsReference();

    for (const command of COMMANDS) expect(reference).toContain(`## ${command.name}`);
    expect(reference).toContain('prints one JSON line');
    expect(reference).toContain('## Error codes');
    expect(reference).toContain('| `missing-credentials` |');
  });
});
