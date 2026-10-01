import { pick } from './answer.ts';
import type { Answer } from './answer.ts';

// One line of the report: what was checked, how it went, and what the CLI or the platform said.
export type Check = { readonly name: string; readonly outcome: 'pass' | 'fail' | 'note'; readonly detail: string };

// What a target hands back: its checks, and what is left for the user to do by hand.
export type Findings = { readonly checks: ReadonlyArray<Check>; readonly byHand: ReadonlyArray<string> };

export const check = (name: string, outcome: Check['outcome'], detail: string): Check => ({ name, outcome, detail });

// What a command answered, in one line: ok, or its code and message.
export const said = (answer: Answer): string => (answer.ok ? 'ok' : `${answer.code}: ${answer.message}`);

// The token of a Threads or Instagram status: where it comes from and, when saved, its age.
export const tokenDetail = (data: unknown): string =>
  pick(data, 'token', 'source') === 'saved' ? `token saved ${String(pick(data, 'token', 'ageDays'))} days ago` : 'token from the environment';

export const postsQuota = (data: unknown): string => `posts ${String(pick(data, 'limits', 'posts', 'used'))} of ${String(pick(data, 'limits', 'posts', 'total'))} today`;

// A status check: the account details stay out of the report, which the user pastes into a chat.
export const statusCheck = (platform: string, answer: Answer, detail: (data: Readonly<Record<string, unknown>>) => string): Check =>
  answer.ok ? check(`status ${platform}`, 'pass', detail(answer.data)) : check(`status ${platform}`, 'fail', said(answer));

const cell = (text: string): string => text.replaceAll('|', String.raw`\|`).replaceAll('\n', ' ');

export const renderReport = (title: string, findings: Findings): string =>
  [
    `## ${title}`,
    '',
    '| Check | Result | Detail |',
    '|---|---|---|',
    ...findings.checks.map((line) => `| ${cell(line.name)} | ${line.outcome} | ${cell(line.detail)} |`),
    ...(findings.byHand.length === 0 ? [] : ['', 'By hand:', ...findings.byHand.map((line) => `- ${line}`)]),
  ].join('\n');

export const failed = (findings: Findings): boolean => findings.checks.some((line) => line.outcome === 'fail');
