import { useFiasTheme } from '@fias/arche-sdk';

const TOOLS = [
  { emoji: '📄', name: 'CV Analysis', description: 'Optimize every section' },
  { emoji: '🎯', name: 'Job Match', description: 'Find aligned roles' },
  { emoji: '🎤', name: 'Interview Prep', description: 'Practice with AI' },
  { emoji: '🗺️', name: 'Career Planning', description: 'Plan 90 days ahead' },
  { emoji: '💼', name: 'LinkedIn Optimiser', description: 'Impress recruiters' },
  { emoji: '💰', name: 'Salary Negotiation', description: 'Earn what you deserve' },
  { emoji: '🏆', name: 'Achievements', description: 'Track your wins' },
  { emoji: '📈', name: 'Progress', description: 'See your momentum' },
];

const NAV_ITEMS = [
  { label: 'Home', icon: '🏠', active: false },
  { label: 'CV', icon: '📄', active: false },
  { label: 'Track', icon: '🎯', active: true },
  { label: 'Interview', icon: '🎤', active: false },
  { label: 'Progress', icon: '📈', active: false },
];

export function Dashboard({ userName, onReset }: { userName: string; onReset: () => void }) {
  const theme = useFiasTheme();
  if (!theme) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = userName ? userName.split(' ')[0] : 'there';
  const velocityScore = 78;
  const velocityBand = 'Confidence Band';

  return (
    <div style={{ minHeight: '100vh', width: '100%', paddingBottom: 100, backgroundColor: '#ffffff', fontFamily: theme.fonts.body }}
    >
      {/* NAVY HEADER SECTION */}
      <div style={{ background: '#0F2554', color: '#ffffff', padding: '32px 20px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <h1 style={{ margin: 0, fontFamily: theme.fonts.heading, fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
                {greeting}, {displayName} 👋
              </h1>
              <p style={{ margin: 0, fontSize: 15, opacity: 0.85, lineHeight: 1.6 }}>Job hunting — Stay focused on landing the role</p>
            </div>
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          {/* CAREER VELOCITY PROGRESS BAR */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.85 }}>
                Career Velocity
              </label>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.15)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${velocityScore}%`,
                    background: 'linear-gradient(90deg, #0AAFAA, #06B6D4)',
                    borderRadius: 999,
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ opacity: 0.75 }}>{velocityScore} — {velocityBand}</span>
              <span style={{ fontWeight: 700 }}>{velocityScore}%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px' }}>
        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'CV Score', value: '8.2', unit: '/10' },
            { label: 'Applications', value: '12', unit: 'active' },
            { label: 'Interviews', value: '3', unit: 'scheduled' },
            { label: 'Streak', value: '14', unit: 'days' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #F3F4F6',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'grid',
                gap: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.label}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{stat.value}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* TOOLS SECTION */}
        <section style={{ marginBottom: 36 }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0AAFAA' }}>
            YOUR TOOLKIT
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {TOOLS.map((tool) => (
              <button
                key={tool.name}
                type="button"
                style={{
                  borderRadius: 16,
                  border: '1px solid #F3F4F6',
                  background: '#ffffff',
                  padding: '20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease',
                  display: 'grid',
                  gap: 12,
                }}
                onMouseEnter={(event) => {
                  (event.currentTarget as HTMLButtonElement).style.borderColor = '#0AAFAA';
                  (event.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 16px rgba(10,175,170,0.12)';
                  (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(event) => {
                  (event.currentTarget as HTMLButtonElement).style.borderColor = '#F3F4F6';
                  (event.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  (event.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: 24 }}>{tool.emoji}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{tool.name}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>{tool.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* PRIORITY ACTION CARD */}
        <section
          style={{
            borderRadius: 20,
            background: '#ffffff',
            border: '1px solid #F3F4F6',
            borderLeft: '4px solid #0AAFAA',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'grid',
            gap: 14,
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0AAFAA' }}>
              PRIORITY RIGHT NOW
            </p>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              Update your target role profile today
            </h2>
          </div>
          <button
            type="button"
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #0AAFAA, #06B6D4)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(10,175,170,0.24)',
              whiteSpace: 'nowrap',
            }}
          >
            Take action
          </button>
        </section>
      </div>

      {/* FIXED BOTTOM NAV */}
      <nav
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#ffffff',
          borderTop: '1px solid #F3F4F6',
          boxShadow: '0 -4px 12px rgba(15,23,42,0.06)',
          zIndex: 30,
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 20px', display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '12px 8px',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                gap: 6,
                color: item.active ? '#0AAFAA' : '#6B7280',
                fontWeight: item.active ? 700 : 600,
                fontSize: 12,
                transition: 'color 200ms ease',
              }}
            >
              <div style={{ fontSize: 20 }}>{item.icon}</div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
