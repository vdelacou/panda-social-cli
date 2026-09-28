import { describe, expect, it } from 'bun:test';
import { DEFAULT_PROFILE, profileNameUnsafe } from '../domain/profile-name.ts';
import { ok } from '../domain/result.ts';
import { parseCliArgs, renderFailure, renderSuccess } from './cli.ts';

describe('reading the command line', () => {
  it('`post --to threads --text Hello` reads as a Threads post of "Hello"', () => {
    expect(parseCliArgs(['post', '--to', 'threads', '--text', 'Hello'])).toEqual(ok({ command: 'post', platform: 'threads', text: 'Hello' }));
  });

  it('an unknown platform is refused, and the hint lists the supported ones', () => {
    const result = parseCliArgs(['post', '--to', 'myspace', '--text', 'Hello']);

    expect(!result.ok && result.error.code).toBe('unknown-platform');
    expect(!result.ok && result.error.hint).toContain('Supported platforms: threads');
  });

  it('a missing --text is refused, and the hint shows a complete example', () => {
    const result = parseCliArgs(['post', '--to', 'threads']);

    expect(!result.ok && result.error.code).toBe('missing-text');
    expect(!result.ok && result.error.hint).toContain('panda-social post --to threads --text "Hello from panda"');
  });
});

describe('reading the setup and profile flags', () => {
  it('`setup threads` reads as the Threads setup for the default profile', () => {
    expect(parseCliArgs(['setup', 'threads'])).toEqual(ok({ command: 'setup', platform: 'threads', profile: DEFAULT_PROFILE, tokenFromStdin: false }));
  });

  it('`setup threads --token-stdin --profile brand-a` reads as a non-interactive setup for brand-a', () => {
    expect(parseCliArgs(['setup', 'threads', '--token-stdin', '--profile', 'brand-a'])).toEqual(
      ok({ command: 'setup', platform: 'threads', profile: profileNameUnsafe('brand-a'), tokenFromStdin: true })
    );
  });

  it('`setup myspace` is refused with a hint listing the platforms that have a setup', () => {
    const result = parseCliArgs(['setup', 'myspace']);

    expect(!result.ok && result.error.code).toBe('unknown-platform');
    expect(!result.ok && result.error.hint).toContain('Platforms with a setup: threads');
  });

  it('`post --profile brand-a ...` carries the profile', () => {
    expect(parseCliArgs(['post', '--to', 'threads', '--text', 'Hello', '--profile', 'brand-a'])).toEqual(
      ok({ command: 'post', platform: 'threads', text: 'Hello', profile: profileNameUnsafe('brand-a') })
    );
  });
});

describe('writing the answer', () => {
  it('a published post renders as {"ok":true,"data":...}', () => {
    const data = { platform: 'threads', id: '17890000000000001', url: 'https://www.threads.com/@panda/post/C0ffee' };

    expect(JSON.parse(renderSuccess(data))).toEqual({ ok: true, data });
  });

  it('a failure renders as {"ok":false,"error":{"code","message","hint"}}', () => {
    const failure = { code: 'missing-text', message: 'The post has no text.', hint: 'Pass the text with --text.' };

    expect(JSON.parse(renderFailure(failure))).toEqual({ ok: false, error: failure });
  });
});

describe('reading the agent entry points', () => {
  it('`--version` reads as the version request', () => {
    expect(parseCliArgs(['--version'])).toEqual(ok({ command: 'version' }));
  });

  it('no arguments, or `--help`, reads as the manifest request', () => {
    expect(parseCliArgs([])).toEqual(ok({ command: 'help-json' }));
    expect(parseCliArgs(['--help'])).toEqual(ok({ command: 'help-json' }));
  });

  it('`docs post` and `post --help` both ask for the post documentation', () => {
    expect(parseCliArgs(['docs', 'post'])).toEqual(ok({ command: 'docs', target: 'post' }));
    expect(parseCliArgs(['post', '--help'])).toEqual(ok({ command: 'docs', target: 'post' }));
  });

  it('`docs myspace` is refused, and the hint lists the commands', () => {
    const result = parseCliArgs(['docs', 'myspace']);

    expect(!result.ok && result.error.code).toBe('unknown-command');
    expect(!result.ok && result.error.hint).toContain('post, setup, help-json, docs');
  });

  it('an unknown option is refused, and the hint lists the command options', () => {
    const result = parseCliArgs(['post', '--to', 'threads', '--text', 'Hello', '--txet', 'oops']);

    expect(!result.ok && result.error.code).toBe('unknown-option');
    expect(!result.ok && result.error.hint).toContain('--to, --text, --profile');
  });

  it('text with spaces left unquoted is refused as an unexpected argument, and the hint shows it quoted', () => {
    const result = parseCliArgs(['post', '--to', 'threads', '--text', 'Hello', 'from', 'panda']);

    expect(!result.ok && result.error.code).toBe('unexpected-argument');
    expect(!result.ok && result.error.hint).toContain('--text "Hello from panda"');
  });
});
