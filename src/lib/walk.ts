// The rules of the guided walk, as plain functions — no React, no ProseMirror,
// so scripts/proofread.test.ts can exercise them directly (the component around
// them is mostly layout and animation).

/** The buckets an issue can land in. */
export type IssueSource = 'spelling' | 'grammar' | 'wordchoice' | 'clarity';

export const ISSUE_SOURCES: IssueSource[] = ['spelling', 'grammar', 'wordchoice', 'clarity'];

/**
 * LanguageTool's `kind` → the bucket the walk shows it in.
 *
 * `confusion` (quiet/quite, their/there) is deliberately NOT spelling: the word
 * is spelled correctly, so telling the author otherwise is wrong, and offering
 * "add to dictionary" would whitelist a common word and silence the rule for
 * good. It still carries LT's replacement as a one-click fix — the author just
 * gets it labelled as the word-choice suggestion it is, and can Ignore it when
 * the diction was deliberate.
 */
export function sourceFor(kind: string): IssueSource {
  if (kind === 'misspelling') return 'spelling';
  if (kind === 'confusion') return 'wordchoice';
  return 'grammar';
}

/** Stable identity for an issue: survives re-lints, so an ignore sticks. */
export function issueKey(source: IssueSource, text: string, message: string): string {
  return `${source}|${text}|${message}`;
}

/**
 * Read a key back — it carries everything the Ignored drawer needs to render a
 * row, so there is no second store to keep in sync. Split on the first two
 * separators, matching how the key is built, so a '|' inside the message
 * survives the round trip.
 */
export function parseIssueKey(key: string): { source: IssueSource; text: string; message: string } | null {
  const first = key.indexOf('|');
  const second = key.indexOf('|', first + 1);
  if (first < 0 || second < 0) return null;
  const source = key.slice(0, first) as IssueSource;
  if (!ISSUE_SOURCES.includes(source)) return null;
  return { source, text: key.slice(first + 1, second), message: key.slice(second + 1) };
}

/**
 * Where "Continue" resumes after the writer has been editing by hand.
 *
 * The next issue AT OR AFTER the caret — you fixed something, you want to know
 * what's next from here, not to be thrown back to issue 1 somewhere above the
 * fold. Falling back to the last issue before the caret means a fix at the very
 * end of a chapter still lands somewhere real instead of dead-ending the pass.
 */
export function resumeTarget<T extends { from: number | null }>(queue: T[], caret: number): T | null {
  if (queue.length === 0) return null;
  const ahead = queue.find((r) => r.from != null && r.from >= caret);
  if (ahead) return ahead;
  const behind = [...queue].reverse().find((r) => r.from != null);
  return behind ?? queue[0] ?? null;
}
