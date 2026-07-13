// The Proofreader's own preferences: which checks the walk includes.
//
// Stored in the plugin's GLOBAL state (ctx.state), so it follows the writer
// across books and devices — unlike the ignore list, which is per manuscript
// and per chapter (it's about one passage, not about how you like to work).
//
// Shared by the walk (ProofreadView) and the Settings panel (ProofreadSettings)
// so there is exactly one definition of what the defaults are.

import type { PluginContext } from '@chronicle/plugin-api';

/** The checks a writer can switch off. Clarity is omitted deliberately: it only
 *  runs when you press the button, so a toggle would be a toggle for a thing
 *  that already doesn't happen unless you ask. */
export type CheckKey = 'spelling' | 'grammar' | 'wordchoice';

export const CHECK_META: Record<CheckKey, { label: string; hint: string }> = {
  spelling: {
    label: 'Spelling',
    hint: 'Misspelled words, with LanguageTool’s corrections as one-click fixes.',
  },
  grammar: {
    label: 'Grammar & punctuation',
    hint: 'Agreement, articles, spacing, and the like — suggestions offered where LanguageTool has one.',
  },
  wordchoice: {
    label: 'Word choice',
    hint: 'Commonly confused pairs (quiet/quite, their/there). Prone to false positives on deliberate or older diction — switch it off if it fights your voice.',
  },
};

export const DEFAULT_CHECKS: Record<CheckKey, boolean> = {
  spelling: true,
  grammar: true,
  wordchoice: true,
};

interface ProofreadGlobalState {
  checks?: Partial<Record<CheckKey, boolean>>;
}

/** Which checks are on. Anything unset falls back to the default (on). */
export function getChecks(ctx: PluginContext): Record<CheckKey, boolean> {
  const stored = (ctx.state.get() as ProofreadGlobalState).checks ?? {};
  return {
    spelling: stored.spelling ?? DEFAULT_CHECKS.spelling,
    grammar: stored.grammar ?? DEFAULT_CHECKS.grammar,
    wordchoice: stored.wordchoice ?? DEFAULT_CHECKS.wordchoice,
  };
}

export function setCheck(ctx: PluginContext, key: CheckKey, enabled: boolean): void {
  // state.set REPLACES the blob — spread so nothing else the plugin keeps
  // globally is lost.
  const state = ctx.state.get() as ProofreadGlobalState;
  ctx.state.set({ ...state, checks: { ...getChecks(ctx), [key]: enabled } });
}
