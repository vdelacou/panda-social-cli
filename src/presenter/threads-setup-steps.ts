import type { SetupStep } from '../domain/setup-step.ts';

// The one-time Threads setup a first-time user walks through, verified against Meta's
// dashboard on 2026-09-28. It is copy shown to people, so it lives with the presenter;
// the terminal guide and the agent's JSON guide both read this list.
// threads_manage_replies and threads_delete are asked for now so reply chains and
// delete never need a second token.
export const THREADS_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Create your Meta developer account',
    actions: ['Log in to Facebook in your browser.', 'Open the registration page, accept the terms, then verify your phone number and email.'],
    url: 'https://developers.facebook.com/async/registration',
  },
  {
    title: 'Create an app that can use the Threads API',
    actions: [
      'Click Create app and enter an app name and your email.',
      'Tick "Access the Threads API", then Next.',
      'Choose "I don\'t want to connect a business portfolio yet", then create the app.',
    ],
    url: 'https://developers.facebook.com/apps/creation/',
  },
  {
    title: 'Give the app permission to post',
    actions: [
      'In the app dashboard, open Use cases, then Access the Threads API, then Customize.',
      'Add threads_content_publish, threads_manage_replies and threads_delete. threads_basic is already there.',
    ],
    url: 'https://developers.facebook.com/apps/',
  },
  {
    title: 'Make your Threads account a tester of the app',
    actions: ['In the same use case, open Settings, then Add or Remove Threads Testers.', 'Click Add People, choose Threads Tester, and enter your Threads username.'],
  },
  {
    title: 'Accept the invitation in Threads',
    actions: ['In Threads, open Settings, Account, Website permissions, then Invites.', 'Accept the invitation from your app. Keep the profile public.'],
    url: 'https://www.threads.com/settings/account',
  },
  {
    title: 'Generate your access token',
    actions: [
      'Back in the app dashboard: Use cases, Access the Threads API, Settings, User Token Generator.',
      'Click Generate Access Token next to your account, continue, and copy the token.',
    ],
  },
];
