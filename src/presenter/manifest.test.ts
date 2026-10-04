import { describe, expect, it } from 'bun:test';
import { buildManifest } from './manifest.ts';

describe('the manifest an agent reads first', () => {
  it('the manifest gives each command its usage line, its options, its examples as shell lines, and the error table', () => {
    const manifest = buildManifest();
    const post = manifest.commands.find((command) => command.name === 'post');

    expect(manifest.commands.map((command) => command.name)).toEqual(['post', 'update', 'delete', 'setup', 'status', 'help-json', 'docs', 'mcp']);
    expect(post?.usage).toBe('panda-social post --to <platform> [--text <text>] [--profile <name>] [--image <image>] [--split]');
    expect(post?.options.map((option) => option.flag)).toEqual(['--to', '--text', '--profile', '--image', '--split']);
    expect(post?.examples[0]).toEqual({ command: 'panda-social post --to threads --text "Hello from panda"', explanation: expect.any(String) });
    expect(manifest.errors).toContainEqual({ code: 'missing-credentials', hint: expect.stringContaining('panda-social setup threads') });
  });
});
