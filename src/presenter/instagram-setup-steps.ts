import type { SetupStep } from '../domain/setup-step.ts';

// The one-time Instagram setup under Instagram Login (D30, D31), from Meta's Instagram Platform
// pages (checked 2026-09-28), 2026 guides by others for the tester step, and the use case
// panda-social-agent publishes through. The terminal guide, the agent's JSON guide and
// docs/setup/instagram.md all carry these words.
// The text is in Simplified Technical English, with one instruction in each action (D47).
export const INSTAGRAM_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Change your Instagram account to a professional account',
    actions: [
      'In Instagram, open your profile, then the menu (Settings and activity), then Account type and tools in For professionals.',
      'Tap Switch to professional account.',
      'Select Creator or Business.',
      'A personal account cannot post through the API. A professional account is public.',
    ],
    url: 'https://help.instagram.com/502981923235522',
  },
  {
    title: 'Create an app that can use the Instagram API',
    actions: [
      'Log in at developers.facebook.com.',
      'If the site shows a registration form, register as a developer.',
      'Click Create app.',
      'Enter an app name.',
      'Select "Manage messaging & content on Instagram".',
      'If the form shows a business portfolio field, select "I don\'t want to connect a business portfolio yet".',
      'Create the app.',
    ],
    url: 'https://developers.facebook.com/apps/creation/',
  },
  {
    title: 'Give the app permission to post',
    actions: [
      'In the app dashboard, open Use cases, then Manage messaging & content on Instagram, then Customize.',
      'Make sure that instagram_business_basic and instagram_business_content_publish are in the list of permissions.',
      'Add each permission that is not in the list.',
    ],
    url: 'https://developers.facebook.com/apps/',
  },
  {
    title: 'Make your Instagram account a tester of the app',
    actions: ['In the app dashboard, open App roles, then Roles.', 'Click Add People.', 'Select Instagram Tester.', 'Enter your Instagram username.'],
  },
  {
    title: 'Accept the invitation in Instagram',
    actions: ['On instagram.com, open Settings, then Apps and websites, then Tester invites.', 'Accept the invitation from your app.'],
    url: 'https://www.instagram.com/accounts/manage_access/',
  },
  {
    title: 'Generate your access token',
    actions: [
      'In the app dashboard, open Use cases, Manage messaging & content on Instagram, Customize, then API setup with Instagram login.',
      'In Generate access tokens, click Add account.',
      'Log in to Instagram.',
      'Click Generate token next to your account.',
      'Copy the token.',
      'The token expires after 60 days. panda-social renews the token 30 days after it saved the token, when a command runs.',
    ],
  },
];
