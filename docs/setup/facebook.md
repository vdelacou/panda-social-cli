# Connect a Facebook Page

This page walks you through connecting a Facebook Page to panda-social, once. It takes about fifteen minutes and needs the Facebook account that manages the Page, with a role on it that can create posts (full control, or content access). panda-social acts as the Page, never as your personal profile.

At the end, panda-social keeps the Page's own token in `~/.panda-social/credentials.json`, readable by you only. That token does not expire: it works until you change your Facebook password, lose your role on the Page, or remove the app. The token you paste is used once to find the Page and is never saved.

There are two ways through the same five steps:

- In a terminal, `panda-social setup facebook` shows the steps one at a time, waits for Enter after each, then asks for the token without showing it on screen.
- Through an AI agent, the agent relays the steps to you. At the end you still paste the token into your own terminal (see [Finish](#finish-save-the-page)), so it never passes through a chat.

## Step 1: Create an app that can manage your Page

- Log in at developers.facebook.com with the Facebook account that manages the Page, and register as a developer if it asks.
- Click Create app, enter an app name, and tick "Manage everything on your Page".
- If it asks for a business portfolio, pick the one that owns the Page, or none, then create the app.

Open https://developers.facebook.com/apps/creation/

Any app name works, for example panda-social. The app you made for Threads works too: add the use case to it (Use cases, Add use cases) and carry on at step 2.

> Screenshot to add: `images/facebook-01-use-case.png` (see the [shot list](#screenshots-to-add)).

## Step 2: Give the app permission to post

- In the app dashboard, open Use cases, then Manage everything on your Page, then Customize.
- Add pages_manage_posts and pages_read_engagement. pages_show_list and business_management are already there.

Open https://developers.facebook.com/apps/

| Permission | What panda-social uses it for |
|---|---|
| pages_show_list | Listing the Pages your token grants, during the setup |
| pages_manage_posts | Publishing, editing and deleting the Page's posts |
| pages_read_engagement | Meta asks for it beside pages_manage_posts to publish |
| business_management | Pages owned through a business portfolio; the use case adds it by itself |

A permission you add later is not in a token generated before: generate and extend a new token (steps 4 and 5), then run the setup again.

> Screenshot to add: `images/facebook-02-permissions.png`.

## Step 3: Publish the app

- An unpublished app's posts show only to people with a role on it, so publish it before posting.
- In the app dashboard, open Publish, add what it asks for (an app icon, a privacy policy URL, and a data deletion URL or instructions), then publish.

The privacy policy and the data deletion instructions can be pages of your own that say what the app does: it posts to your Page and keeps nothing about other people. The permissions of step 2 show "Ready for testing" in the dashboard, which covers you as the app's admin without App Review.

You can connect the Page before publishing and publish later; until you do, only people with a role on the app see what panda-social posts.

> Screenshot to add: `images/facebook-03-publish.png`.

## Step 4: Generate a token in the Graph API Explorer

- Under Meta App, pick your app; under User or Page, choose Get User Access Token.
- Add the permissions pages_show_list, pages_manage_posts, pages_read_engagement and business_management, typing a name under Add a Permission when the list does not show it.
- Click Generate Access Token, continue as yourself, and choose the Page (or Pages) panda-social may post to.

Open https://developers.facebook.com/tools/explorer/

With several Pages chosen, the setup asks which one to keep, or takes it from `--page <id>`. The token the Explorer shows lasts about an hour: extend it in step 5 before anything else.

> Screenshots to add: `images/facebook-04-explorer.png` and `images/facebook-05-choose-page.png`.

## Step 5: Extend the token to 60 days

- Paste the token into the Access Token Debugger and click Debug.
- Click Extend Access Token at the bottom, then copy the new token it shows.
- panda-social keeps only the Page token it gets with this one, and that Page token does not expire.

Open https://developers.facebook.com/tools/debug/accesstoken/

The Debugger does the exchange for you, so you never handle the app secret. Copy the token as one line, with no space or line break, and treat it like a password: never paste it into a chat, an email or a shared document. Skip this step and the Page token panda-social keeps stops working within the hour.

> Screenshot to add: `images/facebook-06-extend.png`.

## Finish: save the Page

In your own terminal:

```bash
panda-social setup facebook
```

It shows the five steps again: if you have already done them, press Enter past each one. Then paste the extended token when asked; it does not show on screen. panda-social asks Meta which Pages the token grants and saves the Page's own token, never yours. When the token grants several Pages, it names them and asks for the id of the one to keep.

A script can pipe the token in instead, from a file you delete afterwards, naming the Page when the token grants several:

```bash
panda-social setup facebook --token-stdin --page 104000000000001 < token.txt
```

For a second Page, run the setup again with a profile name, and use the same name on every later command. A profile holds a Threads token, X keys and a Facebook Page side by side.

```bash
panda-social setup facebook --profile brand-a
```

On a server or in CI, you can set the Page in the environment instead of saving it: `PANDA_SOCIAL_FACEBOOK_PAGE_ID` and `PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN`, both or neither. After a setup, the credentials file holds both values as `pageId` and `token`.

> Screenshot to add: `images/facebook-07-terminal-setup.png`.

## Check that it works

```bash
panda-social status facebook
panda-social post --to facebook --text "Hello from panda"
```

`status facebook` answers with the Page the token belongs to, its id and name, and where the token came from: saved, with the date, or the environment. It posts nothing. The second command publishes a real post on the Page and answers with its id, the Page id and the post number joined by an underscore, and its link. Open the link in a private browser window: if the post is missing there, the app is not published yet (step 3).

> Screenshot to add: `images/facebook-08-status.png`.

## When something goes wrong

| What you see | Why | What to do |
|---|---|---|
| `no-pages` | The token grants no Page: none was chosen in the dialog of step 4, or your account has no role on the Page | Generate the token again (step 4), choose the Page, extend it (step 5) and run the setup again |
| `choose-page` | The token grants several Pages and none was named, or `--page` names one it does not grant | Pass `--page` with one of the ids the message lists |
| `missing-page-task` | Your role on the Page cannot create posts | Ask a Page admin for full control or content access, then run the setup again |
| `unauthorized` | The token was copied incompletely, was not extended in step 5 and has expired, or your password changed | Generate and extend a new token (steps 4 and 5), then run the setup again |
| `forbidden` | The token lacks a permission from step 2 | Add it, generate and extend a new token, and run the setup again |
| A permission is missing from Add a Permission | The list shows only what the app already has | Type its name; if it is still missing, add it to the use case (step 2) |
| The Explorer will not generate a user token | Some apps need the Facebook Login for Business product first | In the app dashboard, add Facebook Login for Business (Add product, Set up), leave its settings as they are, then generate again |
| `incomplete-environment` | One of the two `PANDA_SOCIAL_FACEBOOK_` variables is set, not both | Set both, or neither to use the saved Page |
| `invalid-page-id` | A Page id with something other than digits | Use the id the setup answered, or one that `choose-page` lists |
| A post shows to you but not to others | The app is not published, so its posts show only to people with a role on it | Publish it (step 3); the posts already made then show too |
| `invalid-image` | The image is not an https URL or a local JPEG, PNG, GIF, BMP or TIFF file, or is over 10 MB | Pass an https URL, or pick another file |
| `image-rejected` | Facebook could not use the image: the URL does not open for everyone, or the file is damaged | Check that the URL opens in a private browser window, or that the file opens as an image, then retry |
| `duplicate-text` | The text repeats one of the Page's recent posts, which Facebook refuses | Change the text, or delete the earlier post |
| `edit-refused` | Facebook edits only the posts this app made, not those written on facebook.com or by another app | Pass `--repost` to delete the post and publish the new version |

Every error panda-social prints carries a `hint` with the next step, and `panda-social docs setup` has the full command page.

## Screenshots to add

Taken in your own logged-in browser and terminal, saved next to this page under `images/`. Blur what the last column says before committing anything, the token always.

| File | Step | Where | What it shows | Blur |
|---|---|---|---|---|
| `images/facebook-01-use-case.png` | 1 | Create app, use case choice | "Manage everything on your Page" ticked | Nothing |
| `images/facebook-02-permissions.png` | 2 | Use cases, Manage everything on your Page, Customize | The four permissions in the list | App ID |
| `images/facebook-03-publish.png` | 3 | The app dashboard's Publish page | What it asks for before publishing | App ID |
| `images/facebook-04-explorer.png` | 4 | Graph API Explorer | Meta App, User or Page, the four permissions and Generate Access Token | App ID, the token entirely |
| `images/facebook-05-choose-page.png` | 4 | The Facebook dialog after Generate Access Token | The Page chosen in the list of Pages | Other Pages' names, if private |
| `images/facebook-06-extend.png` | 5 | Access Token Debugger | The Extend Access Token button and the new token | Both tokens entirely, user id |
| `images/facebook-07-terminal-setup.png` | Finish | A terminal | `panda-social setup facebook` at step 1 of 5, then the hidden token prompt | Nothing |
| `images/facebook-08-status.png` | Check | A terminal | `panda-social status facebook` answering `"ok":true` | Nothing |
