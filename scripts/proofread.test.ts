/**
 * The Proofreader's decision logic (src/lib/walk.ts, src/lib/prefs.ts).
 *
 * Run:  npx tsx scripts/proofread.test.ts
 * (Needs Chronicle's node_modules on the path — symlink it here while
 * developing; the server never builds this file, only src/.)
 *
 * The component around these functions is layout and animation; this is where
 * the behaviour that can actually be wrong lives — what counts as a spelling
 * error, what an ignore remembers, and where "Continue" puts you after you have
 * been editing by hand.
 */
import assert from 'node:assert/strict';
import { issueKey, parseIssueKey, resumeTarget, sourceFor } from '../src/lib/walk';
import { DEFAULT_CHECKS, getChecks, setCheck, type CheckKey } from '../src/lib/prefs';
import type { PluginContext } from '@chronicle/plugin-api';

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${name} — ${err instanceof Error ? err.message : err}`);
  }
}

// ── Classification ───────────────────────────────────────────────────────────
check('a real typo is spelling', () => {
  assert.equal(sourceFor('misspelling'), 'spelling');
});
check('a confused word is word choice, NOT spelling', () => {
  // The bug this exists to prevent: "quiet" in "They were quiet a trifle
  // longer" reported as a Spelling Error, with "add to dictionary" offered —
  // which would have whitelisted a common word and killed the rule for good.
  assert.equal(sourceFor('confusion'), 'wordchoice');
});
check('anything else is grammar', () => {
  assert.equal(sourceFor('typographical'), 'grammar');
  assert.equal(sourceFor('style'), 'grammar');
});

// ── Issue keys (identity of an ignore) ───────────────────────────────────────
check('a key round-trips through the Ignored drawer', () => {
  const key = issueKey('wordchoice', 'quiet', 'Did you mean “quite”?');
  assert.deepEqual(parseIssueKey(key), {
    source: 'wordchoice',
    text: 'quiet',
    message: 'Did you mean “quite”?',
  });
});
check('a pipe inside the message survives the round trip', () => {
  const key = issueKey('grammar', 'a apple', 'Use “an” | not “a”');
  assert.equal(parseIssueKey(key)?.message, 'Use “an” | not “a”');
});
check('garbage keys are rejected, not guessed at', () => {
  assert.equal(parseIssueKey('nonsense'), null);
  assert.equal(parseIssueKey('bogus|text|msg'), null);
});
check('the same issue keeps its key across re-lints (so an ignore sticks)', () => {
  const a = issueKey(sourceFor('misspelling'), 'stoer', 'Possible spelling mistake found.');
  const b = issueKey(sourceFor('misspelling'), 'stoer', 'Possible spelling mistake found.');
  assert.equal(a, b);
});

// ── Continue: where the walk resumes after hand-editing ──────────────────────
const q = (...positions: (number | null)[]) => positions.map((from) => ({ from }));

check('Continue lands on the next issue AFTER the caret, not back at issue 1', () => {
  // The complaint: fix something in the middle of a chapter and the walk
  // teleports to the first issue in the document, somewhere above the fold.
  assert.deepEqual(resumeTarget(q(10, 200, 400), 250), { from: 400 });
});
check('an issue exactly at the caret counts as ahead', () => {
  assert.deepEqual(resumeTarget(q(10, 300), 300), { from: 300 });
});
check('fixing the LAST issue falls back to the nearest one before it', () => {
  // Otherwise the pass dead-ends: nothing ahead, so nothing happens, and the
  // writer is left staring at a chapter with issues still in it.
  assert.deepEqual(resumeTarget(q(10, 200), 900), { from: 200 });
});
check('a clean chapter resumes to nothing (no crash, no phantom jump)', () => {
  assert.equal(resumeTarget([], 42), null);
});
check('issues with no position (unlocatable clarity quote) are never a target', () => {
  assert.deepEqual(resumeTarget(q(null, 500), 100), { from: 500 });
});

// ── Check toggles (Settings → Plugins → Proofreader) ─────────────────────────
function fakeCtx(initial: Record<string, unknown> = {}): PluginContext & { blob: Record<string, unknown> } {
  const store = { blob: { ...initial } };
  return {
    ...(store as unknown as PluginContext),
    blob: store.blob,
    state: {
      get: () => store.blob,
      set: (next: Record<string, unknown>) => { store.blob = next; },
      getForManuscript: () => ({}),
      setForManuscript: () => {},
    },
  } as unknown as PluginContext & { blob: Record<string, unknown> };
}

check('every check is on by default', () => {
  assert.deepEqual(getChecks(fakeCtx()), DEFAULT_CHECKS);
});
check('switching word choice off is remembered', () => {
  const ctx = fakeCtx();
  setCheck(ctx, 'wordchoice', false);
  assert.equal(getChecks(ctx).wordchoice, false);
  assert.equal(getChecks(ctx).spelling, true, 'other checks must be untouched');
});
check('writing a check preserves the rest of the plugin state blob', () => {
  // state.set REPLACES the blob — a careless write here would silently drop
  // whatever else the plugin keeps globally.
  const ctx = fakeCtx({ somethingElse: 'keep me' });
  setCheck(ctx, 'grammar', false);
  assert.equal((ctx.state.get() as Record<string, unknown>).somethingElse, 'keep me');
});
check('an unknown/missing check falls back to on, not undefined', () => {
  const ctx = fakeCtx({ checks: { spelling: false } });
  const checks = getChecks(ctx);
  assert.equal(checks.spelling, false);
  (['grammar', 'wordchoice'] as CheckKey[]).forEach((k) => assert.equal(checks[k], true));
});

if (failures > 0) {
  console.error(`\n${failures} proofreader check(s) failed`);
  process.exit(1);
}
console.log('\nAll proofreader checks passed.');
