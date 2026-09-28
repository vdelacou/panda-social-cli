import { describe, expect, it } from 'bun:test';
import { imagePathUnsafe } from '../domain/image-path.ts';
import { imageUrlUnsafe } from '../domain/image-url.ts';
import { DEFAULT_PROFILE, profileNameUnsafe } from '../domain/profile-name.ts';
import { ok } from '../domain/result.ts';
import { threadsPostIdUnsafe } from '../domain/threads-post-id.ts';
import { xPostIdUnsafe } from '../domain/x-post-id.ts';
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
    expect(!result.ok && result.error.hint).toContain('post, update, delete, setup, status, help-json, docs');
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

const IMAGE = 'https://cdn.example.com/cat.jpg';
const POST = '17890000000000001';

describe('reading the Threads features', () => {
  it('`post --to threads --image https://…` reads as an image post, with or without text', () => {
    expect(parseCliArgs(['post', '--to', 'threads', '--image', IMAGE])).toEqual(ok({ command: 'post', platform: 'threads', imageUrl: imageUrlUnsafe(IMAGE) }));
    expect(parseCliArgs(['post', '--to', 'threads', '--image', IMAGE, '--text', 'A cat'])).toEqual(
      ok({ command: 'post', platform: 'threads', text: 'A cat', imageUrl: imageUrlUnsafe(IMAGE) })
    );
  });

  it('a local image path is refused, and the hint says Threads needs a public https URL', () => {
    const result = parseCliArgs(['post', '--to', 'threads', '--image', './cat.jpg']);

    expect(!result.ok && result.error.code).toBe('invalid-image');
    expect(!result.ok && result.error.hint).toContain('public https URL');
  });

  it('`post ... --split` carries the split request', () => {
    expect(parseCliArgs(['post', '--to', 'threads', '--text', 'Long text', '--split'])).toEqual(ok({ command: 'post', platform: 'threads', text: 'Long text', split: true }));
  });

  it('`delete --on threads --id <id>` reads as a delete of that post', () => {
    expect(parseCliArgs(['delete', '--on', 'threads', '--id', POST])).toEqual(ok({ command: 'delete', platform: 'threads', id: threadsPostIdUnsafe(POST) }));
  });

  it('a post id that is not numeric is refused before anything is sent', () => {
    const result = parseCliArgs(['delete', '--on', 'threads', '--id', '../me']);

    expect(!result.ok && result.error.code).toBe('invalid-post-id');
  });

  it('`update --on threads --id <id> --text … --repost` reads as a repost', () => {
    expect(parseCliArgs(['update', '--on', 'threads', '--id', POST, '--text', 'Fixed', '--repost'])).toEqual(
      ok({ command: 'update', platform: 'threads', id: threadsPostIdUnsafe(POST), text: 'Fixed', repost: true })
    );
  });

  it('`status threads` reads as a status check of the default profile, and --profile names another', () => {
    expect(parseCliArgs(['status', 'threads'])).toEqual(ok({ command: 'status', platform: 'threads' }));
    expect(parseCliArgs(['status', 'threads', '--profile', 'brand-a'])).toEqual(ok({ command: 'status', platform: 'threads', profile: profileNameUnsafe('brand-a') }));
  });

  it('`status` for a platform with no support is refused, and the hint names threads', () => {
    const result = parseCliArgs(['status', 'myspace']);

    expect(!result.ok && result.error.code).toBe('unknown-platform');
    expect(!result.ok && result.error.hint).toContain('threads');
  });
});

describe('reading the X commands', () => {
  it('`setup x` reads as the X setup of the default profile, and --keys-stdin and --profile are carried', () => {
    expect(parseCliArgs(['setup', 'x'])).toEqual(ok({ command: 'setup', platform: 'x', profile: DEFAULT_PROFILE, keysFromStdin: false }));
    expect(parseCliArgs(['setup', 'x', '--keys-stdin', '--profile', 'brand-a'])).toEqual(
      ok({ command: 'setup', platform: 'x', profile: profileNameUnsafe('brand-a'), keysFromStdin: true })
    );
  });

  it('`setup x --token-stdin` and `setup threads --keys-stdin` are refused, each naming the flag its platform takes', () => {
    const x = parseCliArgs(['setup', 'x', '--token-stdin']);
    const threads = parseCliArgs(['setup', 'threads', '--keys-stdin']);

    expect(!x.ok && x.error.code).toBe('unknown-option');
    expect(!x.ok && x.error.message).toContain('--keys-stdin');
    expect(!threads.ok && threads.error.code).toBe('unknown-option');
    expect(!threads.ok && threads.error.message).toContain('--token-stdin');
  });

  it('`status x` reads as a status check of X', () => {
    expect(parseCliArgs(['status', 'x'])).toEqual(ok({ command: 'status', platform: 'x' }));
  });
});

describe('reading the X post commands', () => {
  it('`post --to x` reads the text, a local image path and --split as an X post', () => {
    expect(parseCliArgs(['post', '--to', 'x', '--text', 'Hello', '--image', './chart.png', '--split'])).toEqual(
      ok({ command: 'post', platform: 'x', text: 'Hello', imagePath: imagePathUnsafe('./chart.png'), split: true })
    );
  });

  it('`post --to x` with an https image is refused as invalid-image, with the advice to download the file first', () => {
    const result = parseCliArgs(['post', '--to', 'x', '--image', 'https://cdn.example.com/cat.jpg']);

    expect(!result.ok && result.error.code).toBe('invalid-image');
    expect(!result.ok && result.error.message).toBe('"https://cdn.example.com/cat.jpg" is a URL, not a local file: download it first, then pass its path.');
    expect(!result.ok && result.error.hint).toContain('X needs a local JPEG, PNG, GIF or WEBP file');
  });

  it('`update --on x` and `delete --on x` read an X post id, and a 20-digit or non-numeric id is refused as invalid-post-id', () => {
    expect(parseCliArgs(['update', '--on', 'x', '--id', '1880000000000000001', '--text', 'Fixed'])).toEqual(
      ok({ command: 'update', platform: 'x', id: xPostIdUnsafe('1880000000000000001'), text: 'Fixed', repost: false })
    );
    expect(parseCliArgs(['delete', '--on', 'x', '--id', '1880000000000000001'])).toEqual(ok({ command: 'delete', platform: 'x', id: xPostIdUnsafe('1880000000000000001') }));
    for (const id of ['12345678901234567890', 'abc']) {
      const result = parseCliArgs(['delete', '--on', 'x', '--id', id]);

      expect(!result.ok && result.error.code).toBe('invalid-post-id');
    }
  });
});
