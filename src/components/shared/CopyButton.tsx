import { useEffect, useRef, useState } from 'react';

/**
 * Copies `text` to the clipboard and shows "Copied ✓" for two seconds.
 * Uses the async Clipboard API where available, with an execCommand
 * fallback for older devices / non-secure contexts.
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied ✓',
  darkMode = false,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  darkMode?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function fallbackCopy(value: string): boolean {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleCopy() {
    let ok = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = fallbackCopy(text);
      }
    } catch {
      ok = fallbackCopy(text);
    }

    if (!ok) return;

    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  const border = darkMode ? 'rgba(255,255,255,0.3)' : '#E5E7EB';
  const fg = copied ? '#0AAFAA' : darkMode ? '#F8FAFF' : '#0F2554';

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 999,
        border: `1px solid ${copied ? '#0AAFAA' : border}`,
        background: copied ? 'rgba(10,175,170,0.10)' : 'transparent',
        color: fg,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'color 200ms ease, border-color 200ms ease, background 200ms ease',
      }}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
