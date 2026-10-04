# Connect an Instagram account

This guide connects an Instagram account to panda-social. You do this procedure one time. The procedure is approximately 15 minutes long.

You must have these items:

- An Instagram account that you can change to a professional account (Creator or Business)
- A Facebook login, for the developer site of Meta.

A Facebook Page is not necessary, because panda-social connects through Instagram Login.

At the end, panda-social keeps the token in `~/.panda-social/credentials.json`. Only you can read this file.

The token expires after 60 days. panda-social renews the token 30 days after it saved the token, when a command runs. Thus, if you use the account one time each month, it stays connected. If you do not use the account for 60 days, the token expires, and you must do the setup again.

Through Instagram Login, panda-social publishes images with their captions. It cannot edit or delete a post. Edit or delete a post in the Instagram app.

You can do the six steps in a terminal or with an AI agent:

- In a terminal, `panda-social setup instagram` shows the steps one at a time. Push Enter after each step. At the end, paste the token. The token does not show on the screen.
- With an AI agent, the agent tells you the steps. At the end, paste the token into your terminal (refer to [Finish](#finish-save-the-token)). Thus, the token does not go through a chat.

## Step 1: Switch your Instagram account to a professional account

- In Instagram, open your profile, then the menu (Settings and activity), then Account type and tools under For professionals.
- Tap Switch to professional account and choose Creator or Business. A personal account cannot post through the API, and a professional one is public.

Open https://help.instagram.com/502981923235522

Creator is for a person, and Business is for a brand. panda-social operates with the two types. You can change the account back in the same menu.

> Screenshot to add: `images/instagram-01-professional.png` (refer to the [list of screenshots](#screenshots-to-add)).

## Step 2: Create an app that can use the Instagram API

- Log in at developers.facebook.com and register as a developer if it asks.
- Click Create app, enter an app name, and tick "Manage messaging & content on Instagram".
- If it asks for a business portfolio, choose "I don't want to connect a business portfolio yet", then create the app.

Open https://developers.facebook.com/apps/creation/

The app name is not important, for example panda-social.

> Screenshot to add: `images/instagram-02-use-case.png`.

## Step 3: Give the app permission to post

- In the app dashboard, open Use cases, then Manage messaging & content on Instagram, then Customize.
- Check that instagram_business_basic and instagram_business_content_publish are among its permissions, and add any that is missing.

Open https://developers.facebook.com/apps/

| Permission | Function in panda-social |
|---|---|
| instagram_business_basic | Read the id and the username of the account, renew the token, and read the posts quota |
| instagram_business_content_publish | Publish posts |

The use case can also show permissions for messages and comments. panda-social does not use them.

A token does not contain the permissions that you add after you generate it. If you add a permission, generate a new token (step 6). Then do the setup again.

> Screenshot to add: `images/instagram-03-permissions.png`.

## Step 4: Make your Instagram account a tester of the app

- In the app dashboard, open App roles, then Roles, and click Add People.
- Choose Instagram Tester and enter your Instagram username.

The username is the name on your profile, without the @.

Until Meta does a review of the app, the app can use only the Instagram accounts with a role on the app. For your account, this is sufficient.

> Screenshot to add: `images/instagram-04-tester.png`.

## Step 5: Accept the invitation in Instagram

- On instagram.com, open Settings, then Apps and websites, then Tester invites.
- Accept the invitation from your app.

Open https://www.instagram.com/accounts/manage_access/

The invitation can show some minutes after step 4. If you do not see it, open the page again. If you do not do this step, the dashboard rejects the account in step 6.

> Screenshot to add: `images/instagram-05-invite.png`.

## Step 6: Generate your access token

- Back in the app dashboard: Use cases, Manage messaging & content on Instagram, Customize, then API setup with Instagram login.
- Under Generate access tokens, click Add account and log in to Instagram, then click Generate token next to your account and copy the token.
- It lasts 60 days, and panda-social renews it once it is 30 days old, whenever a command runs.

Copy the token as one line, without a space or a line break. If you do not have the token, generate a new token.

CAUTION: Do not paste the token into a chat, an email or a document that other persons can read. Other persons can use the token to post on your account.

> Screenshot to add: `images/instagram-06-token.png`.

## Finish: save the token

In your terminal:

```bash
panda-social setup instagram
```

The command shows the six steps again. If you did the steps before, push Enter at each step. Then paste the token. The token does not show on the screen.

panda-social sends the token to Instagram to find its account. Then it saves the token with the id and the username of the account.

A script can send the token on standard input from a file. Delete the file after the setup:

```bash
panda-social setup instagram --token-stdin < token.txt
```

For one more account, do the setup again with a profile name. Then use the same profile name in each command for that account. One profile can hold a Threads token, X keys, a Facebook Page and an Instagram account together.

```bash
panda-social setup instagram --profile brand-a
```

On a server or in CI, you can put the token in an environment variable, and not save it: `PANDA_SOCIAL_INSTAGRAM_TOKEN`. panda-social does not renew a token from the environment. Renew or replace this token before it expires after 60 days.

> Screenshot to add: `images/instagram-07-terminal-setup.png`.

## Do a test of the setup

```bash
panda-social status instagram
panda-social post --to instagram --image https://cdn.example.com/cat.jpg --text "Hello from panda"
```

`status instagram` shows the id and the username of the account. It also shows the token: saved, with its date, its days since the save, and its expiry date after a renewal, or the environment.

Then `status instagram` shows the posts quota for the last 24 hours: the used posts, the total, and the period. It does not post. The Meta documentation gives two different numbers: 50 posts and 100 posts. The output shows the number for your account.

The next command publishes a post. Replace the URL with a public https link to your JPEG image: 8 MB maximum, between 4:5 (portrait) and 1.91:1 (landscape).

Instagram downloads the image from the link. Thus, the link must open in a private window of your browser. The output gives the id of the post and its link on instagram.com.

> Screenshot to add: `images/instagram-08-status.png`.

## If an error occurs

| Error | Cause | Solution |
|---|---|---|
| `unauthorized` | The token is not complete, or it expired (60 days after you generated it or after its last renewal), or the app has no access to the account. | Generate a new token (step 6). Then do the setup again. |
| `forbidden` | The token does not have a permission from step 3. | Add the permission and generate a new token. Then do the setup again. |
| The dashboard rejects the account in step 6, or tells you that the developer role is not sufficient | The account is not a tester of the app, or you did not accept the invitation. | Do steps 4 and 5. Then add the account again. |
| Instagram does not let the account log in to the app | The account is a personal account. | Change it to a professional account (step 1). |
| The app has no API setup with Instagram login | You made the app without the Instagram use case. | Add the use case (Use cases, Add use cases), or make a new app as in step 2. |
| `missing-credentials` | No token is saved for this profile, and `PANDA_SOCIAL_INSTAGRAM_TOKEN` is not set. | Do the setup. For a different profile, add `--profile <name>`. |
| `rate-limited` | Too many calls in a short time, or you used all the API posts of the day. | Wait, and then try again. `status instagram` shows the posts quota. |
| `missing-image` | Instagram has no posts with only text. | Use `--image` with a public https URL to a JPEG. The text becomes its caption. |
| `invalid-image` | The image is a local file, or it is not an https URL. | Put the file on a server where all persons can open it. Then give its https URL. |
| `image-rejected` | Instagram cannot use the image. The URL does not open for all persons, or the image is not a JPEG, or it is larger than 8 MB, or its shape is not between 4:5 and 1.91:1. | Open the URL in a private window of your browser. Examine the format, the size and the shape of the image. Then try again. |
| `still-processing` | Instagram did not complete the image in one minute. Thus, panda-social did not publish it. | Post again. |
| `unsupported` | `update` or `delete` on Instagram. Instagram Login does not let you do these. | Edit or delete the post in the Instagram app. |

Each error from panda-social has a `hint` with the next step. `panda-social docs setup` shows the full page of the command.

## Screenshots to add

Make these screenshots in your browser and your terminal, after you log in. Save them in the `images/` folder, next to this page. Before you commit a screenshot, blur the items in the last column. Always blur the token.

| File | Step | Location | Content | Blur |
|---|---|---|---|---|
| `images/instagram-01-professional.png` | 1 | Instagram, Account type and tools | Switch to professional account | The username, if it is private |
| `images/instagram-02-use-case.png` | 2 | Create app, selection of the use case | "Manage messaging & content on Instagram", selected | No blur |
| `images/instagram-03-permissions.png` | 3 | Use cases, Manage messaging & content on Instagram, Customize | The two permissions in the list | App ID |
| `images/instagram-04-tester.png` | 4 | App roles, Roles, Add People | Instagram Tester, selected, and the username | The username, if it is private |
| `images/instagram-05-invite.png` | 5 | instagram.com, Settings, Apps and websites, Tester invites | The invitation and its Accept button | No blur |
| `images/instagram-06-token.png` | 6 | API setup with Instagram login, Generate access tokens | The account, Generate token, and the dialog of the token | App ID, all of the token |
| `images/instagram-07-terminal-setup.png` | Finish | A terminal | `panda-social setup instagram` at step 1 of 6, then the prompt for the token, which does not show the token | No blur |
| `images/instagram-08-status.png` | Test | A terminal | `panda-social status instagram` with `"ok":true` | No blur |
