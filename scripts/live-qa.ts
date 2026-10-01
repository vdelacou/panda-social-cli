#!/usr/bin/env bun
/*
 * Live QA (plan 2.6, D42 to D44): the built CLI against the real platforms, run by the user on
 * their own machine with the credentials setup saved there, or with the environment variables.
 * The report goes to stdout, to paste back; it holds ids and what each command answered, never a
 * token, a username or a profile link.
 *
 *   bun run build
 *   bun scripts/live-qa.ts threads                                  status only
 *   bun scripts/live-qa.ts threads --publish --image <https URL>    posts, then deletes them
 *   bun scripts/live-qa.ts instagram --renewal                      renews a token a day old or more
 *
 * --profile <name> picks a profile, --runtime bun runs the CLI under Bun instead of Node.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { formatError } from '../src/domain/utilities/format-error.ts';
import { createRunner, pick } from './live-qa/answer.ts';
import { facebookQa } from './live-qa/facebook.ts';
import { instagramQa } from './live-qa/instagram.ts';
import { check, failed, renderReport } from './live-qa/report.ts';
import type { Findings } from './live-qa/report.ts';
import { downloadImage } from './live-qa/session.ts';
import type { Session } from './live-qa/session.ts';
import { threadsQa } from './live-qa/threads.ts';
import { xQa } from './live-qa/x.ts';

const TARGETS: Readonly<Record<string, (session: Session) => Promise<Findings>>> = {
  threads: threadsQa,
  x: xQa,
  facebook: facebookQa,
  instagram: instagramQa,
};

// What --publish posts, said before anything goes out (D43).
const PUBLISHES: Readonly<Record<string, string>> = {
  threads: 'posts a text, an image (with --image) and a --split thread on Threads, then deletes them',
  x: 'posts a text and an image file (with --image) on X and edits the text, then deletes them, for about $0.10 of X credits',
  facebook: 'posts a text twice, a photo by URL and as a file (with --image) on the Page and edits the text, then deletes them',
  instagram: 'posts the --image on Instagram, which only the app can delete, and offers Instagram a PNG it should refuse',
};

const USAGE = `Usage: bun scripts/live-qa.ts <${Object.keys(TARGETS).join('|')}> [--publish] [--renewal] [--image <https URL>] [--profile <name>] [--runtime node|bun]`;

const { values, positionals } = parseArgs({
  options: { publish: { type: 'boolean' }, renewal: { type: 'boolean' }, image: { type: 'string' }, profile: { type: 'string' }, runtime: { type: 'string' } },
  allowPositionals: true,
});
const target = positionals[0] ?? '';
const runtime = values.runtime ?? 'node';
const stop = (message: string): never => {
  console.error(message);
  process.exit(2);
};
if (!Object.hasOwn(TARGETS, target)) stop(USAGE);
if (!(await Bun.file('dist/cli.js').exists())) stop('Run `bun run build` first: the QA runs the built CLI, as npm ships it.');
if (Bun.which(runtime) === null) stop(`${runtime} is not on PATH.`);
const publish = values.publish === true && Object.hasOwn(PUBLISHES, target);
const interactive = process.stdin.isTTY === true;
if (publish && interactive && !confirm(`This run ${PUBLISHES[target]}. Go on?`)) stop('Nothing was posted.');

// A target that throws, on a network failure or a timeout, still ends in a report.
const findingsOf = async (session: Session): Promise<Findings> => {
  try {
    return await TARGETS[target](session);
  } catch (error) {
    return { checks: [check(target, 'fail', `the run stopped: ${formatError(error)}`)], byHand: [] };
  }
};

const work = await mkdtemp(path.join(os.tmpdir(), 'panda-social-qa-'));
try {
  const run = createRunner(runtime, values.profile);
  const downloaded = values.image === undefined ? undefined : await downloadImage(values.image, work);
  const imageFile = downloaded !== undefined && 'file' in downloaded ? downloaded.file : undefined;
  const session: Session = {
    run,
    stamp: new Date().toISOString(),
    profile: values.profile ?? 'default',
    work,
    publish,
    renewal: values.renewal === true,
    interactive,
    ...(values.image !== undefined && { image: values.image }),
    ...(imageFile !== undefined && { imageFile }),
  };
  const download = downloaded !== undefined && 'problem' in downloaded ? [check('download the --image', 'fail', downloaded.problem)] : [];
  const findings = await findingsOf(session);
  const version = String(pick(run(['--version']), 'data', 'version'));
  const title = `Live QA: ${target}, profile ${session.profile}, ${session.stamp}, panda-social-cli ${version} on ${runtime} ${Bun.spawnSync([runtime, '--version']).stdout.toString().trim()}`;
  const report = { checks: [...download, ...findings.checks], byHand: findings.byHand };
  console.log(renderReport(title, report));
  process.exitCode = failed(report) ? 1 : 0;
} finally {
  await rm(work, { recursive: true, force: true });
}
