import type { SetupStep } from '../domain/setup-step.ts';

// The one-time X setup, checked against docs.x.com on 2026-09-28 (the console, app
// permissions and credentials pages, and the pricing page). The terminal guide, the
// agent's JSON guide and docs/setup/x.md all carry these words.
export const X_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Sign in to the X developer console',
    actions: ['Sign in with the X account that will post.', 'Accept the Developer Agreement and Policy, and describe how you will use the API, if the console asks.'],
    url: 'https://console.x.com',
  },
  {
    title: 'Buy API credits and cap the spend',
    actions: [
      'X bills every request against prepaid credits: $0.015 a post, $0.20 a post that contains a link, $0.01 a delete or an account check.',
      'Buy credits in the console, and set a spending limit so a runaway agent cannot drain them.',
    ],
    url: 'https://docs.x.com/x-api/getting-started/pricing',
  },
  {
    title: 'Create an app',
    actions: ['Create a new app, and enter a name, a description and a use case.'],
  },
  {
    title: 'Let the app post',
    actions: [
      "In the app's settings, set the app permissions to Read and write, then save.",
      'Do this before step 5: an Access Token generated earlier keeps its old permissions.',
    ],
  },
  {
    title: 'Generate the four keys',
    actions: [
      'Open the app from Apps in the side menu, then its Keys and tokens tab.',
      'Copy the API Key and Secret, or regenerate them if you no longer have them.',
      'Generate (or regenerate) the Access Token and Secret for your own account, and copy both.',
      'X shows each value once: keep them at hand until the setup has saved them.',
    ],
  },
];

// Shown when the keys are saved: every later command spends credits.
export const X_CREDITS_NOTE =
  'X bills every request this CLI makes against your prepaid credits, from $0.01 (a delete or an account check) to $0.20 (a post with a link). Set a spending limit in the console.';
