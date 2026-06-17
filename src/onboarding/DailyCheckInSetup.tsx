import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';

const TIMES = [
  '7am — morning boost',
  '8am — before work',
  '12pm — lunchtime',
  '6pm — after work',
  '8pm — evening',
  'No thanks',
];

export function DailyCheckInSetup({
  onNext,
  onHome,
  onBack,
}: {
  onNext: () => void;
  onHome: () => void;
  onBack: () => void;
  onReset?: () => void;
}) {
  const theme = useFiasTheme();
  const [selectedTime, setSelectedTime] = usePersistentState<string | null>('daily-checkin-time', null);

  if (!theme) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0F2554',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 24px 120px',
        fontFamily: theme.fonts.body,
        color: '#ffffff',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 50,
          padding: '6px 14px',
          fontSize: 13,
          color: '#ffffff',
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onHome}
        aria-label="Home"
        style={{ position: 'absolute', top: 14, right: 16, background: 'transparent', border: 'none', color: '#ffffff', fontSize: 20, cursor: 'pointer' }}
      >
        🏠
      </button>

      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden>
          ⏰
        </div>
        <h2 style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
          When do you want Elevate to check in with you?
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          A quick daily check-in keeps your momentum going
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 28 }}>
          {TIMES.map((time) => {
            const active = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                onClick={() => setSelectedTime(time)}
                style={{
                  background: active ? 'linear-gradient(135deg, #f0fffe, #e6faf9)' : '#ffffff',
                  borderRadius: 14,
                  padding: '16px 12px',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: active ? 700 : 600,
                  color: active ? '#0F2554' : '#374151',
                  border: active ? '2px solid #0AAFAA' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.body,
                  boxShadow: active ? '0 0 0 4px rgba(10,175,170,0.18)' : '0 1px 3px rgba(0,0,0,0.12)',
                  transition: 'all 200ms ease',
                }}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', zIndex: 25 }}>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedTime}
          style={{
            width: '100%',
            maxWidth: 460,
            display: 'block',
            margin: '0 auto',
            height: 54,
            background: 'linear-gradient(135deg, #0AAFAA, #0891B2)',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 50,
            border: 'none',
            cursor: selectedTime ? 'pointer' : 'not-allowed',
            opacity: selectedTime ? 1 : 0.55,
            boxShadow: '0 4px 20px rgba(10,175,170,0.35)',
            transition: 'opacity 200ms ease',
          }}
        >
          {selectedTime ? 'Continue' : 'Choose a time'}
        </button>
      </div>
    </div>
  );
}
