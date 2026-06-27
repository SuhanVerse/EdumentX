import { MapPin, Phone, Copy, User, CheckCircle2, Info } from 'lucide-react';
import { ScreenShell } from './screen-shell';

interface ShareDetailsProps {
  onNavigate?: (screen: string) => void;
}

export function ShareDetails({ onNavigate }: ShareDetailsProps = {}) {
  return (
    <ScreenShell title="Share Details" showBack>
      <div className="px-5 pt-3 pb-8">
        {/* Accepted banner */}
        <div className="rounded-2xl bg-[#E8F5EE] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1A6B4A] flex items-center justify-center">
            <CheckCircle2 size={16} color="#FFFFFF" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#0A0A0A]">Visit accepted</div>
            <div className="text-[11px] text-[#1A6B4A]">Sandeep Khatri · Tomorrow, 4:00 PM</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="font-['DM_Serif_Display',serif] text-[22px] text-[#0A0A0A] leading-tight">
            Share with Sandeep
          </div>
          <div className="text-[12px] text-[#6B6B6B] mt-1">
            Pick what to send so he can find the place and reach you.
          </div>
        </div>

        {/* Location Card */}
        <div className="mt-5 rounded-2xl bg-white border border-[#E8E8E8] overflow-hidden">
          <div className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8F5EE] flex items-center justify-center shrink-0">
              <MapPin size={16} color="#1A6B4A" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-[#0A0A0A]">Pin location</div>
                <Toggle on />
              </div>
              <div className="text-[11px] text-[#6B6B6B] mt-0.5">Exact GPS pin to the building entrance.</div>
            </div>
          </div>
          {/* Map preview */}
          <div className="mx-4 mb-4 h-[130px] rounded-xl relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, #E8EDE5 0%, #D4DDD0 100%)'
          }}>
            {/* Fake streets */}
            <div className="absolute inset-0">
              <div className="absolute top-1/3 left-0 right-0 h-[6px] bg-white/70" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[6px] bg-white/70" />
              <div className="absolute top-2/3 left-0 right-0 h-[3px] bg-white/50" />
              <div className="absolute left-1/4 top-0 bottom-0 w-[3px] bg-white/50" />
            </div>
            {/* Pin */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-[#0A0A0A] border-[3px] border-white flex items-center justify-center shadow-lg">
                <MapPin size={16} color="#FFFFFF" />
              </div>
              <div className="w-1 h-1 rounded-full bg-[#0A0A0A] mt-0.5" />
            </div>
          </div>
          <div className="px-4 pb-4 text-[11px] text-[#0A0A0A]">
            <div className="font-semibold">Baluwatar Heights, Block B</div>
            <div className="text-[#6B6B6B] mt-0.5">Ward 4, Kathmandu · Behind Saraswati School</div>
          </div>
        </div>

        {/* Contact Card */}
        <div className="mt-3 rounded-2xl bg-white border border-[#E8E8E8] p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8F5EE] flex items-center justify-center shrink-0">
              <Phone size={16} color="#1A6B4A" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-[#0A0A0A]">Contact number</div>
                <Toggle on />
              </div>
              <div className="text-[11px] text-[#6B6B6B] mt-0.5">Tenant can call you to coordinate.</div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-[#FAFAF7] flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#AAAAAA]">Primary number</div>
              <div className="text-[15px] font-semibold text-[#0A0A0A] tracking-wide">+977 98XX-XX1234</div>
            </div>
            <button className="w-8 h-8 rounded-full bg-white border border-[#E8E8E8] flex items-center justify-center">
              <Copy size={13} color="#0A0A0A" />
            </button>
          </div>
          <button className="text-[11px] text-[#0A0A0A] underline underline-offset-2 mt-2.5">
            Use a different number
          </button>
        </div>

        {/* Sharing with */}
        <div className="mt-3 rounded-2xl bg-[#FAFAF7] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F0EDE8] flex items-center justify-center">
            <User size={15} color="#6B6B6B" />
          </div>
          <div className="flex-1 text-[12px] text-[#0A0A0A]">
            Sharing with <span className="font-semibold">Sandeep Khatri</span>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 text-[10px] text-[#888888] leading-relaxed">
          <Info size={11} className="mt-0.5 shrink-0" />
          <span>Details stay private to this tenant for the visit window. You can revoke anytime.</span>
        </div>

        <button
          onClick={() => onNavigate?.('DetailsShared')}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-5"
        >
          Send to Sandeep
        </button>
      </div>
    </ScreenShell>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="w-9 h-[22px] rounded-full p-0.5 transition-colors"
      style={{ background: on ? '#1A6B4A' : '#E8E8E8' }}
    >
      <div
        className="w-[18px] h-[18px] rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? 'translateX(14px)' : 'translateX(0)' }}
      />
    </div>
  );
}
