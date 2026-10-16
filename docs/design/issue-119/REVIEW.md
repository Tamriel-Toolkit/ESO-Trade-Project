# Issue #119 shell acceptance review

Base: `main` at `36595f6daa93106f832ca8e5e863295960f45b04`. Working branch: `codex/issue-119-shell-refinement`. PR #133 supplied the existing Gilded Exchange shell, dropdown interactions, and most plain-language copy. Issue #104 supplied the semantic tokens. This review covers only the remaining presentation and acceptance work.

| #119 acceptance criterion | Before this patch | Evidence and result |
| --- | --- | --- |
| Consistent destination names and one selected-state treatment | **Partially implemented** | `navbar.jsx` already used Marketplace, Characters, and Trait research; mobile still said “Item Requests,” while `MyOrders.jsx` headed the route “My orders & claims.” Active links combined a fill, underline, and CSS diamond (`exchange.css`). Now both navigation variants and the heading say “My orders,” mobile says “Requests,” current pages use an underline, and an open group has a separate surface. |
| All desktop/mobile destinations and utility actions retain handlers, gating, URLs, and state | **Already implemented** | `navbar.jsx` already preserved the seven mobile destinations, Requests/Characters groups, `/requests/my-orders` alias, and dropdown dismissal. `SettingsMenu.jsx` retained the platform, region, appearance, preferences, and development callbacks. `UserMenu.jsx` retained guest login/register state, signed-in links, and logout. This patch changes none of those handlers or destinations. The shell/settings tests and browser route checks passed. |
| No unsupported active game synchronization or watchlist claims | **Partially implemented** | PR #133 had removed the account watchlist claim and item-catalog promotion (`UserMenu.jsx`, `SettingsMenu.jsx`), but “Connection status” could still suggest a local game connection. It now reads “Service status,” “Connected/Not connected,” and “Latest recorded scan” using the same online and scan values. No API or freshness logic changed. |
| Required widths, 200% zoom, short viewport, no overflow/offscreen actions/overlap/clipped focus | **Partially implemented** | At base, the mobile rail gave little overflow indication and the account panel had no viewport height bound (`navbar.jsx`, `exchange.css`). The patch adds a cue that disappears at the rail end, a visible scrollbar, viewport-bounded panel dimensions, wrapping, and compact header spacing. Headless Chrome checked 360, 390, 768, 1024, 1440px and 390×360px with no page overflow. A 720px CSS viewport with DPR 2, approximating a 1440px desktop at 200% zoom, also had no overflow. Actual browser zoom was unavailable. At an additional 195px CSS viewport, the Home page's `exchange-intro` extends to 285px; that page layout is outside this shell patch. |
| Guest/signed-in, long text, both dropdowns, online/offline, appearance, dev/prod rules | **Partially implemented** | Existing `shell.test.jsx` and `settings.test.jsx` covered most handlers/states. The account trigger had a permanent signed-in accent and the account panel lacked a height bound. The patch quiets the trigger, wraps identity text, and bounds both utility panels. Browser checks covered guest, an isolated long signed-in response fixture, offline and online status, dropdowns, dark and disabled Light/System, and development/production exclusion. |
| Before/after captures, route/action parity, lint/build/tests | **Missing** | This review supplies the captures below and the parity checklist. Dependency installation, lint, build, and shell/settings component suites pass (21/21). The broader shell/settings/requests run passes 35/36; the request-card `140,000g` text assertion fails identically on clean base `main`. The npm audit reported 24 advisories on both unchanged dependency sets; no dependency update was made. |

## Route and action parity

- Mobile links still reach `/`, `/marketplace`, `/requests`, `/my-orders`, `/builds`, `/characters`, and `/traits`. Browser clicks verified all seven. Desktop Requests and Characters disclosures retain their links, hover/click/Escape behavior, route dismissal, and `/requests/my-orders` active alias.
- Settings retains PC/Mac and Console, NA and EU, Dark selection, unavailable Light/System, Marketplace preferences, and development accounts behind `!import.meta.env.PROD`. Browser checks confirmed production exclusion.
- Guest account links retain `/login`, the registration `defaultTab: 'register'` state, and the return location. Signed-in links retain `/characters` and `/marketplace`; sign-out still calls `logout`. Component tests cover these behaviors. No authentication or permission code changed.

## Captures

| View | Before | After |
| --- | --- | --- |
| Mobile 390px shell | [before](before-390.png) | [after](after-390.png) |
| Mobile settings | [before](before-settings-390.png) | [after](after-settings-390.png) |
| Mobile account | [before](before-account-390.png) | [after](after-account-390.png) |
| Desktop 1440px shell | [before](before-1440.png) | [after](after-1440.png) |
| Desktop settings | [before](before-settings-1440.png) | [after](after-settings-1440.png) |
| Desktop account | [before](before-account-1440.png) | [after](after-account-1440.png) |

Additional isolated checks: [long account identity at 390×360px](after-account-long-390.png) and [open desktop Characters group](after-dropdown-1440.png). The signed-in image uses an intercepted browser response, not production account data.

## Verification boundaries

- Browser checks used local headless Chrome and local Vite servers with no backend. Isolated response fixtures supplied the signed-in identity and online service state. The offline/guest state came from the absent local API. The production check used `vite preview`.
- Keyboard Tab produced visible outlines on the wordmark, settings, account, and mobile links. The last mobile link retained 16px of space to the rail edge when focused. Escape closed Requests and restored trigger focus. The mobile overflow cue appeared when more links remained and disappeared at the end. The short viewport kept panel actions reachable by scrolling.
- Actual 200% browser zoom, screen readers, other browser engines, and real authenticated production data were not tested. #142 owns Light/System implementation; #177 owns persistent-shell render-error containment. Neither is changed here.
