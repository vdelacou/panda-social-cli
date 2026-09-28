import type { SetupStep } from '../domain/setup-step.ts';

// The one-time Instagram setup under Instagram Login (D30, D31), from Meta's Instagram Platform
// pages (checked 2026-09-28), 2026 guides by others for the tester step, and the use case
// panda-social-agent publishes through. The terminal guide, the agent's JSON guide and
// docs/setup/instagram.md all carry these words.
export const INSTAGRAM_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Switch your Instagram account to a professional account',
    actions: [
      'In Instagram, open your profile, then the menu (Settings and activity), then Account type and tools under For professionals.',
      'Tap Switch to professional account and choose Creator or Business. A personal account cannot post through the API, and a professional one is public.',
    ],
    url: 'https://help.instagram.com/502981923235522',
  },
  {
    title: 'Create an app that can use the Instagram API',
    actions: [
      'Log in at developers.facebook.com and register as a developer if it asks.',
      'Click Create app, enter an app name, and tick "Manage messaging & content on Instagram".',
      'If it asks for a business portfolio, choose "I don\'t want to connect a business portfolio yet", then create the app.',
    ],
    url: 'https://developers.facebook.com/apps/creation/',
  },
  {
    title: 'Give the app permission to post',
    actions: [
      'In the app dashboard, open Use cases, then Manage messaging & content on Instagram, then Customize.',
      'Check that instagram_business_basic and instagram_business_content_publish are among its permissions, and add any that is missing.',
    ],
    url: 'https://developers.facebook.com/apps/',
  },
  {
    title: 'Make your Instagram account a tester of the app',
    actions: ['In the app dashboard, open App roles, then Roles, and click Add People.', 'Choose Instagram Tester and enter your Instagram username.'],
  },
  {
    title: 'Accept the invitation in Instagram',
    actions: ['On instagram.com, open Settings, then Apps and websites, then Tester invites.', 'Accept the invitation from your app.'],
    url: 'https://www.instagram.com/accounts/manage_access/',
  },
  {
    title: 'Generate your access token',
    actions: [
      'Back in the app dashboard: Use cases, Manage messaging & content on Instagram, Customize, then API setup with Instagram login.',
      'Under Generate access tokens, click Add account and log in to Instagram, then click Generate token next to your account and copy the token.',
      'It lasts 60 days, and panda-social renews it once it is 30 days old, whenever a command runs.',
    ],
  },
];
