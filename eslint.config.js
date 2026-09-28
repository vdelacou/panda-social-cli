import pluginJs from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tsPlugin from 'typescript-eslint';

// `mock` from `bun:test` is process-global once installed and leaks into every
// other test file the runner loads, and `spyOn`, `jest` and `vi` are the same
// mocking machinery under other names. Use dependency injection (createXFromApi or
// installFetchMock) instead. See references/testing-infra.md. A const, because
// every layer zone below has to repeat it (see the replace-not-merge note).
const MOCK_BAN = {
  name: 'bun:test',
  importNames: ['mock', 'spyOn', 'jest', 'vi'],
  message:
    '`mock`, `spyOn`, `jest` and `vi` from bun:test are forbidden: mocks leak across test files. Use dependency injection: refactor the production code to accept the SDK as a parameter, then pass a fake at construction (hard rule 13).',
};

// The style rules as lint (hard rules 1, 7, 10, 18, and 13's call-recording assertions).
// ESLint REPLACES a rule's options
// when a second block matches the same file, it never merges them, so every scoped
// `no-restricted-syntax` block below spreads this list before its own selector.
const STYLE_BANS = [
  { selector: 'ClassDeclaration', message: 'No class keyword (hard rule 1; rule 10 for error classes): a module of arrow functions and typed records (references/design-patterns.md).' },
  { selector: 'ClassExpression', message: 'No class keyword (hard rule 1): a module of arrow functions and typed records (references/design-patterns.md).' },
  { selector: 'ImportSpecifier[importKind="type"]', message: 'Type-only imports on their own line: `import type { Foo } from ...` (hard rule 7).' },
  {
    selector: 'VariableDeclarator[id.name!=/^create[A-Z]/] > ArrowFunctionExpression > ArrowFunctionExpression.body',
    message: 'No curried arrow chains: one arrow with all its parameters, wrapped at the call site; the DI factory `createX = (deps) => (input) => ...` is the one exemption (hard rule 18, references/clean-code.md).',
  },
  {
    selector: 'MemberExpression[property.name=/^(toHaveBeen(Last|Nth)?Called|toBeCalled|toHave(Last|Nth)?Returned)/]',
    message: 'No call-recording assertions: a hand-written fake records what it received and the test asserts on that record (hard rule 13, references/testing.md).',
  },
];
// Hard rule 17: a use-case pattern-matches the Result a port returns; a catch there means the port lied.
const TRY_BAN = {
  selector: 'TryStatement',
  message: 'try/catch is quarantined to src/infra/**, the pure-domain fallback and src/main.ts; a use-case pattern-matches the Result (hard rule 17, references/result-type.md).',
};
// Hard rule 20: file IO is Bun.file / Bun.write; node:fs only in tests, src/test-helpers/**
// and the one commented directory helper in src/infra/** (File IO, below).
const FS_BAN = {
  selector: 'ImportDeclaration[source.value=/^(node:)?fs(\\/promises)?$/]',
  message: 'File IO goes through Bun.file and Bun.write; node:fs only in tests, src/test-helpers/** and the one commented directory helper in src/infra/** (hard rule 20, references/bun-typescript.md, File IO).',
};

// A `<factory>Unsafe` helper casts a brand without validating (references/testing.md,
// Branded types and `expect(...).toBe(raw)`); only tests and the fakes may import one.
// It rides inside the zones because flat config replaces a rule's options: a separate
// no-restricted-imports block would wipe the mock ban and the zone for its files.
const INFRA_NO_USE_CASE = {
  group: ['**/use-cases/*', '!**/use-cases/ports'],
  message: 'src/infra implements the use-case ports and never imports a use-case: dependencies point inward (hard rule 37, references/architecture.md, the dependency table).',
};
const UNSAFE_BAN = {
  group: ['**'],
  importNamePattern: 'Unsafe$',
  message: '*Unsafe helpers skip validation and are test-only: production code builds the value through its factory (references/testing.md, Branded types).',
};

// The dependency rule as lint (hard rule 37; references/architecture.md, the dependency
// table). Dependencies point inward, so each layer names the layers it may never import,
// and a layer left out of a list is one it is allowed to reach. Production files only: a
// test reaches for the fakes in src/test-helpers/ by design, and the fakes may build
// their values with the *Unsafe helpers, so that zone alone leaves UNSAFE_BAN out.
// `extraPatterns` carries a ban a name list cannot say, like infra's below.
const layerZone = (layer, forbidden, files = [`src/${layer}/**/*.ts`], extraPatterns = []) => ({
  files,
  ignores: ['**/*.test.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [MOCK_BAN],
        patterns: [
          {
            group: forbidden.flatMap((name) => [`**/${name}`, `**/${name}/**`]),
            message: `src/${layer} must not import ${forbidden.join(', ')}: dependencies point inward (hard rule 37, references/architecture.md, the dependency table).`,
          },
          ...extraPatterns,
          ...(layer === 'test-helpers' ? [] : [UNSAFE_BAN]),
        ],
      },
    ],
  },
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  ...tsPlugin.configs.recommended,
  securityPlugin.configs.recommended,
  {
    // Hard rule 15: no inline ignore, ever. Directive comments (eslint-disable*, eslint-enable,
    // globals, exported) are inert AND each one is reported, so `--max-warnings=0` fails on the
    // comment and the violation it hid surfaces beside it. A finding is a refactor or a
    // project-level severity change with a reason, never a suppression.
    linterOptions: { noInlineConfig: true },
  },
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'func-style': ['error', 'expression'],
      // Rule 35: cyclomatic complexity at most 10 per function. The size caps
      // (10 lines, one indentation level) miss a one-line chain of `&&`/`??`/
      // ternaries and a wide `switch`; this counts the branches.
      complexity: ['error', 10],
      'no-console': ['error'],
      'prefer-template': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-restricted-imports': ['error', { paths: [MOCK_BAN] }],
      // Hard rules 1, 7, 10, 18 and 13's call assertions (STYLE_BANS above); the scoped blocks below add 17 and 20.
      'no-restricted-syntax': ['error', ...STYLE_BANS],
      // Hard rule 15, the other tools' escape hatches: every @ts- form (the recommended preset
      // allows a described @ts-expect-error) and the markers other tools read, anywhere in a comment.
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true, 'ts-check': false }],
      'no-warning-comments': ['error', { terms: ['prettier-ignore', 'stryker disable', 'nosonar', 'sonar-ignore', 'snyk-ignore', 'deepcode ignore', 'biome-ignore', 'oxlint-disable', 'c8 ignore', 'v8 ignore', 'istanbul ignore', 'gitleaks:allow'], location: 'anywhere' }],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true, allowTypedFunctionExpressions: true }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },
  {
    // Gate scripts (scripts/check-coverage.ts, scripts/regenerate-coverage-preload.ts)
    // are terminal tools, not production code: their whole job is printing to the
    // console that invoked them. The Logger port (rule 4) governs src/**; injecting
    // Winston into a pre-commit gate would be ceremony without observability value.
    // Project-level severity change with a comment, never an inline ignore (rule 15).
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Hard rule 17 for the one layer where the count is zero; the domain fallback, the
    // adapter catch and the single catch in main.ts stay with review.
    files: ['src/use-cases/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: { 'no-restricted-syntax': ['error', ...STYLE_BANS, TRY_BAN, FS_BAN] },
  },
  {
    // Hard rule 20 over the rest of src/**; the carve-outs are paths, never inline ignores.
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', 'src/test-helpers/**', 'src/infra/**', 'src/use-cases/**'],
    rules: { 'no-restricted-syntax': ['error', ...STYLE_BANS, FS_BAN] },
  },
  layerZone('domain', ['use-cases', 'infra', 'presenter', 'composition', 'test-helpers']),
  layerZone('use-cases', ['infra', 'presenter', 'composition', 'test-helpers']),
  layerZone('presenter', ['use-cases', 'infra', 'composition', 'test-helpers']),
  // An adapter implements the use-case ports and never imports a use-case (the table
  // allows infra the domain and the ports only). Gitignore semantics cannot re-include a
  // file under an excluded directory, so the pattern excludes the entries of use-cases/
  // and re-includes ports/ itself; a use-case at any depth stays banned.
  layerZone('infra', ['presenter', 'composition', 'test-helpers'], undefined, [INFRA_NO_USE_CASE]),
  layerZone('composition', ['test-helpers']),
  // The fakes may reach the ports they stand for and the entry points a test harness
  // drives; an adapter is the one thing they may never wrap, or the fake stops being a fake.
  layerZone('test-helpers', ['infra']),
  // The entry point sees the composition root, the presenter and infra; it is still
  // production code, so the fakes stay out of it.
  layerZone('main.ts', ['test-helpers'], ['src/main.ts']),
  // Type-aware rules: slow (~25s on full repo), enabled only by
  // `bun run lint:strict` (which sets LINT_STRICT=1), CI's lint step.
  // Inner-loop `bun run lint` does NOT run them.
  ...(process.env['LINT_STRICT']
    ? [
        {
          files: ['src/**/*.ts'],
          languageOptions: {
            parserOptions: {
              projectService: true,
              tsconfigRootDir: import.meta.dirname,
            },
          },
          rules: {
            // Lint-time equivalents of Sonar S4325 (no `!`/`as` non-narrowing assertions)
            // and S6671 (Promise.reject must be an Error).
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/prefer-promise-reject-errors': 'error',
          },
        },
      ]
    : []),
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': [
        1,
        {
          endOfLine: 'lf',
          printWidth: 180,
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5',
        },
      ],
    },
  },
  unicornPlugin.configs.recommended,
  {
    // unicorn's recommended set, less what contradicts the standard or prettier: each rule off for
    // its reason, never inline (hard rule 15). Probed 2026-09-27 against unicorn 61 and 76; a rule
    // renamed between them is named twice, since 'off' on a rule the installed version lacks is a no-op.
    rules: {
      // Formatting is prettier's; these three fight its output (eslint-config-prettier's list).
      'unicorn/empty-brace-spaces': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/number-literal-case': 'off',
      // A port returns `T | null` for an absent row (references/architecture.md).
      'unicorn/no-null': 'off',
      // The standard's own names fail it: the DI factory's `deps`, the Result pair's `err()`, React's
      // `XProps`. Do not abbreviate (references/clean-code.md) stays with review.
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/name-replacements': 'off',
      // Flags every guard clause followed by a return, clean-code.md's own GOOD example: the
      // standard says no `else`, guard clauses instead.
      'unicorn/prefer-ternary': 'off',
      // The standard folds with reduce (first-class collections, references/clean-code.md); a for-of
      // accumulator would trade the fold for a mutable `let`.
      'unicorn/no-array-reduce': 'off',
      // Domain predicates read as the domain says them (`moneyEquals`, references/object-design.md)
      // and the Result discriminant is `ok` (hard rule 16).
      'unicorn/consistent-boolean-name': 'off',
      // Number('') is 0 where parseFloat reads NaN, and a gate parsing a tool's text table (the
      // coverage gate) needs the parseFloat reading.
      'unicorn/prefer-number-coercion': 'off',
      // unicorn 61 wants `Number.NaN` and 76 wants `NaN`; `Number.NaN` satisfies both.
      'unicorn/prefer-global-number-constants': 'off',
      // `ok(undefined)` is how a `Result<void, E>` succeeds (hard rule 16).
      'unicorn/no-useless-undefined': ['error', { checkArguments: false }],
    },
  },
  {
    // The test seams swap a global and restore it (installFetchMock, references/testing-infra.md);
    // production code never assigns one.
    files: ['src/test-helpers/**/*.ts', '**/*.test.ts'],
    rules: {
      'unicorn/no-global-object-property-assignment': 'off',
      'unicorn/no-unnecessary-global-this': 'off',
    },
  },
  {
    rules: {
      // false-positive-heavy rules in this codebase's idioms; disabled at project level.
      // Never inline-ignore: change severity here or refactor the code.
      'security/detect-object-injection': 'off',
      'security/detect-unsafe-regex': 'off',
      // detect-non-literal-fs-filename flags `chmodSync(mkdtempSync(...))` in FS-adapter
      // tests. Production code uses Bun.file (not flagged by this rule), so disabling
      // globally loses nothing on the real attack surface.
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  sonarjsPlugin.configs.recommended,
  {
    // SonarJS rule overrides: always-on, each with its reason on its own line.
    rules: {
      'sonarjs/no-unused-vars': 'off',          // duplicates @typescript-eslint/no-unused-vars
      'sonarjs/no-empty-test-file': 'off',      // false positives on `describe` test layout
      'sonarjs/cognitive-complexity': 'off',    // one metric: the cyclomatic cap (rule 35) plus the size caps cover it
      // 2026-08-29, sonarjs 4.2.0: flags the PRIMITIVE side of every branded type
      // (`string & { __brand }` reported at the `string`, same for `number`), which is
      // hard rule 12. Object-object intersections are unaffected, so the rule is only
      // wrong about the nominal-typing idiom. Re-probed weekly by the skill repository's canary workflow (upstream, not a shipped asset).
      'sonarjs/no-useless-intersection': 'off',
      // 2026-08-29, sonarjs 4.2.0: its flow analysis ignores declared types AND explicit
      // narrowing, reporting `(v: string) => v.trim()` and even
      // `v === undefined ? 0 : v.trim()`. No correct code satisfies it, and `strict: true`
      // already owns this bug class at typecheck. Re-probed weekly by the skill repository's canary workflow (upstream, not a shipped asset).
      'sonarjs/null-dereference': 'off',
      // 2026-09-05, sonarjs 4.2.0: reports every function that returns through the
      // ok()/err() helpers of references/result-type.md, because `Result<T, never>` and
      // `Result<never, E>` are two return types to it. That is hard rule 16, so no correct
      // code satisfies it; `strict: true` and rule 6's explicit return types already own the
      // bug class. Re-probed weekly by the skill repository's canary workflow (upstream, not a shipped asset).
      'sonarjs/function-return-type': 'off',
    },
  },
  // Non-source paths must not be linted: Stryker copies the tree into .stryker-tmp/
  // during a run, reports/ is output, and the config file itself would trip no-undef
  // on `process` (it runs under Node semantics, not the **/*.ts globals block).
  // dist/ is the bundler's output for npm, generated from the linted sources.
  // scripts/ IS linted: the gate scripts stay under the full rule set, with only
  // no-console turned off for them above.
  {
    ignores: ['eslint.config.js', '.stryker-tmp/**', 'reports/**', 'docs/**', '.claude/**', '.agents/**', 'dist/**'],
  },
];
