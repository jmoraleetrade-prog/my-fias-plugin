import { useEffect, useRef, useState } from 'react';
import { CONTACT_EMAIL } from '../../utils/elevate';

/**
 * The ⚙️ menu pinned to the top-right of every navy header. Opens a small
 * dropdown with four items: Settings, Help and FAQs, Privacy Policy, Contact
 * Us (mailto). Closes on outside tap or item selection. Teal icons, white text.
 */
export function SettingsDropdown({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const items: { icon: string; label: string; action: () => void }[] = [
    { icon: '⚙️', label: 'Settings', action: () => onNavigate?.('settings') },
    { icon: '❓', label: 'Help and FAQs', action: () => onNavigate?.('help') },
    { icon: '🔒', label: 'Privacy Policy', action: () => onNavigate?.('privacy') },
    {
      icon: '✉️',
      label: 'Contact Us',
      action: () => {
        window.location.href = `mailto:${CONTACT_EMAIL}`;
      },
    },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Settings menu"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          fontSize: 20,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 0,
          width: 44,
          height: 44,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        ⚙️
      </button>

      {open ? (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            minWidth: 200,
            background: '#0F2554',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14,
            boxShadow: '0 12px 30px rgba(15,37,84,0.4)',
            overflow: 'hidden',
            zIndex: 60,
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.action();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                minHeight: 44,
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ color: '#0AAFAA', fontSize: 16 }} aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
