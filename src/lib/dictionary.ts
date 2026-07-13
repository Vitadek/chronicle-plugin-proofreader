import type { PluginServices } from '@chronicle/plugin-api';

/**
 * The custom spelling dictionary.
 *
 * Deliberately the SAME settings key the Grammar Check plugin uses: a word you
 * add here stops being flagged in the normal editor too. The key is the contract
 * between the two plugins.
 */
export const DICTIONARY_KEY = 'dictionary';

function load(services: PluginServices): string[] {
  try {
    const raw = services.settings.get(DICTIONARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((w) => typeof w === 'string') : [];
  } catch {
    return [];
  }
}
const save = (s: PluginServices, w: string[]) => s.settings.set(DICTIONARY_KEY, JSON.stringify(w));

export const getDictionary = (s: PluginServices) => new Set(load(s).map((w) => w.toLowerCase()));
export const listWords = (s: PluginServices) => load(s).sort((a, b) => a.localeCompare(b));

export function addWord(s: PluginServices, word: string): void {
  const w = word.trim();
  if (!w) return;
  const words = load(s);
  if (words.some((x) => x.toLowerCase() === w.toLowerCase())) return;
  words.push(w);
  save(s, words);
}
export function removeWord(s: PluginServices, word: string): void {
  save(s, load(s).filter((x) => x.toLowerCase() !== word.toLowerCase()));
}
