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
            className="w-full flex items-start gap-3 text-left p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            role="switch"
            aria-checked={checks[key]}
          >
            {/* Geometry in INLINE STYLES, deliberately.
                Tailwind never scans plugin source, so a utility class only
                exists at runtime if the app itself happens to use it. `w-9`
                doesn't — so this track rendered with height and NO width, and
                the absolutely-positioned knob landed on top of the label. A
                plugin cannot safely reach for an arbitrary class; anything
                load-bearing has to be inline (or verified present in the app's
                stylesheet). */}
            <span
              style={{
                width: 36,
                height: 20,
                position: 'relative',
                display: 'block',
                flexShrink: 0,
                marginTop: 2,
                borderRadius: 999,
                // Colours inline too: `bg-black/25` and `bg-white/25` are not in
                // the app's stylesheet either, so an off toggle would have had
                // no track at all. Mid-grey reads on both themes without the
                // plugin needing to know which one is active.
                backgroundColor: checks[key] ? '#3b82f6' : 'rgba(128,128,128,0.4)',
                transition: 'background-color 150ms ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  left: checks[key] ? 20 : 4,
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: '#fff',
                  transition: 'left 150ms ease',
                }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">{CHECK_META[key].label}</span>
              <span className="block text-[10px] leading-relaxed opacity-60">{CHECK_META[key].hint}</span>
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
