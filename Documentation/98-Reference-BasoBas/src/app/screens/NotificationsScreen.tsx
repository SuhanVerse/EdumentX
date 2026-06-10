import { ArrowLeft, Calendar, Tag, MessageSquare, Home } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';

type Notif = {
  id: string;
  icon: 'visit' | 'price' | 'message' | 'listing';
  title: string;
  body: string;
  time: string;
  unread?: boolean;
};

const NOTIFS: Notif[] = [
  {
    id: '1',
    icon: 'visit',
    title: 'Visit confirmed',
    body: 'Your tour at Oakridge Residence is set for Fri, May 14 at 10:30 AM.',
    time: '2m ago',
    unread: true,
  },
  {
    id: '2',
    icon: 'price',
    title: 'Price drop',
    body: 'Maple Hollow just dropped by 20%. Now $19.4k / month.',
    time: '1h ago',
    unread: true,
  },
  {
    id: '3',
    icon: 'message',
    title: 'Abdur Rob replied',
    body: '"Happy to walk you through the lease terms before Friday."',
    time: 'Yesterday',
  },
  {
    id: '4',
    icon: 'listing',
    title: 'New near you',
    body: '3 new listings in New York City matching your filters.',
    time: '2d ago',
  },
];

const ICON_MAP = {
  visit: Calendar,
  price: Tag,
  message: MessageSquare,
  listing: Home,
};

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-full flex flex-col" style={{ background: '#FAFAF8' }}>
      <StatusBar />

      <div className="px-6 pt-2 pb-5 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: '#FFFFFF',
            border: '1px solid #ECECE8',
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.4} color="#0F1114" />
        </button>
        <h1 style={{ fontSize: 22 }}>Notifications</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-32 flex flex-col gap-3">
        {NOTIFS.map((n) => {
          const Icon = ICON_MAP[n.icon];
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 p-4"
              style={{
                background: '#FFFFFF',
                border: '1px solid #ECECE8',
                borderRadius: 20,
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: n.unread ? '#0F1114' : '#F4F4F1',
                  color: n.unread ? '#FFFFFF' : '#0F1114',
                }}
              >
                <Icon size={18} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1114' }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{n.time}</div>
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{n.body}</p>
              </div>
              {n.unread && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: '#E84545',
                    marginTop: 6,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
