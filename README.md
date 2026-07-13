# Proofreader

A guided revision pass: spelling, grammar and an observation-only AI clarity check.

A plugin for [Chronicle](https://github.com/Vitadek/chronicle).

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

> Plugins run with full privileges inside the app (trust-on-install, like
> Obsidian/VS Code). Only install repos you trust.
