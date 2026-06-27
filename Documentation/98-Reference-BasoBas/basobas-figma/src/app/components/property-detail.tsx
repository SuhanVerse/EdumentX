import { ChevronLeft, Edit3, Share2, MapPin, Eye, Heart, MessageSquare } from 'lucide-react';

interface PropertyDetailProps {
  onNavigate?: (screen: string) => void;
}

export function PropertyDetail({ onNavigate }: PropertyDetailProps = {}) {
  return (
    <div
      className="relative bg-white overflow-hidden"
      style={{ width: '390px', height: '844px', fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="overflow-y-auto" style={{ height: '844px' }}>
        {/* Hero image */}
        <div className="relative h-[320px] bg-gradient-to-br from-[#2C3830] to-[#1E2923]">
          <button className="absolute top-3 left-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center backdrop-blur">
            <ChevronLeft size={20} color="#0A0A0A" />
          </button>
          <div className="absolute top-3 right-4 flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center backdrop-blur">
              <Share2 size={16} color="#0A0A0A" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center backdrop-blur">
              <Edit3 size={16} color="#0A0A0A" />
            </button>
          </div>
          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/50 text-white text-[11px] backdrop-blur">
            1 / 8
          </div>
          <div className="absolute bottom-3 left-4 px-2 py-1 rounded-full bg-[#1A6B4A] text-white text-[10px] font-semibold">
            ACTIVE
          </div>
        </div>

        <div className="px-5 pt-4 pb-8">
          <div className="text-[20px] font-semibold text-[#0A0A0A] leading-tight">
            2BHK Apartment in Baluwatar
          </div>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} color="#AAAAAA" />
            <div className="text-[12px] text-[#AAAAAA]">Baluwatar, Kathmandu</div>
          </div>
          <div className="text-[22px] font-semibold text-[#1A6B4A] mt-3 font-['DM_Serif_Display',serif]">
            NPR 28,000<span className="text-[12px] text-[#6B6B6B]">/month</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { icon: Eye, value: '124', label: 'Views', screen: undefined },
              { icon: Heart, value: '32', label: 'Saved', screen: 'AllApplicants' },
              { icon: MessageSquare, value: '8', label: 'Requests', screen: 'VisitRequests' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => s.screen && onNavigate?.(s.screen)}
                  className="bg-[#F5F5F5] rounded-xl p-3 text-center"
                >
                  <Icon size={14} color="#6B6B6B" className="mx-auto" />
                  <div className="text-[16px] font-semibold text-[#0A0A0A] mt-1">{s.value}</div>
                  <div className="text-[10px] text-[#AAAAAA]">{s.label}</div>
                </button>
              );
            })}
          </div>

          {/* Features */}
          <div className="mt-5">
            <div className="text-[14px] font-semibold text-[#0A0A0A] mb-2">Features</div>
            <div className="flex flex-wrap gap-2">
              {['2 Bedrooms', '1 Bathroom', '850 sqft', 'Parking', 'Furnished', 'Water Tank'].map((f) => (
                <div key={f} className="px-3 py-1.5 rounded-full bg-[#F5F5F5] text-[11px] text-[#0A0A0A]">
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mt-5">
            <div className="text-[14px] font-semibold text-[#0A0A0A] mb-2">Description</div>
            <div className="text-[12px] text-[#6B6B6B] leading-relaxed">
              Modern 2BHK apartment in the heart of Baluwatar. Recently renovated with quality fittings.
              Walking distance to schools, hospitals, and shopping centers. Quiet neighborhood with 24/7 water supply.
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-6">
            <button className="flex-1 h-12 rounded-full border border-[#E8E8E8] text-[13px] font-semibold text-[#0A0A0A]">
              Pause Listing
            </button>
            <button
              onClick={() => onNavigate?.('AllApplicants')}
              className="flex-1 h-12 rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-white"
            >
              View Applicants
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
