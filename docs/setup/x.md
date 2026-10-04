# Connect X

This guide connects your X account to panda-social. You do this procedure one time. The procedure is approximately 10 minutes long.

You must have these items:

- The X account that will post
- A payment card, to add API credits.

X has no free tier. Each call to X uses credits. The calls that panda-social makes to examine the keys also use credits.

At the end, you have four keys. panda-social makes sure that X accepts them. Then it keeps them in `~/.panda-social/credentials.json`. Only you can read this file.

The keys do not expire. They operate until you regenerate them in the console, or until you revoke the app.

You can do the five steps in a terminal or with an AI agent:

- In a terminal, `panda-social setup x` shows the steps one at a time. Push Enter after each step. At the end, paste the four keys. The keys do not show on the screen.
- With an AI agent, the agent tells you the steps. At the end, paste the keys into your terminal (refer to [Finish](#finish-save-the-keys)). Thus, the keys do not go through a chat.

## Step 1: Sign in to the X developer console

- Sign in with the X account that will post.
- If the console shows the Developer Agreement and Policy, accept it.
- If the console has a field for your use of the API, write in it how you will use the API.

Open https://console.x.com

The keys of step 5 post as the account that you use to sign in here. To post as a different account, sign in with that account.

> Screenshot to add: `images/x-01-console.png` (refer to the [list of screenshots](#screenshots-to-add)).

## Step 2: Add API credits and set a spending limit

- Each call to X uses prepaid credits.
- A post uses $0.015. A post with a link uses $0.20. A delete or an account check uses $0.01.
- Add credits in the console.
- Set a spending limit. The limit stops an agent that uses too many credits.

Open https://docs.x.com/x-api/getting-started/pricing

These values are from the pricing page of X on 2026-09-28. The values on that page can change.

The console can also add credits automatically when the credits are low. This function is off until you set it to on.

When the credits are at 0, X stops all the calls, and panda-social gives the error `credits-depleted`. Add credits to continue.

| Command | Calls to X | Value |
|---|---|---|
| `panda-social setup x` | One check of the account of the keys | $0.01 |
| `panda-social status x` | One check of the account of the keys | $0.01 |
| `panda-social post --to x` | One post, one more post for each reply of a `--split` thread, and the upload of an image | $0.015 for each post, $0.20 when its text contains a link |
| `panda-social update --on x` | One edit, or with `--repost`, a delete and a new post | The same as a post, plus $0.01 for the delete |
| `panda-social delete --on x` | One delete | $0.01 |

> Screenshot to add: `images/x-02-credits.png`.

## Step 3: Create an app

- Create a new app.
- Enter a name, a description and a use case.

The name is not important, for example panda-social. One sentence is sufficient for the use case, for example "Post to my own account from my scripts".

Some pages of X call the button New App, and other pages call it Create App.

> Screenshot to add: `images/x-03-create-app.png`.

## Step 4: Let the app post

- In the settings of the app, set the app permissions to Read and write.
- Save the settings.
- Do this before step 5. An Access Token from before this change does not get the new permissions.

| Permission | Function | Sufficient for panda-social |
|---|---|---|
| Read | Read posts and profiles | No. panda-social gives the error `read-only-keys`. |
| Read and write | Read, post and delete | Yes |
| Read, write and Direct Messages | All the functions above, and Direct Messages | Yes, but panda-social does not use Direct Messages |

The form can also have a field for a callback URL or a website. If it has one, use one of your addresses, for example your X profile. panda-social does not use these two addresses.

> Screenshot to add: `images/x-04-permissions.png`.

## Step 5: Generate the four keys

- Open the app from Apps in the side menu, then open its Keys and tokens tab.
- Copy the API Key and Secret. If you do not have them, regenerate them.
- Generate or regenerate the Access Token and Secret for your account. Copy the two values.
- X shows each value one time only. Keep the values until the setup saves them.

panda-social reads the keys in this sequence: API Key, API Key Secret, Access Token, Access Token Secret.

Some pages of X give different names to the first two keys: API Key and API Secret, or Consumer Key and Consumer Secret.

The same tab also shows a Bearer Token, a Client ID and a Client Secret. panda-social does not use them.

Copy each key as one part, without a space or a line break.

CAUTION: Do not paste the keys into a chat, an email or a document that other persons can read. Other persons can use the keys to post on your account.

> Screenshot to add: `images/x-05-keys.png`.

## Finish: save the keys

In your terminal:

```bash
panda-social setup x
```

The command shows the five steps again. If you did the steps before, push Enter at each step. Then paste the four keys, one at a time. The keys do not show on the screen.

panda-social sends the keys to X to find their account. It saves the keys only if X accepts them and if they can post.

A script can send the four keys on standard input from a file, with one key on each line, in the sequence above. Delete the file after the setup:

```bash
panda-social setup x --keys-stdin < keys.txt
```

For one more account, do the setup again with a profile name. Then use the same profile name in each command for that account. One profile can hold a Threads token and X keys together. `setup x` does not change the Threads token of the profile.

```bash
panda-social setup x --profile brand-a
```

On a server or in CI, you can put the four keys in environment variables, and not save them: `PANDA_SOCIAL_X_API_KEY`, `PANDA_SOCIAL_X_API_SECRET`, `PANDA_SOCIAL_X_ACCESS_TOKEN` and `PANDA_SOCIAL_X_ACCESS_SECRET`.

Set all four variables or no variable. When the four variables are set, they replace the saved keys of all the profiles.

> Screenshot to add: `images/x-06-terminal-setup.png`.

## Do a test of the setup

```bash
panda-social status x
panda-social post --to x --text "Hello from panda"
```

`status x` shows your username and your user id. It also shows the access level that X gives for the keys: `read-write` when they can post, or null when X gives no level.

Then `status x` shows the source of the keys: saved, with the date, or the environment. It does not post.

The next command publishes a post on your profile. It gives the id and the link of the post.

> Screenshot to add: `images/x-07-status.png`.

## If an error occurs

| Error | Cause | Solution |
|---|---|---|
| `invalid-keys` | There are less or more than four values, or one value is empty or has a space. | Paste the four keys in the sequence of step 5, with one key on each line and each key as one part. |
| `unauthorized` | A key is not complete, or you regenerated it after the setup saved it. | Copy the four keys again from step 5. Then do the setup again. |
| `read-only-keys` | You generated the Access Token when the app could only read. | Set Read and write (step 4). Regenerate the Access Token and Secret. Then do the setup again. |
| `credits-depleted` | The app has no more credits. | Add credits (step 2). Then try again. |
| `forbidden` | X does not let the app do this, for example because the app is not in the pay-per-use package. The message gives the cause from X. | Examine the app in the console. Then try again. |
| `incomplete-environment` | Some of the four `PANDA_SOCIAL_X_` variables are set, but not all. | Set all four variables, or no variable to use the saved keys. |
| `rate-limited` | For each account, in each period of 15 minutes, X lets you make 75 account checks, 100 posts and 50 deletes. | Wait 15 minutes. Then try again. |
| `text-too-long` | The text has more than 280 characters, as X counts them: most characters count 1, CJK characters and emoji count 2, and a link counts 23. | Make the text shorter, or use `--split` to post a thread. |
| `invalid-image` | The image is a URL or a missing file. Or it is not a JPEG, PNG, GIF or WEBP file, or it is larger than 5 MB. | Download a remote image first, and give its path. Or use a different file. |
| `duplicate-text` | The text is the same as one of your last posts, and X rejects it. | Change the text, or delete the other post. |
| `edit-refused` | X lets only X Premium accounts edit a post, a short time after the post, and a maximum of 5 times. | Use `--repost` to delete the post and publish the new text. |

Each error from panda-social has a `hint` with the next step. `panda-social docs setup` shows the full page of the command.

## Screenshots to add

Make these screenshots in your browser and your terminal, after you log in. Save them in the `images/` folder, next to this page. Before you commit a screenshot, blur the items in the last column. Always blur the keys.

| File | Step | Location | Content | Blur |
|---|---|---|---|---|
| `images/x-01-console.png` | 1 | console.x.com | The console after you sign in, with the Developer Agreement if the console shows it | Account name, email |
| `images/x-02-credits.png` | 2 | The billing settings of the console | The credit balance and the spending limit | Payment data |
| `images/x-03-create-app.png` | 3 | The form for a new app | The fields for the name, the description and the use case | No blur |
| `images/x-04-permissions.png` | 4 | The settings of the app | Read and write, selected | App ID |
| `images/x-05-keys.png` | 5 | The Keys and tokens tab of the app | The location where you generate the API Key and the Access Token | All of each key |
| `images/x-06-terminal-setup.png` | Finish | A terminal | `panda-social setup x` at step 1 of 5, then the prompt for a key, which does not show the key | No blur |
| `images/x-07-status.png` | Test | A terminal | `panda-social status x` with `"ok":true` | User id |
