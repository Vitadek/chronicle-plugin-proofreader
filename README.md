# Proofreader

A guided revision pass: spelling, grammar and an observation-only AI clarity check.

A plugin for [Chronicle](https://github.com/Vitadek/chronicle).

## What it does

Open it from the icon on a book's card in the Library, choose the chapters to
cover, and it walks you through one issue at a time: the passage is highlighted,
the card sits under it, and ← / → / Enter move through the queue.

- **One-click fixes** wherever LanguageTool has one — a spelling correction, the
  confused-with word, a grammar or punctuation rewrite. The **AI clarity pass**
  never offers one: it tells you *why* a passage may read unclear and leaves the
  words to you (enforced by the server's schema, not just by prompt).
- **Spelling vs. word choice.** Confusion pairs (*quiet*/*quite*) are shown as
  **Word choice**, not as spelling errors — the word is spelled fine, and
  "add to dictionary" would whitelist a common word and silence the rule for
  good. On deliberate or older diction, **Ignore** it (or switch the whole check
  off in Settings).
- **Ignore is reversible.** Everything you waved off in a chapter is listed in the
  **Ignored** drawer and can be restored, individually or all at once. Ignores
  persist across sessions; they're stored per book and chapter.
- **Editing by hand pauses the walk.** Click into the prose and type, and the
  card steps aside instead of teleporting to the next issue under your cursor.
  A bar offers **Recheck** (re-run the checker and stay put, to see your fix
  land) and **Continue** (re-run it, then pick the walk back up at the next issue
  *after the caret* — not back at issue 1).
- **The custom dictionary** is edited here — from a spelling card, or the
  Dictionary drawer. It applies everywhere in Chronicle, not just in this view.

## Settings

**Settings → Plugins → Proofreader** switches whole classes of check off:
spelling, grammar & punctuation, word choice. That's the permanent
"never show me this" — for a single passage you meant to write that way, use
**Ignore** in the walk instead.

Requires the LanguageTool sidecar (`host:languagetool`); the clarity pass
additionally wants `host:gemini` and is simply absent without it.

## Install

In Chronicle: **Settings → Plugins → Install from git**, and paste:

```
https://github.com/Vitadek/chronicle-plugin-proofreader.git
```

Chronicle clones this repo and compiles it on the server — there is no build step
on your side, and nothing to download by hand. Enable it from the same screen.

Updates are never applied behind your back: use **Check for updates** to see the
incoming commits, then **Update**. **Pin** freezes it at the current commit.

## Develop

Plugin id: `chronicle.proofreader` · entry: `src/index.tsx` · manifest: `chronicle-plugin.json`

Write plain TypeScript/TSX and push — the server builds it. See
[PLUGINS.md](https://github.com/Vitadek/chronicle/blob/main/PLUGINS.md) for the
API, the contribution slots, and the trust model.

The walk's decision logic lives in `src/lib/walk.ts` and `src/lib/prefs.ts` as
plain functions, with tests in `scripts/proofread.test.ts`:

```
ln -s ../chronicle/node_modules node_modules   # once, for tsx + types
npx tsx scripts/proofread.test.ts
```

> Plugins run with full privileges inside the app (trust-on-install, like
> Obsidian/VS Code). Only install repos you trust.
