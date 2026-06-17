import { usePersistentState, useFiasTheme } from '@fias/arche-sdk';

const TIMES = ['8am', '9am', '12pm', '5pm', '8pm', "I'll set this later"];

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
        padding: '72px 24px 120px',
        fontFamily: theme.fonts.body,
        color: '#ffffff',
        position: 'relative',
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

      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden>
          ⏰
        </div>
        <h2 style={{ margin: '16px 0 0', fontSize: 24, fontWeight: 800, color: '#ffffff' }}>One last thing</h2>
        <p style={{ margin: '8px 0 0', fontSize: 16, color: '#ffffff', opacity: 0.7, lineHeight: 1.6 }}>
          When would you like Elevate to check in with you each day?
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
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#0F2554' : '#374151',
                  border: active ? '2px solid #0AAFAA' : '1.5px solid transparent',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.body,
                  boxShadow: active ? '0 0 0 3px rgba(10,175,170,0.15)' : 'none',
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
