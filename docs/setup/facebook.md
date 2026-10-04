# Connect a Facebook Page

This guide connects a Facebook Page to panda-social. You do this procedure one time. The procedure is approximately 15 minutes long.

You must have a Facebook account with a role on the Page. This role must let you make posts: full control, or content access. panda-social posts as the Page, and not as your Facebook profile.

At the end, panda-social keeps the token of the Page in `~/.panda-social/credentials.json`. Only you can read this file.

The Page token does not expire. It operates until you change your Facebook password, until your account has no role on the Page, or until you remove the app. panda-social uses the token that you paste only one time, to find the Page. It does not save this token.

You can do the five steps in a terminal or with an AI agent:

- In a terminal, `panda-social setup facebook` shows the steps one at a time. Push Enter after each step. At the end, paste the token. The token does not show on the screen.
- With an AI agent, the agent tells you the steps. At the end, paste the token into your terminal (refer to [Finish](#finish-save-the-page)). Thus, the token does not go through a chat.

## Step 1: Create an app that can manage your Page

- Log in at developers.facebook.com with the Facebook account that manages the Page, and register as a developer if it asks.
- Click Create app, enter an app name, and tick "Manage everything on your Page".
- If it asks for a business portfolio, pick the one that owns the Page, or none, then create the app.

Open https://developers.facebook.com/apps/creation/

The app name is not important, for example panda-social. You can also use the app that you made for Threads. Add the use case to that app (Use cases, Add use cases), and then go to step 2.

> Screenshot to add: `images/facebook-01-use-case.png` (refer to the [list of screenshots](#screenshots-to-add)).

## Step 2: Give the app permission to post

- In the app dashboard, open Use cases, then Manage everything on your Page, then Customize.
- Add pages_manage_posts and pages_read_engagement. pages_show_list and business_management are already there.

Open https://developers.facebook.com/apps/

| Permission | Function in panda-social |
|---|---|
| pages_show_list | Gives the Pages of your token, during the setup |
| pages_manage_posts | Publish, edit and delete the posts of the Page |
| pages_read_engagement | Meta makes it necessary with pages_manage_posts, for a post |
| business_management | Pages of a business portfolio. The use case adds this permission automatically. |

A token does not contain the permissions that you add after you generate it. If you add a permission, generate and extend a new token (steps 4 and 5). Then do the setup again.

> Screenshot to add: `images/facebook-02-permissions.png`.

## Step 3: Publish the app

- An unpublished app's posts show only to people with a role on it, so publish it before posting.
- In the app dashboard, open Publish, add what it asks for (an app icon, a privacy policy URL, and a data deletion URL or instructions), then publish.

The privacy policy and the data deletion instructions can be pages that you write. These pages tell the functions of the app: it posts to your Page, and it keeps no data on other persons.

In the dashboard, the permissions of step 2 show "Ready for testing". This condition is sufficient for you as the admin of the app, without App Review.

You can connect the Page before you publish the app. Until you publish the app, only persons with a role on the app see the posts of panda-social.

> Screenshot to add: `images/facebook-03-publish.png`.

## Step 4: Generate a token in the Graph API Explorer

- Under Meta App, pick your app; under User or Page, choose Get User Access Token.
- Add the permissions pages_show_list, pages_manage_posts, pages_read_engagement and business_management, typing a name under Add a Permission when the list does not show it.
- Click Generate Access Token, continue as yourself, and choose the Page (or Pages) panda-social may post to.

Open https://developers.facebook.com/tools/explorer/

If you select more than one Page, the setup shows the Pages, and you type the id of one Page. You can also give the id with `--page <id>`.

The token from the Explorer expires after approximately one hour. Extend it in step 5 immediately.

> Screenshots to add: `images/facebook-04-explorer.png` and `images/facebook-05-choose-page.png`.

## Step 5: Extend the token to 60 days

- Paste the token into the Access Token Debugger and click Debug.
- Click Extend Access Token at the bottom, then copy the new token it shows.
- panda-social keeps only the Page token it gets with this one, and that Page token does not expire.

Open https://developers.facebook.com/tools/debug/accesstoken/

The Debugger does the exchange for you. Thus, you do not use the app secret. If you do not do this step, the Page token that panda-social keeps stops in less than one hour.

Copy the token as one line, without a space or a line break.

CAUTION: Do not paste the token into a chat, an email or a document that other persons can read. Other persons can use the token to post on your Page.

> Screenshot to add: `images/facebook-06-extend.png`.

## Finish: save the Page

In your terminal:

```bash
panda-social setup facebook
```

The command shows the five steps again. If you did the steps before, push Enter at each step. Then paste the extended token. The token does not show on the screen.

panda-social gets the Pages of the token from Meta. It saves the token of the Page, and not your token. If the token has more than one Page, the command shows the Pages and their ids, and you type the id of one Page.

A script can send the token on standard input from a file. If the token has more than one Page, give the Page with `--page`. Delete the file after the setup:

```bash
panda-social setup facebook --token-stdin --page 104000000000001 < token.txt
```

For one more Page, do the setup again with a profile name. Then use the same profile name in each command for that Page. One profile can hold a Threads token, X keys and a Facebook Page together.

```bash
panda-social setup facebook --profile brand-a
```

On a server or in CI, you can put the Page in environment variables, and not save it: `PANDA_SOCIAL_FACEBOOK_PAGE_ID` and `PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN`. Set the two variables or no variable.

After a setup, the credentials file keeps the two values as `pageId` and `token`.

> Screenshot to add: `images/facebook-07-terminal-setup.png`.

## Do a test of the setup

```bash
panda-social status facebook
panda-social post --to facebook --text "Hello from panda"
```

`status facebook` shows the Page of the token, with its id and its name. It also shows the source of the token: saved, with the date, or the environment. It does not post.

The next command publishes a post on the Page. It gives the post id and the link of the post. The post id is the Page id and the post number, with an underscore between them.

Open the link in a private window of your browser. If the post is not there, the app is not published (step 3).

> Screenshot to add: `images/facebook-08-status.png`.

## If an error occurs

| Error | Cause | Solution |
|---|---|---|
| `no-pages` | The token has no Page. You did not select a Page in the dialog of step 4, or your account has no role on the Page. | Generate the token again (step 4) and select the Page. Extend the token (step 5). Then do the setup again. |
| `choose-page` | The token has more than one Page, and you did not give a Page. Or `--page` gives a Page that the token does not have. | Use `--page` with one of the ids in the message. |
| `missing-page-task` | Your role on the Page cannot make posts. | Get full control or content access from an admin of the Page. Then do the setup again. |
| `unauthorized` | The token is not complete, or you did not extend it in step 5 and it expired, or your password changed. | Generate and extend a new token (steps 4 and 5). Then do the setup again. |
| `forbidden` | The token does not have a permission from step 2. | Add the permission. Generate and extend a new token. Then do the setup again. |
| A permission is not in Add a Permission | The list shows only the permissions that the app has. | Type the name of the permission. If the permission does not show, add it to the use case (step 2). |
| The Explorer does not generate a user token | Some apps must have the Facebook Login for Business product first. | In the app dashboard, add Facebook Login for Business (Add product, Set up). Do not change its settings. Then generate the token again. |
| `incomplete-environment` | One of the two `PANDA_SOCIAL_FACEBOOK_` variables is set, but not the two. | Set the two variables, or no variable to use the saved Page. |
| `invalid-page-id` | The Page id contains characters that are not digits. | Use the id from the setup, or an id from the `choose-page` message. |
| A post shows to you, but not to other persons | The app is not published. Thus, its posts show only to persons with a role on the app. | Publish the app (step 3). Then the posts that you made also show to all persons. |
| `invalid-image` | The image is not an https URL or a local JPEG, PNG, GIF, BMP or TIFF file, or it is larger than 10 MB. | Use an https URL, or a different file. |
| `image-rejected` | Facebook cannot use the image: the URL does not open for all persons, or the file has damage. | Open the URL in a private window of your browser, or open the file as an image. Then try again. |
| `duplicate-text` | The text is the same as one of the last posts of the Page, and Facebook rejects it. | Change the text, or delete the other post. |
| `edit-refused` | Facebook edits only the posts that this app made. It does not edit posts from facebook.com or from a different app. | Use `--repost` to delete the post and publish the new text. |

Each error from panda-social has a `hint` with the next step. `panda-social docs setup` shows the full page of the command.

## Screenshots to add

Make these screenshots in your browser and your terminal, after you log in. Save them in the `images/` folder, next to this page. Before you commit a screenshot, blur the items in the last column. Always blur the token.

| File | Step | Location | Content | Blur |
|---|---|---|---|---|
| `images/facebook-01-use-case.png` | 1 | Create app, selection of the use case | "Manage everything on your Page", selected | No blur |
| `images/facebook-02-permissions.png` | 2 | Use cases, Manage everything on your Page, Customize | The four permissions in the list | App ID |
| `images/facebook-03-publish.png` | 3 | The Publish page of the app dashboard | The items that the page tells you to add before you publish | App ID |
| `images/facebook-04-explorer.png` | 4 | Graph API Explorer | Meta App, User or Page, the four permissions and Generate Access Token | App ID, all of the token |
| `images/facebook-05-choose-page.png` | 4 | The Facebook dialog after Generate Access Token | The selected Page in the list of Pages | Names of other Pages, if they are private |
| `images/facebook-06-extend.png` | 5 | Access Token Debugger | The Extend Access Token button and the new token | All of the two tokens, user id |
| `images/facebook-07-terminal-setup.png` | Finish | A terminal | `panda-social setup facebook` at step 1 of 5, then the prompt for the token, which does not show the token | No blur |
| `images/facebook-08-status.png` | Test | A terminal | `panda-social status facebook` with `"ok":true` | No blur |
