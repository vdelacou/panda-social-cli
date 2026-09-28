import { describe, expect, it } from 'bun:test';
import { PassThrough } from 'node:stream';
import { createWinstonLogger } from './logger.ts';

describe('the Winston logger', () => {
  it('log lines go out as JSON on the stream they are given, with the token field redacted', async () => {
    const stream = new PassThrough();
    const chunks: string[] = [];
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk.toString());
    });
    const logger = createWinstonLogger('info', stream);

    logger.warn('threads.publish.failed', { token: 'abc', cause: 'unauthorized' });
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(JSON.parse(chunks.join(''))).toEqual({ level: 'warn', message: 'threads.publish.failed', token: '[REDACTED]', cause: 'unauthorized' });
  });
});
