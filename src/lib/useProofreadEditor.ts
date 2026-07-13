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
 * CRITICAL: it is built on `ctx.services.editor.coreExtensions()` — the app's
 * own extension set. Building from a different set would give a different
 * schema, and TipTap silently drops marks it doesn't recognise, so saving back
 * would erase the author's comments, audio marks and scene breaks.
 *
 * On top of that schema it layers the checkers this view needs.
 */
export function useProofreadEditor({ ctx, content, onUpdate, onGrammarMarks, getDictionary }: Options) {
  return useEditor({
    extensions: [
      ...ctx.services.editor.coreExtensions({ placeholder: ' ' }),
      Grammar.configure({
        enabled: true,
        lint: (text: string) => ctx.services.grammar.lint(text),
        getDictionary,
        onMarks: onGrammarMarks,
      }),
      ProofreadHighlight,
      AiGrammar,
    ],
    content,
    onUpdate: ({ editor }) => onUpdate(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'novel-editor-content focus:outline-none min-h-[300px]',
        // LanguageTool is the only checker in this view; the OS spellchecker
        // can't see our custom dictionary, so its squiggles would be noise.
        spellcheck: 'false',
      },
    },
  });
}
