# Connect Threads

This page walks you through connecting your Threads account to panda-social, once. It takes about ten minutes and needs a Facebook account (to register as a Meta developer) and a public Threads account.

At the end you have a token that panda-social checks with Threads and saves in `~/.panda-social/credentials.json`, readable by you only. The token lasts 60 days, and panda-social refreshes it by itself once it is 30 days old, so a CLI that runs at least once a month never needs this page again.

There are two ways through the same six steps:

- In a terminal, `panda-social setup threads` shows the steps one at a time, waits for Enter after each, then asks for the token without showing it on screen.
- Through an AI agent, the agent relays the steps to you. At the end you still paste the token into your own terminal (see [Finish](#finish-save-the-token)), so it never passes through a chat.

## Step 1: Create your Meta developer account

- Log in to Facebook in your browser.
- Open the registration page, accept the terms, then verify your phone number and email.

Open https://developers.facebook.com/async/registration

Check the address: the Threads API lives on developers.facebook.com. A console named Meta Model API that asks for a payment method is a different, paid product.

> Screenshot to add: `images/threads-01-registration.png` (see the [shot list](#screenshots-to-add)).

## Step 2: Create an app that can use the Threads API

- Click Create app and enter an app name and your email.
- Tick "Access the Threads API", then Next.
- Choose "I don't want to connect a business portfolio yet", then create the app.

Open https://developers.facebook.com/apps/creation/

Any app name works, for example panda-social. The app stays in development mode, which is enough to post to your own account once you are its tester (step 4).

> Screenshots to add: `images/threads-02-use-case.png` and `images/threads-03-business-portfolio.png`.

## Step 3: Give the app permission to post

- In the app dashboard, open Use cases, then Access the Threads API, then Customize.
- Add threads_content_publish, threads_manage_replies and threads_delete. threads_basic is already there.

Open https://developers.facebook.com/apps/

| Permission | What panda-social uses it for |
|---|---|
| threads_basic | Every call, starting with checking whose token it is |
| threads_content_publish | `post`, and the new post of `update --repost` |
| threads_manage_replies | The replies of a `--split` thread |
| threads_delete | `delete`, the delete half of `update --repost`, and removing the posted parts of a `--split` thread that failed midway |

A permission you add later is not in a token generated before: generate a new token (step 6) and run the setup again.

> Screenshot to add: `images/threads-04-permissions.png`.

## Step 4: Make your Threads account a tester of the app

- In the same use case, open Settings, then Add or Remove Threads Testers.
- Click Add People, choose Threads Tester, and enter your Threads username.

> Screenshot to add: `images/threads-05-add-tester.png`.

## Step 5: Accept the invitation in Threads

- In Threads, open Settings, Account, Website permissions, then Invites.
- Accept the invitation from your app. Keep the profile public.

Open https://www.threads.com/settings/account

Why public: Meta keeps the permissions a public profile grants for 90 days and lets them be extended, while a private profile has to grant them again when they lapse.

> Screenshot to add: `images/threads-06-accept-invite.png`.

## Step 6: Generate your access token

- Back in the app dashboard: Use cases, Access the Threads API, Settings, User Token Generator.
- Click Generate Access Token next to your account, continue, and copy the token.

If your account is not in the list, the invitation of step 5 is not accepted yet. Copy the token as one line, with no space or line break, and treat it like a password: never paste it into a chat, an email or a shared document.

> Screenshots to add: `images/threads-07-token-generator.png` and `images/threads-08-token-dialog.png`.

## Finish: save the token

In your own terminal:

```bash
panda-social setup threads
```

It shows the six steps again: if you have already done them, press Enter past each one. Then paste the token when asked; it does not show on screen. panda-social asks Threads whose token it is and saves it only if Threads accepts it.

A script can pipe the token in instead, from a file you delete afterwards:

```bash
panda-social setup threads --token-stdin < token.txt
```

For a second account, run the setup again with a profile name, and use the same name on every later command:

```bash
panda-social setup threads --profile brand-a
```

> Screenshot to add: `images/threads-09-terminal-setup.png`.

## Check that it works

```bash
panda-social status threads
panda-social post --to threads --text "Hello from panda"
```

`status threads` answers with your username, the token's age and how much of the day's quotas is used, and posts nothing. The second command publishes a real post on your profile.

> Screenshot to add: `images/threads-10-status.png`.

## When something goes wrong

| What you see | Why | What to do |
|---|---|---|
| `unauthorized`, "Cannot parse access token" | The token was copied incompletely, or with a space or a line break | Copy it again from step 6 as one line, then run the setup again |
| `unauthorized` after weeks of working | The token expired: it lives 60 days after its last refresh, and a refresh happens only when a command runs | Generate a new token (step 6) and run the setup again |
| `forbidden` | The token lacks a permission from step 3, often one added after the token was generated | Add the permission, generate a new token, run the setup again |
| Your account is missing from the User Token Generator | The tester invitation is not accepted | Accept it (step 5), then reload the dashboard |
| A console asks for a payment method | It is Meta's paid model API, not the Threads API | Start again from developers.facebook.com (step 1) |
| `rate-limited` | Threads allows 250 posts, 1,000 replies and 100 deletes per rolling 24 hours | `panda-social status threads` shows what is used; wait, then retry |

Every error panda-social prints carries a `hint` with the next step, and `panda-social docs setup` has the full command page.

## Screenshots to add

Taken in your own logged-in browser and terminal, saved next to this page under `images/`. Blur what the last column says before committing anything, the token always.

| File | Step | Where | What it shows | Blur |
|---|---|---|---|---|
| `images/threads-01-registration.png` | 1 | developers.facebook.com/async/registration | The registration form with the terms and the phone check | Phone number, email |
| `images/threads-02-use-case.png` | 2 | Create app, use case choice | "Access the Threads API" ticked | Nothing |
| `images/threads-03-business-portfolio.png` | 2 | Create app, business portfolio | "I don't want to connect a business portfolio yet" selected | Nothing |
| `images/threads-04-permissions.png` | 3 | Use cases, Access the Threads API, Customize | The four permissions in the list | App ID |
| `images/threads-05-add-tester.png` | 4 | Settings, Add or Remove Threads Testers, Add People | The Threads Tester role and a username field | Username |
| `images/threads-06-accept-invite.png` | 5 | threads.com, Settings, Account, Website permissions, Invites | The pending invitation with its Accept button | App name, if private |
| `images/threads-07-token-generator.png` | 6 | Settings, User Token Generator | The Generate Access Token button next to the account | Username |
| `images/threads-08-token-dialog.png` | 6 | The token dialog | Where the token appears and the copy action | The token, entirely |
| `images/threads-09-terminal-setup.png` | Finish | A terminal | `panda-social setup threads` at step 1 of 6, then the hidden token prompt | Nothing |
| `images/threads-10-status.png` | Check | A terminal | `panda-social status threads` answering `"ok":true` | User id |
