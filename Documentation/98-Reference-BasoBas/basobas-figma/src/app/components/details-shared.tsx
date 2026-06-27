import { CheckCircle2, MapPin, Phone, Calendar as CalendarIcon, X } from 'lucide-react';
import { ScreenShell } from './screen-shell';

export function DetailsShared() {
  return (
    <ScreenShell title="Visit Accepted" showBack>
      <div className="px-5 pt-3 pb-8">
        {/* Success */}
        <div className="flex flex-col items-center text-center pt-6">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, #E8F5EE 0%, #FAFAF7 70%)' }}
            >
              <div className="w-14 h-14 rounded-full bg-[#1A6B4A] flex items-center justify-center">
                <CheckCircle2 size={28} color="#FFFFFF" strokeWidth={2.2} />
              </div>
            </div>
          </div>
          <div className="font-['DM_Serif_Display',serif] text-[24px] text-[#0A0A0A] mt-4 leading-tight">
            Details sent to Sandeep
          </div>
          <div className="text-[12px] text-[#6B6B6B] mt-1 max-w-[280px]">
            He'll get a notification with your pin location and contact number.
          </div>
        </div>

        {/* Summary card */}
        <div className="mt-7 rounded-2xl bg-white border border-[#E8E8E8] overflow-hidden">
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid #F2F1ED' }}>
            <div className="w-10 h-10 rounded-full bg-[#F0EDE8]" />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[#0A0A0A]">Sandeep Khatri</div>
              <div className="text-[11px] text-[#1A6B4A]">Verified Tenant</div>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[#E8F5EE] text-[#1A6B4A] font-semibold">
              ACCEPTED
            </div>
          </div>

          <div className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid #F2F1ED' }}>
            <CalendarIcon size={15} color="#6B6B6B" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] text-[#AAAAAA]">Visit time</div>
              <div className="text-[13px] text-[#0A0A0A]">Tomorrow, June 9 · 4:00 PM</div>
            </div>
          </div>

          <div className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid #F2F1ED' }}>
            <MapPin size={15} color="#6B6B6B" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] text-[#AAAAAA]">Pin location shared</div>
              <div className="text-[13px] text-[#0A0A0A]">Baluwatar Heights, Block B</div>
            </div>
            <div className="text-[10px] text-[#1A6B4A] font-semibold mt-1">ON</div>
          </div>

          <div className="px-4 py-3 flex items-start gap-3">
            <Phone size={15} color="#6B6B6B" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] text-[#AAAAAA]">Contact shared</div>
              <div className="text-[13px] text-[#0A0A0A] tracking-wide">+977 98XX-XX1234</div>
            </div>
            <div className="text-[10px] text-[#1A6B4A] font-semibold mt-1">ON</div>
          </div>
        </div>

        {/* Revoke */}
        <button className="w-full h-12 rounded-2xl border border-[#E8E8E8] mt-4 flex items-center justify-center gap-2 text-[12px] text-[#E53E3E]">
          <X size={14} />
          Revoke shared details
        </button>

        <button className="w-full h-12 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold mt-3">
          Done
        </button>
      </div>
    </ScreenShell>
  );
}
