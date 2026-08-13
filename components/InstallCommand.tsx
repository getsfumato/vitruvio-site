'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const COMMAND = 'curl -fsSL https://vitruvio.sfumato.sh/install.sh | sh';

type State = 'idle' | 'copied' | 'failed';

/** execCommand path for non-secure contexts and older Safari. */
function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

export default function InstallCommand() {
  const [state, setState] = useState<State>('idle');
  const codeRef = useRef<HTMLElement>(null);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(COMMAND);
      } else if (!legacyCopy(COMMAND)) {
        throw new Error('copy rejected');
      }
      setState('copied');
    } catch {
      setState('failed');
      // leave the command selected so the keyboard shortcut is one step away
      const node = codeRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  const label = state === 'copied' ? 'copied' : state === 'failed' ? 'select it' : 'copy';

  return (
    <section className="install" aria-labelledby="install-label">
      <h2 className="visually-hidden" id="install-label">
        Install vitruvio
      </h2>
      <div className="install__row">
        <code className="install__cmd" ref={codeRef}>
          <span className="install__prompt">$</span> {COMMAND}
        </code>
        <motion.button
          className="copy"
          type="button"
          onClick={copy}
          data-state={state}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {/* the label swaps rather than cross-fades in place, so the width change
              does not make the text jitter mid-transition */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
              style={{ display: 'inline-block' }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      {/* The one caveat worth a line. Which extras exist, how to pin a version, where
          the wheels come from — that is the installer's own header and the guide's
          job; under a page whose whole argument is one command, a footnote is the
          largest block of text on screen. "Brings its own Python" is here because it
          is the question anyone installing a Python tool asks first. */}
      <p className="install__status">macOS &amp; Linux · brings its own Python</p>
    </section>
  );
}
