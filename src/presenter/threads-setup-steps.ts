import type { SetupStep } from '../domain/setup-step.ts';

// The one-time Threads setup a first-time user walks through, verified against Meta's
// dashboard on 2026-09-28. It is copy shown to people, so it lives with the presenter;
// the terminal guide and the agent's JSON guide both read this list.
// threads_manage_replies and threads_delete are asked for now so reply chains and
// delete never need a second token.
// The text is in Simplified Technical English, with one instruction in each action (D47).
export const THREADS_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Create your Meta developer account',
    actions: ['Log in to Facebook in your browser.', 'Open the registration page.', 'Accept the terms.', 'Do the checks of your phone number and your email.'],
    url: 'https://developers.facebook.com/async/registration',
  },
  {
    title: 'Create an app that can use the Threads API',
    actions: [
      'Click Create app.',
      'Enter an app name and your email.',
      'Select "Access the Threads API".',
      'Click Next.',
      'Select "I don\'t want to connect a business portfolio yet".',
      'Create the app.',
    ],
    url: 'https://developers.facebook.com/apps/creation/',
  },
  {
    title: 'Give the app permission to post',
    actions: [
      'In the app dashboard, open Use cases, then Access the Threads API, then Customize.',
      'Add threads_content_publish, threads_manage_replies and threads_delete.',
      'threads_basic is in the list automatically.',
    ],
    url: 'https://developers.facebook.com/apps/',
  },
  {
    title: 'Make your Threads account a tester of the app',
    actions: ['In the same use case, open Settings, then Add or Remove Threads Testers.', 'Click Add People.', 'Select Threads Tester.', 'Enter your Threads username.'],
  },
  {
    title: 'Accept the invitation in Threads',
    actions: ['In Threads, open Settings, Account, Website permissions, then Invites.', 'Accept the invitation from your app.', 'Keep the profile public.'],
    url: 'https://www.threads.com/settings/account',
  },
  {
    title: 'Generate your access token',
    actions: [
      'In the app dashboard, open Use cases, Access the Threads API, Settings, then User Token Generator.',
      'Click Generate Access Token next to your account.',
      'Continue in the dialog that opens.',
      'Copy the token.',
    ],
  },
];
