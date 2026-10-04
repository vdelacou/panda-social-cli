import type { SetupStep } from '../domain/setup-step.ts';

// The one-time X setup, checked against docs.x.com on 2026-09-28 (the console, app
// permissions and credentials pages, and the pricing page). The terminal guide, the
// agent's JSON guide and docs/setup/x.md all carry these words.
// The text is in Simplified Technical English, with one instruction in each action (D47).
export const X_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Sign in to the X developer console',
    actions: [
      'Sign in with the X account that will post.',
      'If the console shows the Developer Agreement and Policy, accept it.',
      'If the console has a field for your use of the API, write in it how you will use the API.',
    ],
    url: 'https://console.x.com',
  },
  {
    title: 'Add API credits and set a spending limit',
    actions: [
      'Each call to X uses prepaid credits.',
      'A post uses $0.015. A post with a link uses $0.20. A delete or an account check uses $0.01.',
      'Add credits in the console.',
      'Set a spending limit. The limit stops an agent that uses too many credits.',
    ],
    url: 'https://docs.x.com/x-api/getting-started/pricing',
  },
  {
    title: 'Create an app',
    actions: ['Create a new app.', 'Enter a name, a description and a use case.'],
  },
  {
    title: 'Let the app post',
    actions: [
      'In the settings of the app, set the app permissions to Read and write.',
      'Save the settings.',
      'Do this before step 5. An Access Token from before this change does not get the new permissions.',
    ],
  },
  {
    title: 'Generate the four keys',
    actions: [
      'Open the app from Apps in the side menu, then open its Keys and tokens tab.',
      'Copy the API Key and Secret. If you do not have them, regenerate them.',
      'Generate or regenerate the Access Token and Secret for your account. Copy the two values.',
      'X shows each value one time only. Keep the values until the setup saves them.',
    ],
  },
];

// Shown when the keys are saved: every later command spends credits.
export const X_CREDITS_NOTE =
  'X bills every request this CLI makes against your prepaid credits, from $0.01 (a delete or an account check) to $0.20 (a post with a link). Set a spending limit in the console.';
