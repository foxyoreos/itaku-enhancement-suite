# Itaku Enhancement Suite

*The Itaku Enhancement Suite is not affiliated with the site Itaku.ee. It is developed entirely independently and with no input from site developers, owners, or moderators.*

The Itaku Enhancement Suite looks to fix a small number of usability issues on Itaku.ee without significantly altering the site's style or functionality. The extension does not look to implement broad changes.

A good way to think of the Itaku Enhancement Suite is as a set of **polyfills** for Itaku.ee. The supported features are all features that I or other people would like to see built into the site natively. Experimenting with new features via an opt-in, independent browser extension allows better understanding of which features and UX designs work well and which have unintended side-effects or require additional iteration. Ideally, features in the Itaku Enhancement Suite should dwindle over time as the site matures.

## Features and Sitewide Fixes

See the full list of currently supported features in the [wiki](https://codeberg.org/foxyoreos/itaku-enhancement-suite/wiki/Feature-List). See upcoming features and projects by looking at the issue tracker and at the [project boards](https://codeberg.org/foxyoreos/itaku-enhancement-suite/projects).

## Security Considerations

- Uses Manifest V3 and newer permission models, including non-persistant background scripts instead of persistent scripts.
- Requests as few permissions as possible and is only active on the Itaku domain.
- Never makes network requests to any other domain.
- When possible, prefers `sessionStorage` for cached data which allows caches to be automatically cleared whenever the browser closes.
- Deploys/pushes use 2FA for both Codeberg and Mozilla Addons store.

## Performance and Optimization

- Minimizes extra requests to the Itaku server when fetching information, preferring to combine them when possible.
- Preemptively caches data that will allow skipping future requests whenever that data happens to be fetched.
- Avoids preemptively fetching data that the user hasn't requested yet.

## Architecture

- No build process (the source code you see here is what ships).
- Code documented as much as possible to make it easier to read and understand.

## Privacy Policy

I do not willingly collect any user information, annonymized or not. No information is transmitted from the Itaku Enhancement Suite to any server I control. The extension currently collects the following information and stores it locally within your browser (it is never transmitted off-device):

- Your extension settings (stored locally in extension storage)
- The currently logged in user metadata (username, blocked tags/users, etc... this is a temporary cache, stored in sessionStorage and automatically cleared by Firefox after every browsing session)
- User-created post/image/comment descriptions/titles (temporary cache, stored in sessionStorage and automatically cleared by Firefox after every browsing session)

This list is subject to change as more features are added.

## FAQ

### Who are you?

I go by Foxyoreos online. :3

### I have a feature idea

It's better if you contact me on Itaku.ee directly. I'm more likely to see messages there, and I'd like ideas/issues to primarily come from site users. I also will not accept patches/issues/feature-requests from anypony who is under 18 years old.

### Why is this only released for Firefox?

Because the icon is cute :3 Also because building extensions for Chrome is fckn annoying and I don't want to make a Google account >:3

Why are **you** using Chrome? Why aren't you using the cute fox browser? >w<

### Is there any way to support the extension?

You can donate to Itaku's Patreon [here](https://www.patreon.com/itaku). This should be the first place where your support should go. It'll be better for everypony including me if Itaku is sustainable <3

But if you're uncomfortable linking your real-world purrsonal info on Patreon to your furry side, consider donating instead to the [EFF](https://www.eff.org/pages/donate-eff), the [Internet Archive](https://archive.org/donate/), or to the [Trevor Project](https://give.thetrevorproject.org/give/259439).
