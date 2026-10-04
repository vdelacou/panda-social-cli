# Connect Threads

This guide connects your Threads account to panda-social. You do this procedure one time. The procedure is approximately 10 minutes long.

You must have these accounts:

- A Facebook account, to register as a Meta developer
- A public Threads account.

At the end, panda-social has a token. panda-social makes sure that Threads accepts the token. Then it keeps the token in `~/.panda-social/credentials.json`. Only you can read this file.

The token expires 60 days after its last refresh. panda-social refreshes the token 30 days after it saved the token. If the CLI runs one time each month, you do not do this procedure again.

You can do the six steps in a terminal or with an AI agent:

- In a terminal, `panda-social setup threads` shows the steps one at a time. Push Enter after each step. At the end, paste the token. The token does not show on the screen.
- With an AI agent, the agent tells you the steps. At the end, paste the token into your terminal (refer to [Finish](#finish-save-the-token)). Thus, the token does not go through a chat.

## Step 1: Create your Meta developer account

- Log in to Facebook in your browser.
- Open the registration page, accept the terms, then verify your phone number and email.

Open https://developers.facebook.com/async/registration

Make sure that the address is developers.facebook.com. The Threads API is on this site. A console with the name Meta Model API is a different product. That product is not free: its console tells you to add a payment method.

> Screenshot to add: `images/threads-01-registration.png` (refer to the [list of screenshots](#screenshots-to-add)).

## Step 2: Create an app that can use the Threads API

- Click Create app and enter an app name and your email.
- Tick "Access the Threads API", then Next.
- Choose "I don't want to connect a business portfolio yet", then create the app.

Open https://developers.facebook.com/apps/creation/

The app name is not important, for example panda-social. The app stays in development mode. In this mode, the app can post to your account when you are its tester (step 4).

> Screenshots to add: `images/threads-02-use-case.png` and `images/threads-03-business-portfolio.png`.

## Step 3: Give the app permission to post

- In the app dashboard, open Use cases, then Access the Threads API, then Customize.
- Add threads_content_publish, threads_manage_replies and threads_delete. threads_basic is already there.

Open https://developers.facebook.com/apps/

| Permission | Function in panda-social |
|---|---|
| threads_basic | All the calls. The first call finds the account of the token. |
| threads_content_publish | `post`, and the new post of `update --repost` |
| threads_manage_replies | The replies of a `--split` thread |
| threads_delete | `delete`, the delete part of `update --repost`, and the delete of the posted parts of a `--split` thread that stopped before its end |

A token does not contain the permissions that you add after you generate it. If you add a permission, generate a new token (step 6). Then do the setup again.

> Screenshot to add: `images/threads-04-permissions.png`.

## Step 4: Make your Threads account a tester of the app

- In the same use case, open Settings, then Add or Remove Threads Testers.
- Click Add People, choose Threads Tester, and enter your Threads username.

> Screenshot to add: `images/threads-05-add-tester.png`.

## Step 5: Accept the invitation in Threads

- In Threads, open Settings, Account, Website permissions, then Invites.
- Accept the invitation from your app. Keep the profile public.

Open https://www.threads.com/settings/account

Keep the profile public, because Meta keeps the permissions of a public profile for 90 days, and you can extend them. A private profile must give the permissions again when they expire.

> Screenshot to add: `images/threads-06-accept-invite.png`.

## Step 6: Generate your access token

- Back in the app dashboard: Use cases, Access the Threads API, Settings, User Token Generator.
- Click Generate Access Token next to your account, continue, and copy the token.

If your account is not in the list, accept the invitation of step 5. Copy the token as one line, without a space or a line break.

CAUTION: Do not paste the token into a chat, an email or a document that other persons can read. Other persons can use the token to post on your account.

> Screenshots to add: `images/threads-07-token-generator.png` and `images/threads-08-token-dialog.png`.

## Finish: save the token

In your terminal:

```bash
panda-social setup threads
```

The command shows the six steps again. If you did the steps before, push Enter at each step. Then paste the token. The token does not show on the screen.

panda-social sends the token to Threads to find its account. It saves the token only if Threads accepts it.

A script can send the token on standard input from a file. Delete the file after the setup:

```bash
panda-social setup threads --token-stdin < token.txt
```

For one more account, do the setup again with a profile name. Then use the same profile name in each command for that account:

```bash
panda-social setup threads --profile brand-a
```

> Screenshot to add: `images/threads-09-terminal-setup.png`.

## Do a test of the setup

```bash
panda-social status threads
panda-social post --to threads --text "Hello from panda"
```

`status threads` shows your username, the date when panda-social saved the token, and the used part of the quotas for the last 24 hours. It does not post. The next command publishes a post on your profile.

> Screenshot to add: `images/threads-10-status.png`.

## If an error occurs

| Error | Cause | Solution |
|---|---|---|
| `unauthorized`, "Cannot parse access token" | The token is not complete, or it has a space or a line break. | Copy the token again from step 6, as one line. Then do the setup again. |
| `unauthorized` after some weeks | The token expired. A token expires 60 days after its last refresh, and a refresh occurs only when a command runs. | Generate a new token (step 6). Then do the setup again. |
| `forbidden` | The token does not have a permission from step 3. Usually, you added the permission after you generated the token. | Add the permission and generate a new token. Then do the setup again. |
| Your account is not in the User Token Generator | You did not accept the tester invitation. | Accept the invitation (step 5). Then open the dashboard again. |
| A console tells you to add a payment method | This console is the Meta Model API, which is not free. It is not the Threads API. | Start again from developers.facebook.com (step 1). |
| `rate-limited` | Threads lets you make 250 posts, 1,000 replies and 100 deletes in each period of 24 hours. | `panda-social status threads` shows the used part of each quota. Wait, and then try again. |

Each error from panda-social has a `hint` with the next step. `panda-social docs setup` shows the full page of the command.

## Screenshots to add

Make these screenshots in your browser and your terminal, after you log in. Save them in the `images/` folder, next to this page. Before you commit a screenshot, blur the items in the last column. Always blur the token.

| File | Step | Location | Content | Blur |
|---|---|---|---|---|
| `images/threads-01-registration.png` | 1 | developers.facebook.com/async/registration | The registration form, with the terms and the check of the phone number | Phone number, email |
| `images/threads-02-use-case.png` | 2 | Create app, selection of the use case | "Access the Threads API", selected | No blur |
| `images/threads-03-business-portfolio.png` | 2 | Create app, business portfolio | "I don't want to connect a business portfolio yet", selected | No blur |
| `images/threads-04-permissions.png` | 3 | Use cases, Access the Threads API, Customize | The four permissions in the list | App ID |
| `images/threads-05-add-tester.png` | 4 | Settings, Add or Remove Threads Testers, Add People | The Threads Tester role and a username field | Username |
| `images/threads-06-accept-invite.png` | 5 | threads.com, Settings, Account, Website permissions, Invites | The invitation, with its Accept button | App name, if it is private |
| `images/threads-07-token-generator.png` | 6 | Settings, User Token Generator | The Generate Access Token button next to the account | Username |
| `images/threads-08-token-dialog.png` | 6 | The token dialog | The token area and the copy control | All of the token |
| `images/threads-09-terminal-setup.png` | Finish | A terminal | `panda-social setup threads` at step 1 of 6, then the prompt for the token, which does not show the token | No blur |
| `images/threads-10-status.png` | Test | A terminal | `panda-social status threads` with `"ok":true` | User id |
