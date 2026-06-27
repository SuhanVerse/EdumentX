import { Home, Inbox, Bell, User } from 'lucide-react';

type DockTab = 'dashboard' | 'requests' | 'alerts' | 'profile';

interface LandlordDockProps {
  active: DockTab;
  badge?: { tab: DockTab; count: number };
  onNavigate?: (screen: string) => void;
}

const tabToScreen: Record<DockTab, string> = {
  dashboard: 'Dashboard',
  requests: 'VisitRequests',
  alerts: 'Alerts',
  profile: 'Dashboard',
};

export function LandlordDock({ active, badge, onNavigate }: LandlordDockProps) {
  const tabs: { id: DockTab; icon: typeof Home }[] = [
    { id: 'dashboard', icon: Home },
    { id: 'requests', icon: Inbox },
    { id: 'alerts', icon: Bell },
    { id: 'profile', icon: User },
  ];

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 p-2.5 rounded-full"
      style={{
        bottom: '28px',
        background: 'rgba(100, 100, 100, 0.35)',
        backdropFilter: 'blur(7.5px)',
        WebkitBackdropFilter: 'blur(7.5px)',
        border: '0.625px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        const tabBadge = badge?.tab === tab.id ? badge.count : 0;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate?.(tabToScreen[tab.id])}
            className="relative flex items-center justify-center"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '999px',
              background: isActive ? '#0A0A0A' : 'transparent',
            }}
          >
            <Icon size={22} color="#FFFFFF" strokeWidth={1.6} />
            {tabBadge > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: '#E53E3E', padding: '0 5px', border: '2px solid rgba(100,100,100,0.35)' }}
              >
                {tabBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
