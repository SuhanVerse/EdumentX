import { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { ScreenShell } from './screen-shell';

interface Props {
  onNavigate?: (screen: string) => void;
}

const days = [
  { d: 'Mon', n: 9 },
  { d: 'Tue', n: 10 },
  { d: 'Wed', n: 11 },
  { d: 'Thu', n: 12 },
  { d: 'Fri', n: 13 },
  { d: 'Sat', n: 14 },
];

const times = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];

export function Reschedule({ onNavigate }: Props = {}) {
  const [day, setDay] = useState(2);
  const [time, setTime] = useState(4);

  return (
    <ScreenShell title="Reschedule Visit" showBack>
      <div className="px-5 pt-3 pb-8">
        <div className="rounded-2xl bg-[#FEF3DC] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F5A623] flex items-center justify-center">
            <CalendarIcon size={16} color="#FFFFFF" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#0A0A0A]">Propose a new time</div>
            <div className="text-[11px] text-[#B45309]">Sandeep will be notified to confirm.</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] text-[#AAAAAA] uppercase tracking-wider mb-2">Pick a day</div>
          <div className="flex gap-2 overflow-x-auto">
            {days.map((dd, i) => (
              <button
                key={i}
                onClick={() => setDay(i)}
                className="shrink-0 w-[52px] h-[68px] rounded-2xl flex flex-col items-center justify-center"
                style={{
                  background: day === i ? '#0A0A0A' : '#F5F5F5',
                  color: day === i ? '#FFFFFF' : '#0A0A0A',
                }}
              >
                <div className="text-[10px] opacity-70">{dd.d}</div>
                <div className="text-[18px] font-semibold leading-tight mt-0.5">{dd.n}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] text-[#AAAAAA] uppercase tracking-wider mb-2">Pick a time</div>
          <div className="grid grid-cols-3 gap-2">
            {times.map((t, i) => (
              <button
                key={t}
                onClick={() => setTime(i)}
                className="h-11 rounded-xl text-[12px] flex items-center justify-center gap-1"
                style={{
                  background: time === i ? '#0A0A0A' : '#F5F5F5',
                  color: time === i ? '#FFFFFF' : '#0A0A0A',
                }}
              >
                <Clock size={11} /> {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#E8E8E8] p-4">
          <div className="text-[11px] text-[#AAAAAA]">Note to tenant (optional)</div>
          <div className="text-[12px] text-[#6B6B6B] mt-2">Sorry, I have a conflict at the original time — does {days[day].d} {days[day].n} work?</div>
        </div>

        <button
          onClick={() => onNavigate?.('RescheduleSent')}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-6"
        >
          Send new time
        </button>
      </div>
    </ScreenShell>
  );
}

export function RescheduleSent({ onNavigate }: Props = {}) {
  return (
    <ScreenShell title="Reschedule Sent" showBack>
      <div className="px-5 pt-3 pb-8">
        <div className="flex flex-col items-center text-center pt-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'radial-gradient(circle, #FEF3DC 0%, #FAFAF7 70%)' }}
          >
            <div className="w-14 h-14 rounded-full bg-[#F5A623] flex items-center justify-center">
              <CalendarIcon size={26} color="#FFFFFF" strokeWidth={2.2} />
            </div>
          </div>
          <div className="font-['DM_Serif_Display',serif] text-[24px] text-[#0A0A0A] mt-4 leading-tight">
            New time proposed
          </div>
          <div className="text-[12px] text-[#6B6B6B] mt-1 max-w-[280px]">
            Sandeep will get a notification to confirm Tue, June 10 · 4:00 PM.
          </div>
        </div>

        <div className="mt-7 rounded-2xl bg-white border border-[#E8E8E8] p-4 space-y-3">
          <Row label="Original time" value="Mon, June 9 · 4:00 PM" strike />
          <Row label="New proposal" value="Tue, June 10 · 4:00 PM" highlight />
          <Row label="Status" value="Awaiting tenant" />
        </div>

        <button
          onClick={() => onNavigate?.('VisitRequests')}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-6"
        >
          Back to requests
        </button>
      </div>
    </ScreenShell>
  );
}

function Row({ label, value, strike, highlight }: { label: string; value: string; strike?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11px] text-[#AAAAAA]">{label}</div>
      <div
        className="text-[12px]"
        style={{
          color: highlight ? '#1A6B4A' : '#0A0A0A',
          textDecoration: strike ? 'line-through' : 'none',
          opacity: strike ? 0.5 : 1,
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {value}
      </div>
    </div>
  );
}
