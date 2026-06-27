import { Calendar as CalendarIcon, Eye, CheckCircle2, AlertCircle, Heart } from 'lucide-react';
import { ScreenShell } from './screen-shell';
import { LandlordDock } from './landlord-dock';

const notifications = [
  { id: 1, icon: CalendarIcon, color: '#1A6B4A', bg: '#E8F5EE', title: 'New visit request', body: 'Sandeep Khatri wants to visit 2BHK in Baluwatar tomorrow at 4:00 PM.', time: '2m ago', unread: true },
  { id: 2, icon: Heart, color: '#3B82F6', bg: '#DBEAFE', title: 'Listing saved', body: 'Anita Gurung saved your Studio near Patan listing.', time: '1h ago', unread: true },
  { id: 3, icon: Eye, color: '#F5A623', bg: '#FEF3DC', title: 'Listing trending', body: 'Your 2BHK in Baluwatar got 42 views in the last 24 hours.', time: '3h ago', unread: true },
  { id: 4, icon: CheckCircle2, color: '#1A6B4A', bg: '#E8F5EE', title: 'KYC verified', body: 'Your KYC documents have been approved.', time: 'Yesterday', unread: false },
  { id: 5, icon: AlertCircle, color: '#F5A623', bg: '#FEF3DC', title: 'Listing expiring soon', body: 'Studio near Patan expires in 5 days. Renew to keep it active.', time: '2d ago', unread: false },
];

interface AlertsProps {
  onNavigate?: (screen: string) => void;
}

export function Alerts({ onNavigate }: AlertsProps = {}) {
  return (
    <ScreenShell
      title="Alerts"
      rightSlot={
        <button className="text-[12px] text-[#1A6B4A] font-semibold">Mark all read</button>
      }
    >
      <div className="pt-2 pb-[120px]">
        {notifications.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              className="px-5 py-3 flex gap-3"
              style={{
                borderBottom: '1px solid #F0F0F0',
                background: n.unread ? '#FAFAF7' : 'transparent',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: n.bg }}
              >
                <Icon size={16} color={n.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-semibold text-[#0A0A0A]">{n.title}</div>
                  {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-[#1A6B4A]" />}
                </div>
                <div className="text-[11px] text-[#6B6B6B] mt-0.5 leading-relaxed">{n.body}</div>
                <div className="text-[10px] text-[#AAAAAA] mt-1">{n.time}</div>
              </div>
            </div>
          );
        })}
      </div>
      <LandlordDock active="alerts" onNavigate={onNavigate} />
    </ScreenShell>
  );
}
