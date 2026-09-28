import type { SetupStep } from '../domain/setup-step.ts';

// The one-time Facebook setup, checked against developers.facebook.com on 2026-09-28 (the
// Pages API app and permissions pages, app modes, long-lived tokens) and against the flow
// panda-social-agent runs. The terminal guide, the agent's JSON guide and
// docs/setup/facebook.md all carry these words.
export const FACEBOOK_SETUP_STEPS: ReadonlyArray<SetupStep> = [
  {
    title: 'Create an app that can manage your Page',
    actions: [
      'Log in at developers.facebook.com with the Facebook account that manages the Page, and register as a developer if it asks.',
      'Click Create app, enter an app name, and tick "Manage everything on your Page".',
      'If it asks for a business portfolio, pick the one that owns the Page, or none, then create the app.',
    ],
    url: 'https://developers.facebook.com/apps/creation/',
  },
  {
    title: 'Give the app permission to post',
    actions: [
      'In the app dashboard, open Use cases, then Manage everything on your Page, then Customize.',
      'Add pages_manage_posts and pages_read_engagement. pages_show_list and business_management are already there.',
    ],
    url: 'https://developers.facebook.com/apps/',
  },
  {
    title: 'Publish the app',
    actions: [
      "An unpublished app's posts show only to people with a role on it, so publish it before posting.",
      'In the app dashboard, open Publish, add what it asks for (an app icon, a privacy policy URL, and a data deletion URL or instructions), then publish.',
    ],
  },
  {
    title: 'Generate a token in the Graph API Explorer',
    actions: [
      'Under Meta App, pick your app; under User or Page, choose Get User Access Token.',
      'Add the permissions pages_show_list, pages_manage_posts, pages_read_engagement and business_management, typing a name under Add a Permission when the list does not show it.',
      'Click Generate Access Token, continue as yourself, and choose the Page (or Pages) panda-social may post to.',
    ],
    url: 'https://developers.facebook.com/tools/explorer/',
  },
  {
    title: 'Extend the token to 60 days',
    actions: [
      'Paste the token into the Access Token Debugger and click Debug.',
      'Click Extend Access Token at the bottom, then copy the new token it shows.',
      'panda-social keeps only the Page token it gets with this one, and that Page token does not expire.',
    ],
    url: 'https://developers.facebook.com/tools/debug/accesstoken/',
  },
];

// Shown when the Page is saved: nothing tells the CLI whether the app is published.
export const FACEBOOK_PUBLISH_NOTE = 'Posts show to everyone only once the app is published (step 3 of the setup); until then only people with a role on the app see them.';
