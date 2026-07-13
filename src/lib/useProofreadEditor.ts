import { useEditor } from '@tiptap/react';
import type { PluginContext } from '@chronicle/plugin-api';
import { Grammar, type GrammarMark } from './Grammar';
import { ProofreadHighlight } from './ProofreadHighlight';
import { AiGrammar } from './AiGrammarMarks';

interface Options {
  ctx: PluginContext;
  content: string;
  onUpdate: (html: string) => void;
  onGrammarMarks: (marks: GrammarMark[], reason?: 'lint' | 'cleared') => void;
  getDictionary: () => Set<string>;
}

/**
 * The editor the Proofread view drives.
 *
 * Built through `ctx.services.editor.createEditorOptions`, which merges the
 * app's core extensions — the manuscript SCHEMA — in for us and appends ours.
 *
 * This is not a stylistic preference. Chapter content is stored as HTML, and
 * TipTap parses it against whatever schema the registered extensions define,
 * SILENTLY DROPPING anything it has no parse rule for. An editor built from bare
 * StarterKit would quietly delete every inline comment and audio marker in the
 * chapter on load — and this view autosaves, so the loss would be written back
 * over the author's work with no error shown. Going through the host also means
 * we inherit any mark Chronicle adds later, instead of rotting against a copy.
 */
export function useProofreadEditor({ ctx, content, onUpdate, onGrammarMarks, getDictionary }: Options) {
  return useEditor(
    ctx.services.editor.createEditorOptions({
      content,
      placeholder: ' ',
      onUpdate,
      extensions: [
        Grammar.configure({
          enabled: true,
          lint: (text: string) => ctx.services.grammar.lint(text),
          getDictionary,
          onMarks: onGrammarMarks,
        }),
        ProofreadHighlight,
        AiGrammar,
      ],
      attributes: {
        class: 'novel-editor-content focus:outline-none min-h-[300px]',
        // LanguageTool is the only checker in this view; the OS spellchecker
        // can't see our custom dictionary, so its squiggles would be noise.
        spellcheck: 'false',
      },
    }) as Parameters<typeof useEditor>[0],
  );
}
