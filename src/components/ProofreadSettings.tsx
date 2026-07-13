// The Proofreader's section inside Global Settings (the `settingsPanel` slot).
//
// Only holds what is genuinely GLOBAL — which checks run at all. Two related
// things deliberately live elsewhere, next to the work they belong to:
//
//   · the custom dictionary  → the Dictionary drawer inside the Proofreader
//   · ignored issues         → the Ignored drawer, per book and chapter
//
// A toggle here is a permanent "never bother me with this class of thing";
// ignoring an issue in the walk is "not this passage". Keeping them apart is
// what stops the writer from reaching for the wrong one.

import React, { useState } from 'react';
import type { PluginContext } from '@chronicle/plugin-api';
import { cn } from '../lib/utils';
import { CHECK_META, getChecks, setCheck, type CheckKey } from '../lib/prefs';

export const ProofreadSettings: React.FC<PluginContext> = (ctx) => {
  const [checks, setChecks] = useState(() => getChecks(ctx));

  const toggle = (key: CheckKey) => {
    const next = !checks[key];
    setCheck(ctx, key, next);
    setChecks((prev) => ({ ...prev, [key]: next }));
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed opacity-50">
        Which checks the guided pass includes. Switching one off hides it from the
        walk and the issue list everywhere — for a single passage you meant to
        write that way, use <span className="font-bold">Ignore</span> in the walk
        instead (reversible from the Proofreader’s Ignored drawer).
      </p>

      <div className="space-y-2">
        {(Object.keys(CHECK_META) as CheckKey[]).map((key) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="w-full flex items-start gap-3 text-left p-3 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
            role="switch"
            aria-checked={checks[key]}
          >
            <span
              className={cn(
                'mt-0.5 relative w-9 h-5 rounded-full shrink-0 transition-colors',
                checks[key] ? 'bg-blue-500' : 'bg-black/15 dark:bg-white/20',
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                  checks[key] ? 'left-5' : 'left-1',
                )}
              />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold">{CHECK_META[key].label}</span>
              <span className="block text-[10px] leading-relaxed opacity-50">{CHECK_META[key].hint}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed opacity-40">
        The AI clarity pass is not listed: it never runs on its own, only when you
        press <span className="font-bold">Run clarity pass</span> inside the
        Proofreader.
      </p>
    </div>
  );
};
