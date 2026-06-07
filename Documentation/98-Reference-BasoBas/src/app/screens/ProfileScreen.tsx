import {
  Heart,
  Calendar,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Settings,
  CreditCard,
} from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const MENU = [
  { Icon: Heart, label: 'Saved properties', value: '12' },
  { Icon: Calendar, label: 'Visit history', value: '5' },
  { Icon: CreditCard, label: 'Payment methods', value: 'Visa •• 4242' },
  { Icon: Bell, label: 'Notifications', value: 'On' },
  { Icon: Lock, label: 'Privacy & security' },
  { Icon: HelpCircle, label: 'Help center' },
];

export function ProfileScreen({}: { onBack: () => void }) {
  return (
    <div className="h-full flex flex-col" style={{ background: '#FAFAF8' }}>
      <StatusBar />

      <div className="px-6 pt-2 pb-2 flex items-center justify-between">
        <h1 style={{ fontSize: 22 }}>Profile</h1>
        <button
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: '#FFFFFF',
            border: '1px solid #ECECE8',
          }}
        >
          <Settings size={18} strokeWidth={2.2} color="#0F1114" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-32">
        <div
          className="mt-4 p-5 flex items-center gap-4"
          style={{ background: '#0F1114', color: '#FFFFFF', borderRadius: 24 }}
        >
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"
            alt="Roman"
            className="object-cover"
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              border: '2px solid rgba(255,255,255,0.15)',
            }}
          />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Roman Cole</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>roman.cole@mail.com</div>
          </div>
          <button
            style={{
              background: '#FFFFFF',
              color: '#0F1114',
              paddingInline: 14,
              height: 36,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Edit
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <Stat label="Saved" value="12" />
          <Stat label="Visits" value="5" />
          <Stat label="Reviews" value="8" />
        </div>

        <div
          className="mt-5"
          style={{
            background: '#FFFFFF',
            border: '1px solid #ECECE8',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {MENU.map(({ Icon, label, value }, i) => (
            <button
              key={label}
              className="w-full flex items-center gap-4 px-4"
              style={{
                height: 60,
                borderBottom: i < MENU.length - 1 ? '1px solid #F4F4F1' : 'none',
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 36, height: 36, borderRadius: 12, background: '#F4F4F1' }}
              >
                <Icon size={16} strokeWidth={2.2} color="#0F1114" />
              </div>
              <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#0F1114' }}>
                {label}
              </span>
              {value && (
                <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{value}</span>
              )}
              <ChevronRight size={16} strokeWidth={2.4} color="#9CA3AF" />
            </button>
          ))}
        </div>

        <button
          className="w-full mt-4 flex items-center justify-center gap-2"
          style={{
            height: 54,
            background: '#FFFFFF',
            border: '1px solid #ECECE8',
            borderRadius: 999,
            color: '#E84545',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <LogOut size={16} strokeWidth={2.4} />
          Log out
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 text-center"
      style={{ background: '#FFFFFF', border: '1px solid #ECECE8', borderRadius: 18 }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 700,
          color: '#0F1114',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{label}</div>
    </div>
  );
}
