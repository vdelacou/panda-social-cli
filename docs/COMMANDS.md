# panda-social commands

<!-- Generated from src/presenter/command-registry.ts by scripts/gen-docs.ts. Edit the registry, then run `bun run docs:gen`. -->

Every command prints one JSON line on stdout: `{"ok":true,"data":...}` on success, or `{"ok":false,"error":{"code":"...","message":"...","hint":"..."}}` on failure, and exits 0 or 1. The `hint` names the next step for the `code`; an optional `details` object carries the ids to act on after a partial failure, such as the parts of a thread that could not be deleted. The interactive setup guide and the logs go to stderr, never to stdout.

| Command | What it does |
| --- | --- |
| [`post`](#post) | Publish a text post, an image, or both, to Threads, X or a Facebook Page. |
| [`update`](#update) | Replace a post: an edit in place on X and Facebook, or with --repost on any platform, delete it and publish the new version. |
| [`delete`](#delete) | Delete a Threads, X or Facebook post by its id. |
| [`setup`](#setup) | Connect a Threads account, X keys, a Facebook Page or an Instagram account, and save the credentials under a profile. |
| [`status`](#status) | Check a connected Threads, X, Facebook or Instagram account: whose credentials they are and whether they still work, with the Threads and Instagram quotas. |
| [`help-json`](#help-json) | Describe every command, option, example and error code as JSON. Start here. |
| [`docs`](#docs) | Show one command's full documentation as markdown. |

| Flag | What it does |
| --- | --- |
| `panda-social --version` | Print the package name and version. |
| `panda-social --help` | Print the manifest, as help-json does. `<command> --help` prints that command page, as `docs <command>` does. |

## post

Publishes a new post on the account saved in the profile and answers with its id and link. A text over the platform limit (500 on Threads, 280 on X) is refused unless --split posts it as a thread of replies; Facebook takes a long text whole. Threads downloads the image from its URL; on X the CLI uploads a local file; Facebook takes either, and the text becomes the photo caption. Threads allows 250 posts per 24 hours; X allows 100 per 15 minutes and bills each one against the app credits, $0.015, or $0.20 when the text contains a link; Facebook posts are free, and show to everyone once the Meta app is published. Publishing is never retried: a post that timed out may still have gone out, so check the profile before posting again.

### Usage

```bash
panda-social post --to <platform> [--text <text>] [--profile <name>] [--image <image>] [--split]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--to <platform>` | yes | The platform to post to. One of: threads, x, facebook. |
| `--text <text>` | no | The text of the post, quoted when it contains spaces. Required unless --image is given. Threads takes 500 characters, an emoji counting its UTF-8 bytes (a thumbs-up is 4); X takes 280 as X counts them: most characters 1, CJK characters and emoji 2, a link 23; Facebook takes a long text whole. |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads or Instagram token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, PANDA_SOCIAL_INSTAGRAM_TOKEN, all four PANDA_SOCIAL_X_ variables, or both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, when set, override the saved credentials. |
| `--image <image>` | no | Threads: a public https URL to a JPEG or PNG image, 8 MB at most, which Threads downloads itself. X: a local JPEG, PNG, GIF or WEBP file, 5 MB at most, which the CLI uploads. Facebook: either, an https URL Facebook downloads or a local JPEG, PNG, GIF, BMP or TIFF file of 10 MB at most, which the CLI uploads. |
| `--split` | no | Post a text over the limit as a thread: the first post, then replies, each answering the one before. If a part fails, the parts already published are deleted. Facebook takes a long text whole, so there it changes nothing. |

### Examples

```bash
# Post from the account saved in the default profile.
panda-social post --to threads --text "Hello from panda"
# Post from the account saved in the brand-a profile.
panda-social post --to threads --text "Launch day" --profile brand-a
# Post an image with a caption.
panda-social post --to threads --image https://cdn.example.com/cat.jpg --text "A cat on the sofa"
# Post a long text as a thread of replies.
panda-social post --to threads --text "Release notes that run past 500 characters" --split
# Post to X from the keys saved in the default profile.
panda-social post --to x --text "Hello from panda"
# Upload a local image to X with a caption.
panda-social post --to x --image ./chart.png --text "This week in one chart"
# Post to the Facebook Page saved in the default profile.
panda-social post --to facebook --text "Hello from panda"
# Upload a local photo to the Page with a caption.
panda-social post --to facebook --image ./chart.png --text "This week in one chart"
```

### Output

The new post: `{"platform":"threads","id":"<post id>","url":"<link, or null when Threads did not return one>"}` on Threads, `{"platform":"x","id":"<post id>","url":"https://x.com/i/status/<post id>"}` on X, `{"platform":"facebook","id":"<page id>_<post id>","url":"https://www.facebook.com/<page id>/posts/<post id>"}` on Facebook, plus `"replies":["<id>",...]` for a --split thread.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as `panda-social docs <command>` lists them. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-text` | Pass the text of the post with --text (quoted when it contains spaces), an image with --image (a URL on Threads, a local file on X, either on Facebook), or both. |
| `invalid-image` | Threads needs a public https URL to a JPEG or PNG image, 8 MB at most: host a local file first, then pass its URL. X needs a local JPEG, PNG, GIF or WEBP file, 5 MB at most: download a remote image first, then pass its path. Facebook takes an https URL, or a local JPEG, PNG, GIF, BMP or TIFF file of 10 MB at most. |
| `text-too-long` | Threads allows 500 characters per post, an emoji counting its UTF-8 bytes; X allows 280, most characters counting 1, CJK characters and emoji 2, a link 23. Shorten the text, or pass --split to post it as a thread of replies; an X edit is one post, so pass --repost there instead. |
| `image-rejected` | The platform could not use the image. Threads: check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most. X: check that the file opens as a JPEG, PNG, GIF or WEBP image. Facebook: check that the URL opens in a private browser window, or that the file opens as an image. Then retry. |
| `still-processing` | Threads was still processing the image after 60 seconds, so nothing was published. Retry the post. |
| `duplicate-text` | X and Facebook refuse a post whose text repeats one of the account's recent posts. Change the text, or delete the earlier post first. |
| `missing-credentials` | Connect the account with `panda-social setup threads`, `panda-social setup x`, `panda-social setup facebook` or `panda-social setup instagram` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, all four PANDA_SOCIAL_X_ variables, both PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. Facebook: the Page token stopped working (a changed password, a lost Page role, or a token not extended in step 5): generate and extend a new one (steps 4 and 5) and run `panda-social setup facebook` again. Instagram: the token lapsed (60 days after it was generated or last renewed) or was revoked: generate a new one (Meta app dashboard, Use cases, Manage messaging & content on Instagram, Customize, API setup with Instagram login, Generate token) and run `panda-social setup instagram` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. Facebook: add the permission Meta names under Use cases, Manage everything on your Page, Customize, generate and extend a new token, and run `panda-social setup facebook` again. Instagram: check that instagram_business_basic and instagram_business_content_publish are under Use cases, Manage messaging & content on Instagram, Customize, generate a new token, and run `panda-social setup instagram` again. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks; Facebook limits calls per app, per user and per Page, and its message says which; Instagram allows 50 or 100 API posts per 24 hours (Meta's pages differ, and `panda-social status instagram` shows the account's own). Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net, api.x.com, graph.facebook.com or graph.instagram.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |
| `incomplete-environment` | Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys. For Facebook, set both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, or neither to use the saved Page. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `read-only-keys` | These X keys can read but not post. In the developer console, set the app permissions to Read and write, then regenerate the Access Token and Secret (keys made earlier stay read-only) and run `panda-social setup x` again. |
| `invalid-page-id` | A Facebook Page id is digits only, as `panda-social setup facebook` answers it, for example --page 104000000000001. |

## update

On X, update edits the post in place and answers the new version with the id it edited; X allows it with X Premium only, for a short window after posting (30 minutes or 1 hour, X pages differ) and 5 times at most, and one edited post stays one post, so the text must fit 280. On Facebook, update edits the text in place, for posts this app made, and answers the same id and link; an image cannot be edited there, so a new --image needs --repost. Threads cannot edit a published post, so there update refuses unless --repost is given. With --repost, on any platform, it deletes the old post first, then publishes the new text or image as post does: the new post gets a new id and link, and the old one takes its likes and replies with it. If the delete fails, nothing is published; if the publish fails after the delete, the error says the old post is gone.

### Usage

```bash
panda-social update --on <platform> --id <post-id> [--text <text>] [--profile <name>] [--image <image>] [--split] [--repost]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--on <platform>` | yes | The platform the post is on. One of: threads, x, facebook. |
| `--id <post-id>` | yes | The id of the post, as post returned it: digits on Threads and X, the Page id and the post number joined by an underscore on Facebook. |
| `--text <text>` | no | The text of the post, quoted when it contains spaces. Required unless --image is given. Threads takes 500 characters, an emoji counting its UTF-8 bytes (a thumbs-up is 4); X takes 280 as X counts them: most characters 1, CJK characters and emoji 2, a link 23; Facebook takes a long text whole. |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads or Instagram token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, PANDA_SOCIAL_INSTAGRAM_TOKEN, all four PANDA_SOCIAL_X_ variables, or both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, when set, override the saved credentials. |
| `--image <image>` | no | Threads: a public https URL to a JPEG or PNG image, 8 MB at most, which Threads downloads itself. X: a local JPEG, PNG, GIF or WEBP file, 5 MB at most, which the CLI uploads. Facebook: either, an https URL Facebook downloads or a local JPEG, PNG, GIF, BMP or TIFF file of 10 MB at most, which the CLI uploads. |
| `--split` | no | Post a text over the limit as a thread: the first post, then replies, each answering the one before. If a part fails, the parts already published are deleted. Facebook takes a long text whole, so there it changes nothing. |
| `--repost` | no | Delete the post and publish the new version instead of editing it. Required on Threads, which cannot edit, and for a new image on Facebook; on X and Facebook it replaces the edit. |

### Examples

```bash
# Replace a post with corrected text.
panda-social update --on threads --id 17890000000000001 --text "Hello from panda, typo fixed" --repost
# Edit an X post in place (X Premium).
panda-social update --on x --id 1880000000000000001 --text "Hello from panda, typo fixed"
# Edit the text of a Page post in place.
panda-social update --on facebook --id 104000000000001_122000000000001 --text "Hello from panda, typo fixed"
```

### Output

The new post: `{"platform":"<platform>","id":"<new id>","url":"<link>","edited":"<old id>"}` after an edit on X, the same id in both after an edit on Facebook, or `"replaced":"<old id>"` in place of `edited` after a repost, plus `"replies"` for a --split thread.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as `panda-social docs <command>` lists them. |
| `invalid-post-id` | Pass the id that post returned, for example --id 17890000000000001 on Threads, --id 1880000000000000001 on X, or --id 104000000000001_122000000000001 on Facebook, the Page id and the post number joined by an underscore. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `unsupported` | Threads cannot edit a published post, and Facebook edits the text of one but not its image. Pass --repost to delete the post and publish the new version: it gets a new id and link, and loses its likes, replies and comments. |
| `edit-refused` | X edits a post only for an X Premium account, within a short window after posting (30 minutes or 1 hour, X pages differ) and 5 times at most; Facebook edits only posts this Meta app made. Pass --repost to delete the post and publish the new version instead: it gets a new id and link, and loses its likes, replies and comments. |
| `missing-text` | Pass the text of the post with --text (quoted when it contains spaces), an image with --image (a URL on Threads, a local file on X, either on Facebook), or both. |
| `invalid-image` | Threads needs a public https URL to a JPEG or PNG image, 8 MB at most: host a local file first, then pass its URL. X needs a local JPEG, PNG, GIF or WEBP file, 5 MB at most: download a remote image first, then pass its path. Facebook takes an https URL, or a local JPEG, PNG, GIF, BMP or TIFF file of 10 MB at most. |
| `text-too-long` | Threads allows 500 characters per post, an emoji counting its UTF-8 bytes; X allows 280, most characters counting 1, CJK characters and emoji 2, a link 23. Shorten the text, or pass --split to post it as a thread of replies; an X edit is one post, so pass --repost there instead. |
| `image-rejected` | The platform could not use the image. Threads: check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most. X: check that the file opens as a JPEG, PNG, GIF or WEBP image. Facebook: check that the URL opens in a private browser window, or that the file opens as an image. Then retry. |
| `still-processing` | Threads was still processing the image after 60 seconds, so nothing was published. Retry the post. |
| `duplicate-text` | X and Facebook refuse a post whose text repeats one of the account's recent posts. Change the text, or delete the earlier post first. |
| `missing-credentials` | Connect the account with `panda-social setup threads`, `panda-social setup x`, `panda-social setup facebook` or `panda-social setup instagram` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, all four PANDA_SOCIAL_X_ variables, both PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. Facebook: the Page token stopped working (a changed password, a lost Page role, or a token not extended in step 5): generate and extend a new one (steps 4 and 5) and run `panda-social setup facebook` again. Instagram: the token lapsed (60 days after it was generated or last renewed) or was revoked: generate a new one (Meta app dashboard, Use cases, Manage messaging & content on Instagram, Customize, API setup with Instagram login, Generate token) and run `panda-social setup instagram` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. Facebook: add the permission Meta names under Use cases, Manage everything on your Page, Customize, generate and extend a new token, and run `panda-social setup facebook` again. Instagram: check that instagram_business_basic and instagram_business_content_publish are under Use cases, Manage messaging & content on Instagram, Customize, generate a new token, and run `panda-social setup instagram` again. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks; Facebook limits calls per app, per user and per Page, and its message says which; Instagram allows 50 or 100 API posts per 24 hours (Meta's pages differ, and `panda-social status instagram` shows the account's own). Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net, api.x.com, graph.facebook.com or graph.instagram.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |
| `incomplete-environment` | Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys. For Facebook, set both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, or neither to use the saved Page. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `read-only-keys` | These X keys can read but not post. In the developer console, set the app permissions to Read and write, then regenerate the Access Token and Secret (keys made earlier stay read-only) and run `panda-social setup x` again. |
| `invalid-page-id` | A Facebook Page id is digits only, as `panda-social setup facebook` answers it, for example --page 104000000000001. |

## delete

Deletes one post from the account saved in the profile. Replies, the other parts of a --split thread included, are posts of their own: delete each id. On X, deleting an edited post deletes every version of it. Threads allows 100 deletes per 24 hours and needs the threads_delete permission; X allows 50 per 15 minutes and bills $0.01 each. A Facebook post id is the Page id and the post number joined by an underscore, as post returned it.

### Usage

```bash
panda-social delete --on <platform> --id <post-id> [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--on <platform>` | yes | The platform the post is on. One of: threads, x, facebook. |
| `--id <post-id>` | yes | The id of the post, as post returned it: digits on Threads and X, the Page id and the post number joined by an underscore on Facebook. |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads or Instagram token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, PANDA_SOCIAL_INSTAGRAM_TOKEN, all four PANDA_SOCIAL_X_ variables, or both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, when set, override the saved credentials. |

### Examples

```bash
# Delete one post from the default profile.
panda-social delete --on threads --id 17890000000000001
# Delete one X post.
panda-social delete --on x --id 1880000000000000001
# Delete one post from the Facebook Page.
panda-social delete --on facebook --id 104000000000001_122000000000001
```

### Output

The deleted post: `{"platform":"<platform>","id":"<post id>","deleted":true}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as `panda-social docs <command>` lists them. |
| `invalid-post-id` | Pass the id that post returned, for example --id 17890000000000001 on Threads, --id 1880000000000000001 on X, or --id 104000000000001_122000000000001 on Facebook, the Page id and the post number joined by an underscore. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-credentials` | Connect the account with `panda-social setup threads`, `panda-social setup x`, `panda-social setup facebook` or `panda-social setup instagram` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, all four PANDA_SOCIAL_X_ variables, both PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. Facebook: the Page token stopped working (a changed password, a lost Page role, or a token not extended in step 5): generate and extend a new one (steps 4 and 5) and run `panda-social setup facebook` again. Instagram: the token lapsed (60 days after it was generated or last renewed) or was revoked: generate a new one (Meta app dashboard, Use cases, Manage messaging & content on Instagram, Customize, API setup with Instagram login, Generate token) and run `panda-social setup instagram` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. Facebook: add the permission Meta names under Use cases, Manage everything on your Page, Customize, generate and extend a new token, and run `panda-social setup facebook` again. Instagram: check that instagram_business_basic and instagram_business_content_publish are under Use cases, Manage messaging & content on Instagram, Customize, generate a new token, and run `panda-social setup instagram` again. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks; Facebook limits calls per app, per user and per Page, and its message says which; Instagram allows 50 or 100 API posts per 24 hours (Meta's pages differ, and `panda-social status instagram` shows the account's own). Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net, api.x.com, graph.facebook.com or graph.instagram.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |
| `incomplete-environment` | Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys. For Facebook, set both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, or neither to use the saved Page. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `read-only-keys` | These X keys can read but not post. In the developer console, set the app permissions to Read and write, then regenerate the Access Token and Secret (keys made earlier stay read-only) and run `panda-social setup x` again. |
| `invalid-page-id` | A Facebook Page id is digits only, as `panda-social setup facebook` answers it, for example --page 104000000000001. |

## setup

On a terminal, walks a first-time user through the one-time steps of the platform (six for Threads and Instagram, five for X and for Facebook) one at a time, then reads the Threads token, the four X keys, the Facebook token or the Instagram token without showing them. Without a terminal it answers with the same steps as JSON, for an agent to relay to its human, and the command that finishes the setup. With --token-stdin (Threads, Facebook, Instagram) or --keys-stdin (X, four lines: API Key, API Key Secret, Access Token, Access Token Secret) it reads them from standard input. The credentials are checked with the platform before they are saved in ~/.panda-social/credentials.json, readable by its owner only; X keys that X reports as read-only are refused. Checking X keys spends about $0.01 of X credits. For Facebook, the token is the long-lived user token of step 5: the CLI reads the Pages it grants, saves the chosen Page's own token, which does not expire, and never the user token; --page names the Page when the token grants several, and a Page on which the user cannot create content is refused. For Instagram, the token is the one the app dashboard generates for a professional account (Instagram Login, no Facebook Page needed); it lasts 60 days and renews itself once it is 30 days old, as the Threads token does; `post` does not take Instagram yet.

### Usage

```bash
panda-social setup <platform> [--token-stdin] [--keys-stdin] [--page <page-id>] [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<platform>` | yes | The platform to connect. One of: threads, x, facebook, instagram. |
| `--token-stdin` | no | Threads, Facebook and Instagram: read the token from standard input instead of asking for it. |
| `--keys-stdin` | no | X: read the four keys from standard input, one per line: API Key, API Key Secret, Access Token, Access Token Secret. |
| `--page <page-id>` | no | Facebook: the id of the Page to connect, needed when the token grants several. |
| `--profile <name>` | no | The profile to save the account under. Defaults to "default". |

### Examples

```bash
# On a terminal, the guided setup; without one, the steps as JSON.
panda-social setup threads
# Save a token piped in on standard input, once Threads confirms it.
panda-social setup threads --token-stdin
# Save a second account under the brand-a profile.
panda-social setup threads --token-stdin --profile brand-a
# On a terminal, the guided X setup; without one, the steps as JSON.
panda-social setup x
# Save four X keys piped in, one per line, once X confirms they can post.
panda-social setup x --keys-stdin
# On a terminal, the guided Facebook setup; without one, the steps as JSON.
panda-social setup facebook
# Save the Page 104000000000001 with a token piped in, once Meta confirms the token grants it.
panda-social setup facebook --token-stdin --page 104000000000001
# On a terminal, the guided Instagram setup; without one, the steps as JSON.
panda-social setup instagram
# Save an Instagram token piped in on standard input, once Instagram confirms whose it is.
panda-social setup instagram --token-stdin
```

### Output

The connected account, `{"platform":"threads","profile":"<name>","userId":"<id>","username":"<username>"}`, for X the same with `"platform":"x"` and a `note` on credits, for Instagram the same with `"platform":"instagram"`, and for Facebook `{"platform":"facebook","profile":"<name>","pageId":"<id>","pageName":"<name>","note":"<posts stay private until the app is published>"}`. Without a terminal and without --token-stdin or --keys-stdin, the guide instead: `{"platform":"threads","profile":"<name>","steps":[{"step":1,"title":"...","actions":["..."],"url":"..."}],"finish":"<the command that completes the setup>"}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as `panda-social docs <command>` lists them. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `no-home` | Set HOME (USERPROFILE on Windows), or pass the credentials in the environment instead of saving them: PANDA_SOCIAL_THREADS_TOKEN, the four PANDA_SOCIAL_X_ variables, the two PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN. |
| `cancelled` | The setup stopped before the credentials were pasted. Run the same setup command again when you have them. |
| `invalid-keys` | Paste the four X keys in this order, one per line: API Key, API Key Secret, Access Token, Access Token Secret. |
| `invalid-page-id` | A Facebook Page id is digits only, as `panda-social setup facebook` answers it, for example --page 104000000000001. |
| `no-pages` | The token grants no Page. Generate it again in the Graph API Explorer (step 4 of `panda-social setup facebook`) and choose your Page in the dialog; your Facebook account needs a role on that Page. |
| `choose-page` | Run the setup again with --page <id>, one of the Page ids the message lists; for a Page it does not list, generate a new token that grants it (step 4 of `panda-social setup facebook`). |
| `missing-page-task` | Your role on the Page cannot create posts. Ask a Page admin for full control or content access (the Page's settings, Page access), then run `panda-social setup facebook` again. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. Facebook: the Page token stopped working (a changed password, a lost Page role, or a token not extended in step 5): generate and extend a new one (steps 4 and 5) and run `panda-social setup facebook` again. Instagram: the token lapsed (60 days after it was generated or last renewed) or was revoked: generate a new one (Meta app dashboard, Use cases, Manage messaging & content on Instagram, Customize, API setup with Instagram login, Generate token) and run `panda-social setup instagram` again. |
| `read-only-keys` | These X keys can read but not post. In the developer console, set the app permissions to Read and write, then regenerate the Access Token and Secret (keys made earlier stay read-only) and run `panda-social setup x` again. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. Facebook: add the permission Meta names under Use cases, Manage everything on your Page, Customize, generate and extend a new token, and run `panda-social setup facebook` again. Instagram: check that instagram_business_basic and instagram_business_content_publish are under Use cases, Manage messaging & content on Instagram, Customize, generate a new token, and run `panda-social setup instagram` again. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks; Facebook limits calls per app, per user and per Page, and its message says which; Instagram allows 50 or 100 API posts per 24 hours (Meta's pages differ, and `panda-social status instagram` shows the account's own). Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net, api.x.com, graph.facebook.com or graph.instagram.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `write-failed` | The credentials could not be saved. Check that your home folder is writable, then run the setup again. |

## status

Asks the platform whose credentials the profile holds. For Threads it also reads the rolling 24-hour quotas for posts, replies and deletes, and a saved token 30 days old or more is refreshed first, as every Threads command does: running status now and then keeps an idle token alive, since Threads lets a token lapse 60 days after its last refresh. For X it reports the access level X states for the keys (null when X states none); X shows neither the credit balance nor the rate windows to these keys, and the check spends about $0.01 of X credits. For Facebook it asks Meta which Page the token belongs to. For Instagram it reads the rolling 24-hour posts quota, and a saved token 30 days old or more is renewed first, as on Threads. It never posts.

### Usage

```bash
panda-social status <platform> [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<platform>` | yes | The platform to check. One of: threads, x, facebook, instagram. |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads or Instagram token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, PANDA_SOCIAL_INSTAGRAM_TOKEN, all four PANDA_SOCIAL_X_ variables, or both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, when set, override the saved credentials. |

### Examples

```bash
# Check the account saved in the default profile.
panda-social status threads
# Check the account saved in the brand-a profile.
panda-social status threads --profile brand-a
# Check the X keys saved in the default profile.
panda-social status x
# Check the Facebook Page saved in the default profile.
panda-social status facebook
# Check the Instagram account saved in the default profile.
panda-social status instagram
```

### Output

Threads: `{"platform":"threads","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"token":{"source":"saved","savedAt":"<time>","ageDays":<n>,"expiresAt":"<time, or null until the first refresh>","refreshed":<true when this run refreshed it>},"limits":{"posts":{"used":<n>,"total":250,"windowSeconds":86400},"replies":{...},"deletes":{...}}}`, with `token` `{"source":"environment"}` when PANDA_SOCIAL_THREADS_TOKEN is set. X: `{"platform":"x","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"accessLevel":"read-write","keys":{"source":"saved","savedAt":"<time>"}}`, with `keys` `{"source":"environment"}` when the four PANDA_SOCIAL_X_ variables are set. Facebook: `{"platform":"facebook","profile":"<name>","page":{"id":"<id>","name":"<name>"},"token":{"source":"saved","savedAt":"<time>"}}`, with `token` `{"source":"environment"}` when PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN are set. Instagram: `{"platform":"instagram","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"token":{...as for Threads},"limits":{"posts":{"used":<n>,"total":<n>,"windowSeconds":86400}}}`, with `token` `{"source":"environment"}` when PANDA_SOCIAL_INSTAGRAM_TOKEN is set.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as `panda-social docs <command>` lists them. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `incomplete-environment` | Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys. For Facebook, set both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, or neither to use the saved Page. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `invalid-page-id` | A Facebook Page id is digits only, as `panda-social setup facebook` answers it, for example --page 104000000000001. |
| `missing-credentials` | Connect the account with `panda-social setup threads`, `panda-social setup x`, `panda-social setup facebook` or `panda-social setup instagram` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, all four PANDA_SOCIAL_X_ variables, both PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. Facebook: the Page token stopped working (a changed password, a lost Page role, or a token not extended in step 5): generate and extend a new one (steps 4 and 5) and run `panda-social setup facebook` again. Instagram: the token lapsed (60 days after it was generated or last renewed) or was revoked: generate a new one (Meta app dashboard, Use cases, Manage messaging & content on Instagram, Customize, API setup with Instagram login, Generate token) and run `panda-social setup instagram` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. Facebook: add the permission Meta names under Use cases, Manage everything on your Page, Customize, generate and extend a new token, and run `panda-social setup facebook` again. Instagram: check that instagram_business_basic and instagram_business_content_publish are under Use cases, Manage messaging & content on Instagram, Customize, generate a new token, and run `panda-social setup instagram` again. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks; Facebook limits calls per app, per user and per Page, and its message says which; Instagram allows 50 or 100 API posts per 24 hours (Meta's pages differ, and `panda-social status instagram` shows the account's own). Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net, api.x.com, graph.facebook.com or graph.instagram.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |

## help-json

The manifest an agent reads on first contact: the output contract, the global flags, every command with its usage line, parameters, examples and error codes, and the next step for every error code. The same manifest ships as docs/commands.json.

### Usage

```bash
panda-social help-json
```

### Parameters

None.

### Examples

```bash
# Read the whole command surface in one call.
panda-social help-json
```

### Output

The manifest: `{"name","version","bin","contract","flags":[...],"commands":[...],"errors":[{"code","hint"}]}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |

## docs

The long form of one command: what it does, its usage line, every parameter, examples ready to paste into a shell, its output and its error codes. docs/COMMANDS.md collects every page.

### Usage

```bash
panda-social docs <command>
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<command>` | yes | The command to document. One of: post, update, delete, setup, status, help-json, docs. |

### Examples

```bash
# Read the post page.
panda-social docs post
```

### Output

The page: `{"command":"<name>","markdown":"<the page>"}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-command` | Run `panda-social help-json` for every command, or `panda-social docs <command>` for one. |

## Error codes

Every failure carries one of these codes. Its `hint` says what to do next.

| Code | Next step |
| --- | --- |
| `cancelled` | The setup stopped before the credentials were pasted. Run the same setup command again when you have them. |
| `choose-page` | Run the setup again with --page <id>, one of the Page ids the message lists; for a Page it does not list, generate a new token that grants it (step 4 of `panda-social setup facebook`). |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `duplicate-text` | X and Facebook refuse a post whose text repeats one of the account's recent posts. Change the text, or delete the earlier post first. |
| `edit-refused` | X edits a post only for an X Premium account, within a short window after posting (30 minutes or 1 hour, X pages differ) and 5 times at most; Facebook edits only posts this Meta app made. Pass --repost to delete the post and publish the new version instead: it gets a new id and link, and loses its likes, replies and comments. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. Facebook: add the permission Meta names under Use cases, Manage everything on your Page, Customize, generate and extend a new token, and run `panda-social setup facebook` again. Instagram: check that instagram_business_basic and instagram_business_content_publish are under Use cases, Manage messaging & content on Instagram, Customize, generate a new token, and run `panda-social setup instagram` again. |
| `image-rejected` | The platform could not use the image. Threads: check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most. X: check that the file opens as a JPEG, PNG, GIF or WEBP image. Facebook: check that the URL opens in a private browser window, or that the file opens as an image. Then retry. |
| `incomplete-environment` | Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys. For Facebook, set both PANDA_SOCIAL_FACEBOOK_PAGE_ID and PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN, or neither to use the saved Page. |
| `invalid-image` | Threads needs a public https URL to a JPEG or PNG image, 8 MB at most: host a local file first, then pass its URL. X needs a local JPEG, PNG, GIF or WEBP file, 5 MB at most: download a remote image first, then pass its path. Facebook takes an https URL, or a local JPEG, PNG, GIF, BMP or TIFF file of 10 MB at most. |
| `invalid-keys` | Paste the four X keys in this order, one per line: API Key, API Key Secret, Access Token, Access Token Secret. |
| `invalid-page-id` | A Facebook Page id is digits only, as `panda-social setup facebook` answers it, for example --page 104000000000001. |
| `invalid-post-id` | Pass the id that post returned, for example --id 17890000000000001 on Threads, --id 1880000000000000001 on X, or --id 104000000000001_122000000000001 on Facebook, the Page id and the post number joined by an underscore. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-credentials` | Connect the account with `panda-social setup threads`, `panda-social setup x`, `panda-social setup facebook` or `panda-social setup instagram` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, all four PANDA_SOCIAL_X_ variables, both PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN. |
| `missing-page-task` | Your role on the Page cannot create posts. Ask a Page admin for full control or content access (the Page's settings, Page access), then run `panda-social setup facebook` again. |
| `missing-text` | Pass the text of the post with --text (quoted when it contains spaces), an image with --image (a URL on Threads, a local file on X, either on Facebook), or both. |
| `network-failed` | The platform could not be reached (graph.threads.net, api.x.com, graph.facebook.com or graph.instagram.com). Check the network, then retry. |
| `no-home` | Set HOME (USERPROFILE on Windows), or pass the credentials in the environment instead of saving them: PANDA_SOCIAL_THREADS_TOKEN, the four PANDA_SOCIAL_X_ variables, the two PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN. |
| `no-pages` | The token grants no Page. Generate it again in the Graph API Explorer (step 4 of `panda-social setup facebook`) and choose your Page in the dialog; your Facebook account needs a role on that Page. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks; Facebook limits calls per app, per user and per Page, and its message says which; Instagram allows 50 or 100 API posts per 24 hours (Meta's pages differ, and `panda-social status instagram` shows the account's own). Wait, then retry. |
| `read-only-keys` | These X keys can read but not post. In the developer console, set the app permissions to Read and write, then regenerate the Access Token and Secret (keys made earlier stay read-only) and run `panda-social setup x` again. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `still-processing` | Threads was still processing the image after 60 seconds, so nothing was published. Retry the post. |
| `text-too-long` | Threads allows 500 characters per post, an emoji counting its UTF-8 bytes; X allows 280, most characters counting 1, CJK characters and emoji 2, a link 23. Shorten the text, or pass --split to post it as a thread of replies; an X edit is one post, so pass --repost there instead. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. Facebook: the Page token stopped working (a changed password, a lost Page role, or a token not extended in step 5): generate and extend a new one (steps 4 and 5) and run `panda-social setup facebook` again. Instagram: the token lapsed (60 days after it was generated or last renewed) or was revoked: generate a new one (Meta app dashboard, Use cases, Manage messaging & content on Instagram, Customize, API setup with Instagram login, Generate token) and run `panda-social setup instagram` again. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-command` | Run `panda-social help-json` for every command, or `panda-social docs <command>` for one. |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unknown-platform` | Name a platform the command takes, as `panda-social docs <command>` lists them. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unsupported` | Threads cannot edit a published post, and Facebook edits the text of one but not its image. Pass --repost to delete the post and publish the new version: it gets a new id and link, and loses its likes, replies and comments. |
| `write-failed` | The credentials could not be saved. Check that your home folder is writable, then run the setup again. |
