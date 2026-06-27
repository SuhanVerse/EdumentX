import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { ScreenShell } from './screen-shell';

interface Props {
  onNavigate?: (screen: string) => void;
}

const reasons = [
  'Already rented out',
  'Tenant profile not a fit',
  'Time does not work',
  'Budget mismatch',
  'Other',
];

export function RequestDeclined({ onNavigate }: Props = {}) {
  const [selected, setSelected] = useState(0);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <ScreenShell title="Request Declined" showBack>
        <div className="px-5 pt-3 pb-8">
          <div className="flex flex-col items-center text-center pt-10">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, #FDECEC 0%, #FAFAF7 70%)' }}
            >
              <div className="w-14 h-14 rounded-full bg-[#E53E3E] flex items-center justify-center">
                <XCircle size={26} color="#FFFFFF" strokeWidth={2.2} />
              </div>
            </div>
            <div className="font-['DM_Serif_Display',serif] text-[24px] text-[#0A0A0A] mt-4 leading-tight">
              Request declined
            </div>
            <div className="text-[12px] text-[#6B6B6B] mt-1 max-w-[280px]">
              Sandeep has been notified politely. The listing stays active for other tenants.
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-[#FAFAF7] p-4">
            <div className="text-[11px] text-[#AAAAAA]">Reason sent</div>
            <div className="text-[13px] text-[#0A0A0A] mt-1">{reasons[selected]}</div>
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

  return (
    <ScreenShell title="Decline Request" showBack>
      <div className="px-5 pt-3 pb-8">
        <div className="rounded-2xl bg-[#FDECEC] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E53E3E] flex items-center justify-center">
            <XCircle size={16} color="#FFFFFF" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#0A0A0A]">Decline this visit?</div>
            <div className="text-[11px] text-[#9B2C2C]">Sandeep will be notified with your reason.</div>
          </div>
        </div>

        <div className="mt-5 text-[11px] text-[#AAAAAA] uppercase tracking-wider mb-2">
          Pick a reason
        </div>
        <div className="rounded-2xl border border-[#E8E8E8] overflow-hidden">
          {reasons.map((r, i) => (
            <button
              key={r}
              onClick={() => setSelected(i)}
              className="w-full h-12 px-4 flex items-center justify-between text-left"
              style={{ borderBottom: i < reasons.length - 1 ? '1px solid #F2F1ED' : 'none' }}
            >
              <div className="text-[13px] text-[#0A0A0A]">{r}</div>
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: selected === i ? '#0A0A0A' : '#DDDDDD' }}
              >
                {selected === i && <div className="w-2 h-2 rounded-full bg-[#0A0A0A]" />}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[#E8E8E8] p-4">
          <div className="text-[11px] text-[#AAAAAA]">Message (optional)</div>
          <div className="text-[12px] text-[#6B6B6B] mt-2">Thanks for your interest — wishing you luck finding the right place.</div>
        </div>

        <button
          onClick={() => setSent(true)}
          className="w-full h-12 rounded-full bg-[#E53E3E] text-white text-[13px] font-semibold mt-6"
        >
          Send decline
        </button>
        <button
          onClick={() => onNavigate?.('RequestDetail')}
          className="w-full h-12 rounded-full border border-[#E8E8E8] text-[13px] text-[#0A0A0A] mt-2"
        >
          Cancel
        </button>
      </div>
    </ScreenShell>
  );
}
