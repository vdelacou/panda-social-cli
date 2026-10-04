import type { SetupStep } from '../domain/setup-step.ts';

// The one-time Facebook setup, checked against developers.facebook.com on 2026-09-28 (the
// Pages API app and permissions pages, app modes, long-lived tokens) and against the flow
// panda-social-agent runs. The terminal guide, the agent's JSON guide and
// docs/setup/facebook.md all carry these words.
// The text is in Simplified Technical English, with one instruction in each action (D47).
export const FACEBOOK_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Create an app that can manage your Page',
    actions: [
      'Log in at developers.facebook.com with the Facebook account that manages the Page.',
      'If the site shows a registration form, register as a developer.',
      'Click Create app.',
      'Enter an app name.',
      'Select "Manage everything on your Page".',
      'If the form shows a business portfolio field, select the portfolio of the Page, or no portfolio.',
      'Create the app.',
    ],
    url: 'https://developers.facebook.com/apps/creation/',
  },
  {
    title: 'Give the app permission to post',
    actions: [
      'In the app dashboard, open Use cases, then Manage everything on your Page, then Customize.',
      'Add pages_manage_posts and pages_read_engagement.',
      'pages_show_list and business_management are in the list automatically.',
    ],
    url: 'https://developers.facebook.com/apps/',
  },
  {
    title: 'Publish the app',
    actions: [
      'Until you publish the app, only persons with a role on the app see its posts.',
      'In the app dashboard, open Publish.',
      'Add the necessary items: an app icon, a privacy policy URL, and a data deletion URL or instructions.',
      'Publish the app.',
    ],
  },
  {
    title: 'Generate a token in the Graph API Explorer',
    actions: [
      'In the Meta App field, select your app.',
      'In the User or Page field, select Get User Access Token.',
      'Add the permissions pages_show_list, pages_manage_posts, pages_read_engagement and business_management.',
      'If the list does not show a permission, type its name in Add a Permission.',
      'Click Generate Access Token.',
      'Continue with your account.',
      'Select the Pages that panda-social can post to.',
    ],
    url: 'https://developers.facebook.com/tools/explorer/',
  },
  {
    title: 'Extend the token to 60 days',
    actions: [
      'Paste the token into the Access Token Debugger.',
      'Click Debug.',
      'Click Extend Access Token at the bottom.',
      'Copy the new token.',
      'panda-social keeps only the Page token that it gets with this token. The Page token does not expire.',
    ],
    url: 'https://developers.facebook.com/tools/debug/accesstoken/',
  },
];

// Shown when the Page is saved: nothing tells the CLI whether the app is published.
// The text is in Simplified Technical English (D48).
export const FACEBOOK_PUBLISH_NOTE =
  'Until you publish the app (step 3 of the setup), only persons with a role on the app see its posts. A published app shows its posts to all persons.';
