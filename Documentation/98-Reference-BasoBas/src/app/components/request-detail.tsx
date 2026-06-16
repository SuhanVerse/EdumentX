import { Calendar as CalendarIcon, MapPin, User, CheckCircle2 } from 'lucide-react';
import { ScreenShell } from './screen-shell';

interface RequestDetailProps {
  onNavigate?: (screen: string) => void;
}

export function RequestDetail({ onNavigate }: RequestDetailProps = {}) {
  return (
    <ScreenShell title="Visit Request" showBack>
      <div className="px-5 pt-4 pb-8">
        {/* Applicant Card */}
        <div className="rounded-2xl bg-[#F5F5F5] p-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#F0EDE8] flex items-center justify-center">
            <User size={24} color="#6B6B6B" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <div className="text-[16px] font-semibold text-[#0A0A0A]">Sandeep Khatri</div>
              <CheckCircle2 size={13} color="#1A6B4A" />
            </div>
            <div className="text-[11px] text-[#1A6B4A] mt-0.5">Verified Tenant</div>
            <div className="text-[11px] text-[#AAAAAA] mt-0.5">Member since Mar 2025</div>
          </div>
        </div>

        {/* Property */}
        <div className="mt-4 rounded-2xl border border-[#E8E8E8] p-3 flex gap-3">
          <div className="w-16 h-16 rounded-xl bg-[#F0EDE8]" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#0A0A0A]">2BHK in Baluwatar</div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} color="#AAAAAA" />
              <div className="text-[10px] text-[#AAAAAA]">Baluwatar, Kathmandu</div>
            </div>
            <div className="text-[12px] font-semibold text-[#1A6B4A] mt-1">NPR 28,000/mo</div>
          </div>
        </div>

        {/* Visit Details */}
        <div className="mt-5">
          <div className="text-[13px] font-semibold text-[#0A0A0A] mb-2">Visit Details</div>
          <div className="rounded-2xl border border-[#E8E8E8] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <CalendarIcon size={16} color="#6B6B6B" />
              <div>
                <div className="text-[12px] text-[#AAAAAA]">Requested Date</div>
                <div className="text-[13px] text-[#0A0A0A]">Tomorrow, June 9 · 4:00 PM</div>
              </div>
            </div>
            <div className="pt-3 border-t border-[#F0F0F0]">
              <div className="text-[11px] text-[#AAAAAA] mb-1">Note from tenant</div>
              <div className="text-[12px] text-[#0A0A0A] leading-relaxed">
                "Relocating from Pokhara for a new job. Looking to move in by July 1st. Would prefer an afternoon visit."
              </div>
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Move-in', value: 'Jul 1' },
            { label: 'Budget', value: '30k' },
            { label: 'Tenure', value: '12 mo' },
          ].map((s) => (
            <div key={s.label} className="bg-[#F5F5F5] rounded-xl p-3">
              <div className="text-[10px] text-[#AAAAAA]">{s.label}</div>
              <div className="text-[14px] font-semibold text-[#0A0A0A] mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2 mt-6">
          <button
            onClick={() => onNavigate?.('ShareDetails')}
            className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold"
          >
            Accept Visit
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate?.('Reschedule')}
              className="flex-1 h-12 rounded-full border border-[#E8E8E8] text-[13px] text-[#0A0A0A]"
            >
              Reschedule
            </button>
            <button
              onClick={() => onNavigate?.('RequestDeclined')}
              className="flex-1 h-12 rounded-full border border-[#E8E8E8] text-[13px] text-[#E53E3E]"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
