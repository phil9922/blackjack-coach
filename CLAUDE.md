# blackjack-coach — public, open-source

This repo is **public**. It is the self-hostable, bring-your-own-API-key version of
the app, and that boundary is load-bearing, not a style preference.

## Hard rule: no SaaS code here, ever

There is a private, paid variant of this app that gates the AI coach behind a
subscription and uses the owner's own Claude API key instead of the player's. That
variant — its backend, its billing, its auth — lives in a **separate private repo**
and must stay there. Never add any of the following to this repo, even behind a
flag or an "optional" toggle:

- Sign-in / sign-up / account management of any kind
- Billing, subscriptions, Stripe, or any payment integration
- A server/worker backend that holds an API key on the player's behalf
- Any reference to the private repo's *name* or *implementation details* (its
  code, its stack, how the subscription works, anything from its CLAUDE.md)

The one deliberate exception: the README may link to the hosted product's
**domain** as a "try it live" / "prefer not to self-host?" pointer — ordinary
practice for a self-hostable OSS project with a paid hosted option. That's a
single outbound link, not a reference to the private repo itself; it carries
no other detail about how the hosted version is built.

**The AI coach in this repo must always require the player's own Claude API key**,
entered in Settings and sent directly from their browser to Anthropic — never a
key supplied by the app owner, never a server in between. If a request would
change that (e.g. "make the coach free for everyone," "add accounts," "add a
subscribe button"), say so and decline — that work belongs in the private repo.

## Why this repo and the private one can still share code

Everything that is *not* about auth/billing/hosting a shared key — the game
engine, strategy chart, counting systems, drills, gamification, UI — is meant to
stay in sync between the two. The private repo keeps a `public` git remote
pointing at this one specifically so its owner can pull core improvements with a
normal merge. Because of that:

- Keep this repo's history reachable — don't rewrite published commits without a
  real reason (the private repo's ability to merge depends on shared ancestry).
- A core feature or bug fix belongs here first; the private repo pulls it in.
- SaaS-only work never flows the other direction — nothing from the private repo
  should ever land in a commit on this repo.

## Other standing constraints

See `.handoff/PROJECT.md` for the rest of the project's non-negotiables (strategy
chart correctness, honest shoe/count, saved-progress compatibility, etc.) — this
file only covers the public/private split, since that's the newest and easiest
one to get wrong.
