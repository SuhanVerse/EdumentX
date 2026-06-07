import { Home, Heart, Map, User } from 'lucide-react';

type Tab = 'home' | 'visits' | 'map' | 'profile' | 'notifications';

const ITEMS: { key: Tab; label: string; Icon: typeof Home }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'visits', label: 'Saved', Icon: Heart },
  { key: 'map', label: 'Map', Icon: Map },
  { key: 'profile', label: 'Profile', Icon: User },
];

export function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (t: string) => void;
}) {
  return (
    <div className="absolute left-0 right-0 bottom-0 pb-5 pointer-events-none">
      <div className="px-6 flex justify-center">
        <div
          className="pointer-events-auto flex items-center gap-1 px-2 py-2"
          style={{
            background: '#0F1114',
            borderRadius: 999,
            boxShadow: '0 18px 40px rgba(15,17,20,0.35), 0 4px 12px rgba(15,17,20,0.25)',
          }}
        >
          {ITEMS.map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className="flex items-center gap-2 transition-all"
                style={{
                  height: 48,
                  paddingInline: active ? 18 : 14,
                  borderRadius: 999,
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0F1114' : '#9CA3AF',
                }}
                aria-label={label}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {active && (
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
