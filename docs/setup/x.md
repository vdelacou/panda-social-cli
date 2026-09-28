# Connect X

This page walks you through connecting your X account to panda-social, once. It takes about ten minutes and needs the X account that will post, plus a card to buy API credits: X has no free tier and bills every request, including the ones panda-social makes to check the keys.

At the end you have four keys that panda-social checks with X and saves in `~/.panda-social/credentials.json`, readable by you only. They do not expire: they keep working until you regenerate them in the console or revoke the app.

There are two ways through the same five steps:

- In a terminal, `panda-social setup x` shows the steps one at a time, waits for Enter after each, then asks for the four keys without showing them on screen.
- Through an AI agent, the agent relays the steps to you. At the end you still paste the keys into your own terminal (see [Finish](#finish-save-the-keys)), so they never pass through a chat.

## Step 1: Sign in to the X developer console

- Sign in with the X account that will post.
- Accept the Developer Agreement and Policy, and describe how you will use the API, if the console asks.

Open https://console.x.com

The keys of step 5 post as the account you sign in with here. To post as another account, sign in with that one instead.

> Screenshot to add: `images/x-01-console.png` (see the [shot list](#screenshots-to-add)).

## Step 2: Buy API credits and cap the spend

- X bills every request against prepaid credits: $0.015 a post, $0.20 a post that contains a link, $0.01 a delete or an account check.
- Buy credits in the console, and set a spending limit so a runaway agent cannot drain them.

Open https://docs.x.com/x-api/getting-started/pricing

The prices are the ones X's pricing page listed on 2026-09-28; the page has the current ones. The console can also recharge the credits by itself when they run low, which is off unless you turn it on. When the credits run out, X blocks every request until you add more, and panda-social answers `credits-depleted`.

| Command | What it asks X | Price |
|---|---|---|
| `panda-social setup x` | Whose keys these are, once | $0.01 |
| `panda-social status x` | Whose keys these are, once | $0.01 |

> Screenshot to add: `images/x-02-credits.png`.

## Step 3: Create an app

- Create a new app, and enter a name, a description and a use case.

Any name works, for example panda-social, and one sentence is enough for the use case, such as "Post to my own account from my scripts". X's own pages call the button New App in some places and Create App in others.

> Screenshot to add: `images/x-03-create-app.png`.

## Step 4: Let the app post

- In the app's settings, set the app permissions to Read and write, then save.
- Do this before step 5: an Access Token generated earlier keeps its old permissions.

| Permission | What it allows | Enough for panda-social |
|---|---|---|
| Read | Reading posts and profiles | No: panda-social answers `read-only-keys` |
| Read and write | Reading, posting and deleting | Yes |
| Read, write and Direct Messages | All of the above, plus Direct Messages | Yes, and more than panda-social needs |

If the form also asks for a callback URL or a website, panda-social uses neither, so any address of yours works, your X profile for example.

> Screenshot to add: `images/x-04-permissions.png`.

## Step 5: Generate the four keys

- Open the app from Apps in the side menu, then its Keys and tokens tab.
- Copy the API Key and Secret, or regenerate them if you no longer have them.
- Generate (or regenerate) the Access Token and Secret for your own account, and copy both.
- X shows each value once: keep them at hand until the setup has saved them.

panda-social asks for them in this order: API Key, API Key Secret, Access Token, Access Token Secret. X's pages also call the first two the API Secret, or the Consumer Key and Secret. The same tab offers a Bearer Token and a Client ID and Secret, which panda-social does not need.

Copy each key as one piece, with no space or line break, and treat all four like passwords: never paste them into a chat, an email or a shared document.

> Screenshot to add: `images/x-05-keys.png`.

## Finish: save the keys

In your own terminal:

```bash
panda-social setup x
```

It shows the five steps again: if you have already done them, press Enter past each one. Then paste the four keys when asked, one at a time; they do not show on screen. panda-social asks X whose keys they are, and saves them only if X accepts them and they can post.

A script can pipe the four keys in instead, one per line in the order above, from a file you delete afterwards:

```bash
panda-social setup x --keys-stdin < keys.txt
```

For a second account, run the setup again with a profile name, and use the same name on every later command. A profile holds a Threads token and X keys side by side: `setup x` leaves the profile's Threads token as it is.

```bash
panda-social setup x --profile brand-a
```

On a server or in CI, you can set the four keys in the environment instead of saving them: `PANDA_SOCIAL_X_API_KEY`, `PANDA_SOCIAL_X_API_SECRET`, `PANDA_SOCIAL_X_ACCESS_TOKEN` and `PANDA_SOCIAL_X_ACCESS_SECRET`. Set all four or none: when all four are set, they replace the saved keys of every profile.

> Screenshot to add: `images/x-06-terminal-setup.png`.

## Check that it works

```bash
panda-social status x
```

`status x` answers with your username and user id, the access level X states for the keys (`read-write` when they can post, or null when X states none), and where the keys came from: saved, with the date, or the environment. It posts nothing.

> Screenshot to add: `images/x-07-status.png`.

## When something goes wrong

| What you see | Why | What to do |
|---|---|---|
| `invalid-keys` | Fewer or more than four values, or one that is empty or has a space in it | Paste the four keys in the order of step 5, one per line, each as one piece |
| `unauthorized` | A key was copied incompletely, or was regenerated after it was saved | Copy the four again from step 5, then run the setup again |
| `read-only-keys` | The Access Token was generated while the app could only read | Set Read and write (step 4), regenerate the Access Token and Secret, then run the setup again |
| `credits-depleted` | The app's credits are spent | Buy more (step 2), then retry |
| `forbidden` | X refuses this action for the app, for example an app outside the pay-per-use package; the message gives X's reason | Check the app in the console, then retry |
| `incomplete-environment` | Some of the four `PANDA_SOCIAL_X_` variables are set, not all | Set all four, or none to use the saved keys |
| `rate-limited` | X allows 75 account checks per account every 15 minutes | Wait 15 minutes, then retry |

Every error panda-social prints carries a `hint` with the next step, and `panda-social docs setup` has the full command page.

## Screenshots to add

Taken in your own logged-in browser and terminal, saved next to this page under `images/`. Blur what the last column says before committing anything, the keys always.

| File | Step | Where | What it shows | Blur |
|---|---|---|---|---|
| `images/x-01-console.png` | 1 | console.x.com | The console after sign-in, with the Developer Agreement if it asks | Account name, email |
| `images/x-02-credits.png` | 2 | The console's billing settings | The credit balance and the spending limit | Payment details |
| `images/x-03-create-app.png` | 3 | The new app form | The name, description and use case fields | Nothing |
| `images/x-04-permissions.png` | 4 | The app's settings | Read and write selected | App ID |
| `images/x-05-keys.png` | 5 | The app's Keys and tokens tab | Where the API Key and the Access Token are generated | Every key, entirely |
| `images/x-06-terminal-setup.png` | Finish | A terminal | `panda-social setup x` at step 1 of 5, then a hidden key prompt | Nothing |
| `images/x-07-status.png` | Check | A terminal | `panda-social status x` answering `"ok":true` | User id |
