import { Calendar as CalendarIcon, User } from 'lucide-react';
import { ScreenShell } from './screen-shell';
import { LandlordDock } from './landlord-dock';

const requests = [
  { id: 1, name: 'Sandeep Khatri', property: '2BHK in Baluwatar', when: 'Tomorrow, 4:00 PM', status: 'Pending', statusColor: '#F5A623', statusBg: '#FEF3DC' },
  { id: 2, name: 'Anita Gurung', property: 'Studio near Patan', when: 'Fri, 11:00 AM', status: 'Pending', statusColor: '#F5A623', statusBg: '#FEF3DC' },
  { id: 3, name: 'Rajan Maharjan', property: '2BHK in Baluwatar', when: 'Sat, 2:30 PM', status: 'Accepted', statusColor: '#1A6B4A', statusBg: '#E8F5EE' },
  { id: 4, name: 'Pooja Shrestha', property: 'Studio near Patan', when: 'Mon, 5:00 PM', status: 'Pending', statusColor: '#F5A623', statusBg: '#FEF3DC' },
];

interface VisitRequestsProps {
  onNavigate?: (screen: string) => void;
}

export function VisitRequests({ onNavigate }: VisitRequestsProps = {}) {
  return (
    <ScreenShell title="Visit Requests">
      <div className="px-5 pt-4 pb-[130px]">
        <div className="flex gap-2 mb-4">
          {['All (8)', 'Pending (6)', 'Accepted (2)'].map((tab, i) => (
            <div
              key={tab}
              className="px-3 py-1.5 rounded-full text-[12px]"
              style={{
                background: i === 0 ? '#0A0A0A' : '#F5F5F5',
                color: i === 0 ? '#FFFFFF' : '#6B6B6B',
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {requests.map((r) => (
            <button
              key={r.id}
              onClick={() => onNavigate?.('RequestDetail')}
              className="w-full text-left rounded-2xl border border-[#E8E8E8] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                    <User size={16} color="#6B6B6B" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">{r.name}</div>
                    <div className="text-[11px] text-[#AAAAAA]">{r.property}</div>
                  </div>
                </div>
                <div
                  className="px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: r.statusBg, color: r.statusColor }}
                >
                  {r.status}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6B6B6B]">
                <CalendarIcon size={12} />
                {r.when}
              </div>
              {r.status === 'Pending' && (
                <div className="mt-3 text-[11px] text-[#0A0A0A] font-semibold">
                  Tap to review →
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <LandlordDock active="requests" badge={{ tab: 'requests', count: 6 }} onNavigate={onNavigate} />
    </ScreenShell>
  );
}
