# Connect an Instagram account

This page walks you through connecting an Instagram account to panda-social, once. It takes about fifteen minutes and needs an Instagram account you can switch to a professional account (Creator or Business), plus a Facebook login for Meta's developer site. No Facebook Page is needed: panda-social connects through Instagram Login.

At the end, panda-social keeps the token in `~/.panda-social/credentials.json`, readable by you only. The token lasts 60 days, and panda-social renews it once it is 30 days old, whenever a command runs: an account you use at least once a month stays connected. Left unused for 60 days, the token lapses and the setup runs again.

Through Instagram Login, panda-social publishes images with their captions; it cannot edit or delete a post, which you do in the Instagram app.

There are two ways through the same six steps:

- In a terminal, `panda-social setup instagram` shows the steps one at a time, waits for Enter after each, then asks for the token without showing it on screen.
- Through an AI agent, the agent relays the steps to you. At the end you still paste the token into your own terminal (see [Finish](#finish-save-the-token)), so it never passes through a chat.

## Step 1: Switch your Instagram account to a professional account

- In Instagram, open your profile, then the menu (Settings and activity), then Account type and tools under For professionals.
- Tap Switch to professional account and choose Creator or Business. A personal account cannot post through the API, and a professional one is public.

Open https://help.instagram.com/502981923235522

Creator suits a person and Business a brand; panda-social works with both. You can switch back later, from the same menu.

> Screenshot to add: `images/instagram-01-professional.png` (see the [shot list](#screenshots-to-add)).

## Step 2: Create an app that can use the Instagram API

- Log in at developers.facebook.com and register as a developer if it asks.
- Click Create app, enter an app name, and tick "Manage messaging & content on Instagram".
- If it asks for a business portfolio, choose "I don't want to connect a business portfolio yet", then create the app.

Open https://developers.facebook.com/apps/creation/

Any app name works, for example panda-social.

> Screenshot to add: `images/instagram-02-use-case.png`.

## Step 3: Give the app permission to post

- In the app dashboard, open Use cases, then Manage messaging & content on Instagram, then Customize.
- Check that instagram_business_basic and instagram_business_content_publish are among its permissions, and add any that is missing.

Open https://developers.facebook.com/apps/

| Permission | What panda-social uses it for |
|---|---|
| instagram_business_basic | Reading the account's id and username, renewing the token, and reading the posts quota |
| instagram_business_content_publish | Publishing posts, once `post` takes Instagram |

The use case may list permissions for messages and comments too; panda-social uses neither. A permission you add later is not in a token generated before: generate a new one (step 6), then run the setup again.

> Screenshot to add: `images/instagram-03-permissions.png`.

## Step 4: Make your Instagram account a tester of the app

- In the app dashboard, open App roles, then Roles, and click Add People.
- Choose Instagram Tester and enter your Instagram username.

The username is the one on your profile, without the @. Until the app is reviewed by Meta, it can reach only the Instagram accounts that hold a role on it, which is all panda-social needs for your own account.

> Screenshot to add: `images/instagram-04-tester.png`.

## Step 5: Accept the invitation in Instagram

- On instagram.com, open Settings, then Apps and websites, then Tester invites.
- Accept the invitation from your app.

Open https://www.instagram.com/accounts/manage_access/

The invitation can take a few minutes to show up: reload the page. Without this step, the dashboard refuses the account in step 6.

> Screenshot to add: `images/instagram-05-invite.png`.

## Step 6: Generate your access token

- Back in the app dashboard: Use cases, Manage messaging & content on Instagram, Customize, then API setup with Instagram login.
- Under Generate access tokens, click Add account and log in to Instagram, then click Generate token next to your account and copy the token.
- It lasts 60 days, and panda-social renews it once it is 30 days old, whenever a command runs.

Copy the token as one line, with no space or line break, and treat it like a password: never paste it into a chat, an email or a shared document. If you lose it, generate another.

> Screenshot to add: `images/instagram-06-token.png`.

## Finish: save the token

In your own terminal:

```bash
panda-social setup instagram
```

It shows the six steps again: if you have already done them, press Enter past each one. Then paste the token when asked; it does not show on screen. panda-social asks Instagram whose token it is and saves it with the account's id and username.

A script can pipe the token in instead, from a file you delete afterwards:

```bash
panda-social setup instagram --token-stdin < token.txt
```

For a second account, run the setup again with a profile name, and use the same name on every later command. A profile holds a Threads token, X keys, a Facebook Page and an Instagram account side by side.

```bash
panda-social setup instagram --profile brand-a
```

On a server or in CI, you can set the token in the environment instead of saving it: `PANDA_SOCIAL_INSTAGRAM_TOKEN`. panda-social never renews a token it reads from the environment, so renew or replace it yourself before its 60 days run out.

> Screenshot to add: `images/instagram-07-terminal-setup.png`.

## Check that it works

```bash
panda-social status instagram
panda-social post --to instagram --image https://cdn.example.com/cat.jpg --text "Hello from panda"
```

`status instagram` answers with the account's id and username, the token (saved, with its date, its age in days and its expiry once renewed, or the environment), and the posts quota for the last 24 hours: how many API posts were used, of how many, over what window. It posts nothing. Meta's pages give 50 or 100 posts a day; the answer shows your account's own figure.

The second command publishes a real post: replace the URL with a public https link to a JPEG of yours, 8 MB at most, between 4:5 (portrait) and 1.91:1 (landscape). Instagram downloads the image itself, so the link must open in a private browser window. The answer carries the post's id and its instagram.com link.

> Screenshot to add: `images/instagram-08-status.png`.

## When something goes wrong

| What you see | Why | What to do |
|---|---|---|
| `unauthorized` | The token was copied incompletely, or it lapsed (60 days after it was generated or last renewed), or the app lost access to the account | Generate a new token (step 6) and run the setup again |
| `forbidden` | The token lacks a permission from step 3 | Add it, generate a new token, and run the setup again |
| The dashboard refuses the account in step 6, or says the developer role is insufficient | The account is not a tester of the app, or the invitation is still pending | Do steps 4 and 5, then add the account again |
| Instagram will not let the account log in to the app | It is a personal account | Switch it to a professional account (step 1) |
| The app has no API setup with Instagram login | The app was made without the Instagram use case | Add the use case (Use cases, Add use cases), or create a new app as in step 2 |
| `missing-credentials` | No token is saved for this profile, and `PANDA_SOCIAL_INSTAGRAM_TOKEN` is not set | Run the setup, adding `--profile <name>` for another profile |
| `rate-limited` | Too many calls in a short time, or the day's API posts are used up | Wait, then retry; `status instagram` shows the posts quota |
| `missing-image` | Instagram has no text-only posts | Pass `--image` with a public https URL to a JPEG; the text becomes its caption |
| `invalid-image` | The image is a local file or not an https URL | Host the file where it opens for everyone, then pass its https URL |
| `image-rejected` | Instagram could not use the image: the URL does not open for everyone, or it is not a JPEG, weighs over 8 MB, or falls outside 4:5 to 1.91:1 | Check the URL in a private browser window, and the image's format, size and shape, then retry |
| `still-processing` | Instagram had not finished with the image after a minute, so nothing was published | Retry the post |
| `unsupported` | `update` or `delete` on Instagram, which Instagram Login does not allow | Change or delete the post in the Instagram app |

Every error panda-social prints carries a `hint` with the next step, and `panda-social docs setup` has the full command page.

## Screenshots to add

Taken in your own logged-in browser, phone and terminal, saved next to this page under `images/`. Blur what the last column says before committing anything, the token always.

| File | Step | Where | What it shows | Blur |
|---|---|---|---|---|
| `images/instagram-01-professional.png` | 1 | Instagram, Account type and tools | Switch to professional account | The username, if private |
| `images/instagram-02-use-case.png` | 2 | Create app, use case choice | "Manage messaging & content on Instagram" ticked | Nothing |
| `images/instagram-03-permissions.png` | 3 | Use cases, Manage messaging & content on Instagram, Customize | The two permissions in the list | App ID |
| `images/instagram-04-tester.png` | 4 | App roles, Roles, Add People | Instagram Tester chosen and the username typed | The username, if private |
| `images/instagram-05-invite.png` | 5 | instagram.com, Settings, Apps and websites, Tester invites | The invitation and its Accept button | Nothing |
| `images/instagram-06-token.png` | 6 | API setup with Instagram login, Generate access tokens | The account, Generate token, and the token dialog | App ID, the token entirely |
| `images/instagram-07-terminal-setup.png` | Finish | A terminal | `panda-social setup instagram` at step 1 of 6, then the hidden token prompt | Nothing |
| `images/instagram-08-status.png` | Check | A terminal | `panda-social status instagram` answering `"ok":true` | Nothing |
