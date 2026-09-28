#!/usr/bin/env bun
/*
 * The second half of docs:check: the two hand-written pages people follow must not drift
 * from the code.
 *
 *   - Every `panda-social` line in a bash block of skills/SKILL.md or docs/setup/threads.md
 *     is a command line the real parser accepts.
 *   - Every setup step the CLI shows (THREADS_SETUP_STEPS) is in the guide: its title as a
 *     `## Step N: <title>` heading, each action as a `- <action>` line, its URL as `Open <url>`.
 *   - The skill's frontmatter names it panda-social and keeps its description within the
 *     1,024 characters an agent harness loads.
 *
 *   bun run scripts/check-guides.ts   # exit 1 with one line per finding
 */
import { parseCliArgs } from '../src/presenter/cli.ts';
import { THREADS_SETUP_STEPS } from '../src/presenter/threads-setup-steps.ts';

const SKILL = 'skills/SKILL.md';
const GUIDE = 'docs/setup/threads.md';
const DESCRIPTION_LIMIT = 1024;

type Line = { readonly number: number; readonly text: string };

// The lines inside ```bash fences, numbered as in the file.
const bashLines = (page: string): ReadonlyArray<Line> => {
  const lines: Line[] = [];
  let inBash = false;
  for (const [index, text] of page.split('\n').entries()) {
    if (text.startsWith('```')) {
      inBash = !inBash && text === '```bash';
      continue;
    }
    if (inBash) lines.push({ number: index + 1, text: text.trim() });
  }
  return lines;
};

// Split like a shell: quotes group words and are dropped, and the words stop at the first
// redirection, pipe, separator or comment.
const shellWords = (line: string): ReadonlyArray<string> => {
  const words: string[] = [];
  for (const [, doubled, single, operator, bare] of line.matchAll(/"([^"]*)"|'([^']*)'|([<>|;&#])|([^\s"'<>|;&#]+)/g)) {
    if (operator !== undefined) break;
    words.push(doubled ?? single ?? bare ?? '');
  }
  return words;
};

const commandFindings = (file: string, text: string): ReadonlyArray<string> =>
  bashLines(text)
    .filter((line) => line.text.startsWith('panda-social '))
    .flatMap((line) => {
      const parsed = parseCliArgs(shellWords(line.text).slice(1));
      return parsed.ok ? [] : [`${file}:${line.number}: \`${line.text}\` is refused by the CLI: ${parsed.error.code}, ${parsed.error.message}`];
    });

const stepFindings = (guide: string): ReadonlyArray<string> => {
  const lines = new Set(guide.split('\n'));
  return THREADS_SETUP_STEPS.flatMap((step, index) =>
    [`## Step ${index + 1}: ${step.title}`, ...step.actions.map((action) => `- ${action}`), ...(step.url ? [`Open ${step.url}`] : [])]
      .filter((expected) => !lines.has(expected))
      .map((expected) => `${GUIDE}: the CLI's setup step ${index + 1} has "${expected}", which the guide lacks`)
  );
};

// The frontmatter's name, and its description with the folded lines joined as YAML joins them.
const frontmatter = (text: string): { readonly name: string | undefined; readonly description: string } => {
  const lines = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1]?.split('\n') ?? [];
  const start = lines.findIndex((line) => line.startsWith('description:'));
  const folded = start === -1 ? [] : lines.slice(start + 1).filter((line) => line.startsWith('  '));
  const name = lines.find((line) => line.startsWith('name: '))?.slice('name: '.length);
  return { name, description: folded.map((line) => line.trim()).join(' ') };
};

const skillFindings = (skill: string): ReadonlyArray<string> => {
  const { name, description } = frontmatter(skill);
  const findings: string[] = [];
  if (name !== 'panda-social') findings.push(`${SKILL}: the frontmatter must name the skill panda-social, found ${String(name)}`);
  if (description === '') findings.push(`${SKILL}: the frontmatter has no folded description`);
  if (description.length > DESCRIPTION_LIMIT) findings.push(`${SKILL}: the description runs ${description.length} characters, over the ${DESCRIPTION_LIMIT} a harness loads`);
  return findings;
};

const skill = await Bun.file(SKILL).text();
const guide = await Bun.file(GUIDE).text();
const findings = [...commandFindings(SKILL, skill), ...commandFindings(GUIDE, guide), ...stepFindings(guide), ...skillFindings(skill)];

for (const finding of findings) console.error(`docs-check: ${finding}`);
if (findings.length > 0) process.exit(1);
console.log(`docs-check: ${SKILL} and ${GUIDE} match the CLI`);
