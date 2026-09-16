# Shared shell presentation parity

- Public wordmark and accessible home-link name remain **ESO Marketplace**. The ESO square, Lucide icons, original routes, and mobile destinations are retained.
- Navigation retains pointer hover disclosure and click/keyboard activation. The initial pointer click no longer immediately reverses hover-open. Escape closes and restores trigger focus; Tab leaving the disclosure and any route change close it. Current-page semantics include the existing `/requests/my-orders` alias.
- Account and settings popovers keep existing actions and preferences. Labeled settings groups and pressed states now expose existing selection; Escape and focus exit dismiss predictably. A persistent trigger receives focus before developer-modal opening or sign-out so focus is not left on a removed menu action.
- Developer create/edit inputs retain their existing values, validation, callbacks, and payloads, with persistent visible labels. Long usernames, handles, emails, and token text wrap. Existing confirmation dialogs, development-only visibility, and all destructive-operation semantics remain unchanged. No tests invoke real mutations.
- The not-found page retains marketplace/home destinations using single links rather than nested links and buttons.

## Known pre-existing limitation (not changed)

The Settings platform UI offers **PC / Mac** and **Console**, while `ThemeProvider.togglePlatform` cycles **PC → Xbox → PlayStation**. Its existing click handlers can cycle to a different platform than the clicked label suggests. This is a functional selection defect outside this UI-only restyle; callbacks and storage keys were intentionally preserved. The Console pressed state now accurately includes Xbox/PlayStation values, but does not claim that the underlying selection defect is fixed.

## Verification

`frontend/src/__tests__/shell.test.jsx` covers hover/click and keyboard dropdown closure, all mobile destinations, current-page semantics, setting group/pressed states and callbacks, guest registration route state, authenticated account actions, developer labels/closed-state behavior, and not-found link structure. API calls are isolated test doubles; no production database or session is modified.
